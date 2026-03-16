---
layout: doc
title: Socket.io Bridge Example — v1
---

# Socket.io Bridge example

::: warning Legacy v1 docs
v1 is on security fixes only. For new projects use the [v2 WebSocket provider](/api/websocket-provider).
:::

The Socket.io integration lets you access the serial port from a browser that is **not physically connected** to the device (e.g., a tablet or remote machine on the same network). A small Node.js server owns the USB/serial connection and proxies it over a WebSocket.

## Architecture

```
Browser  ──WebSocket──▶  Node.js bridge server  ──serial port──▶  Device
         (socket.io)      (serialport + socket.io)
```

## Server (Node.js)

```javascript
// server.js
import { SerialPort } from "serialport";
import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: "*" } });

const ports = new Map(); // deviceUUID → SerialPort

io.on("connection", (socket) => {
  console.log("Browser connected:", socket.id);

  socket.on("connectDevice", async ({ config }) => {
    const { uuid, connectionBytes, config: portConfig, info } = config;

    const portPath = info.portName ?? (await autoDetect(portConfig));
    if (!portPath) {
      socket.emit("response", { uuid, type: "error", data: "PORT_NOT_FOUND" });
      return;
    }

    const port = new SerialPort({
      path: portPath,
      baudRate: portConfig.baudRate,
      autoOpen: false,
    });

    await new Promise((res, rej) =>
      port.open((err) => (err ? rej(err) : res())),
    );

    ports.set(uuid, port);

    // Forward incoming data back to the browser
    port.on("data", (data) => {
      socket.emit("response", {
        uuid,
        name: config.name,
        deviceNumber: config.deviceNumber,
        type: "success",
        data: Array.from(data),
      });
    });

    // Send connection bytes
    port.write(Buffer.from(connectionBytes));

    socket.emit("response", { uuid, type: "info", data: "PORT_OPENED" });
  });

  socket.on("cmd", ({ uuid, bytes }) => {
    ports.get(uuid)?.write(Buffer.from(bytes));
  });

  socket.on("disconnectDevice", ({ config }) => {
    const port = ports.get(config.uuid);
    port?.close();
    ports.delete(config.uuid);
    socket.emit("response", { uuid: config.uuid, type: "disconnect" });
  });

  socket.on("disconnectAll", () => {
    for (const [uuid, port] of ports) {
      port.close();
      ports.delete(uuid);
    }
  });

  socket.on("disconnect", () => {
    // clean up all ports this browser owned
    for (const [uuid, port] of ports) {
      port.close();
      ports.delete(uuid);
    }
  });
});

httpServer.listen(3001, () => console.log("Bridge listening on :3001"));
```

Install the server dependencies:

```bash
npm install serialport socket.io
```

## Browser (device class)

The device class is identical to the [Arduino example](./arduino) with one addition — pass `socket: true` to the constructor:

```javascript
// arduino-socket.js
import { Core, Devices } from "webserial-core";

export class Arduino extends Core {
  constructor({ no_device = 1 } = {}) {
    super({
      no_device,
      socket: true, // ← enable socket mode
    });
    this.__internal__.device.type = "arduino";
    Devices.registerType("arduino");
    Devices.add(this);
    this.getResponseAsString();

    // Tell the bridge which port to open
    this.portPath = "/dev/ttyUSB0"; // or "COM3" on Windows
  }

  serialSetConnectionConstant() {
    return this.add0x(this.parseStringToBytes("CONNECT"));
  }

  serialMessage(codex) {
    this.dispatch("serial:message", { code: codex });
  }
}
```

## Browser (connection script)

```javascript
// main.js
import { Arduino } from "./arduino-socket.js";
import { Socket } from "webserial-core";

// 1. Point to your bridge server
Socket.configure("http://localhost:3001");
Socket.prepare();

// 2. Create device — socket mode is set in the constructor
const arduino = new Arduino({ no_device: 1 });

arduino.on("serial:connected", () => console.log("Connected via socket!"));
arduino.on("serial:disconnected", () => console.log("Disconnected"));
arduino.on("serial:message", (e) => console.log(e.detail));

// 3. Connect — Core sends connectDevice over the socket automatically
arduino.connect().catch(console.error);
```

## Custom parser

The bridge server can use two parsers (configured via `device.socketPortParser`):

| Parser               | Property                         | Description                                          |
| -------------------- | -------------------------------- | ---------------------------------------------------- |
| `inter-byte-timeout` | `socketPortParserInterval` (ms)  | Emits after silence — good for text protocols        |
| `byte-length`        | `socketPortParserLength` (bytes) | Emits every N bytes — good for fixed-frame protocols |

```javascript
// inside your constructor:
this.socketPortParser = "inter-byte-timeout";
this.socketPortParserInterval = 30; // ms
```
