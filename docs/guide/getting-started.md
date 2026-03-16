# Getting Started

## Requirements

| Requirement | Version                            |
| ----------- | ---------------------------------- |
| Node.js     | ≥ 18                               |
| TypeScript  | ≥ 5.0                              |
| Browser     | Chrome 89+ / Edge 89+ (Web Serial) |

> **Note:** Web Serial requires a secure context (HTTPS or `localhost`) and
> a Chromium-based browser. WebUSB and Web Bluetooth have similar requirements.

## Installation

```bash
npm install webserial-core
```

## Quick example — Web Serial

```ts
import { AbstractSerialDevice, delimiter } from "webserial-core";

class MyDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      autoReconnect: true,
    });
  }

  protected async handshake(): Promise<boolean> {
    // Optional: send a command and wait for confirmation.
    // Return true to accept any port.
    return true;
  }
}

const device = new MyDevice();

device.on("serial:connected", () => console.log("Connected!"));
device.on("serial:data", (line) => console.log("Received:", line));
device.on("serial:error", (err) => console.error("Error:", err.message));

// Opens the browser port picker and connects
await device.connect();

// Send data
await device.send("LED_ON\n");

// Disconnect
await device.disconnect();
```

## Switching transport providers

All four adapters implement the same `SerialProvider` interface. Inject your
chosen provider once before constructing any device:

```ts
import { AbstractSerialDevice } from "webserial-core";
import { WebUsbProvider } from "webserial-core/adapters/web-usb";
// or:
import { createBluetoothProvider } from "webserial-core/adapters/web-bluetooth";
// or:
import { createWebSocketProvider } from "webserial-core/adapters/websocket";

// WebUSB polyfill (useful on Android Chrome)
AbstractSerialDevice.setProvider(new WebUsbProvider());

// Web Bluetooth NUS
AbstractSerialDevice.setProvider(createBluetoothProvider());

// WebSocket bridge (Node.js server required — see demos/websocket/README.md)
AbstractSerialDevice.setProvider(
  createWebSocketProvider("ws://localhost:8080"),
);
```

After calling `setProvider`, every `AbstractSerialDevice` subclass instance
will use that transport automatically.

## Configuration options

All options are passed to the `super()` call in your device constructor:

```ts
super({
  baudRate: 9600, // Serial baud rate
  dataBits: 8, // 7 or 8
  stopBits: 1, // 1 or 2
  parity: "none", // "none" | "even" | "odd"
  flowControl: "none", // "none" | "hardware"
  bufferSize: 255, // Internal read buffer size (bytes)
  parser: delimiter("\n"), // How to split incoming bytes into messages
  commandTimeout: 3000, // ms before a queued command times out
  autoReconnect: true, // Automatically reconnect on disconnect
  autoReconnectInterval: 1500, // ms between reconnect attempts
  handshakeTimeout: 2000, // ms allowed for handshake() to complete
  filters: [], // USB vendor/product ID filters
});
```

## Next steps

- Read the [Architecture guide](./architecture.md) to understand how the pieces
  fit together.
- Browse the [API reference](/api/abstract-serial-device) for full method and
  event documentation.
- Check the [examples](/examples/web-serial) for copy-paste demos.
- If you are upgrading from v1, see the [Migration guide](./migration-v1-v2.md).
