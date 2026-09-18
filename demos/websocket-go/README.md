# ws-serial-bridge (Go)

WebSocket ↔ SerialPort bridge for webserial-core. Same wire protocol as the Node.js demo, implemented in Go.

## Requirements

- Go 1.25.5+

## Install

```sh
go mod tidy
```

## Run

```sh
go run main.go [--port 8080]
```

The bridge listens on `127.0.0.1` by default and prints a session token at
startup. Configure the client with `ws://127.0.0.1:8080/?token=TOKEN`, or set
`BRIDGE_TOKEN` to reuse a token. `--host` changes the listen address.
`BRIDGE_ORIGINS` and `BRIDGE_PORTS` are comma-separated lists of allowed web
origins and serial paths. Remote access requires a TLS proxy (`wss://`) and
explicit access configuration.

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
