---
layout: doc
title: Socket — v1 API
---

# Socket

::: warning Legacy v1 docs
v1 is on security fixes only. See [v2 docs](/api/websocket-provider) for the current release.
:::

`Socket` is a singleton that manages the Socket.io connection to a serial-bridge server. It forwards commands from the browser to a Node.js server that owns the physical serial port.

```typescript
import { Socket } from "webserial-core";
```

> **Peer dependency** — the Socket integration requires `socket.io-client` to be installed:
>
> ```bash
> npm install socket.io-client
> ```

## Server setup

You need a companion Node.js server. A minimal example is included in the `tests/ws-serial-bridge/` directory of the repository. It listens for `connectDevice`, `disconnectDevice`, `disconnectAll`, and `cmd` events and proxies them through the `serialport` npm package.

## Configuration

### `Socket.configure(uri?, options?)`

Sets the URI and Socket.io options **before** calling `prepare()`. Throws if `prepare()` has already been called.

```typescript
configure(uri?: string, options?: Partial<ManagerOptions & SocketOptions>): void
```

```javascript
Socket.configure("http://192.168.1.10:3001", { transports: ["websocket"] });
```

Default URI: `http://localhost:3001`.

---

### `Socket.prepare()`

Creates the `socket.io-client` instance and registers all internal event handlers. Safe to call multiple times — subsequent calls are no-ops if already connected.

```typescript
prepare(): void
```

---

### `Socket.disconnect()`

Closes the socket and cleans up all listeners.

```typescript
disconnect(): void
```

## Device interaction

### `Socket.connectDevice(config)`

Emits `connectDevice` to the server with the device configuration object.

```typescript
connectDevice(config: object): void
```

The `config` object matches `device.configDeviceSocket`.

---

### `Socket.disconnectDevice(config)`

Emits `disconnectDevice` to the server.

```typescript
disconnectDevice(config: object): void
```

---

### `Socket.disconnectAllDevices()`

Emits `disconnectAll` to the server — useful for cleanup on page unload.

```typescript
disconnectAllDevices(): void
```

---

### `Socket.write(data)`

Emits `cmd` to the server, which forwards the bytes to the serial port.

```typescript
write(data: object): void
```

## State

```typescript
Socket.isConnected(): boolean
Socket.isDisconnected(): boolean
Socket.socketId: string | null  // Socket.io socket ID
Socket.uri: string              // current server URI
Socket.options: object          // current Socket.io options
```

## Window events

The singleton dispatches these events on `window` so that `Core` instances can react to socket state changes:

| Event                        | Description                             |
| ---------------------------- | --------------------------------------- |
| `serial:socket:connected`    | Socket successfully connected           |
| `serial:socket:disconnected` | Socket disconnected or connection error |

## Usage example

```javascript
import { Arduino } from "./arduino.js";
import { Socket } from "webserial-core";

// 1. Configure before any device uses it
Socket.configure("http://localhost:3001");
Socket.prepare();

// 2. Create device in socket mode
const arduino = new Arduino({ socket: true, no_device: 1 });

arduino.on("serial:connected", () => console.log("Connected via socket"));
arduino.on("serial:disconnected", () => console.log("Disconnected"));

// 3. Connect — Core handles the connectDevice emit internally
arduino.connect().catch(console.error);
```
