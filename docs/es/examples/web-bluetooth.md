# Ejemplo de Web Bluetooth

Usa **WebBluetoothProvider** para comunicarse con módulos BLE UART a través del
Nordic UART Service (NUS) sobre GATT.

## Hardware compatible

Cualquier dispositivo que anuncie el UUID del servicio NUS `6e400001-b5a3-f393-e0a9-e50e24dcca9e`:

- nRF52840 / nRF52832 con firmware NUS
- ESP32 con sketch Arduino BLE UART
- Módulos BLE-to-UART HC-08, AT-09, HM-10

## Configuración

```ts
import { AbstractSerialDevice, createBluetoothProvider } from "webserial-core";

AbstractSerialDevice.setProvider(createBluetoothProvider());
```

## Ejemplo completo

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
      baudRate: 9600, // Ignorado sobre BLE — mantenido por compatibilidad de interfaz
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
      bufferSize: 255,
      commandTimeout: 3000,
      parser: delimiter("\n"),
      autoReconnect: false, // La reconexión BLE requiere interacción del usuario
      handshakeTimeout: 2000,
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new BleDevice();

device.on("serial:connecting", () => console.log("Abriendo selector BLE..."));
device.on("serial:connected", () => console.log("Conectado via BLE!"));
device.on("serial:disconnected", () => console.log("BLE desconectado."));
device.on("serial:data", (line) => console.log("←", line));
device.on("serial:error", (err) => console.error(err.message));

// Abre el selector de dispositivos Web Bluetooth
await device.connect();

// Los envíos se fragmentan automáticamente al MTU BLE de 20 bytes
await device.send("HELLO\n");
```

## Nota sobre fragmentación

El MTU BLE para `writeValueWithoutResponse` es típicamente **20 bytes**. El proveedor
divide automáticamente cada llamada a `send()` en chunks de 20 bytes, con un retardo de
10 ms entre chunks para evitar saturar el stack BLE.

Para mensajes de menos de 20 bytes, no hay división ni retardo.

## Soporte de navegadores

| Navegador          | Plataforma                    | Soporte |
| ------------------ | ----------------------------- | ------- |
| Chrome 56+         | macOS, Windows, Linux (BlueZ) | ✅      |
| Chrome for Android | Android 6.0+                  | ✅      |
| Edge 79+           | Windows                       | ✅      |
| Firefox            | Todos                         | ❌      |
| Safari             | Todos                         | ❌      |

## Demo interactivo

Prueba este ejemplo directamente en tu navegador:

👉 **[Abrir demo Web Bluetooth](/demos/web-bluetooth.html)**

O ejecuta el demo localmente:

```bash
npm run dev
# Luego abre http://localhost:5173/demos/web-bluetooth/
```

Código fuente: [`demos/web-bluetooth/`](https://github.com/danidoble/webserial-core/tree/main/demos/web-bluetooth)
