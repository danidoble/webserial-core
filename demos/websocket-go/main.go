// demos/websocket-go/main.go
//
// WebSocket ↔ SerialPort bridge for webserial-core.
// Compiles on Linux and Windows (go.bug.st/serial is cross-platform).
//
// Install dependencies:
//   go mod tidy
//
// Usage:
//   go run main.go [--port 8080]
//
// Build Linux:
//   go build -o ws-serial-bridge main.go
//
// Build Windows:
//   GOOS=windows GOARCH=amd64 go build -o ws-serial-bridge.exe main.go
//
// Wire protocol (JSON over WebSocket):
//   Browser → Server: list-ports | open | write | close
//   Server → Browser: port-list  | opened | data | closed | error

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.bug.st/serial"
	"go.bug.st/serial/enumerator"
)

// ─── Message types ────────────────────────────────────────────────────────────

type InMessage struct {
	Type     string        `json:"type"`
	Filters  []PortFilter  `json:"filters,omitempty"`
	Path     string        `json:"path,omitempty"`
	BaudRate int           `json:"baudRate,omitempty"`
	DataBits int           `json:"dataBits,omitempty"`
	StopBits int           `json:"stopBits,omitempty"`
	Parity   string        `json:"parity,omitempty"`
	Parser   *ParserConfig `json:"parser,omitempty"`
	Bytes    ByteArray     `json:"bytes,omitempty"`
}

// ByteArray serializes as a JSON array of numbers (not base64).
type ByteArray []byte

func (b ByteArray) MarshalJSON() ([]byte, error) {
	if b == nil {
		return []byte("[]"), nil
	}
	out := make([]byte, 0, 2+len(b)*4)
	out = append(out, '[')
	for i, v := range b {
		if i > 0 {
			out = append(out, ',')
		}
		if v < 10 {
			out = append(out, '0'+v)
		} else if v < 100 {
			out = append(out, '0'+v/10, '0'+v%10)
		} else {
			out = append(out, '0'+v/100, '0'+(v/10)%10, '0'+v%10)
		}
	}
	out = append(out, ']')
	return out, nil
}

func (b *ByteArray) UnmarshalJSON(data []byte) error {
	var nums []uint8
	if err := json.Unmarshal(data, &nums); err != nil {
		return err
	}
	*b = ByteArray(nums)
	return nil
}

type OutMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
	Bytes   ByteArray   `json:"bytes"`
}

type PortFilter struct {
	USBVendorID  *uint16 `json:"usbVendorId,omitempty"`
	USBProductID *uint16 `json:"usbProductId,omitempty"`
}

type ParserConfig struct {
	Type   string `json:"type,omitempty"`
	Value  string `json:"value,omitempty"`
	Length int    `json:"length,omitempty"`
}

type PortInfo struct {
	Path      string  `json:"path"`
	VendorID  *uint16 `json:"vendorId,omitempty"`
	ProductID *uint16 `json:"productId,omitempty"`
}

// ─── Globals ──────────────────────────────────────────────────────────────────

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ─── Logger ───────────────────────────────────────────────────────────────────

func logf(tag, format string, args ...interface{}) {
	ts := time.Now().Format("15:04:05.000")
	msg := fmt.Sprintf(format, args...)
	log.Printf("[%s] [%s] %s", ts, tag, msg)
}

// ─── Port discovery ───────────────────────────────────────────────────────────

func listPorts(filters []PortFilter) ([]PortInfo, error) {
	ports, err := enumerator.GetDetailedPortsList()
	if err != nil {
		return nil, err
	}

	var result []PortInfo
	for _, p := range ports {
		if !p.IsUSB {
			continue
		}

		var vid, pid uint16
		fmt.Sscanf(p.VID, "%x", &vid)
		fmt.Sscanf(p.PID, "%x", &pid)

		if len(filters) == 0 {
			result = append(result, PortInfo{Path: p.Name, VendorID: &vid, ProductID: &pid})
			continue
		}

		for _, f := range filters {
			matchVendor := f.USBVendorID == nil || *f.USBVendorID == vid
			matchProduct := f.USBProductID == nil || *f.USBProductID == pid
			if matchVendor && matchProduct {
				result = append(result, PortInfo{Path: p.Name, VendorID: &vid, ProductID: &pid})
				break
			}
		}
	}

	return result, nil
}

// ─── Send helper ─────────────────────────────────────────────────────────────

type safeConn struct {
	mu   sync.Mutex
	conn *websocket.Conn
}

func (c *safeConn) send(msgType string, payload interface{}, bytes []byte) {
	if bytes == nil {
		bytes = []byte{}
	}
	msg := OutMessage{Type: msgType, Payload: payload, Bytes: bytes}
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	_ = c.conn.WriteMessage(websocket.TextMessage, data)
}

// ─── Parser / frame reader ────────────────────────────────────────────────────

// frameReader reads from port and sends complete frames to frameCh.
// Implements delimiter, fixed-length, and raw modes.
type frameReader struct {
	port      serial.Port
	cfg       *ParserConfig
	frameCh   chan []byte
	done      chan struct{}
	disconnCh chan struct{}
}

func newFrameReader(port serial.Port, cfg *ParserConfig) *frameReader {
	return &frameReader{
		port:      port,
		cfg:       cfg,
		frameCh:   make(chan []byte, 64),
		done:      make(chan struct{}),
		disconnCh: make(chan struct{}),
	}
}

func (fr *frameReader) start() {
	go fr.readLoop()
}

func (fr *frameReader) stop() {
	close(fr.done)
}

func (fr *frameReader) readLoop() {
	defer func() {
		select {
		case <-fr.done:
		default:
			close(fr.disconnCh)
		}
		close(fr.frameCh)
	}()

	buf := make([]byte, 4096)

	// raw or nil — forward chunks directly
	if fr.cfg == nil || fr.cfg.Type == "raw" || fr.cfg.Type == "" {
		for {
			n, err := fr.port.Read(buf)
			if err != nil {
				return
			}
			if n > 0 {
				chunk := make([]byte, n)
				copy(chunk, buf[:n])
				select {
				case fr.frameCh <- chunk:
				case <-fr.done:
					return
				}
			}
		}
	}

	// fixed-length mode
	if fr.cfg.Type == "fixed" {
		length := fr.cfg.Length
		if length < 1 {
			length = 1
		}
		acc := make([]byte, 0, length)
		for {
			n, err := fr.port.Read(buf)
			if err != nil {
				return
			}
			acc = append(acc, buf[:n]...)
			for len(acc) >= length {
				chunk := make([]byte, length)
				copy(chunk, acc[:length])
				acc = acc[length:]
				select {
				case fr.frameCh <- chunk:
				case <-fr.done:
					return
				}
			}
		}
	}

	// delimiter mode (default)
	delim := fr.cfg.Value
	if delim == "" {
		delim = "\n"
	}
	delim = strings.ReplaceAll(delim, `\n`, "\n")
	delim = strings.ReplaceAll(delim, `\r`, "\r")
	delim = strings.ReplaceAll(delim, `\t`, "\t")

	acc := make([]byte, 0, 256)
	delimBytes := []byte(delim)
	for {
		n, err := fr.port.Read(buf)
		if err != nil {
			return
		}
		acc = append(acc, buf[:n]...)
		for {
			idx := indexBytes(acc, delimBytes)
			if idx < 0 {
				break
			}
			end := idx + len(delimBytes)
			chunk := make([]byte, end)
			copy(chunk, acc[:end])
			acc = acc[end:]
			select {
			case fr.frameCh <- chunk:
			case <-fr.done:
				return
			}
		}
	}
}

func indexBytes(haystack, needle []byte) int {
	if len(needle) == 0 {
		return 0
	}
	for i := 0; i <= len(haystack)-len(needle); i++ {
		match := true
		for j := range needle {
			if haystack[i+j] != needle[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

// ─── Connection handler ───────────────────────────────────────────────────────

func handleConnection(ws *websocket.Conn) {
	conn := &safeConn{conn: ws}
	logf("WS", "New connection")

	var (
		port   serial.Port
		reader *frameReader
		portMu sync.Mutex
	)

	defer func() {
		portMu.Lock()
		if reader != nil {
			reader.stop()
		}
		if port != nil {
			_ = port.Close()
		}
		portMu.Unlock()
		logf("WS", "Connection closed — cleaned up")
	}()

	for {
		_, raw, err := ws.ReadMessage()
		if err != nil {
			break
		}

		var msg InMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			logf("WS", "Non-JSON message ignored")
			continue
		}

		switch msg.Type {

		// ── list-ports ───────────────────────────────────────────────────────
		case "list-ports":
			ports, err := listPorts(msg.Filters)
			if err != nil {
				logf("ERROR", "list-ports: %v", err)
				conn.send("port-list", []PortInfo{}, nil)
				continue
			}
			if ports == nil {
				ports = []PortInfo{}
			}
			paths := make([]string, len(ports))
			for i, p := range ports {
				paths[i] = p.Path
			}
			logf("SERIAL", "Available ports: %s", strings.Join(paths, ", "))
			conn.send("port-list", ports, nil)

		// ── open ─────────────────────────────────────────────────────────────
		case "open":
			portMu.Lock()
			if port != nil {
				conn.send("opened", nil, nil)
				portMu.Unlock()
				continue
			}

			baudRate := msg.BaudRate
			if baudRate == 0 {
				baudRate = 9600
			}

			mode := &serial.Mode{
				BaudRate: baudRate,
				DataBits: 8,
				StopBits: serial.OneStopBit,
				Parity:   serial.NoParity,
			}
			if msg.DataBits > 0 {
				mode.DataBits = msg.DataBits
			}
			switch msg.StopBits {
			case 2:
				mode.StopBits = serial.TwoStopBits
			}
			switch msg.Parity {
			case "odd":
				mode.Parity = serial.OddParity
			case "even":
				mode.Parity = serial.EvenParity
			}

			p, err := serial.Open(msg.Path, mode)
			if err != nil {
				logf("ERROR", "open %s: %v", msg.Path, err)
				conn.send("error", map[string]string{"message": err.Error()}, nil)
				portMu.Unlock()
				continue
			}
			port = p
			logf("SERIAL", "Port opened: %s @ %d baud", msg.Path, baudRate)
			conn.send("opened", nil, nil)

			// start frame reader
			reader = newFrameReader(port, msg.Parser)
			reader.start()
			portMu.Unlock()

			// forward frames to browser; detect unexpected disconnect
			go func() {
				fr := reader
				for chunk := range fr.frameCh {
					logf("SERIAL", "← %d bytes", len(chunk))
					conn.send("data", nil, chunk)
				}
				select {
				case <-fr.disconnCh:
					logf("SERIAL", "Port disconnected unexpectedly")
					portMu.Lock()
					port = nil
					reader = nil
					portMu.Unlock()
					conn.send("disconnected", map[string]string{"message": "Serial port disconnected"}, nil)
				default:
				}
			}()

		// ── write ─────────────────────────────────────────────────────────────
		case "write":
			portMu.Lock()
			p := port
			portMu.Unlock()
			if p == nil {
				logf("WS", "write ignored — port not open")
				continue
			}
			logf("SERIAL", "→ %d bytes", len(msg.Bytes))
			_, werr := p.Write(msg.Bytes)
			if werr != nil {
				logf("ERROR", "write: %v", werr)
			}

		// ── close ─────────────────────────────────────────────────────────────
		case "close":
			portMu.Lock()
			if reader != nil {
				reader.stop()
				reader = nil
			}
			if port != nil {
				_ = port.Close()
				port = nil
				conn.send("closed", nil, nil)
			}
			portMu.Unlock()

		default:
			logf("WS", "Unknown message type: %s", msg.Type)
		}
	}
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logf("WS", "Upgrade failed: %v", err)
		return
	}
	defer conn.Close()
	handleConnection(conn)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	wsPort := flag.Int("port", 8080, "WebSocket listen port")
	flag.Parse()

	addr := fmt.Sprintf(":%d", *wsPort)

	http.HandleFunc("/", wsHandler)

	logf("SERVER", "ws-serial-bridge (Go) listening on ws://localhost%s", addr)
	logf("SERVER", "Waiting for browser connections...")

	if err := http.ListenAndServe(addr, nil); err != nil {
		logf("SERVER-ERR", "%v", err)
		os.Exit(1)
	}
}
