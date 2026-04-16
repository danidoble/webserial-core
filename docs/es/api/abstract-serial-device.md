# AbstractSerialDevice\<T\>

`AbstractSerialDevice<T>` es el núcleo de la librería. Extiéndela para crear
un driver de dispositivo para cualquier dispositivo conectado por serial.

## Parámetro de tipo

| Parámetro | Descripción                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `T`       | El tipo de datos emitidos por los eventos `serial:data` (ej. `string`, `Uint8Array`, tu propio tipo) |

## Constructor

```ts
protected constructor(options: SerialDeviceOptions<T>)
```

Llamado desde tu subclase mediante `super(options)`.

Ve [`SerialDeviceOptions<T>`](/es/api/types#serialdeviceoptions) para todos los campos.

## Métodos estáticos

### `setProvider(provider)`

```ts
static setProvider(provider: SerialProvider): void
```

Inyecta un `SerialProvider` global que usarán todas las instancias de dispositivos.
Llámalo una vez antes de construir cualquier dispositivo.

```ts
AbstractSerialDevice.setProvider(new WebUsbProvider());
```

### Proveedor por instancia

También puedes establecer un proveedor para una **única instancia** pasando
`provider` en las opciones del constructor. Tiene precedencia sobre el
proveedor global y no afecta a otras instancias.

```ts
import {
  AbstractSerialDevice,
  delimiter,
  createBluetoothProvider,
  createWebSocketProvider,
} from "webserial-core";
import { WebUsbProvider } from "webserial-core";

// Una instancia usando Web Bluetooth
class BleDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      provider: createBluetoothProvider(),
    });
  }
  protected async handshake(): Promise<boolean> { return true; }
}

// Otra instancia usando WebUSB en la misma app
class UsbDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 115200,
      parser: delimiter("\n"),
      provider: new WebUsbProvider(),
    });
  }
  protected async handshake(): Promise<boolean> { return true; }
}

// Otra instancia tunelizada sobre WebSocket
class WsDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      provider: createWebSocketProvider("ws://localhost:8080"),
    });
  }
  protected async handshake(): Promise<boolean> { return true; }
}

// Las tres coexisten; no se toca ningún proveedor global
const ble = new BleDevice();
const usb = new UsbDevice();
const ws  = new WsDevice();
```

Orden de resolución del proveedor por instancia:

| Prioridad | Fuente |
| --------- | ------ |
| 1 (más alta) | `options.provider` pasado al constructor |
| 2 | `AbstractSerialDevice.setProvider(...)` estático global |
| 3 (más baja) | `navigator.serial` Web Serial API nativa |

## Métodos de instancia

### `connect()`

```ts
connect(): Promise<void>
```

Abre el selector de puertos (o selecciona automáticamente un puerto ya autorizado),
ejecuta el `handshake()` e inicia el bucle de lectura. Emite `serial:connecting` al
inicio y `serial:connected` al completar.

Lanza `SerialPortConflictError` si otra instancia ya tiene el puerto. Lanza
`SerialPermissionError` si el usuario deniega el acceso.

### `disconnect()`

```ts
disconnect(): Promise<void>
```

Cancela el bucle de lectura, vacía la cola de comandos, cierra el puerto y
emite `serial:disconnected`. Deshabilita la auto-reconexión para esta sesión.

### `isConnected()`

```ts
isConnected(): boolean
```

Regresa `true` si el puerto está actualmente abierto. `false` si está desconectado o en proceso de conexión.

### `isDisconnected()`

```ts
isDisconnected(): boolean
```

Regresa `true` si el puerto está actualmente cerrado. `false` si está conectado o en proceso de desconexión.

### `send(data)`

```ts
send(data: string | Uint8Array): Promise<void>
```

Codifica `data` (UTF-8 si es string) y encola la escritura. Devuelve cuando los
bytes han sido enviados al puerto. Emite `serial:sent` con los bytes sin procesar.

### `on(event, handler)` / `off(event, handler)`

```ts
on<K extends keyof SerialEventMap<T>>(event: K, handler: SerialEventMap<T>[K]): this
off<K extends keyof SerialEventMap<T>>(event: K, handler: SerialEventMap<T>[K]): this
```

Suscribirse o cancelar la suscripción a un evento tipado. Ver la [referencia de eventos](/es/api/events).

## Métodos abstractos

### `handshake()`

```ts
protected abstract handshake(): Promise<boolean>
```

Llamado después de que el puerto se abre, antes del primer evento `serial:data`.
Devuelve `true` para aceptar la conexión o `false` para rechazarla (lo que dispara
una desconexión). Úsalo para identificación del dispositivo o configuración inicial.

```ts
protected async handshake(): Promise<boolean> {
  await this.send("PING\n");
  return new Promise((resolve) => {
    const handler = (data: string) => {
      this.off("serial:data", handler);
      resolve(data.trim() === "PONG");
    };
    this.on("serial:data", handler);
  });
}
```

Devuelve `true` inmediatamente para saltar el handshake y aceptar cualquier puerto:

```ts
protected async handshake(): Promise<boolean> {
  return true;
}
```

## Propiedades protegidas

| Propiedad     | Tipo                 | Descripción                                              |
| ------------- | -------------------- | -------------------------------------------------------- |
| `isConnected` | `boolean`            | Si el puerto está actualmente abierto                    |
| `port`        | `SerialPort \| null` | El objeto de puerto subyacente, o `null` al desconectado |
