# Web Serial example

Uses the native **Web Serial API** — no polyfill, no extra setup.

## Full example

```ts
import { AbstractSerialDevice, delimiter } from "webserial-core";
import type { SerialPortFilter } from "webserial-core";

class ArduinoDevice extends AbstractSerialDevice<string> {
  constructor(baudRate = 9600, filters?: SerialPortFilter[]) {
    super({
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
      bufferSize: 255,
      commandTimeout: 3000,
      parser: delimiter("\n"),
      autoReconnect: true,
      autoReconnectInterval: 1500,
      handshakeTimeout: 2000,
      filters: filters ?? [],
    });
  }

  protected async handshake(): Promise<boolean> {
    // Send identification command and wait for response
    await this.send("CONNECT\n");
    return new Promise((resolve) => {
      const handler = (data: string) => {
        this.off("serial:data", handler);
        resolve(data.trim() === "connected");
      };
      this.on("serial:data", handler);
    });
  }
}

// ─── Create device ────────────────────────────────────────────

const device = new ArduinoDevice(9600, [
  { usbVendorId: 0x2341 }, // Arduino vendor ID
]);

// ─── Listen to events ─────────────────────────────────────────

device.on("serial:connected", () => console.log("Connected!"));
device.on("serial:disconnected", () => console.log("Disconnected."));
device.on("serial:reconnecting", () => console.log("Reconnecting..."));
device.on("serial:data", (line) => console.log("←", line));
device.on("serial:sent", (bytes) => console.log("→", bytes));
device.on("serial:error", (err) => console.error("Error:", err.message));
device.on("serial:need-permission", () => console.warn("Permission denied"));
device.on("serial:timeout", (cmd) => console.warn("Timeout:", cmd));

// ─── Connect ──────────────────────────────────────────────────

await device.connect(); // opens the port picker

// ─── Send data ────────────────────────────────────────────────

await device.send("LED_ON\n");
await device.send(new Uint8Array([0xaa, 0x01, 0xff])); // binary

// ─── Disconnect ───────────────────────────────────────────────

await device.disconnect();
```

## Minimal example (no handshake)

```ts
import { AbstractSerialDevice, delimiter } from "webserial-core";

class SimpleDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({ baudRate: 9600, parser: delimiter("\n") });
  }

  protected async handshake(): Promise<boolean> {
    return true; // accept any port
  }
}

const device = new SimpleDevice();
device.on("serial:data", (line) => console.log(line));
await device.connect();
```

## Live demo

Run the demo locally:

```bash
npm run dev
# Then open http://localhost:5173/demos/web-serial/
```

Source: [`demos/web-serial/`](https://github.com/danidoble/webserial-core/tree/main/demos/web-serial)
