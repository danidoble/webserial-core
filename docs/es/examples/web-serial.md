# Ejemplo de Web Serial

Usa la **Web Serial API** nativa — sin polyfill, sin configuración adicional.

## Ejemplo completo

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
    // Enviar comando de identificación y esperar respuesta
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

// ─── Crear dispositivo ────────────────────────────────────────

const device = new ArduinoDevice(9600, [
  { usbVendorId: 0x2341 }, // Vendor ID de Arduino
]);

// ─── Escuchar eventos ─────────────────────────────────────────

device.on("serial:connected", () => console.log("Conectado!"));
device.on("serial:disconnected", () => console.log("Desconectado."));
device.on("serial:reconnecting", () => console.log("Reconectando..."));
device.on("serial:data", (line) => console.log("←", line));
device.on("serial:sent", (bytes) => console.log("→", bytes));
device.on("serial:error", (err) => console.error("Error:", err.message));
device.on("serial:need-permission", () => console.warn("Permiso denegado"));
device.on("serial:timeout", (cmd) => console.warn("Timeout:", cmd));

// ─── Conectar ─────────────────────────────────────────────────

await device.connect(); // abre el selector de puerto

// ─── Enviar datos ─────────────────────────────────────────────

await device.send("LED_ON\n");
await device.send(new Uint8Array([0xaa, 0x01, 0xff])); // binario

// ─── Desconectar ──────────────────────────────────────────────

await device.disconnect();
```

## Ejemplo mínimo (sin handshake)

```ts
import { AbstractSerialDevice, delimiter } from "webserial-core";

class SimpleDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({ baudRate: 9600, parser: delimiter("\n") });
  }

  protected async handshake(): Promise<boolean> {
    return true; // aceptar cualquier puerto
  }
}

const device = new SimpleDevice();
device.on("serial:data", (line) => console.log(line));
await device.connect();
```

## Demo interactivo

Prueba este ejemplo directamente en tu navegador sin necesidad de compilar:

👉 **[Abrir demo Web Serial](/demos/web-serial.html)**

O ejecuta el demo localmente:

```bash
npm run dev
# Luego abre http://localhost:5173/demos/web-serial/
```

Código fuente: [`demos/web-serial/`](https://github.com/danidoble/webserial-core/tree/main/demos/web-serial)
