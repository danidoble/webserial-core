---
layout: doc
title: Devices — v1 API
---

# Devices

::: warning Legacy v1 docs
v1 is on security fixes only. See [v2 docs](/api/abstract-serial-device) for the current release.
:::

`Devices` is a **static registry** that keeps track of every device instance in your app. It is a `Dispatcher` subclass so you can listen to the `change` event globally.

```typescript
import { Devices } from "webserial-core";
```

## Static methods

### `registerType(type)`

Creates a slot in the registry for a new device type. Call this once inside your subclass constructor before calling `Devices.add()`.

```typescript
Devices.registerType(type: string): void
```

```javascript
Devices.registerType("arduino");
```

---

### `add(device)`

Registers a device instance. Typically called at the end of your subclass constructor.

```typescript
Devices.add(device: Core): number  // returns the index in the type bucket
```

Throws if a device with the same UUID is already registered.

---

### `get(type, id)`

Returns a device by type name and UUID.

```typescript
Devices.get(type: string, id: string): Core
```

---

### `getByNumber(type, deviceNumber)`

Returns the device with the given `deviceNumber` within a type bucket, or `null`.

```typescript
Devices.getByNumber(type: string, deviceNumber: number): Core | null
```

---

### `getCustom(type, deviceNumber?)`

Alias of `getByNumber`.

```typescript
Devices.getCustom(type: string, deviceNumber?: number): Core | null
```

---

### `getAll(type?)`

Returns all devices of a given type (or all devices grouped by type when `type` is `null`).

```typescript
Devices.getAll(type?: string | null): IDevice | IDevices
```

---

### `getList()`

Returns a flat array of every registered device regardless of type.

```typescript
Devices.getList(): Core[]
```

---

### `connectToAll()`

Calls `connect()` on every device that is currently disconnected.

```typescript
Devices.connectToAll(): Promise<boolean>
```

Returns `true` when every device is connected.

---

### `disconnectAll()`

Calls `disconnect()` on every device that is currently connected.

```typescript
Devices.disconnectAll(): Promise<boolean>
```

---

### `areAllConnected()`

Returns `true` when every registered device is connected.

```typescript
Devices.areAllConnected(): Promise<boolean>
```

---

### `areAllDisconnected()`

Returns `true` when every registered device is disconnected.

```typescript
Devices.areAllDisconnected(): Promise<boolean>
```

---

### `getAllConnected()`

Returns an array of all devices that are currently connected.

```typescript
Devices.getAllConnected(): Promise<Core[]>
```

---

### `getAllDisconnected()`

Returns an array of all devices that are currently disconnected.

```typescript
Devices.getAllDisconnected(): Promise<Core[]>
```

## Instance event

The singleton `Devices.instance` emits one event:

| Event    | Payload                   | Description                                                      |
| -------- | ------------------------- | ---------------------------------------------------------------- |
| `change` | `{ devices, dispatcher }` | Fired whenever a device is added or its connection state changes |

```javascript
Devices.instance.on("change", (event) => {
  const { devices, dispatcher } = event.detail;
  console.log("Registry changed:", Object.keys(devices));
});
```

## Usage example

```javascript
import { Arduino } from "./arduino.js";
import { Devices } from "webserial-core";

const a1 = new Arduino({ no_device: 1 });
const a2 = new Arduino({ no_device: 2 });

// Connect both at once
await Devices.connectToAll();

// Retrieve by number
const first = Devices.getByNumber("arduino", 1);
console.log(first.isConnected); // true

// Disconnect all
await Devices.disconnectAll();
```
