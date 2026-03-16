# WebUSB example

Uses **WebUsbProvider** as a polyfill for the native Web Serial API.
Ideal for Android Chrome where Web Serial is unavailable.

## Setup

```ts
import {
  AbstractSerialDevice,
  delimiter,
  WebUsbProvider,
} from "webserial-core";

// Inject the WebUSB provider once, before constructing any device.
// usbControlInterfaceClass / usbTransferInterfaceClass = 255 covers
// CP210x, CH340, and other vendor-class USB-UART bridges.
AbstractSerialDevice.setProvider(
  new WebUsbProvider({
    usbControlInterfaceClass: 255,
    usbTransferInterfaceClass: 255,
  }),
);
```

## Full example

```ts
import {
  AbstractSerialDevice,
  delimiter,
  WebUsbProvider,
} from "webserial-core";
import type { SerialPortFilter } from "webserial-core";

AbstractSerialDevice.setProvider(
  new WebUsbProvider({
    usbControlInterfaceClass: 255,
    usbTransferInterfaceClass: 255,
  }),
);

class UsbDevice extends AbstractSerialDevice<string> {
  constructor(filters?: SerialPortFilter[]) {
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
      filters: filters ?? [],
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

// Filter to CP2102 (ESP32 / NodeMCU)
const device = new UsbDevice([{ usbVendorId: 0x10c4, usbProductId: 0xea60 }]);

device.on("serial:connected", () => console.log("Connected via WebUSB!"));
device.on("serial:data", (line) => console.log("←", line));
device.on("serial:error", (err) => console.error(err.message));

await device.connect();
await device.send("LED_ON\n");
```

## Common USB vendor IDs

| Device                   | Vendor ID | Product ID |
| ------------------------ | --------- | ---------- |
| ESP32 / NodeMCU (CP2102) | `0x10c4`  | `0xea60`   |
| ESP32 / NodeMCU (CH340)  | `0x1a86`  | `0x7523`   |
| Arduino Uno              | `0x2341`  | `0x0043`   |
| Arduino Nano             | `0x0403`  | `0x6001`   |

## Live demo

👉 **[Open interactive demo](/demos/web-usb.html)** — runs directly in your browser

Or run locally:

```bash
npm run dev
# Then open http://localhost:5173/demos/web-usb/
```

Source: [`demos/web-usb/`](https://github.com/danidoble/webserial-core/tree/main/demos/web-usb)
