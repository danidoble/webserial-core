# Ejemplo de WebUSB

Usa **WebUsbProvider** como polyfill para la Web Serial API nativa.
Ideal para Android Chrome donde Web Serial no está disponible.

## Configuración

```ts
import {
  AbstractSerialDevice,
  delimiter,
  WebUsbProvider,
} from "webserial-core";

// Inyectar el proveedor WebUSB una vez, antes de construir cualquier dispositivo.
// usbControlInterfaceClass / usbTransferInterfaceClass = 255 cubre
// CP210x, CH340 y otros puentes USB-UART de clase vendor.
AbstractSerialDevice.setProvider(
  new WebUsbProvider({
    usbControlInterfaceClass: 255,
    usbTransferInterfaceClass: 255,
  }),
);
```

## Ejemplo completo

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

// Filtrar por CP2102 (ESP32 / NodeMCU)
const device = new UsbDevice([{ usbVendorId: 0x10c4, usbProductId: 0xea60 }]);

device.on("serial:connected", () => console.log("Conectado via WebUSB!"));
device.on("serial:data", (line) => console.log("←", line));
device.on("serial:error", (err) => console.error(err.message));

await device.connect();
await device.send("LED_ON\n");
```

## Vendor IDs USB comunes

| Dispositivo               | Vendor ID | Product ID |
| ------------------------- | --------- | ---------- |
| ESP32 / NodeMCU (CP2102)  | `0x10c4`  | `0xea60`   |
| ESP32 / NodeMCU (CH340)   | `0x1a86`  | `0x7523`   |
| Arduino Uno               | `0x2341`  | `0x0043`   |
| Arduino Nano              | `0x0403`  | `0x6001`   |

## Demo interactivo

Prueba este ejemplo directamente en tu navegador:

👉 **[Abrir demo WebUSB](/demos/web-usb.html)**

O ejecuta el demo localmente:

```bash
npm run dev
# Luego abre http://localhost:5173/demos/web-usb/
```

Código fuente: [`demos/web-usb/`](https://github.com/danidoble/webserial-core/tree/main/demos/web-usb)
