---
layout: doc
title: Getting Started (v1)
---

# Getting Started — v1

::: warning You are viewing legacy v1 docs
v1 is on security fixes only. For new projects please use [v2 (latest)](/guide/getting-started).
:::

## Requirements

- A Chromium-based browser (Chrome 89+, Edge 89+) with the **Web Serial API** enabled.
- Linux users must add themselves to the `dialout` group:

```bash
sudo usermod -a -G dialout $USER
# Log out and back in for the change to take effect
```

## Installation

```bash
npm install webserial-core
```

> For a pinned v1.x.x release use `npm install webserial-core@^1.2.1`.

## Core concepts

In v1 the main entry point is the `Core` class. You **always subclass it** — you never instantiate `Core` directly. Inside the subclass you implement two abstract-like methods:

| Method                          | Purpose                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `serialSetConnectionConstant()` | Returns the bytes that are sent to the device on connect to identify this client                |
| `serialMessage(code)`           | Called each time the device sends a response; you parse it and `dispatch` the appropriate event |

## Step 1 — Write your device class

```javascript
// arduino.js
import { Core, Devices } from "webserial-core";

export class Arduino extends Core {
  constructor({
    filters = null,
    config_port = {
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      bufferSize: 32768,
      flowControl: "none",
    },
    no_device = 1,
  } = {}) {
    super({ filters, config_port, no_device });

    // Give this device type a name and register it
    this.__internal__.device.type = "arduino";
    Devices.registerType(this.__internal__.device.type);

    if (Devices.getByNumber(this.typeDevice, no_device)) {
      throw new Error(`Device arduino #${no_device} already exists`);
    }

    // Tune timeouts (ms)
    this.__internal__.time.response_connection = 2000;
    this.__internal__.time.response_general = 2000;
    this.__internal__.serial.delay_first_connection = 1000;

    Devices.add(this);

    // Responses will be decoded as plain strings
    this.getResponseAsString();
  }

  // The bytes sent on connect to identify the device
  serialSetConnectionConstant() {
    return this.add0x(this.parseStringToBytes("CONNECT"));
  }

  // Called for every message received from the device
  serialMessage(codex) {
    const message = {
      code: codex,
      name: "unknown",
      description: "Unknown command",
      request: "unknown",
      no_code: 400,
    };

    switch (codex) {
      case "connected":
        message.name = "connected";
        message.description = "Connection established";
        message.request = "connect";
        message.no_code = 100;
        break;
      case "created by danidoble":
        message.name = "thanks";
        message.description = "Thanks for using this software";
        message.request = "credits";
        message.no_code = 101;
        break;
      case "hello there":
        message.name = "hello there";
        message.description = "Hi human";
        message.request = "hi";
        message.no_code = 102;
        break;
    }

    this.dispatch("serial:message", message);
  }

  // --- Public commands ---

  async sayCredits() {
    await this.appendToQueue(this.parseStringToBytes("CREDITS"), "credits");
  }

  async sayHi() {
    await this.appendToQueue(this.parseStringToBytes("HI"), "hi");
  }

  async sendCustomCode({ code = "" } = {}) {
    if (typeof code !== "string") throw new Error("code must be a string");
    await this.appendToQueue(this.parseStringToBytes(code), "custom");
  }
}
```

## Step 2 — Connect and listen to events

```javascript
// main.js
import { Arduino } from "./arduino.js";

const arduino = new Arduino();

arduino.on("serial:connected", () => {
  console.log("Connected!");
});

arduino.on("serial:disconnected", () => {
  console.log("Disconnected");
});

arduino.on("serial:message", (event) => {
  const msg = event.detail;
  console.log(`[${msg.no_code}] ${msg.name}: ${msg.description}`);
});

arduino.on("serial:timeout", (event) => {
  console.warn("Timeout:", event.detail);
});

arduino.on("serial:error", (event) => {
  console.error("Error:", event.detail.message);
});

// Opens the browser port-picker and connects
arduino.connect().catch(console.error);
```

## Step 3 — HTML

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>webserial-core v1 demo</title>
    <script src="./main.js" type="module"></script>
  </head>
  <body>
    <button id="connect">Connect</button>
    <button id="disconnect" hidden>Disconnect</button>
    <button id="hi">Say Hi</button>
    <pre id="log"></pre>

    <script type="module">
      import { arduino } from "./main.js";

      const log = (msg) =>
        (document.getElementById("log").textContent += msg + "\n");

      arduino.on("serial:connected", () => {
        log("Connected");
      });
      arduino.on("serial:disconnected", () => {
        log("Disconnected");
      });
      arduino.on("serial:message", (e) => log(JSON.stringify(e.detail)));
      arduino.on("serial:need-permission", () =>
        log("Permission required — click Connect"),
      );

      document
        .getElementById("connect")
        .addEventListener("click", () =>
          arduino.connect().catch(console.error),
        );
      document
        .getElementById("disconnect")
        .addEventListener("click", () =>
          arduino.disconnect().catch(console.error),
        );
      document
        .getElementById("hi")
        .addEventListener("click", () => arduino.sayHi().catch(console.error));
    </script>
  </body>
</html>
```

## Response format

By default v1 returns device data as **`Uint8Array`**. Call one of the helpers inside your constructor to change the format:

| Method                            | Returns                  |
| --------------------------------- | ------------------------ |
| `this.getResponseAsUint8Array()`  | `Uint8Array` _(default)_ |
| `this.getResponseAsString()`      | decoded `string`         |
| `this.getResponseAsArrayHex()`    | `string[]` hex values    |
| `this.getResponseAsArrayBuffer()` | `ArrayBuffer`            |

## Differences from v2

| Feature                 | v1                        | v2                                       |
| ----------------------- | ------------------------- | ---------------------------------------- |
| Transports              | Web Serial only           | Web Serial, WebUSB, Bluetooth, WebSocket |
| TypeScript generics     | Partial                   | Full                                     |
| Parsers                 | Manual in `serialMessage` | Built-in (delimiter, fixed-length, raw)  |
| Provider injection      | No                        | Yes                                      |
| Auto-reconnect back-off | No                        | Yes                                      |
| Command queue           | ❌                        | ✅                                       |
| Auto-reconnect          | ❌                        | ✅                                       |
| Provider injection      | ❌                        | ✅                                       |
| Tree-shakeable          | ❌                        | ✅                                       |

## Migrating to v2

See the [Migration Guide](/guide/migration-v1-v2) for a step-by-step upgrade path.
