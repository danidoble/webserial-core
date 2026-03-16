---
layout: home

hero:
  name: "webserial-core v1"
  text: "Event-driven serial communication"
  tagline: Legacy version — consider upgrading to v2 for full TypeScript support and multi-transport adapters.
  actions:
    - theme: brand
      text: v1 Getting Started
      link: /v1/guide/getting-started
    - theme: alt
      text: Upgrade to v2 →
      link: /guide/getting-started

features:
  - icon: 📡
    title: Event-driven
    details: Listen to `data`, `connect`, and `disconnect` events from your serial device.
  - icon: 🔌
    title: Web Serial only
    details: v1 targets the Web Serial API exclusively. For WebUSB, Bluetooth, and WebSocket support, upgrade to v2.
  - icon: 🧩
    title: Basic parsers
    details: Delimiter-based line parsing included. Custom parsers require manual implementation.
---

::: warning Legacy version
You are viewing the **v1 legacy documentation**. v1 is no longer actively maintained.

For new projects, use [v2 (latest)](/guide/getting-started) which adds:

- Provider-agnostic adapters (WebUSB, Web Bluetooth, WebSocket)
- Full TypeScript generics
- Built-in command queue
- Auto-reconnect with back-off
  :::
