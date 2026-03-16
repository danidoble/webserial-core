# WebSocket Bridge Demo

This demo shows how to use `WebSocketProvider` from **webserial-core** to
communicate with a serial device through a Node.js bridge server.

## Architecture

```
Browser (webserial-core)
        │  WebSocket (JSON messages)
        ▼
Node.js bridge (server.js)
        │  serialport
        ▼
Physical serial device (e.g. Arduino, ESP32)
```

The browser uses `WebSocketProvider` which presents the same `SerialProvider`
interface as the native Web Serial API. The bridge server translates WebSocket
JSON messages into actual serial port reads and writes.

## Wire Protocol

| Direction        | Message type | Payload                                                  |
| ---------------- | ------------ | -------------------------------------------------------- |
| Browser → Server | `list-ports` | `{ filters: [] }`                                        |
| Server → Browser | `port-list`  | `[{ path, vendorId, productId }]`                        |
| Browser → Server | `open`       | `{ path, baudRate, dataBits, stopBits, parity, parser }` |
| Server → Browser | `opened`     | `null`                                                   |
| Browser → Server | `write`      | `{ bytes: number[] }`                                    |
| Server → Browser | `data`       | — (bytes in `bytes` field)                               |
| Browser → Server | `close`      | —                                                        |
| Server → Browser | `closed`     | —                                                        |

## Quick Start

### 1. Install bridge dependencies

```bash
cd demos/websocket
npm install
```

### 2. Start the bridge

```bash
node server.js
# or with a custom port:
node server.js --port 8080
```

### 3. Open the demo

Start the Vite dev server from the project root:

```bash
npm run dev
```

Then open [http://localhost:5173/demos/websocket/](http://localhost:5173/demos/websocket/)
and click **Connect**.

## Parser configuration

The bridge supports three parser modes, configured via the `parser` field in
the `open` message:

| Config                                | Description                                     |
| ------------------------------------- | ----------------------------------------------- |
| `{ type: "delimiter", value: "\\n" }` | One event per newline-terminated line (default) |
| `{ type: "fixed", length: N }`        | One event per N-byte block                      |
| `{ type: "raw" }`                     | Raw bytes, no accumulation                      |

To change the parser, edit `demos/websocket/main.ts` and update the
`createWebSocketProvider` call or modify the `open` message sent from the
`WebSocketProvider` adapter.

## Security note

The bridge server listens on `localhost` by default. Do **not** expose it to
the public internet without adding authentication, as it grants raw access to
serial ports on the host machine.
