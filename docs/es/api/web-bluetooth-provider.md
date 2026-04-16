# WebBluetoothProvider

`createBluetoothProvider()` devuelve un `SerialProvider` que usa la
[API Web Bluetooth](https://developer.mozilla.org/es/docs/Web/API/Web_Bluetooth_API)
sobre GATT para emular una conexión serial.

## Servicio compatible

Implementa el **Nordic UART Service (NUS)** sobre BLE:

| UUID                                   | Rol                                                     |
| -------------------------------------- | ------------------------------------------------------- |
| `6e400001-b5a3-f393-e0a9-e50e24dcca9e` | Servicio primario                                       |
| `6e400002-b5a3-f393-e0a9-e50e24dcca9e` | Característica TX (el navegador escribe)                |
| `6e400003-b5a3-f393-e0a9-e50e24dcca9e` | Característica RX (el navegador lee vía notificaciones) |

Hardware compatible: serie nRF52, ESP32 BLE UART, módulos HC-08 / AT-09 BLE,
o cualquier firmware que anuncie el servicio NUS.

## Importación

```ts
import { createBluetoothProvider } from "webserial-core";
```

## Función de fábrica

```ts
createBluetoothProvider(): SerialProvider
```

Devuelve una nueva instancia de `SerialProvider`. Sin opciones — el MTU BLE y
el retardo entre chunks están fijados a valores seguros (MTU 20 bytes, 10 ms de retardo).

## Uso

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
      baudRate: 9600, // Ignorado sobre BLE, mantenido por compatibilidad de interfaz
      parser: delimiter("\n"),
      autoReconnect: false, // La reconexión BLE requiere re-emparejamiento; manejar manualmente
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new MyBleDevice();
await device.connect(); // Abre el selector de dispositivos Web Bluetooth
```

## Uso por instancia

Pasa `provider` directamente en las opciones del constructor para limitar el
proveedor BLE a una sola instancia. El proveedor global establecido mediante
`AbstractSerialDevice.setProvider()` no se modifica, por lo que otros
dispositivos en la misma app siguen usando sus propios proveedores.

```ts
import {
  AbstractSerialDevice,
  delimiter,
  createBluetoothProvider,
} from "webserial-core";

class MyBleDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      autoReconnect: false,
      provider: createBluetoothProvider(), // BLE solo para esta instancia
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new MyBleDevice();
await device.connect();
```

Esto es especialmente útil cuando una app gestiona múltiples tipos de
dispositivos simultáneamente — por ejemplo, un dispositivo BLE junto a uno
USB o WebSocket.

## MTU y fragmentación

BLE tiene un MTU predeterminado de **20 bytes** para `writeValueWithoutResponse`. El
proveedor divide automáticamente las escrituras en chunks de 20 bytes con un retardo de
10 ms entre chunks para evitar saturar el stack BLE.

## Soporte de navegadores

Requiere Chrome 56+ en escritorio (macOS, Windows, Linux con BlueZ), Chrome en Android,
o Edge. No disponible en Firefox ni Safari. Requiere HTTPS o `localhost`.

## Notas

- `baudRate` en `SerialDeviceOptions` es ignorado sobre BLE. La velocidad del enlace
  físico la determinan los parámetros de conexión BLE.
- Se recomienda `autoReconnect: false` — la reconexión BLE requiere que el usuario
  empareje el dispositivo nuevamente mediante el selector del navegador.
