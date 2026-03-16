/**
 * demos/websocket/server.js
 *
 * WebSocket ↔ SerialPort bridge for webserial-core.
 * Runs on Node.js (v18+). Browsers connect via WebSocketProvider and this
 * server relays bytes to/from a physical serial port.
 *
 * Install dependencies:
 *   npm install
 *
 * Usage:
 *   node server.js [--port 8080]
 *
 * Wire protocol (JSON over WebSocket):
 *   Browser → Server: list-ports | open | write | close
 *   Server → Browser: port-list  | opened | data | closed | error
 */

import { WebSocketServer } from "ws";
import { SerialPort, ByteLengthParser, DelimiterParser } from "serialport";

// ─── CLI arguments ───────────────────────────────────────────────────────────
// eslint-disable-next-line no-undef
const args = process.argv.slice(2);
const WS_PORT = parseInt(args[args.indexOf("--port") + 1] ?? "8080", 10);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Send a JSON message to the browser client.
 *
 * @param {import('ws').WebSocket} ws
 * @param {string} type
 * @param {unknown} payload
 * @param {number[]} [bytes]
 */
function send(ws, type, payload, bytes = []) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload, bytes }));
  }
}

function log(tag, msg) {
  const ts = new Date().toISOString().split("T")[1].slice(0, -1);
  console.log(`[${ts}] [${tag}] ${msg}`);
}

// ─── Parser factory ──────────────────────────────────────────────────────────

/**
 * Build a serialport Transform parser from the config sent in the `open` message.
 *
 * Supported configs:
 *   { type: "delimiter", value: "\\n" }  — one event per delimited frame (default)
 *   { type: "fixed",     length: N }     — one event per N-byte block
 *   { type: "raw" }                      — no accumulation, pass through raw bytes
 *
 * @param {{ type?: string, value?: string, length?: number } | null} parserConfig
 * @returns {import('@serialport/stream').Transform | null}
 */
function createParser(parserConfig) {
  if (!parserConfig || parserConfig.type === "raw") {
    return null; // raw mode — listen directly on port "data" events
  }

  if (parserConfig.type === "fixed") {
    const length = parserConfig.length;
    if (!length || length < 1)
      throw new Error("fixed parser requires length >= 1");
    return new ByteLengthParser({ length });
  }

  // "delimiter" is the default
  const raw = parserConfig.value ?? "\n";
  const delimiter = raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");

  return new DelimiterParser({ delimiter, includeDelimiter: true });
}

// ─── Port discovery ──────────────────────────────────────────────────────────

/**
 * Return a list of connected serial ports, optionally filtered by vendor/product ID.
 *
 * @param {Array<{ usbVendorId?: number, usbProductId?: number }>} filters
 */
async function listPorts(filters = []) {
  const all = await SerialPort.list();
  // Only include ports with recognized USB IDs
  const recognized = all.filter((p) => p.vendorId && p.productId);

  if (!filters.length) return recognized;

  return recognized.filter((p) =>
    filters.some((f) => {
      const matchVendor =
        !f.usbVendorId ||
        p.vendorId?.toLowerCase() ===
          f.usbVendorId.toString(16).padStart(4, "0").toLowerCase();
      const matchProduct =
        !f.usbProductId ||
        p.productId?.toLowerCase() ===
          f.usbProductId.toString(16).padStart(4, "0").toLowerCase();
      return matchVendor && matchProduct;
    }),
  );
}

// ─── Per-connection handler ───────────────────────────────────────────────────

/**
 * Handle one browser WebSocket connection.
 *
 * @param {import('ws').WebSocket} ws
 */
async function handleConnection(ws) {
  log("WS", "New connection");

  /** @type {SerialPort | null} */
  let port = null;

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      log("WS", "Non-JSON message ignored");
      return;
    }

    // ── list-ports ───────────────────────────────────────────────────────────
    if (msg.type === "list-ports") {
      try {
        const ports = await listPorts(msg.filters ?? []);
        const payload = ports.map((p) => ({
          path: p.path,
          vendorId: p.vendorId ? parseInt(p.vendorId, 16) : undefined,
          productId: p.productId ? parseInt(p.productId, 16) : undefined,
        }));
        log(
          "SERIAL",
          `Available ports: ${payload.map((p) => p.path).join(", ") || "none"}`,
        );
        send(ws, "port-list", payload);
      } catch (err) {
        log("ERROR", `list-ports: ${err.message}`);
        send(ws, "port-list", []);
      }
      return;
    }

    // ── open ─────────────────────────────────────────────────────────────────
    if (msg.type === "open") {
      if (port?.isOpen) {
        send(ws, "opened", null);
        return;
      }

      port = new SerialPort({
        path: msg.path,
        baudRate: msg.baudRate ?? 9600,
        dataBits: msg.dataBits ?? 8,
        stopBits: msg.stopBits ?? 1,
        parity: msg.parity ?? "none",
        autoOpen: false,
      });

      port.open((err) => {
        if (err) {
          log("ERROR", `open ${msg.path}: ${err.message}`);
          send(ws, "error", { message: err.message });
          return;
        }
        log("SERIAL", `Port opened: ${msg.path} @ ${msg.baudRate} baud`);
        send(ws, "opened", null);
      });

      // Attach parser (or use the raw port) as the data source
      let dataSource;
      try {
        const parser = createParser(msg.parser);
        if (parser) {
          dataSource = port.pipe(parser);
          log("SERIAL", `Parser: ${JSON.stringify(msg.parser)}`);
        } else {
          dataSource = port;
          log("SERIAL", "No parser — raw mode");
        }
      } catch (parserErr) {
        log("ERROR", `createParser: ${parserErr.message}`);
        send(ws, "error", { message: parserErr.message });
        return;
      }

      // Forward complete frames to the browser
      dataSource.on("data", (chunk) => {
        log("SERIAL", `← ${chunk.length} bytes`);
        send(ws, "data", null, Array.from(chunk));
      });

      port.on("error", (err) => {
        log("ERROR", `serial: ${err.message}`);
        send(ws, "error", { message: err.message });
      });

      port.on("close", () => {
        log("SERIAL", "Port closed");
        send(ws, "closed", null);
      });

      return;
    }

    // ── write ─────────────────────────────────────────────────────────────────
    if (msg.type === "write") {
      if (!port?.isOpen) {
        log("WS", "write ignored — port not open");
        return;
      }
      // eslint-disable-next-line no-undef
      const buf = Buffer.from(msg.bytes);
      log("SERIAL", `→ ${buf.length} bytes`);
      port.write(buf, (err) => {
        if (err) log("ERROR", `write: ${err.message}`);
      });
      return;
    }

    // ── close ─────────────────────────────────────────────────────────────────
    if (msg.type === "close") {
      if (port?.isOpen) port.close();
      return;
    }

    log("WS", `Unknown message type: ${msg.type}`);
  });

  ws.on("close", () => {
    log("WS", "Connection closed — cleaning up");
    if (port?.isOpen) port.close();
    port = null;
  });

  ws.on("error", (err) => {
    log("WS-ERR", err.message);
  });
}

// ─── Start server ─────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: WS_PORT });

wss.on("listening", () => {
  log("SERVER", `ws-serial-bridge listening on ws://localhost:${WS_PORT}`);
  log("SERVER", "Waiting for browser connections...");
});

wss.on("connection", handleConnection);

wss.on("error", (err) => {
  console.error(`[SERVER-ERR] ${err.message}`);
  // eslint-disable-next-line no-undef
  process.exit(1);
});
