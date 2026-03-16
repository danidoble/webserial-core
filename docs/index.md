---
layout: home

hero:
  name: "webserial-core"
  text: "Typed serial communication for the web"
  tagline: >
    Abstract, event-driven TypeScript library for Web Serial, WebUSB,
    Web Bluetooth, and WebSocket serial communication.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/abstract-serial-device
    - theme: alt
      text: View on GitHub
      link: https://github.com/danidoble/webserial-core

features:
  - icon: 🔌
    title: Provider-agnostic
    details: >
      Switch between Web Serial, WebUSB, Web Bluetooth, or WebSocket
      transports by injecting a provider — zero changes to your device class.
  - icon: 🔒
    title: Strictly typed
    details: >
      Full TypeScript generics throughout. Data events, parsers, and options
      are all typed. Zero implicit `any`.
  - icon: 📡
    title: Event-driven
    details: >
      Typed event map covering connecting, connected, disconnected, data,
      sent, error, timeout, reconnecting, and more.
  - icon: ⚡
    title: Command queue
    details: >
      Built-in FIFO command queue with optional per-command timeouts.
      Perfect for request/response serial protocols.
  - icon: 🔄
    title: Auto-reconnect
    details: >
      Configurable auto-reconnect with back-off. The library handles the
      reconnect loop; your code just listens to events.
  - icon: 🧩
    title: Composable parsers
    details: >
      Ship with `delimiter`, `fixedLength`, and `raw` parsers. Implement
      `SerialParser<T>` to parse any custom binary or text protocol.
---
