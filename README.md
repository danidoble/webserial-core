# webserial-core

A strongly-typed, event-driven, abstract TypeScript library for the **Web Serial API**.

Built for real-world embedded hardware communication — supports custom parsers, FIFO command queues, handshake validation, auto-reconnect, and multiple simultaneous device connections.

## Features

| Feature              | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| **Abstract Class**   | Extend `AbstractSerialDevice<T>` for your specific hardware                |
| **Typed Events**     | Full IDE autocomplete via `SerialEventMap<T>` (`on` / `off` / `emit`)      |
| **Custom Parsers**   | Built-in `fixedLength`, `delimiter`, and `raw` parsers — or write your own |
| **Command Queue**    | FIFO queue with per-command timeout and `serial:sent` tracking             |
| **Handshake**        | Override `handshake()` to validate device identity on connect              |
| **Auto-Reconnect**   | Polling-based reconnection when a device disconnects unexpectedly          |
| **Port Registry**    | Prevents duplicate connections to the same physical port                   |
| **Multi-Port Scan**  | Cycles through all saved ports during reconnect, with handshake for each   |
| **Polyfill Support** | Inject a WebUSB polyfill for Android or any custom `SerialProvider`        |

## Installation

```bash
npm install webserial-core
# or
bun add webserial-core
```

## Quick Start

### 1. Create a device class

```ts
import { AbstractSerialDevice, delimiter } from "webserial-core";

class MyArduino extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      autoReconnect: true,
      handshakeTimeout: 2000,
    });
  }

  // Optional: validate device identity
  protected async handshake(): Promise<boolean> {
    // Send a ping, wait for pong, return true/false
    return true;
  }
}
```

### 2. Connect and communicate

```ts
const device = new MyArduino();

device.on("serial:connected", () => console.log("Connected!"));
device.on("serial:data", (line) => console.log("Received:", line));
device.on("serial:sent", (bytes) => console.log("Sent:", bytes));
device.on("serial:disconnected", () => console.log("Disconnected"));
device.on("serial:reconnecting", () => console.log("Scanning for device..."));

// Must be called from a user gesture (e.g. button click)
await device.connect();
await device.send("LED_ON\n");
```

### 3. Send raw bytes

```ts
const payload = new Uint8Array([0xff, 0x01, 0xa3]);
await device.send(payload);
```

## Configuration

All options passed to `super()` in your device class:

```ts
interface SerialDeviceOptions<T> {
  baudRate: number;
  filters?: SerialPortFilter[]; // USB vendor/product ID filters
  dataBits?: 7 | 8; // Default: 8
  stopBits?: 1 | 2; // Default: 1
  parity?: "none" | "even" | "odd"; // Default: "none"
  bufferSize?: number; // Default: 255
  flowControl?: "none" | "hardware"; // Default: "none"
  commandTimeout?: number; // Queue timeout per command (ms), 0 = disabled
  parser?: SerialParser<T>; // How incoming bytes are parsed
  autoReconnect?: boolean; // Auto-reconnect on unexpected disconnect
  autoReconnectInterval?: number; // Polling interval (ms), default: 1500
  handshakeTimeout?: number; // Max time for handshake (ms), default: 2000
  provider?: SerialProvider; // Instance-specific SerialProvider (e.g. WebUsbProvider)
  polyfillOptions?: SerialPolyfillOptions; // Custom config for the provider (classCode overrides)
}
```

## Events

| Event                    | Payload               | Description                                    |
| ------------------------ | --------------------- | ---------------------------------------------- |
| `serial:connecting`      | `(instance)`          | Connection attempt started                     |
| `serial:connected`       | `(instance)`          | Successfully connected                         |
| `serial:disconnected`    | `(instance)`          | Port closed                                    |
| `serial:reconnecting`    | `(instance)`          | Auto-reconnect polling started                 |
| `serial:data`            | `(data, instance)`    | Parsed data received (type `T`)                |
| `serial:sent`            | `(data, instance)`    | Command processed by queue and written to port |
| `serial:error`           | `(error, instance)`   | An error occurred                              |
| `serial:need-permission` | `(instance)`          | User denied port access                        |
| `serial:queue-empty`     | `(instance)`          | Command queue cleared                          |
| `serial:timeout`         | `(command, instance)` | Command timed out waiting for response         |

## Built-in Parsers

### `delimiter(char: string)` → `SerialParser<string>`

Accumulates incoming bytes and emits complete strings split by a delimiter character.

```ts
import { delimiter } from "webserial-core";

// Splits on newline — typical for Serial.println()
super({ parser: delimiter("\n"), baudRate: 9600 });
```

### `fixedLength(n: number)` → `SerialParser<Uint8Array>`

Buffers incoming bytes and emits exactly `n`-byte chunks.

```ts
import { fixedLength } from "webserial-core";

// Emit every 14 bytes
super({ parser: fixedLength(14), baudRate: 115200 });
```

### `raw()` → `SerialParser<Uint8Array>`

Passes through every chunk as-is, no buffering.

```ts
import { raw } from "webserial-core";

super({ parser: raw(), baudRate: 9600 });
```

### Custom Parser

Implement the `SerialParser<T>` interface:

```ts
import type { SerialParser } from "webserial-core";

function myParser(): SerialParser<MyFrame> {
  let buffer = new Uint8Array(0);

  return {
    parse(chunk, emit) {
      // Accumulate and parse your protocol
      // Call emit(parsed) for each complete frame
    },
    reset() {
      buffer = new Uint8Array(0);
    },
  };
}
```

## Handshake

Override the `handshake()` method to verify that a port belongs to the correct device. This is especially useful when multiple devices share the same USB chip (e.g. CH340, CP2102).

```ts
class MyDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      handshakeTimeout: 2000,
    });
  }

  protected async handshake(): Promise<boolean> {
    // Send identification command
    await this.send("WHO\n");

    // Wait for response via a one-shot listener
    return new Promise((resolve) => {
      const handler = (data: string) => {
        this.off("serial:data", handler);
        resolve(data.trim() === "MYDEVICE_V2");
      };
      this.on("serial:data", handler);
    });
  }
}
```

If `handshake()` returns `false` or times out, the port is released and the next saved port is tried.

## Auto-Reconnect

When `autoReconnect: true` is set and the device disconnects unexpectedly (cable pulled, device reset):

1. `serial:disconnected` fires
2. `serial:reconnecting` fires
3. The library polls `navigator.serial.getPorts()` every `autoReconnectInterval` ms
4. Each matching port is opened and handshake-validated
5. On success → `serial:connected` fires automatically

Calling `disconnect()` manually **does not** trigger auto-reconnect. You can also call `stopReconnecting()` to cancel the polling loop.

## Multiple Devices

```ts
const sensor = new SensorDevice();
const motor = new MotorDevice();

// Connect one by one
await sensor.connect();
await motor.connect();

// Or connect all registered instances
await AbstractSerialDevice.connectAll();

// List all active instances
const all = AbstractSerialDevice.getInstances();
```

The port registry prevents two instances from opening the same physical port.

## Error Classes

| Class                     | When                                       |
| ------------------------- | ------------------------------------------ |
| `SerialPortConflictError` | Port is already opened by another instance |
| `SerialPermissionError`   | User denied the browser permission dialog  |
| `SerialTimeoutError`      | General timeout error                      |
| `SerialReadError`         | Failed to read from port                   |
| `SerialWriteError`        | Failed to write to port                    |

## Browser Compatibility

Requires a browser with [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API) support:

- ✅ Chrome 89+
- ✅ Edge 89+
- ✅ Opera 75+
- ✅ Android Chrome (via WebUSB polyfill — see below)
- ❌ Firefox (not supported)
- ❌ Safari (not supported)

## WebUSB Polyfill (Android Support)

Android Chrome doesn't fully support the Web Serial API for wired USB devices. To bridge the gap, `webserial-core` ships with a built-in `WebUsbProvider` that uses the native WebUSB API (`navigator.usb`) to emulate Web Serial.

```ts
import { AbstractSerialDevice, WebUsbProvider } from "webserial-core";

// Set the polyfill globally before any connect() call
if (!navigator.serial) {
  AbstractSerialDevice.setProvider(new WebUsbProvider());
}
```

### Standard vs Vendor-Specific Devices (Class 2 vs 255)

By default, the `WebUsbProvider` looks for **Standard USB CDC ACM** devices (Class `2`). Examples include native Arduino Unos and Leonardos.

However, many devices use **Vendor-Specific** USB-to-UART bridge chips (Class `255`), like the **Silicon Labs CP2102** (NodeMCU, ESP32) or **CH340**. These chips do not understand standard CDC ACM commands. If you try to send CDC commands to them, the connection will throw a `NetworkError` or `SecurityError`.

The built-in `WebUsbProvider` automatically handles protocol initialization for standard chips and some known vendor chips (like CP210x).

If you are communicating with mixed devices, you can set the `WebUsbProvider` **per-instance** instead of globally, allowing you to tweak the USB Interface filters for each device:

```ts
class NativeArduino extends AbstractSerialDevice<string> {
  constructor() {
    super({ baudRate: 9600 }); // Uses standard navigator.serial or global Provider
  }
}

class CustomEsp32 extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 115200,
      filters: [{ usbVendorId: 0x10c4 }], // Silicon Labs vendor ID

      // Override the provider FOR THIS INSTANCE ONLY
      provider: new WebUsbProvider(),
      polyfillOptions: {
        usbControlInterfaceClass: 255, // Vendor-specific
        usbTransferInterfaceClass: 255,
        protocol: "cp210x", // Send CP2102-specific UART init commands
      },
    });
  }
}
```

### USB Initialization Protocols

You can force a specific USB initialization protocol using `polyfillOptions.protocol`:

- `"cdc_acm"`: (Default for Class 2). Sends standard `SetLineCoding` and `SetControlLineState`.
- `"cp210x"`: (Auto-detected for Vendor `0x10c4`). Sends Silicon Labs specific registers to enable UART, Baudrate, and DTR/RTS.
- `"none"`: Opens the port and claims interfaces, but sends **no** initialization commands.

> **Desktop note:** On **Linux**, **Windows**, and **macOS**, USB-serial devices are automatically claimed by OS kernel drivers. WebUSB **cannot** access devices already claimed by a driver — the device picker will appear empty. `WebUsbProvider` is primarily designed for **Android Chrome**, where the OS does not load kernel drivers.

## Advanced: WebSocket + Node.js Provider

Because `SerialProvider` is a plain interface, you can build a provider that communicates with a **Node.js backend via WebSockets**. The backend uses the [`serialport`](https://serialport.io/) npm package to talk to the physical device, and the browser connects through your provider — **without changing any library code**.

### Architecture

```
Browser                              Node.js Server
┌─────────────────────┐   WebSocket   ┌─────────────────────┐
│  webserial-core     │ ◄──────────► │  serialport (npm)    │
│  + WebSocketProvider│               │  + WebSocket bridge  │
└─────────────────────┘               └──────────┬──────────┘
                                                  │ USB / UART
                                            ┌─────┴─────┐
                                            │  Device    │
                                            └───────────┘
```

### 1. Browser side — WebSocket Provider

Create a custom `SerialProvider` that wraps a WebSocket connection:

```ts
import type { SerialProvider, SerialPortFilter } from "webserial-core";
import { AbstractSerialDevice } from "webserial-core";

/**
 * A SerialProvider that tunnels serial communication through a WebSocket
 * to a Node.js server running the `serialport` npm package.
 */
function createWebSocketProvider(serverUrl: string): SerialProvider {
  return {
    async requestPort(options) {
      // 1. Ask the server for available ports (filtered)
      const ws = new WebSocket(serverUrl);
      await waitForOpen(ws);

      ws.send(
        JSON.stringify({
          type: "list-ports",
          filters: options?.filters ?? [],
        }),
      );

      const ports = await waitForMessage<PortInfo[]>(ws, "port-list");

      // 2. Let the user pick a port (you could show a custom dialog here)
      const selected = ports[0]; // or show a picker UI
      if (!selected) throw new Error("No ports available");

      // 3. Return a SerialPort-compatible object backed by this WebSocket
      return createWsSerialPort(ws, selected);
    },

    async getPorts() {
      const ws = new WebSocket(serverUrl);
      await waitForOpen(ws);

      ws.send(JSON.stringify({ type: "list-ports", filters: [] }));
      const ports = await waitForMessage<PortInfo[]>(ws, "port-list");

      return ports.map((info) => createWsSerialPort(ws, info));
    },
  };
}

/**
 * Creates a SerialPort-compatible object that tunnels read/write
 * through a WebSocket connection.
 */
function createWsSerialPort(ws: WebSocket, info: PortInfo): SerialPort {
  let readable: ReadableStream<Uint8Array> | null = null;
  let writable: WritableStream<Uint8Array> | null = null;

  return {
    get readable() {
      return readable;
    },
    get writable() {
      return writable;
    },

    getInfo() {
      return {
        usbVendorId: info.vendorId,
        usbProductId: info.productId,
      };
    },

    async open(options) {
      // Tell the server to open the port with these serial options
      ws.send(
        JSON.stringify({
          type: "open",
          path: info.path,
          baudRate: options.baudRate,
          dataBits: options.dataBits,
          stopBits: options.stopBits,
          parity: options.parity,
        }),
      );

      await waitForMessage(ws, "opened");

      // Create a ReadableStream that emits data received from the server
      readable = new ReadableStream<Uint8Array>({
        start(controller) {
          ws.addEventListener("message", (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === "data") {
              controller.enqueue(new Uint8Array(msg.bytes));
            }
            if (msg.type === "closed") {
              controller.close();
            }
          });
        },
      });

      // Create a WritableStream that sends data to the server
      writable = new WritableStream<Uint8Array>({
        write(chunk) {
          ws.send(
            JSON.stringify({
              type: "write",
              bytes: Array.from(chunk),
            }),
          );
        },
      });
    },

    async close() {
      ws.send(JSON.stringify({ type: "close" }));
      readable = null;
      writable = null;
      ws.close();
    },
  } as SerialPort;
}

// ── Utility helpers ──────────────────────────────────────────

interface PortInfo {
  path: string;
  vendorId?: number;
  productId?: number;
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", (e) => reject(e), { once: true });
  });
}

function waitForMessage<T>(ws: WebSocket, expectedType: string): Promise<T> {
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type === expectedType) {
        ws.removeEventListener("message", handler);
        resolve(msg.payload as T);
      }
    };
    ws.addEventListener("message", handler);
  });
}
```

### 2. Usage in your device class

```ts
// Set the WebSocket provider before connecting
const wsProvider = createWebSocketProvider("ws://localhost:8080");
AbstractSerialDevice.setProvider(wsProvider);

// Now use your device class exactly as before
const device = new MyArduino();
await device.connect(); // tunnels through WebSocket → Node.js → USB
await device.send("LED_ON\n");
```

### 3. Node.js server side (example)

```ts
// server.ts — run with: npx tsx server.ts
import { WebSocketServer } from "ws";
import { SerialPort } from "serialport";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  let port: SerialPort | null = null;

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());

    switch (msg.type) {
      case "list-ports": {
        const ports = await SerialPort.list();
        const filtered = ports.map((p) => ({
          path: p.path,
          vendorId: parseInt(p.vendorId ?? "0", 16) || undefined,
          productId: parseInt(p.productId ?? "0", 16) || undefined,
        }));
        ws.send(JSON.stringify({ type: "port-list", payload: filtered }));
        break;
      }

      case "open": {
        port = new SerialPort({
          path: msg.path,
          baudRate: msg.baudRate,
          dataBits: msg.dataBits ?? 8,
          stopBits: msg.stopBits ?? 1,
          parity: msg.parity ?? "none",
        });

        port.on("data", (data: Buffer) => {
          ws.send(
            JSON.stringify({
              type: "data",
              bytes: Array.from(data),
            }),
          );
        });

        port.on("close", () => {
          ws.send(JSON.stringify({ type: "closed" }));
        });

        ws.send(JSON.stringify({ type: "opened" }));
        break;
      }

      case "write": {
        if (port && port.isOpen) {
          port.write(Buffer.from(msg.bytes));
        }
        break;
      }

      case "close": {
        if (port && port.isOpen) {
          port.close();
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    if (port && port.isOpen) port.close();
  });
});

console.log("Serial WebSocket bridge running on ws://localhost:8080");
```

### Why this works

The key insight is that `webserial-core` never calls `navigator.serial` directly — it goes through the `SerialProvider` interface. Any object that implements `requestPort()` and `getPorts()` and returns objects with `readable`/`writable` Web Streams is a valid provider.

This means you can swap the transport layer without touching your device classes:

| Provider                    | Transport          | Use case                    |
| --------------------------- | ------------------ | --------------------------- |
| Native (`navigator.serial`) | USB direct         | Desktop Chrome/Edge         |
| `web-serial-polyfill`       | WebUSB             | Android Chrome              |
| WebSocket provider          | WS → Node.js → USB | Any browser, remote devices |
| Bluetooth provider          | Web Bluetooth      | Wireless devices            |
| Mock provider               | In-memory          | Unit testing                |

## Advanced: Web Bluetooth Provider

Just like WebSockets, you can implement a `SerialProvider` using the **Web Bluetooth API** for completely wireless serial communication (like HC-05/HC-06 modules or BLE UART services).

> **Note:** The standard Web Serial API recently gained support for classic Bluetooth RFCOMM, but Web Bluetooth gives you more control over BLE GATT characteristics.

On linux you need to enable this flag: `chrome://flags/#enable-web-bluetooth` and on windows `chrome://flags/#use-winrt-bluetooth-adapter`

### Browser side — Web Bluetooth interface

Here is a simplified example of mapping Web Bluetooth to `SerialPort`:

```ts
import type { SerialProvider, SerialPortFilter } from "webserial-core";

const NORDIC_UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const TX_CHARACTERISTIC = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const RX_CHARACTERISTIC = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

export function createBluetoothProvider(): SerialProvider {
  return {
    async requestPort() {
      if (!navigator.bluetooth) throw new Error("Web Bluetooth not supported");

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [NORDIC_UART_SERVICE] }],
      });

      return createBleSerialPort(device);
    },

    async getPorts() {
      // Web Bluetooth doesn't have an exact equivalent to getPorts()
      // You either return empty, or track previously connected devices
      return [];
    },
  };
}

function createBleSerialPort(device: BluetoothDevice): SerialPort {
  let readable: ReadableStream<Uint8Array> | null = null;
  let writable: WritableStream<Uint8Array> | null = null;
  let server: BluetoothRemoteGATTServer | null = null;

  return {
    get readable() {
      return readable;
    },
    get writable() {
      return writable;
    },
    getInfo() {
      return {};
    },

    async open() {
      server = await device.gatt!.connect();
      const service = await server.getPrimaryService(NORDIC_UART_SERVICE);
      const rxChar = await service.getCharacteristic(RX_CHARACTERISTIC);
      const txChar = await service.getCharacteristic(TX_CHARACTERISTIC);

      // Create stream for receiving BLE notifications
      await rxChar.startNotifications();
      readable = new ReadableStream<Uint8Array>({
        start(controller) {
          rxChar.addEventListener("characteristicvaluechanged", (e: any) => {
            const buffer = e.target.value.buffer;
            controller.enqueue(new Uint8Array(buffer));
          });
        },
      });

      // Create stream for writing to BLE characteristic
      writable = new WritableStream<Uint8Array>({
        async write(chunk) {
          // Note: BLE has MTU limits (e.g. 20 bytes), chunking may be needed here
          await txChar.writeValueWithoutResponse(chunk);
        },
      });
    },

    async close() {
      if (server) server.disconnect();
      readable = null;
      writable = null;
    },
  } as SerialPort;
}
```

### Usage

```ts
import { createBluetoothProvider } from "./ble-provider";
import { AbstractSerialDevice } from "webserial-core";

AbstractSerialDevice.setProvider(createBluetoothProvider());

// Now `connect()` will launch the Web Bluetooth picker!
const bleDevice = new MyBluetoothTracker();
await bleDevice.connect();
await bleDevice.send("GET_BATTERY");
```

## Development

```bash
# Install dependencies
bun install

# Start dev server (with test page)
bun run dev

# Build library
bun run build

# Lint
bun lint

# Format
bun format
```

## License

MIT © [danidoble](https://github.com/danidoble)
