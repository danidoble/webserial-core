# WebUsbProvider

`WebUsbProvider` implements `SerialProvider` using the
[WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
as a polyfill for the native Web Serial API.

## When to use

- **Android Chrome** — Web Serial is not available; WebUSB is the only way to
  talk to USB serial adapters.
- **Desktop testing** — Force the WebUSB code path to verify behaviour before
  deploying to Android.
- **Custom USB devices** — Devices not exposed via Web Serial (e.g. custom
  vendor-class USB).

## Supported protocols

| Protocol       | USB class       | Notes                         |
| -------------- | --------------- | ----------------------------- |
| CDC ACM        | Class 0x02      | Standard Arduino, ST-LINK     |
| CP210x / CH340 | Vendor-specific | Common USB-UART bridges       |
| Raw bulk       | Any class       | Generic bulk-transfer devices |

## Import

```ts
import { WebUsbProvider } from "webserial-core";
```

## Constructor

```ts
new WebUsbProvider(options?: SerialPolyfillOptions)
```

| Option                      | Type     | Default | Description                               |
| --------------------------- | -------- | ------- | ----------------------------------------- |
| `usbControlInterfaceClass`  | `number` | `10`    | USB interface class for control transfers |
| `usbTransferInterfaceClass` | `number` | `10`    | USB interface class for bulk transfers    |

For devices using vendor-class interfaces (CP210x, CH340):

```ts
new WebUsbProvider({
  usbControlInterfaceClass: 255,
  usbTransferInterfaceClass: 255,
});
```

## Usage

```ts
import { AbstractSerialDevice, delimiter } from "webserial-core";
import { WebUsbProvider } from "webserial-core";

AbstractSerialDevice.setProvider(
  new WebUsbProvider({
    usbControlInterfaceClass: 255,
    usbTransferInterfaceClass: 255,
  }),
);

class MyDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      filters: [{ usbVendorId: 0x10c4, usbProductId: 0xea60 }], // CP2102
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new MyDevice();
await device.connect(); // Opens WebUSB device picker
```

## Per-instance usage

Pass `provider` (and optionally `polyfillOptions`) in the constructor options
to bind `WebUsbProvider` to a single device instance without touching the
global provider.

```ts
import { AbstractSerialDevice, delimiter, WebUsbProvider } from "webserial-core";

class MyUsbDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      filters: [{ usbVendorId: 0x10c4, usbProductId: 0xea60 }],
      provider: new WebUsbProvider({
        usbControlInterfaceClass: 255,
        usbTransferInterfaceClass: 255,
      }),
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new MyUsbDevice();
await device.connect();
```

Alternatively, pass `polyfillOptions` separately and let the library forward
them to whichever provider resolves for that instance:

```ts
class MyUsbDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      provider: new WebUsbProvider(),
      polyfillOptions: { usbControlInterfaceClass: 255 },
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}
```

## Browser support

Requires a Chromium-based browser with WebUSB enabled. Not available in Firefox
or Safari. Requires HTTPS or `localhost`.
