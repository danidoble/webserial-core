# Web Bluetooth example

Uses **WebBluetoothProvider** to communicate with BLE UART modules via the
Nordic UART Service (NUS) over GATT.

## Compatible hardware

Any device advertising the NUS service UUID `6e400001-b5a3-f393-e0a9-e50e24dcca9e`:

- nRF52840 / nRF52832 running NUS firmware
- ESP32 with Arduino BLE UART sketch
- HC-08, AT-09, HM-10 BLE-to-UART modules

## Setup

```ts
import { AbstractSerialDevice, createBluetoothProvider } from "webserial-core";

AbstractSerialDevice.setProvider(createBluetoothProvider());
```

## Full example

```ts
import {
  AbstractSerialDevice,
  delimiter,
  createBluetoothProvider,
} from "webserial-core";

AbstractSerialDevice.setProvider(createBluetoothProvider());

class BleDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600, // Ignored over BLE — kept for interface compatibility
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
      bufferSize: 255,
      commandTimeout: 3000,
      parser: delimiter("\n"),
      autoReconnect: false, // BLE reconnect requires user interaction
      handshakeTimeout: 2000,
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new BleDevice();

device.on("serial:connecting", () => console.log("Opening BLE picker..."));
device.on("serial:connected", () => console.log("Connected via BLE!"));
device.on("serial:disconnected", () => console.log("BLE disconnected."));
device.on("serial:data", (line) => console.log("←", line));
device.on("serial:error", (err) => console.error(err.message));

// Opens the Web Bluetooth device picker
await device.connect();

// Sends are automatically chunked at 20-byte BLE MTU
await device.send("HELLO\n");
```

## Chunking note

The BLE MTU for `writeValueWithoutResponse` is typically **20 bytes**. The
provider splits every `send()` call into 20-byte chunks automatically, with a
10 ms delay between chunks to avoid overflowing the BLE stack.

For messages shorter than 20 bytes, there is no split and no delay.

## Browser support

| Browser            | Platform                      | Support |
| ------------------ | ----------------------------- | ------- |
| Chrome 56+         | macOS, Windows, Linux (BlueZ) | ✅      |
| Chrome for Android | Android 6.0+                  | ✅      |
| Edge 79+           | Windows                       | ✅      |
| Firefox            | All                           | ❌      |
| Safari             | All                           | ❌      |

## Live demo

👉 **[Open interactive demo](/demos/web-bluetooth.html)** — runs directly in your browser

Or run locally:

```bash
npm run dev
# Then open http://localhost:5173/demos/web-bluetooth/
```

Source: [`demos/web-bluetooth/`](https://github.com/danidoble/webserial-core/tree/main/demos/web-bluetooth)
