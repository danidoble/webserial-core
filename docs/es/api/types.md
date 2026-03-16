# Tipos e Interfaces

Todos los tipos se exportan desde el punto de entrada principal de `webserial-core`.

## `SerialDeviceOptions<T>`

Pasado a `super()` en tu subclase de `AbstractSerialDevice`.

```ts
interface SerialDeviceOptions<T> {
  /** Velocidad en baudios (ej. 9600, 115200). */
  baudRate: number;

  /** Bits de datos por byte. Por defecto: 8 */
  dataBits?: 7 | 8;

  /** Bits de parada. Por defecto: 1 */
  stopBits?: 1 | 2;

  /** Modo de paridad. Por defecto: "none" */
  parity?: "none" | "even" | "odd";

  /** Control de flujo por hardware. Por defecto: "none" */
  flowControl?: "none" | "hardware";

  /** Tamaño del buffer de lectura interno en bytes. Por defecto: 255 */
  bufferSize?: number;

  /** Parser que transforma bytes sin procesar en valores de tipo T. */
  parser: SerialParser<T>;

  /** Timeout (ms) antes de que un comando en cola sea considerado fallido. Por defecto: 0 (deshabilitado) */
  commandTimeout?: number;

  /** Reconectar automáticamente en desconexión inesperada. Por defecto: false */
  autoReconnect?: boolean;

  /** Retardo (ms) entre intentos de auto-reconexión. Por defecto: 1000 */
  autoReconnectInterval?: number;

  /** Timeout (ms) permitido para que handshake() complete. Por defecto: 5000 */
  handshakeTimeout?: number;

  /** Filtros de vendor/product ID USB mostrados en el selector de puerto. Por defecto: [] */
  filters?: SerialPortFilter[];
}
```

---

## `SerialProvider`

```ts
interface SerialProvider {
  /**
   * Abre el selector de puerto del navegador (o equivalente) y devuelve el
   * objeto SerialPort compatible seleccionado.
   */
  requestPort(options?: { filters?: SerialPortFilter[] }): Promise<SerialPort>;

  /** Devuelve todos los puertos previamente autorizados (ya emparejados). */
  getPorts(): Promise<SerialPort[]>;
}
```

---

## `SerialParser<T>`

```ts
interface SerialParser<T> {
  transform(chunk: Uint8Array, push: (value: T) => void): void;
  flush?(push: (value: T) => void): void;
}
```

---

## `SerialEventMap<T>`

```ts
interface SerialEventMap<T> {
  "serial:connecting": () => void;
  "serial:connected": () => void;
  "serial:disconnected": () => void;
  "serial:data": (value: T) => void;
  "serial:sent": (data: Uint8Array) => void;
  "serial:error": (error: Error) => void;
  "serial:need-permission": () => void;
  "serial:timeout": (command: Uint8Array) => void;
  "serial:queue-empty": () => void;
  "serial:reconnecting": () => void;
}
```

---

## `SerialPortFilter`

```ts
interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}
```

---

## `SerialPolyfillOptions`

Opciones para `WebUsbProvider`. Controla qué clases de interfaz USB se usan
para control y transferencia masiva.

```ts
interface SerialPolyfillOptions {
  /** Clase de interfaz USB para mensajes de control. Por defecto: 10 (CDC) */
  usbControlInterfaceClass?: number;

  /** Clase de interfaz USB para transferencia masiva. Por defecto: 10 (CDC) */
  usbTransferInterfaceClass?: number;
}
```

---

## `CommandQueueOptions`

Opciones aceptadas por el constructor de `CommandQueue`.

```ts
interface CommandQueueOptions {
  /** Timeout (ms) por comando. 0 = sin timeout. Por defecto: 0 */
  timeout?: number;
}
```

---

## Clases de error

| Clase                     | Cuándo se lanza                                         |
| ------------------------- | ------------------------------------------------------- |
| `SerialPortConflictError` | Dos dispositivos intentan abrir el mismo puerto         |
| `SerialPermissionError`   | El usuario deniega el acceso al puerto                  |
| `SerialTimeoutError`      | Se superó `commandTimeout` para un comando en cola      |
| `SerialReadError`         | Error al leer del `ReadableStream` del puerto           |
| `SerialWriteError`        | Error al escribir en el `WritableStream` del puerto     |

Todas extienden la clase `Error` integrada e incluyen `name` y `message`.
