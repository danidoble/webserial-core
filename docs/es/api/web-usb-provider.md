# WebUsbProvider

`WebUsbProvider` implementa `SerialProvider` usando la
[API WebUSB](https://developer.mozilla.org/es/docs/Web/API/WebUSB_API)
como polyfill para la Web Serial API nativa.

## Cuándo usarlo

- **Android Chrome** — Web Serial no está disponible; WebUSB es la única forma de
  comunicarse con adaptadores USB-serial.
- **Pruebas en escritorio** — Forzar la ruta de código WebUSB para verificar el
  comportamiento antes de desplegar en Android.
- **Dispositivos USB personalizados** — Dispositivos no expuestos vía Web Serial (ej.
  USB de clase vendor personalizada).

## Protocolos soportados

| Protocolo       | Clase USB       | Notas                              |
| --------------- | --------------- | ---------------------------------- |
| CDC ACM         | Clase 0x02      | Arduino estándar, ST-LINK          |
| CP210x / CH340  | Vendor específico | Puentes USB-UART comunes          |
| Bulk genérico   | Cualquier clase | Dispositivos de transferencia bulk |

## Importación

```ts
import { WebUsbProvider } from "webserial-core";
```

## Constructor

```ts
new WebUsbProvider(options?: SerialPolyfillOptions)
```

| Opción                      | Tipo     | Por defecto | Descripción                                    |
| --------------------------- | -------- | ----------- | ---------------------------------------------- |
| `usbControlInterfaceClass`  | `number` | `10`        | Clase de interfaz USB para transferencias de control |
| `usbTransferInterfaceClass` | `number` | `10`        | Clase de interfaz USB para transferencias bulk |

Para dispositivos con interfaces de clase vendor (CP210x, CH340):

```ts
new WebUsbProvider({
  usbControlInterfaceClass: 255,
  usbTransferInterfaceClass: 255,
});
```

## Uso

```ts
import { AbstractSerialDevice, delimiter, WebUsbProvider } from "webserial-core";

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
await device.connect(); // Abre el selector de dispositivos WebUSB
```

## Soporte de navegadores

Requiere un navegador basado en Chromium con WebUSB habilitado. No disponible en
Firefox ni Safari. Requiere HTTPS o `localhost`.
