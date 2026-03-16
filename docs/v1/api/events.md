---
layout: doc
title: Events — v1 API
---

# Events

::: warning Legacy v1 docs
v1 is on security fixes only. See [v2 docs](/api/events) for the current release.
:::

v1 uses a custom `CustomEvent`-based system. Listen with `device.on(eventName, handler)`. The handler receives the native `CustomEvent`; payload is always in `event.detail`.

```javascript
arduino.on("serial:connected", (event) => {
  console.log("connected!", event.detail);
});
```

## Device events

| Event                    | Detail                             | Description                                                             |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------------- |
| `serial:connecting`      | `null`                             | Emitted when the connection process starts                              |
| `serial:connected`       | `null`                             | Emitted when the device is fully connected and ready                    |
| `serial:disconnected`    | `object \| null`                   | Emitted when the device disconnects (detail may carry an error message) |
| `serial:need-permission` | `null`                             | User must interact with the browser to grant port access                |
| `serial:unsupported`     | `null`                             | Web Serial API is not available in this browser                         |
| `serial:reconnect`       | `{}`                               | Emitted on a connection timeout when still in `connect` phase           |
| `serial:message`         | device-specific                    | Emitted from your `serialMessage()` implementation                      |
| `serial:corrupt-message` | `{ code }`                         | Emitted from your `serialCorruptMessage()` implementation               |
| `serial:sent`            | `{ action, bytes }`                | Emitted after bytes are written to the port                             |
| `serial:timeout`         | `{ message, action, code, bytes }` | Emitted when a queued command does not receive a response in time       |
| `serial:soft-reload`     | `{}`                               | Emitted by `softReload()`; use it to reset your local state             |
| `serial:error`           | `Error \| DOMException`            | Any uncaught error from connection or I/O                               |
| `serial:lost`            | `null`                             | Emitted when the port is unexpectedly removed/closed                    |
| `debug`                  | `{ type, data }`                   | Internal debug event (only fired when debug mode is active)             |

## Registry event

| Event    | Detail                    | Description                                                |
| -------- | ------------------------- | ---------------------------------------------------------- |
| `change` | `{ devices, dispatcher }` | Fired on `Devices.instance` whenever context state changes |

## Socket events (window-level)

When `socket: true` is set in the constructor, these events are dispatched on `window`:

| Event                        | Description                      |
| ---------------------------- | -------------------------------- |
| `serial:socket:connected`    | Socket.io connection established |
| `serial:socket:disconnected` | Socket.io connection lost        |

## Event detail shapes

### `serial:timeout`

```typescript
{
  message: string;   // "Operation response timed out."
  action: string;    // the queue action (e.g. "connect", "hi")
  code: Uint8Array | string[] | null;
  bytes: Uint8Array | string[];
  no_code: number;
}
```

### `serial:sent`

```typescript
{
  action: string; // the queue action
  bytes: Uint8Array; // the bytes that were written
}
```

### `serial:disconnected`

```typescript
{
  error?: string;    // reason, e.g. "Port is closed, not readable or writable."
}
```
