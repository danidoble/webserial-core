---
layout: doc
title: Core — v1 API
---

# Core

::: warning Legacy v1 docs
v1 is on security fixes only. See [v2 docs](/api/abstract-serial-device) for the current release.
:::

`Core` is the base class for all v1 devices. You always **subclass** it — never instantiate it directly.

```typescript
import { Core, Devices } from "webserial-core";

class MyDevice extends Core {
  constructor() {
    super({ baudRate: 9600 });
    this.__internal__.device.type = "my-device";
    Devices.registerType("my-device");
    Devices.add(this);
    this.getResponseAsString();
  }

  serialSetConnectionConstant() {
    return this.add0x(this.parseStringToBytes("CONNECT"));
  }

  serialMessage(code) {
    this.dispatch("serial:message", { code });
  }
}
```

## Constructor

```typescript
new Core(options?: CoreConstructorParams)
```

| Parameter                     | Type                         | Default                                                                                                | Description                                                 |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `filters`                     | `SerialPortFilter[] \| null` | `null`                                                                                                 | Filters passed to `navigator.serial.requestPort()`          |
| `config_port`                 | `SerialOptions`              | `{ baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none", bufferSize: 32768, flowControl: "none" }` | Serial port configuration                                   |
| `no_device`                   | `number`                     | `1`                                                                                                    | Device instance number (used by the registry)               |
| `device_listen_on_channel`    | `number \| string`           | `1`                                                                                                    | Channel/port number passed to `serialSetConnectionConstant` |
| `bypassSerialBytesConnection` | `boolean`                    | `false`                                                                                                | Skip automatic connection-byte sending                      |
| `socket`                      | `boolean`                    | `false`                                                                                                | Use Socket.io bridge instead of direct Web Serial           |
| `transformStream`             | `false \| TransformStream`   | `false`                                                                                                | Custom transform stream to inject into the read pipeline    |

## Methods to implement in subclass

### `serialSetConnectionConstant(listenOnPort?)`

Called automatically during connection. Must return the bytes to send for device handshake.

```typescript
serialSetConnectionConstant(listenOnPort = 1): string | Uint8Array | string[] | number[] | null
```

**Example**

```javascript
serialSetConnectionConstant() {
  return this.add0x(this.parseStringToBytes("CONNECT"));
}
```

---

### `serialMessage(code)`

Called for every message received from the device. Parse and dispatch events here.

```typescript
serialMessage(code: string | Uint8Array | string[] | ArrayBuffer): void
```

**Example**

```javascript
serialMessage(codex) {
  if (codex === "connected") {
    this.dispatch("serial:message", { name: "connected", no_code: 100 });
  }
}
```

---

### `serialCorruptMessage(code)` _(optional)_

Called when a received message fails validation. Override to handle corrupt responses.

```typescript
serialCorruptMessage(code: Uint8Array | string[] | string | null): void
```

## Connection methods

### `connect()`

Opens the system port picker (if no port is already saved) and establishes the serial connection.

```typescript
connect(): Promise<boolean>
```

Returns `true` when connected.

---

### `disconnect(detail?)`

Closes the serial port and emits `serial:disconnected`.

```typescript
disconnect(detail?: object | null): Promise<void>
```

---

### `serialConnect()`

Low-level connect (no port picker). Reopens a previously granted port.

```typescript
serialConnect(): Promise<void>
```

---

### `serialDisconnect()`

Low-level close of the serial port streams.

```typescript
serialDisconnect(): Promise<void>
```

---

### `serialForget()`

Calls `port.forget()` to revoke the browser permission for the saved port.

```typescript
serialForget(): Promise<boolean>
```

## Queue methods

### `appendToQueue(arr, action)`

Enqueues bytes to be written to the device. Sends `internal:queue` to process the next item.

```typescript
appendToQueue(
  arr: string | Uint8Array | string[] | number[],
  action: string
): Promise<void>
```

---

### `sendConnect()`

Sends the connection-constant bytes through the queue.

```typescript
sendConnect(): Promise<void>
```

---

### `sendCustomCode({ code })`

Enqueues arbitrary bytes with action `"custom"`.

```typescript
sendCustomCode({ code }: { code: string | Uint8Array | string[] | number[] }): Promise<void>
```

---

### `clearSerialQueue()`

Empties the command queue immediately.

```typescript
clearSerialQueue(): void
```

---

### `softReload()`

Clears the last error state and emits `serial:soft-reload`.

```typescript
softReload(): void
```

## Response format helpers

Call exactly **one** of these in your constructor:

```javascript
this.getResponseAsUint8Array(); // default — Uint8Array
this.getResponseAsString(); // decoded string (TextDecoder)
this.getResponseAsArrayHex(); // string[] of hex values
this.getResponseAsArrayBuffer(); // ArrayBuffer
```

## Properties

### State

| Property         | Type             | Description                                          |
| ---------------- | ---------------- | ---------------------------------------------------- |
| `isConnected`    | `boolean`        | `true` when the port is open and readable/writable   |
| `isConnecting`   | `boolean`        | `true` while the connection handshake is in progress |
| `isDisconnected` | `boolean`        | `true` when not connected                            |
| `lastAction`     | `string \| null` | The `action` string of the last queued command       |

### Identity

| Property       | Type     | Description                                            |
| -------------- | -------- | ------------------------------------------------------ |
| `uuid`         | `string` | Auto-generated `crypto.randomUUID()`                   |
| `typeDevice`   | `string` | Device type string (e.g. `"arduino"`)                  |
| `deviceNumber` | `number` | Instance number set via `no_device` in the constructor |

### Queue

| Property | Type          | Description                             |
| -------- | ------------- | --------------------------------------- |
| `queue`  | `QueueData[]` | Current pending items in the send queue |

### Port configuration

| Property           | Type                       | Description                                |
| ------------------ | -------------------------- | ------------------------------------------ |
| `serialFilters`    | `SerialPortFilter[]`       | Get/set port filters (throws if connected) |
| `serialConfigPort` | `SerialOptions`            | Get/set port options (throws if connected) |
| `portPath`         | `string \| null`           | COM/tty path hint for socket mode          |
| `portVendorId`     | `string \| number \| null` | USB vendor ID hint for socket mode         |
| `portProductId`    | `string \| number \| null` | USB product ID hint for socket mode        |
| `useRTSCTS`        | `boolean`                  | Enable RTS/CTS hardware flow control       |

### Response parsing

| Property                      | Type                       | Description                                                                |
| ----------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `fixedBytesMessage`           | `number \| null`           | Expect exactly N bytes per message; `null` = variable                      |
| `timeoutBeforeResponseBytes`  | `number`                   | Inter-byte silence (ms) before declaring a response complete. Default `50` |
| `responseDelimited`           | `boolean`                  | Use `responseLimiter` to split messages                                    |
| `responseLimiter`             | `string \| RegExp \| null` | Delimiter for message boundaries                                           |
| `responsePrefixLimited`       | `boolean`                  | Limiter appears at the **start** of each message                           |
| `responseSufixLimited`        | `boolean`                  | Limiter appears at the **end** of each message (default `true`)            |
| `bypassSerialBytesConnection` | `boolean`                  | Skip connection-byte dispatch                                              |
| `connectionBytes`             | `Uint8Array`               | Read-only computed connection bytes                                        |

### Socket mode

| Property                   | Type                                    | Description                                  |
| -------------------------- | --------------------------------------- | -------------------------------------------- |
| `useSocket`                | `boolean`                               | Whether socket mode is active                |
| `socketPortParser`         | `"byte-length" \| "inter-byte-timeout"` | Parser type for the socket bridge            |
| `socketPortParserInterval` | `number`                                | Inter-byte timeout (ms) for socket parser    |
| `socketPortParserLength`   | `number`                                | Fixed byte length for socket parser          |
| `configDeviceSocket`       | `object`                                | Full config object sent to the socket bridge |

## Byte-conversion utilities

```typescript
parseStringToBytes(string: string, end?: string): string[]
parseStringToTextEncoder(string: string, end?: string): Uint8Array
parseUint8ToHex(array: Uint8Array): string[]
parseHexToUint8(array: string[]): Uint8Array
stringArrayToUint8Array(strings: string[]): Uint8Array
parseUint8ArrayToString(array: Uint8Array | string[]): string
stringToArrayHex(string: string): string[]
stringToArrayBuffer(string: string, end?: string): ArrayBufferLike
hexToAscii(hex: string | number): string
asciiToHex(asciiString: string): string
decToHex(dec: number | string): string
hexToDec(hex: string): number
hexMaker(val?: string, min?: number): string
add0x(bytes: string[]): string[]
bytesToHex(bytes: string[]): string[]
sumHex(arr: string[]): string
validateBytes(data: string | Uint8Array | string[] | number[]): Uint8Array
```
