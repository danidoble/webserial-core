# Events

`AbstractSerialDevice<T>` emits the following typed events. All are prefixed
with `serial:` to avoid collisions with DOM events.

## Event reference

### `serial:connecting`

Fired immediately when `connect()` is called, before the port picker appears.

```ts
device.on("serial:connecting", () => {
  connectButton.disabled = true;
});
```

**Payload:** none

---

### `serial:connected`

Fired after the port is open **and** `handshake()` returns `true`.

```ts
device.on("serial:connected", () => {
  console.log("Ready to communicate!");
});
```

**Payload:** none

---

### `serial:disconnected`

Fired after the port closes, for any reason (manual disconnect, error, device
unplugged). If `autoReconnect` is enabled, a reconnect attempt follows.

```ts
device.on("serial:disconnected", () => {
  console.log("Connection lost.");
});
```

**Payload:** none

---

### `serial:data`

Fired every time the parser emits a complete message.

```ts
device.on("serial:data", (value) => {
  // `value` is typed as T (e.g. string when using delimiter())
  console.log("Received:", value);
});
```

**Payload:** `T` — the parsed value

---

### `serial:sent`

Fired after bytes are written to the port.

```ts
device.on("serial:sent", (bytes) => {
  console.log("Sent:", bytes);
});
```

**Payload:** `Uint8Array` — the exact bytes written

---

### `serial:error`

Fired when an unrecoverable error occurs (port error, write failure, etc.).

```ts
device.on("serial:error", (error) => {
  console.error("Serial error:", error.message);
});
```

**Payload:** `Error`

---

### `serial:need-permission`

Fired when the user denies port access or no authorized ports are available.
This is the right place to re-enable your "Connect" button.

```ts
device.on("serial:need-permission", () => {
  connectButton.disabled = false;
});
```

**Payload:** none

---

### `serial:timeout`

Fired when a queued command does not complete within `commandTimeout` ms.

```ts
device.on("serial:timeout", (command) => {
  console.warn("Command timed out:", command);
});
```

**Payload:** `Uint8Array` — the bytes of the command that timed out

---

### `serial:queue-empty`

Fired when the last command in the queue finishes and the queue becomes idle.

```ts
device.on("serial:queue-empty", () => {
  console.log("All commands sent.");
});
```

**Payload:** none

---

### `serial:reconnecting`

Fired at the start of each auto-reconnect attempt.

```ts
device.on("serial:reconnecting", () => {
  statusLabel.textContent = "Reconnecting...";
});
```

**Payload:** none

---

## TypeScript: full event map

```ts
import type { SerialEventMap } from "webserial-core";

// SerialEventMap<T> is:
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
