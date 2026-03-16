# Types & Interfaces

All types are exported from the main `webserial-core` entry point.

## `SerialDeviceOptions<T>`

Passed to `super()` in your `AbstractSerialDevice` subclass.

```ts
interface SerialDeviceOptions<T> {
  /** Serial baud rate (e.g. 9600, 115200). */
  baudRate: number;

  /** Data bits per byte. Default: 8 */
  dataBits?: 7 | 8;

  /** Stop bits. Default: 1 */
  stopBits?: 1 | 2;

  /** Parity mode. Default: "none" */
  parity?: "none" | "even" | "odd";

  /** Hardware flow control. Default: "none" */
  flowControl?: "none" | "hardware";

  /** Internal read buffer size in bytes. Default: 255 */
  bufferSize?: number;

  /** Parser that transforms raw bytes into values of type T. */
  parser: SerialParser<T>;

  /** Timeout (ms) before a queued command is considered failed. Default: 0 (disabled) */
  commandTimeout?: number;

  /** Automatically reconnect on unexpected disconnect. Default: false */
  autoReconnect?: boolean;

  /** Delay (ms) between auto-reconnect attempts. Default: 1000 */
  autoReconnectInterval?: number;

  /** Timeout (ms) allowed for handshake() to complete. Default: 5000 */
  handshakeTimeout?: number;

  /** USB vendor/product ID filters shown in the port picker. Default: [] */
  filters?: SerialPortFilter[];
}
```

---

## `SerialProvider`

```ts
interface SerialProvider {
  /**
   * Opens the browser port picker (or equivalent) and returns the selected
   * SerialPort-compatible object.
   */
  requestPort(options?: { filters?: SerialPortFilter[] }): Promise<SerialPort>;

  /** Returns all previously authorized (already-paired) ports. */
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

Options for `WebUsbProvider`. Controls which USB interface classes are used
for control and bulk transfer.

```ts
interface SerialPolyfillOptions {
  /** USB interface class used for control messages. Default: 10 (CDC) */
  usbControlInterfaceClass?: number;

  /** USB interface class used for bulk data transfer. Default: 10 (CDC) */
  usbTransferInterfaceClass?: number;
}
```

---

## `CommandQueueOptions`

Options accepted by the `CommandQueue` constructor.

```ts
interface CommandQueueOptions {
  /** Timeout (ms) per command. 0 = no timeout. Default: 0 */
  timeout?: number;
}
```

---

## Error classes

| Class                     | When thrown                                    |
| ------------------------- | ---------------------------------------------- |
| `SerialPortConflictError` | Two devices attempt to open the same port      |
| `SerialPermissionError`   | User denies port access                        |
| `SerialTimeoutError`      | `commandTimeout` exceeded for a queued command |
| `SerialReadError`         | Error reading from the port's `ReadableStream` |
| `SerialWriteError`        | Error writing to the port's `WritableStream`   |

All extend the built-in `Error` class and include `name` and `message`.
