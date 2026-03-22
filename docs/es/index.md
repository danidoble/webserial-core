---
layout: home

hero:
  name: "webserial-core"
  text: "Comunicación serial tipada para la web"
  tagline: >
    Librería TypeScript abstracta y orientada a eventos para Web Serial, WebUSB,
    Web Bluetooth y comunicación serial por WebSocket.
  image:
    src: /images/cover.svg
    alt: webserial-core — diagrama navegador a microcontrolador
  actions:
    - theme: brand
      text: Empezar
      link: /es/guide/getting-started
    - theme: alt
      text: "Playground"
      link: /demos/web-serial.html
    - theme: alt
      text: Referencia API
      link: /api/abstract-serial-device
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/danidoble/webserial-core

features:
  - icon:
      src: /images/icons/adapters.svg
      alt: adaptadores
    title: Agnóstico al proveedor
    details: >
      Cambia entre Web Serial, WebUSB, Web Bluetooth o WebSocket
      inyectando un proveedor — sin cambios en tu clase de dispositivo.
  - icon:
      src: /images/icons/typed.svg
      alt: TypeScript
    title: Fuertemente tipado
    details: >
      Genéricos de TypeScript en todo momento. Eventos de datos, parsers y opciones
      están completamente tipados. Cero `any` implícitos.
  - icon:
      src: /images/icons/events.svg
      alt: eventos
    title: Orientado a eventos
    details: >
      Mapa de eventos tipado que cubre connecting, connected, disconnected, data,
      sent, error, timeout, reconnecting y más.
  - icon:
      src: /images/icons/queue.svg
      alt: cola de comandos
    title: Cola de comandos
    details: >
      Cola FIFO integrada con timeouts opcionales por cada comando.
      Perfecta para protocolos seriales de petición/respuesta.
  - icon:
      src: /images/icons/reconnect.svg
      alt: auto-reconexión
    title: Auto-reconexión
    details: >
      Reconexión automática configurable con back-off. La librería maneja el
      ciclo de reconexión; tu código solo escucha los eventos.
  - icon:
      src: /images/icons/parsers.svg
      alt: parsers
    title: Parsers componibles
    details: >
      Incluye parsers `delimiter`, `fixedLength` y `raw`. Implementa
      `SerialParser<T>` para parsear cualquier protocolo binario o de texto.
---
