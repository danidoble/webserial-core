# Migrating from v1

> **v2 is a complete rewrite of webserial-core and is not backwards compatible with v1.**

Version 2 introduces a new architecture, new adapter system, new folder structure, new build
output format, and changes to every public API. There is no incremental upgrade path.

---

## Recommended approach

The cleanest way to migrate is to **start fresh** with v2:

1. Uninstall v1 and install v2:

   ```bash
   npm remove webserial-core
   npm install webserial-core@latest
   ```

2. Delete any existing extension of the old `SerialDevice` class.

3. Create a new class extending `AbstractSerialDevice<T>` following the
   [Getting started](./getting-started.md) guide.

---

## Why a full rewrite?

Version 1 was a prototype that proved the concept. Version 2 was designed from scratch with
the following goals that required breaking changes at every layer:

- **Strict TypeScript** — no `any`, full JSDoc, named interfaces for every option
- **Modular adapter system** — WebUSB, Web Bluetooth, and WebSocket are first-class transports
- **Dual ESM + CJS output** — proper `.mjs` / `.cjs` / `.umd.cjs` build via Vite
- **Isolated responsibilities** — parsers, queue, events, registry, and adapters are all
  separate modules that can be tested independently
- **English-only source** — all source code, JSDoc, and error messages are in English

---

## Reference

:::tip Start here
Read the [Getting started](./getting-started.md) guide for the full v2 API.
:::

- [API — AbstractSerialDevice](../api/abstract-serial-device.md)
- [API — Events](../api/events.md)
- [API — Parsers](../api/parsers.md)
- [Examples](../examples/web-serial.md)
