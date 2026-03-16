# webserial-core

[![npm version](https://badge.fury.io/js/webserial-core.svg)](https://www.npmjs.com/package/webserial-core)
[![npm downloads](https://img.shields.io/npm/dm/webserial-core)](https://www.npmjs.com/package/webserial-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)
![bundle size](https://img.shields.io/bundlephobia/minzip/webserial-core)
![GitHub release](https://img.shields.io/github/v/release/danidoble/webserial-core)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/danidoble/webserial-core)


A strongly-typed, event-driven, abstract TypeScript library for serial
communication on the web. Supports **Web Serial**, **WebUSB**, **Web
Bluetooth**, and **WebSocket** transports through a unified API.

---

> **⚠️ Breaking Changes — v2**
>
> Version 2 is a complete rewrite. Tthe public API is completally changed,
> please if you has an implementation of this library is better read docs as like a
> new integration See the [Migration Guide](docs/guide/migration-v1-v2.md) before upgrading.

---

## Features

- **Provider-agnostic** — swap between Web Serial, WebUSB, Web Bluetooth, or
  WebSocket transport by injecting a single provider.
- **Strictly typed** — full TypeScript generics, no implicit `any`, compatible
  with `strict: true`.
- **Typed events** — `connecting`, `connected`, `disconnected`, `data`,
  `sent`, `error`, `timeout`, `reconnecting`, and more — all fully typed.
- **Built-in parsers** — `delimiter`, `fixedLength`, `raw`. Implement
  `SerialParser<T>` for any custom binary or text protocol.
- **Command queue** — FIFO write queue with optional per-command timeouts.
- **Auto-reconnect** — configurable reconnect loop with back-off.
- **WebUSB polyfill** — full WebUSB serial polyfill (CDC ACM, CP210x, CH340).
- **BLE NUS adapter** — Nordic UART Service over Web Bluetooth GATT.
- **WebSocket bridge** — relay serial I/O through a Node.js bridge server.

## Installation

```bash
npm install webserial-core
```

## Quick start

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
    return true; // return false to reject the port
  }
}

const device = new MyDevice();

device.on("serial:connected", () => console.log("Connected!"));
device.on("serial:data", (line) => console.log("←", line));
device.on("serial:disconnected", () => console.log("Disconnected."));
device.on("serial:error", (err) => console.error(err.message));

await device.connect(); // opens the browser port picker
await device.send("PING\n"); // enqueues a write
await device.disconnect();
```

## Transport adapters

All four adapters expose the same `SerialProvider` interface. Inject your
chosen adapter once before constructing any device:

```ts
import { AbstractSerialDevice, WebUsbProvider } from "webserial-core";
import { createBluetoothProvider } from "webserial-core";
import { createWebSocketProvider } from "webserial-core";

// WebUSB polyfill (Android Chrome, or desktop for testing)
AbstractSerialDevice.setProvider(new WebUsbProvider());

// Web Bluetooth (Nordic UART Service over BLE GATT)
AbstractSerialDevice.setProvider(createBluetoothProvider());

// WebSocket bridge (requires Node.js server — see demos/websocket/)
AbstractSerialDevice.setProvider(
  createWebSocketProvider("ws://localhost:8080"),
);
```

## Parsers

```ts
import { delimiter, fixedLength, raw } from "webserial-core";

// Newline-delimited strings (Arduino Serial.println)
parser: delimiter("\n");

// 16-byte binary packets
parser: fixedLength(16);

// Raw Uint8Array chunks
parser: raw();
```

## Events

| Event                    | Payload      | Description                                   |
| ------------------------ | ------------ | --------------------------------------------- |
| `serial:connecting`      | —            | `connect()` called, port picker about to open |
| `serial:connected`       | —            | Port open, handshake passed                   |
| `serial:disconnected`    | —            | Port closed                                   |
| `serial:data`            | `T`          | Parser emitted a complete message             |
| `serial:sent`            | `Uint8Array` | Bytes written to the port                     |
| `serial:error`           | `Error`      | Unrecoverable error                           |
| `serial:need-permission` | —            | User denied access                            |
| `serial:timeout`         | `Uint8Array` | Command timed out                             |
| `serial:queue-empty`     | —            | Write queue is now idle                       |
| `serial:reconnecting`    | —            | Auto-reconnect attempt starting               |

## Project structure

```
src/
  core/           AbstractSerialDevice, SerialEventEmitter, SerialRegistry
  adapters/
    web-usb/      WebUsbProvider (WebUSB polyfill)
    web-bluetooth/ createBluetoothProvider (BLE NUS)
    websocket/    createWebSocketProvider (Node.js bridge)
  parsers/        delimiter, fixedLength, raw
  queue/          CommandQueue
  errors/         SerialPortConflictError, SerialPermissionError, …
  types/          SerialDeviceOptions, SerialProvider, SerialParser, …
demos/
  web-serial/     Native Web Serial demo
  web-usb/        WebUSB polyfill demo
  web-bluetooth/  Web Bluetooth BLE demo
  websocket/      WebSocket bridge demo + Node.js server
docs/             VitePress documentation site
```

## Building

```bash
npm run build
```

Output in `dist/`:

| File                     | Format     | Use case                  |
| ------------------------ | ---------- | ------------------------- |
| `webserial-core.mjs`     | ESM        | Bundlers, modern browsers |
| `webserial-core.cjs`     | CJS        | Node.js, legacy bundlers  |
| `webserial-core.umd.cjs` | UMD        | `<script>` tag, CDN       |
| `index.d.ts`             | TypeScript | Type declarations         |

## Documentation

```bash
npm run docs:dev   # live VitePress server
npm run docs:build # static build → docs/.vitepress/dist
```

## Browser compatibility

| Feature       | Browser requirement  |
| ------------- | -------------------- |
| Web Serial    | Chrome 89+, Edge 89+ |
| WebUSB        | Chrome 61+, Edge 79+ |
| Web Bluetooth | Chrome 56+, Edge 79+ |
| WebSocket     | All modern browsers  |

All browser APIs require a **secure context** (HTTPS or `localhost`).

## License

MIT © [danidoble](https://github.com/danidoble/webserial-core)
