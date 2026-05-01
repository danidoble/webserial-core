# ws-serial-bridge (Go)

WebSocket ↔ SerialPort bridge for webserial-core. Same wire protocol as the Node.js demo, implemented in Go.

## Requirements

- Go 1.21+

## Install

```sh
go mod tidy
```

## Run

```sh
go run main.go [--port 8080]
```

## Build

```sh
# Linux
go build -o ws-serial-bridge main.go

# Windows (cross-compile from Linux)
GOOS=windows GOARCH=amd64 go build -o ws-serial-bridge.exe main.go
```

## Wire protocol

| Direction          | Message types                          |
|--------------------|----------------------------------------|
| Browser → Server   | `list-ports`, `open`, `write`, `close` |
| Server → Browser   | `port-list`, `opened`, `data`, `closed`, `error` |

All messages are JSON: `{ "type": "...", "payload": ..., "bytes": [...] }`

## Parser config (in `open` message)

| Type        | Config example                              |
|-------------|---------------------------------------------|
| `raw`       | `{ "type": "raw" }`                         |
| `delimiter` | `{ "type": "delimiter", "value": "\\n" }`  |
| `fixed`     | `{ "type": "fixed", "length": 8 }`          |
