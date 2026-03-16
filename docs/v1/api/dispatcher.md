---
layout: doc
title: Dispatcher — v1 API
---

# Dispatcher

::: warning Legacy v1 docs
v1 is on security fixes only. See [v2 docs](/api/abstract-serial-device) for the current release.
:::

`Dispatcher` extends the native `EventTarget` and adds helper methods for the event-driven communication system. Both `Core` and `Devices` extend this class.

```typescript
import { Dispatcher } from "webserial-core";
```

## Methods

### `on(type, callback)`

Registers an event listener and marks the event type as active.

```typescript
on(type: string, callback: EventListenerOrEventListenerObject): void
```

```javascript
device.on("serial:connected", (event) => {
  console.log("connected", event.detail);
});
```

---

### `off(type, callback)`

Removes a previously registered event listener.

```typescript
off(type: string, callback: EventListenerOrEventListenerObject): void
```

```javascript
const handler = (e) => console.log(e.detail);
device.on("serial:message", handler);
// later...
device.off("serial:message", handler);
```

---

### `dispatch(type, data?)`

Synchronously dispatches a `SerialEvent` (a `CustomEvent` subclass). The `data` value becomes `event.detail`.

```typescript
dispatch(type: string, data?: string | number | boolean | object | null): void
```

---

### `dispatchAsync(type, data?, ms?)`

Dispatches an event after `ms` milliseconds (default `100`).

```typescript
dispatchAsync(type: string, data?: any, ms?: number): void
```

---

### `serialRegisterAvailableListener(type)`

Registers a new event type so it appears in `availableListeners`. Called internally in the `Core` constructor — use it in your subclass to declare custom events.

```typescript
serialRegisterAvailableListener(type: string): void
```

```javascript
// inside your subclass constructor:
this.serialRegisterAvailableListener("my-custom-event");
```

---

### `removeAllListeners()`

Removes every listener except `internal:queue` and resets all listening flags to `false`. Useful for cleanup.

```typescript
removeAllListeners(): void
```

## Properties

### `availableListeners`

Read-only array of `{ type: string; listening: boolean }` objects representing all registered event types.

```typescript
get availableListeners(): { type: string; listening: boolean }[]
```

```javascript
console.table(device.availableListeners);
// [
//   { type: "serial:connected",    listening: true },
//   { type: "serial:disconnected", listening: false },
//   ...
// ]
```
