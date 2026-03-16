---
layout: home

hero:
  name: "webserial-core v1"
  text: "Event-driven serial communication"
  tagline: Legacy version (1.x) — consider upgrading to v2 for full TypeScript support and multi-transport adapters.
  actions:
    - theme: brand
      text: Getting Started
      link: /v1/guide/getting-started
    - theme: alt
      text: API Reference
      link: /v1/api/core
    - theme: alt
      text: Upgrade to v2 →
      link: /guide/getting-started

features:
  - icon: 📡
    title: Event-driven
    details: Rich event system covering connected, connecting, disconnected, timeout, message, error and more.
  - icon: 🔌
    title: Web Serial API
    details: v1 targets the Web Serial API. Includes optional Socket.io integration for remote/server-side serial bridging.
  - icon: 🗂️
    title: Command queue
    details: Built-in sequential command queue with per-action timeouts ensures ordered communication with your device.
  - icon: 🧩
    title: Device registry
    details: The Devices registry tracks all active device instances and lets you connect/disconnect them in bulk.
---

::: warning Legacy version
You are viewing the **v1 (legacy) documentation**. v1 is now on security fixes only.

For new projects use [v2 (latest)](/guide/getting-started) which adds:

- Provider-agnostic adapters (WebUSB, Web Bluetooth, WebSocket)
- Full TypeScript generics and strict typings
- Improved parser system (delimiter, fixed-length, raw)
- Auto-reconnect with exponential back-off
  :::
