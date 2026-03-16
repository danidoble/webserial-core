# Architecture

## Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Your device class                     │
│              (extends AbstractSerialDevice<T>)           │
└───────────────────────┬──────────────────────────────────┘
                        │ inherits
                        ▼
┌──────────────────────────────────────────────────────────┐
│              AbstractSerialDevice<T>                     │
│  ┌─────────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  SerialRegistry │  │ CmdQueue │  │ SerialEventEmit│  │
│  │  (port locks)   │  │ (FIFO)   │  │  ter<EventMap> │  │
│  └─────────────────┘  └──────────┘  └────────────────┘  │
│                                                          │
│  connect() / disconnect() / send() / handshake()         │
└───────────────────────┬──────────────────────────────────┘
                        │ delegates to
                        ▼
┌──────────────────────────────────────────────────────────┐
│                   SerialProvider                         │
│  (requestPort, getPorts — returns SerialPort objects)    │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────┐ ┌──────────────────┐ ┌───────────┐  │
│  │ Navigator      │ │  WebUsbProvider  │ │ WebBT/WS  │  │
│  │ (native Web    │ │  (USB polyfill)  │ │ providers │  │
│  │  Serial API)   │ │                  │ │           │  │
│  └────────────────┘ └──────────────────┘ └───────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Core components

### `AbstractSerialDevice<T>`

The base class your device inherits from. It manages the full connection
lifecycle:

1. **`connect()`** — calls `provider.requestPort()`, opens the port, runs
   `handshake()`, then starts the read loop.
2. **Read loop** — continuously reads `Uint8Array` chunks from the port's
   `ReadableStream` and feeds them through the configured `SerialParser<T>`.
   Every time the parser emits a value, a `serial:data` event fires.
3. **`send(data)`** — encodes strings/bytes, enqueues the write in
   `CommandQueue`, and flushes to the port's `WritableStream`.
4. **`disconnect()`** — cancels the read loop, drains the queue, closes the
   port, and fires `serial:disconnected`.
5. **Auto-reconnect** — if `autoReconnect: true` and the connection drops,
   the device waits `autoReconnectInterval` ms and calls `connect()` again.

### `SerialProvider`

```ts
interface SerialProvider {
  requestPort(options?: { filters?: SerialPortFilter[] }): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}
```

The default provider uses `navigator.serial` (native Web Serial API). Inject
a custom provider for WebUSB, Web Bluetooth, or WebSocket.

### `SerialParser<T>`

```ts
interface SerialParser<T> {
  transform(chunk: Uint8Array, push: (value: T) => void): void;
  flush?(push: (value: T) => void): void;
}
```

Receives raw bytes and calls `push()` for each complete message. Three
built-in parsers are included:

| Parser       | Factory          | Description                                 |
| ------------ | ---------------- | ------------------------------------------- |
| Delimiter    | `delimiter(sep)` | Splits on a byte sequence (e.g. `"\n"`)     |
| Fixed length | `fixedLength(n)` | Emits every N bytes                         |
| Raw          | `raw()`          | Passes each chunk unchanged as `Uint8Array` |

### `CommandQueue`

A FIFO queue that serialises writes to the port. Each `send()` call enqueues
a write. If a command does not complete within `commandTimeout` ms, a
`serial:timeout` event fires and the next command proceeds.

### `SerialRegistry`

A global singleton that tracks which ports are currently open. Prevents two
`AbstractSerialDevice` instances from opening the same port simultaneously.

### `SerialEventEmitter<EventMap>`

A minimal typed event emitter. `on`, `off`, and `emit` are all fully typed
using the `SerialEventMap<T>` generic, so TypeScript knows the exact payload
type for every event.

## Data flow

```
SerialPort.readable (ReadableStream<Uint8Array>)
        │
        ▼
   Read loop (pump)
        │  Uint8Array chunks
        ▼
   SerialParser<T>.transform(chunk, push)
        │  Parsed values of type T
        ▼
   emit("serial:data", value)
        │
        ▼
   Your event handler
```

## Provider injection

```ts
// Global — affects all AbstractSerialDevice instances
AbstractSerialDevice.setProvider(myProvider);

// Or pass it directly to the constructor (per-instance)
super({ ...options, provider: myProvider });
```
