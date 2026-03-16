---
layout: doc
title: Arduino Example — v1
---

# Arduino example

::: warning Legacy v1 docs
v1 is on security fixes only. For new projects use [v2](/examples/web-serial).
:::

This is a complete working example of connecting to an Arduino via v1 of webserial-core.

## Arduino firmware

Upload the following sketch to your board:

```cpp
// firmware.ino

void setup() {
  Serial.begin(9600);
}

void loop() {
  if (Serial.available() > 0) {
    String comando = Serial.readStringUntil('\n');

    if (comando.startsWith("CONNECT")) {
      Serial.println("connected");
    } else if (comando.startsWith("CREDITS")) {
      Serial.println("created by danidoble");
    } else if (comando.startsWith("HI")) {
      Serial.println("hello there");
    } else {
      Serial.println("ara ara, what are you doing?");
    }
  }
}
```

## Device class

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

    this.__internal__.device.type = "arduino";
    Devices.registerType("arduino");

    if (Devices.getByNumber(this.typeDevice, no_device)) {
      throw new Error(`Device arduino #${no_device} already exists`);
    }

    this.__internal__.time.response_connection = 2000;
    this.__internal__.time.response_general = 2000;
    this.__internal__.serial.delay_first_connection = 1000;

    Devices.add(this);
    this.getResponseAsString();
  }

  serialSetConnectionConstant() {
    return this.add0x(this.parseStringToBytes("CONNECT"));
  }

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
        Object.assign(message, {
          name: "connected",
          description: "Connection established",
          request: "connect",
          no_code: 100,
        });
        break;
      case "created by danidoble":
        Object.assign(message, {
          name: "thanks",
          description: "Thanks for using this software",
          request: "credits",
          no_code: 101,
        });
        break;
      case "hello there":
        Object.assign(message, {
          name: "hello there",
          description: "Hi human",
          request: "hi",
          no_code: 102,
        });
        break;
    }

    this.dispatch("serial:message", message);
  }

  async sayCredits() {
    await this.appendToQueue(this.parseStringToBytes("CREDITS"), "credits");
  }

  async sayHi() {
    await this.appendToQueue(this.parseStringToBytes("HI"), "hi");
  }

  async sendCustomCode({ code = "" } = {}) {
    if (typeof code !== "string") throw new TypeError("code must be a string");
    await this.appendToQueue(this.parseStringToBytes(code), "custom");
  }
}
```

## Connection script

```javascript
// main.js
import { Arduino } from "./arduino.js";

export const arduino = new Arduino();

arduino.on("serial:message", (event) => {
  console.log("[message]", event.detail);
});

arduino.on("serial:timeout", (event) => {
  console.warn("[timeout]", event.detail);
});

arduino.on("serial:error", (event) => {
  console.error("[error]", event.detail);
});

arduino.on("serial:disconnected", () => {
  document.getElementById("log").textContent += "Disconnected\n";
  toggleUI(false);
});

arduino.on("serial:connecting", () => {
  document.getElementById("log").textContent += "Connecting…\n";
});

arduino.on("serial:connected", () => {
  document.getElementById("log").textContent += "Connected!\n";
  toggleUI(true);
});

arduino.on("serial:need-permission", () => {
  document.getElementById("log").textContent +=
    "Permission required — click Connect\n";
});

arduino.on("serial:soft-reload", () => {
  // reset your local variables here
});

arduino.on("serial:unsupported", () => {
  document.getElementById("unsupported").hidden = false;
});

function toggleUI(connected) {
  document.getElementById("connect").hidden = connected;
  document.getElementById("disconnect").hidden = !connected;
}

function tryConnect() {
  arduino.connect().catch(console.error);
}

document.addEventListener("DOMContentLoaded", () => {
  tryConnect();
  document.getElementById("connect").addEventListener("click", tryConnect);
  document.getElementById("disconnect").addEventListener("click", async () => {
    await arduino.disconnect().catch(console.error);
    document.getElementById("log").textContent += "Disconnected by user\n";
  });
  document
    .getElementById("hi")
    .addEventListener("click", () => arduino.sayHi().catch(console.error));
  document
    .getElementById("credits")
    .addEventListener("click", () => arduino.sayCredits().catch(console.error));
});
```

## HTML

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>webserial-core v1 — Arduino demo</title>
    <script src="./main.js" type="module"></script>
  </head>
  <body>
    <h1>Arduino Demo</h1>

    <button id="connect">Connect to serial</button>
    <button id="disconnect" hidden>Disconnect</button>
    <button id="hi">Say Hi</button>
    <button id="credits">Get credits</button>

    <div id="need-permission" hidden>
      Permission denied — click <strong>Connect to serial</strong> to try again.
    </div>

    <div id="unsupported" hidden>
      This browser does not support the Web Serial API. Please use Chrome 89+ or
      Edge 89+.
    </div>

    <pre id="log">Log:&#10;</pre>
  </body>
</html>
```

## Multiple devices

To manage two Arduino boards simultaneously:

```javascript
import { Arduino } from "./arduino.js";
import { Devices } from "webserial-core";

const a1 = new Arduino({ no_device: 1 });
const a2 = new Arduino({ no_device: 2 });

// Connect both at once
await Devices.connectToAll();

// Send a command to board 2 only
await a2.sayHi();
```
