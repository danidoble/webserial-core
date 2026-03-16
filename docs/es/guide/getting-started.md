# Primeros pasos

## Requisitos

| Requisito  | Versión                               |
| ---------- | ------------------------------------- |
| Node.js    | ≥ 18                                  |
| TypeScript | ≥ 5.0                                 |
| Navegador  | Chrome 89+ / Edge 89+ (Web Serial)    |

> **Nota:** Web Serial requiere un contexto seguro (HTTPS o `localhost`) y
> un navegador basado en Chromium. WebUSB y Web Bluetooth tienen requisitos similares.

## Instalación

::: code-group

```bash [npm]
npm install webserial-core
```

```bash [pnpm]
pnpm add webserial-core
```

```bash [bun]
bun add webserial-core
```

:::

## Ejemplo rápido — Web Serial

```ts
import { AbstractSerialDevice, delimiter } from "webserial-core";

class MyDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      autoReconnect: true,
    });
  }

  protected async handshake(): Promise<boolean> {
    // Opcional: enviar un comando y esperar confirmación.
    // Devuelve true para aceptar cualquier puerto.
    return true;
  }
}

const device = new MyDevice();

device.on("serial:connected", () => console.log("Conectado!"));
device.on("serial:data", (line) => console.log("Recibido:", line));
device.on("serial:error", (err) => console.error("Error:", err.message));

// Abre el selector de puertos del navegador y conecta
await device.connect();

// Enviar datos
await device.send("LED_ON\n");

// Desconectar
await device.disconnect();
```

## Cambiar el proveedor de transporte

Los cuatro adaptadores implementan la misma interfaz `SerialProvider`. Inyecta
el proveedor elegido una vez antes de construir cualquier dispositivo:

```ts
import { AbstractSerialDevice } from "webserial-core";
import { WebUsbProvider } from "webserial-core/adapters/web-usb";
// o:
import { createBluetoothProvider } from "webserial-core/adapters/web-bluetooth";
// o:
import { createWebSocketProvider } from "webserial-core/adapters/websocket";

// Polyfill WebUSB (útil en Android Chrome)
AbstractSerialDevice.setProvider(new WebUsbProvider());

// Web Bluetooth NUS
AbstractSerialDevice.setProvider(createBluetoothProvider());

// Puente WebSocket (requiere servidor Node.js — ver demos/websocket/README.md)
AbstractSerialDevice.setProvider(
  createWebSocketProvider("ws://localhost:8080"),
);
```

Después de llamar a `setProvider`, todas las subclases de `AbstractSerialDevice`
usarán ese transporte automáticamente.

## Opciones de configuración

Todas las opciones se pasan en la llamada `super()` del constructor:

```ts
super({
  baudRate: 9600,           // Velocidad en baudios
  dataBits: 8,              // 7 u 8
  stopBits: 1,              // 1 o 2
  parity: "none",           // "none" | "even" | "odd"
  flowControl: "none",      // "none" | "hardware"
  bufferSize: 255,          // Tamaño del buffer de lectura (bytes)
  parser: delimiter("\n"),  // Cómo dividir los bytes entrantes en mensajes
  commandTimeout: 3000,     // ms antes de que un comando expire
  autoReconnect: true,      // Reconectar automáticamente al desconectarse
  autoReconnectInterval: 1500, // ms entre intentos de reconexión
  handshakeTimeout: 2000,   // ms permitidos para que handshake() termine
  filters: [],              // Filtros de vendor/product ID USB
});
```

## Próximos pasos

- Lee la [guía de Arquitectura](./architecture.md) para entender cómo encajan las piezas.
- Consulta la [referencia de API](/es/api/abstract-serial-device) para la documentación completa de métodos y eventos.
- Revisa los [ejemplos](/es/examples/web-serial) con demos listos para usar.
- Prueba los [demos interactivos](/es/demos) directamente en el navegador.
- Si estás actualizando desde v1, consulta la [guía de migración](./migration-v1-v2.md).
