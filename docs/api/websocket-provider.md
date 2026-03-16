# WebSocketProvider

`createWebSocketProvider(serverUrl)` returns a `SerialProvider` that relays
serial I/O to a Node.js bridge server over a WebSocket connection.

## When to use

- Access serial ports on a remote machine (e.g. a Raspberry Pi) from a browser.
- Build web UIs for devices connected to a server behind a firewall.
- Test serial code in an environment where Web Serial is unavailable.

## Import

```ts
import { createWebSocketProvider } from "webserial-core";
```

## Factory function

```ts
createWebSocketProvider(serverUrl: string): SerialProvider
```

| Parameter   | Type     | Description                                                       |
| ----------- | -------- | ----------------------------------------------------------------- |
| `serverUrl` | `string` | WebSocket URL of the bridge server (e.g. `"ws://localhost:8080"`) |

## Usage

```ts
import {
  AbstractSerialDevice,
  delimiter,
  createWebSocketProvider,
} from "webserial-core";

AbstractSerialDevice.setProvider(
  createWebSocketProvider("ws://localhost:8080"),
);

class MyDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      autoReconnect: true,
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new MyDevice();
await device.connect(); // Connects to the first port listed by the bridge
```

## Bridge server

A ready-to-use Node.js bridge server is included at
`demos/websocket/server.js`. See the
[WebSocket Bridge demo README](https://github.com/danidoble/webserial-core/tree/main/demos/websocket)
for setup instructions.

## Wire protocol

All messages are JSON objects sent over the WebSocket connection.

| Direction        | Type         | Payload description                                      |
| ---------------- | ------------ | -------------------------------------------------------- |
| Browser → Server | `list-ports` | `{ filters: SerialPortFilter[] }`                        |
| Server → Browser | `port-list`  | `{ payload: PortInfo[] }`                                |
| Browser → Server | `open`       | `{ path, baudRate, dataBits, stopBits, parity, parser }` |
| Server → Browser | `opened`     | acknowledge                                              |
| Browser → Server | `write`      | `{ bytes: number[] }`                                    |
| Server → Browser | `data`       | `{ bytes: number[] }`                                    |
| Browser → Server | `close`      | —                                                        |
| Server → Browser | `closed`     | —                                                        |
| Server → Browser | `error`      | `{ payload: { message: string } }`                       |

## Port selection

`requestPort()` opens a new WebSocket connection, requests the port list, and
**auto-selects the first available port**. For production apps, display a UI
picker over the returned port list before calling `open`.

## Security note

The bridge server has raw access to serial ports. Deploy it only on trusted
networks and add authentication for any internet-facing setup.
