# ws-serial-bridge

A **WebSocket ↔ SerialPort** bridge for `AbstractSerialDevice` and the
`webserial-core` WebSocket provider (v2).

```
Browser (WebSocket provider)
        │  ws://127.0.0.1:8080/?token=TOKEN
        ▼
  Node.js server.js          ← this package
        │  serialport
        ▼
   ESP32 / Arduino
```

## Installation

```bash
cd ws-serial-bridge
npm install
```

## Usage

```bash
# Start the bridge
npm start

# Watch mode for development
npm run dev
```

By default, the server listens on `127.0.0.1:8080`. It accepts local development
origins and requires the token printed at startup. Pass
`ws://127.0.0.1:8080/?token=TOKEN` to `createWebSocketProvider()`.
Use `BRIDGE_TOKEN`, `BRIDGE_HOST`, `BRIDGE_ORIGINS`, and `BRIDGE_PORTS` to
configure the token, bind address, allowed origins, and allowed serial ports.

## Message protocol

All messages are JSON strings.

### Browser → Node

| `type`       | Payload                                          | Description              |
| ------------ | ------------------------------------------------ | ------------------------ |
| `list-ports` | `{ filters: SerialPortFilter[] }`                | Lists available ports    |
| `open`       | `{ path, baudRate, dataBits, stopBits, parity }` | Opens a serial port      |
| `write`      | `{ bytes: number[] }`                            | Writes bytes to the port |
| `close`      | —                                                | Closes the port          |

### Node → Browser

| `type`      | Payload               | Description                           |
| ----------- | --------------------- | ------------------------------------- |
| `port-list` | `PortInfo[]`          | Port list in response to `list-ports` |
| `opened`    | `null`                | Port opened                           |
| `data`      | `{ bytes: number[] }` | Data received from the device         |
| `closed`    | `null`                | Port closed                           |
| `error`     | `{ message: string }` | Port error                            |

## ESP32 firmware

Flash `firmware.ino` with Arduino IDE or PlatformIO.

### Available commands

| Command        | Response                                  |
| -------------- | ----------------------------------------- |
| `CONNECT\n`    | `connected\n` (required by the handshake) |
| `CREDITS\n`    | `created by danidoble\n`                  |
| `LED_ON\n`     | `LED:ON\n`                                |
| `HI\n`         | `hello there\n`                           |
| `OTHERTHING\n` | `ara ara, what are you doing?\n`          |

### Set BAUD_RATE

Change the constant in `firmware.ino` and pass the same value to `ArduinoDeviceWS`:

```ts
const arduino = new ArduinoDeviceWS(9600);
```

## Port filters

You can filter by vendor ID and product ID in the provider:

```ts
const wsProvider = createWebSocketProvider("ws://127.0.0.1:8080/?token=TOKEN");
// Pass filters to requestPort() when calling .connect().
```

ESP32 IDs vary by USB-to-serial chip:

- **CP2102**: `{ usbVendorId: 0x10C4, usbProductId: 0xEA60 }`
- **CH340**: `{ usbVendorId: 0x1A86, usbProductId: 0x7523 }`
- **FTDI**: `{ usbVendorId: 0x0403, usbProductId: 0x6001 }`
