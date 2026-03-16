# WebSocket Bridge example

Uses **WebSocketProvider** to route serial I/O through a Node.js bridge
server over WebSocket. The browser never touches the serial port directly —
all I/O happens server-side and is relayed via JSON messages.

## Architecture

```
Browser (webserial-core)
        │  ws://localhost:8080  JSON messages
        ▼
Node.js bridge (demos/websocket/server.js)
        │  serialport
        ▼
Physical device
```

## 1. Start the bridge server

```bash
cd demos/websocket
npm install
node server.js
# Listening on ws://localhost:8080
```

## 2. Browser code

```ts
import {
  AbstractSerialDevice,
  delimiter,
  createWebSocketProvider,
} from "webserial-core";

AbstractSerialDevice.setProvider(
  createWebSocketProvider("ws://localhost:8080"),
);

class BridgedDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
      bufferSize: 255,
      commandTimeout: 3000,
      parser: delimiter("\n"),
      autoReconnect: true,
      autoReconnectInterval: 1500,
      handshakeTimeout: 2000,
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new BridgedDevice();

device.on("serial:connected", () => console.log("Connected via WebSocket!"));
device.on("serial:data", (line) => console.log("←", line));
device.on("serial:reconnecting", () => console.log("Reconnecting..."));
device.on("serial:error", (err) => console.error(err.message));

await device.connect();
await device.send("LED_ON\n");
```

## Wire protocol reference

| Browser → Server                        | Description             |
| --------------------------------------- | ----------------------- |
| `{ type: "list-ports", filters: [] }`   | Request available ports |
| `{ type: "open", path, baudRate, ... }` | Open a port             |
| `{ type: "write", bytes: number[] }`    | Send bytes              |
| `{ type: "close" }`                     | Close the port          |

| Server → Browser                             | Description              |
| -------------------------------------------- | ------------------------ |
| `{ type: "port-list", payload: PortInfo[] }` | Available ports          |
| `{ type: "opened" }`                         | Port opened successfully |
| `{ type: "data", bytes: number[] }`          | Incoming serial bytes    |
| `{ type: "closed" }`                         | Port closed              |
| `{ type: "error", payload: { message } }`    | Error                    |

## Connecting to a remote machine

Change the server URL to point at your remote host:

```ts
createWebSocketProvider("ws://my-raspberry-pi.local:8080");
```

> **Security:** The bridge has raw access to serial ports. Add authentication
> middleware before exposing it outside `localhost`.

## Live demo

```bash
# Terminal 1: bridge server
cd demos/websocket && npm install && node server.js

# Terminal 2: Vite dev server
npm run dev

# Open http://localhost:5173/demos/websocket/
```

Source: [`demos/websocket/`](https://github.com/danidoble/webserial-core/tree/main/demos/websocket)
