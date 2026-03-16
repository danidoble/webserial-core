# WebBluetoothProvider

`createBluetoothProvider()` returns a `SerialProvider` that uses the
[Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
over GATT to emulate a serial connection.

## Supported service

Implements the **Nordic UART Service (NUS)** over BLE:

| UUID                                   | Role                                                |
| -------------------------------------- | --------------------------------------------------- |
| `6e400001-b5a3-f393-e0a9-e50e24dcca9e` | Primary service                                     |
| `6e400002-b5a3-f393-e0a9-e50e24dcca9e` | TX characteristic (browser writes)                  |
| `6e400003-b5a3-f393-e0a9-e50e24dcca9e` | RX characteristic (browser reads via notifications) |

Compatible hardware: nRF52 series, ESP32 BLE UART, HC-08 / AT-09 BLE modules,
or any firmware advertising the NUS service.

## Import

```ts
import { createBluetoothProvider } from "webserial-core";
```

## Factory function

```ts
createBluetoothProvider(): SerialProvider
```

Returns a new `SerialProvider` instance. No options — the BLE MTU and
inter-chunk delay are fixed at safe defaults (20-byte MTU, 10 ms delay).

## Usage

```ts
import {
  AbstractSerialDevice,
  delimiter,
  createBluetoothProvider,
} from "webserial-core";

AbstractSerialDevice.setProvider(createBluetoothProvider());

class MyBleDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600, // Ignored over BLE, kept for interface compatibility
      parser: delimiter("\n"),
      autoReconnect: false, // BLE reconnect requires re-pairing; handle manually
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new MyBleDevice();
await device.connect(); // Opens Web Bluetooth device picker
```

## MTU and chunking

BLE has a default MTU of **20 bytes** for `writeValueWithoutResponse`. The
provider automatically splits writes into 20-byte chunks with a 10 ms inter-
chunk delay to avoid overflowing the BLE stack.

## Browser support

Requires Chrome 56+ on desktop (macOS, Windows, Linux with BlueZ), Chrome on
Android, or Edge. Not available in Firefox or Safari. Requires HTTPS or
`localhost`.

## Notes

- `baudRate` in `SerialDeviceOptions` is ignored over BLE. The physical link
  speed is determined by the BLE connection parameters.
- `autoReconnect: false` is recommended — BLE reconnection requires the user
  to re-pair the device through the browser picker.
