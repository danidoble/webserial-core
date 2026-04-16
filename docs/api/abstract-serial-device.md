# AbstractSerialDevice\<T\>

`AbstractSerialDevice<T>` is the heart of the library. Extend it to create
a device driver for any serial-connected device.

## Type parameter

| Parameter | Description                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------- |
| `T`       | The type of data emitted by `serial:data` events (e.g. `string`, `Uint8Array`, your own message type) |

## Constructor

```ts
protected constructor(options: SerialDeviceOptions<T>)
```

Called from your subclass via `super(options)`.

See [`SerialDeviceOptions<T>`](/api/types#serialdeviceoptions) for all fields.

## Static methods

### `setProvider(provider)`

```ts
static setProvider(provider: SerialProvider): void
```

Injects a global `SerialProvider` that all device instances will use.
Call this once before constructing any device.

```ts
AbstractSerialDevice.setProvider(new WebUsbProvider());
```

## Instance methods

### `connect()`

```ts
connect(): Promise<void>
```

Opens the port picker (or auto-selects a previously authorized port), runs the
`handshake()`, and starts the read loop. Emits `serial:connecting` at the
start and `serial:connected` on success.

Throws `SerialPortConflictError` if another device instance already holds the
port. Throws `SerialPermissionError` if the user denies access.

### `disconnect()`

```ts
disconnect(): Promise<void>
```

Cancels the read loop, drains the command queue, closes the port, and emits
`serial:disconnected`. Disables auto-reconnect for this session.

### `isConnected()`

```ts
isConnected(): boolean
```

Returns `true` if the port is currently open. `false` if disconnected or in the process of connecting.

### `isDisconnected()`

```ts
isDisconnected(): boolean
```

Returns `true` if the port is currently closed. `false` if connected or in the process of disconnecting.

### `send(data)`

```ts
send(data: string | Uint8Array): Promise<void>
```

Encodes `data` (UTF-8 if string) and enqueues the write. Returns when the
bytes have been flushed to the port. Emits `serial:sent` with the raw bytes.

### `on(event, handler)` / `off(event, handler)`

```ts
on<K extends keyof SerialEventMap<T>>(event: K, handler: SerialEventMap<T>[K]): this
off<K extends keyof SerialEventMap<T>>(event: K, handler: SerialEventMap<T>[K]): this
```

Subscribe to or unsubscribe from a typed event. See the [Events reference](/api/events).

## Abstract methods

### `handshake()`

```ts
protected abstract handshake(): Promise<boolean>
```

Called after the port opens, before the first `serial:data` event. Return
`true` to accept the connection or `false` to reject it (which triggers a
disconnect). Use this for device identification or initial configuration.

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

Return `true` immediately to skip the handshake and accept any port:

```ts
protected async handshake(): Promise<boolean> {
  return true;
}
```

## Protected properties

| Property      | Type                 | Description                                             |
| ------------- | -------------------- | ------------------------------------------------------- |
| `isConnected` | `boolean`            | Whether the port is currently open                      |
| `port`        | `SerialPort \| null` | The underlying port object, or `null` when disconnected |
