# Interactive Demos

Try **webserial-core** directly in your browser — no installation, no build
step required. The demos use the UMD bundle to run as static HTML pages.

> **Requirement:** The demos use browser-exclusive APIs (Web Serial, WebUSB,
> Web Bluetooth). You need **Chrome 89+** or **Edge 89+** for most demos.
> Safari and Firefox are not supported.

## Available demos

### ⚡ Web Serial

Connect using the **native Web Serial API** in Chrome/Edge.

- Send TXT or HEX data
- Real-time connection/disconnection events
- Configurable auto-reconnect

👉 **[Open Web Serial demo](/demos/web-serial.html)**

---

### 🔌 WebUSB

Connect USB serial devices on Android Chrome or Desktop using the
**WebUSB polyfill** (no Web Serial API required).

- Compatible with CP210x, CH340, Arduino (CDC-ACM)
- Useful for testing Android behavior from desktop

👉 **[Open WebUSB demo](/demos/web-usb.html)**

---

### 📶 Web Bluetooth (BLE UART)

Communicate with BLE UART devices using the
**Nordic UART Service (NUS)** over GATT.

- Compatible with ESP32 BLE, nRF52, HC-08, AT-09
- Auto-chunked writes at 20-byte BLE MTU

👉 **[Open Web Bluetooth demo](/demos/web-bluetooth.html)**

---

## Using in production

The demos use the UMD bundle (`webserial-core.umd.js`) via a `<script>` tag.
For real projects, import via ESM to take advantage of tree-shaking:

```ts
import { AbstractSerialDevice, delimiter } from "webserial-core";
```

## Development demo source

The full TypeScript development demos live in
[`demos/`](https://github.com/danidoble/webserial-core/tree/main/demos) in the
repository. They include auto-reconnect examples, HEX mode, and the WebSocket bridge.
