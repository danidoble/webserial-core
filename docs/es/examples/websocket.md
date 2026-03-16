# Ejemplo del Puente WebSocket

Usa **WebSocketProvider** para enrutar I/O serial a través de un servidor
puente Node.js sobre WebSocket. El navegador nunca toca el puerto serial
directamente — todo el I/O ocurre en el servidor y se retransmite vía mensajes JSON.

## Arquitectura

```
Navegador (webserial-core)
        │  ws://localhost:8080  mensajes JSON
        ▼
Puente Node.js (demos/websocket/server.js)
        │  serialport
        ▼
Dispositivo físico
```

## 1. Iniciar el servidor puente

```bash
cd demos/websocket
npm install
node server.js
# Escuchando en ws://localhost:8080
```

## 2. Código del navegador

```ts
import {
  AbstractSerialDevice,
  delimiter,
  createWebSocketProvider,
} from "webserial-core";

AbstractSerialDevice.setProvider(
  createWebSocketProvider("ws://localhost:8080"),
);

class BridgedDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
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
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new BridgedDevice();

device.on("serial:connected", () => console.log("Conectado via WebSocket!"));
device.on("serial:data", (line) => console.log("←", line));
device.on("serial:reconnecting", () => console.log("Reconectando..."));
device.on("serial:error", (err) => console.error(err.message));

await device.connect();
await device.send("LED_ON\n");
```

## Referencia del protocolo

| Navegador → Servidor                    | Descripción             |
| --------------------------------------- | ----------------------- |
| `{ type: "list-ports", filters: [] }`   | Solicitar puertos       |
| `{ type: "open", path, baudRate, ... }` | Abrir un puerto         |
| `{ type: "write", bytes: number[] }`    | Enviar bytes            |
| `{ type: "close" }`                     | Cerrar el puerto        |

| Servidor → Navegador                         | Descripción               |
| -------------------------------------------- | ------------------------- |
| `{ type: "port-list", payload: PortInfo[] }` | Puertos disponibles       |
| `{ type: "opened" }`                         | Puerto abierto con éxito  |
| `{ type: "data", bytes: number[] }`          | Bytes seriales entrantes  |
| `{ type: "closed" }`                         | Puerto cerrado            |
| `{ type: "error", payload: { message } }`    | Error                     |

## Conectar a una máquina remota

Cambia la URL del servidor para apuntar a tu host remoto:

```ts
createWebSocketProvider("ws://mi-raspberry-pi.local:8080");
```

> **Seguridad:** El puente tiene acceso directo a los puertos seriales. Añade
> middleware de autenticación antes de exponerlo fuera de `localhost`.

## Demo local

```bash
# Terminal 1: servidor puente
cd demos/websocket && npm install && node server.js

# Terminal 2: servidor de desarrollo Vite
npm run dev

# Abrir http://localhost:5173/demos/websocket/
```

Código fuente: [`demos/websocket/`](https://github.com/danidoble/webserial-core/tree/main/demos/websocket)
