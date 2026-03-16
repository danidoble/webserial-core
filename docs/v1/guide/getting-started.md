---
layout: doc
title: Getting Started (v1)
---

# Getting Started — v1

::: warning You are viewing legacy v1 docs
v1 is no longer actively maintained. For new projects please use [v2 (latest)](/guide/getting-started).
:::

## Installation

```bash
npm install webserial-core@1
```

## Basic usage

In v1, the library exposed a simpler, class-based API with no provider abstraction. You extended `SerialDevice` directly and used the Web Serial API under the hood.

```javascript
import { SerialDevice } from "webserial-core";

class ArduinoDevice extends SerialDevice {
  constructor() {
    super({ baudRate: 9600 });
  }
}

const device = new ArduinoDevice();

device.on("data", (chunk) => {
  console.log("Received:", chunk);
});

device.on("connect", () => console.log("Connected"));
device.on("disconnect", () => console.log("Disconnected"));

// Request port and connect
await device.requestPort();
await device.open();
```

## Differences from v2

| Feature | v1 | v2 |
|---------|----|----|
| Transports | Web Serial only | Web Serial, WebUSB, Bluetooth, WebSocket |
| TypeScript generics | Partial | Full |
| Command queue | ❌ | ✅ |
| Auto-reconnect | ❌ | ✅ |
| Provider injection | ❌ | ✅ |
| Tree-shakeable | ❌ | ✅ |

## Migrating to v2

See the [Migration Guide](/guide/migration-v1-v2) for a step-by-step upgrade path.
