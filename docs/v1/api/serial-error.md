---
layout: doc
title: SerialError — v1 API
---

# SerialError

::: warning Legacy v1 docs
v1 is on security fixes only. See [v2 docs](/api/abstract-serial-device) for the current release.
:::

`SerialError` is a structured error class that wraps serial communication failures with a typed code and optional context.

```typescript
import { SerialError, SerialErrorCode } from "webserial-core";
```

## Constructor

```typescript
new SerialError(
  message: string,
  code?: SerialErrorCode,
  context?: Record<string, unknown>
)
```

| Parameter | Default                         | Description                                              |
| --------- | ------------------------------- | -------------------------------------------------------- |
| `message` | —                               | Human-readable description                               |
| `code`    | `SerialErrorCode.UNKNOWN_ERROR` | Error category from `SerialErrorCode`                    |
| `context` | `undefined`                     | Extra key/value information (port name, baud rate, etc.) |

## `SerialErrorCode` enum

| Value                   | Description                                   |
| ----------------------- | --------------------------------------------- |
| `CONNECTION_FAILED`     | Could not open the serial port                |
| `DISCONNECTION_FAILED`  | Port failed to close cleanly                  |
| `WRITE_FAILED`          | Writing bytes to the port failed              |
| `READ_FAILED`           | Reading bytes from the port failed            |
| `TIMEOUT`               | No response received within the allotted time |
| `PORT_NOT_FOUND`        | Serial port no longer found / unplugged       |
| `PERMISSION_DENIED`     | Browser denied access to the port             |
| `DEVICE_NOT_SUPPORTED`  | Device type is not supported                  |
| `INVALID_CONFIGURATION` | Bad constructor options                       |
| `SOCKET_ERROR`          | Socket.io communication error                 |
| `UNKNOWN_ERROR`         | General uncategorised error                   |

## Properties

| Property    | Type                                   | Description                |
| ----------- | -------------------------------------- | -------------------------- |
| `name`      | `string`                               | Always `"SerialError"`     |
| `message`   | `string`                               | Human-readable message     |
| `code`      | `SerialErrorCode`                      | Error category             |
| `context`   | `Record<string, unknown> \| undefined` | Optional extra context     |
| `timestamp` | `Date`                                 | When the error was created |
| `stack`     | `string \| undefined`                  | V8 stack trace             |

## Methods

### `toJSON()`

Returns a plain object suitable for logging or serialisation.

```typescript
toJSON(): Record<string, unknown>
```

```javascript
const err = new SerialError(
  "Failed to connect",
  SerialErrorCode.CONNECTION_FAILED,
  { baudRate: 9600 },
);

console.log(err.toJSON());
// {
//   name: "SerialError",
//   message: "Failed to connect",
//   code: "CONNECTION_FAILED",
//   context: { baudRate: 9600 },
//   timestamp: "2024-01-15T10:30:00.000Z",
//   stack: "..."
// }
```

### `toString()`

Returns a formatted single-line string.

```typescript
toString(): string
// "SerialError [CONNECTION_FAILED]: Failed to connect | Context: {"baudRate":9600}"
```

## Usage

```javascript
arduino.on("serial:error", (event) => {
  const err = event.detail;
  if (err instanceof SerialError) {
    console.error(`[${err.code}] ${err.message}`, err.context);
  } else {
    console.error(err);
  }
});
```
