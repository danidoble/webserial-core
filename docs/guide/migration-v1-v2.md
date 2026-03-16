# Migration Guide: v1 → v2

> **⚠️ Breaking Changes**
>
> Version 2 is a complete rewrite with significant breaking changes.
> Read this guide carefully before upgrading.

## Summary of breaking changes

| Area                   | v1                             | v2                                           |
| ---------------------- | ------------------------------ | -------------------------------------------- |
| Package structure      | Flat `src/`                    | `src/core/`, `src/adapters/`, `src/types/`   |
| Provider import        | `src/providers/WebUsbProvider` | `webserial-core` (re-exported from adapters) |
| Bluetooth support      | Not included                   | `createBluetoothProvider()`                  |
| WebSocket support      | Not included                   | `createWebSocketProvider(url)`               |
| `CommandQueue` options | Inline object type             | Named `CommandQueueOptions` interface        |
| Import extensions      | Bare specifiers                | `.js` extensions (ESM-compatible)            |
| Build output           | Single format                  | ESM (`.mjs`) + CJS (`.cjs`) + UMD            |

## Step-by-step upgrade

### 1. Update the package

```bash
npm install webserial-core@latest
```

### 2. Update import paths

#### WebUsbProvider

**v1:**

```ts
import { WebUsbProvider } from "webserial-core/providers/WebUsbProvider";
```

**v2:**

```ts
import { WebUsbProvider } from "webserial-core";
// or explicitly from the adapter sub-path:
import { WebUsbProvider } from "webserial-core/adapters/web-usb";
```

#### All other imports

All public API (classes, parsers, types, errors) is re-exported from the
main entry point and remains unchanged:

```ts
import {
  AbstractSerialDevice,
  delimiter,
  fixedLength,
  raw,
  SerialPortConflictError,
  // ...
} from "webserial-core";
```

### 3. Web Bluetooth (new in v2)

```ts
import { AbstractSerialDevice } from "webserial-core";
import { createBluetoothProvider } from "webserial-core";

AbstractSerialDevice.setProvider(createBluetoothProvider());
```

### 4. WebSocket bridge (new in v2)

```ts
import { AbstractSerialDevice, createWebSocketProvider } from "webserial-core";

AbstractSerialDevice.setProvider(
  createWebSocketProvider("ws://localhost:8080"),
);
```

### 5. `CommandQueueOptions` (renamed type)

If you referenced the `CommandQueue` constructor options type directly:

**v1:** Inline anonymous object type (not exported).

**v2:** Exported named interface:

```ts
import type { CommandQueueOptions } from "webserial-core";
```

### 6. Build output filenames

If you reference the compiled output directly (e.g. in a `<script>` tag or
Rollup external):

| v1                        | v2                                       |
| ------------------------- | ---------------------------------------- |
| `dist/webserial-core.js`  | `dist/webserial-core.mjs` (ESM)          |
| `dist/webserial-core.cjs` | `dist/webserial-core.cjs` (unchanged)    |
| —                         | `dist/webserial-core.umd.cjs` (UMD, new) |

## What did not change

- `AbstractSerialDevice<T>` API — all methods and events are identical
- All parsers (`delimiter`, `fixedLength`, `raw`) — same signature
- All error classes — same names and constructor signatures
- `SerialRegistry` — same static API
- `SerialEventEmitter<T>` — same `on`/`off`/`emit` API
- `SerialDeviceOptions<T>` — same fields (plus `provider` is now optional per-instance)
