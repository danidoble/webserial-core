# WebSocketProvider

`createWebSocketProvider(serverUrl)` devuelve un `SerialProvider` que retransmite
I/O serial a un servidor puente Node.js a través de una conexión WebSocket.

## Cuándo usarlo

- Acceder a puertos seriales en una máquina remota (ej. una Raspberry Pi) desde un navegador.
- Construir interfaces web para dispositivos conectados a un servidor detrás de un firewall.
- Probar código serial en un entorno donde Web Serial no está disponible.

## Importación

```ts
import { createWebSocketProvider } from "webserial-core";
```

## Función de fábrica

```ts
createWebSocketProvider(serverUrl: string): SerialProvider
```

| Parámetro   | Tipo     | Descripción                                                             |
| ----------- | -------- | ----------------------------------------------------------------------- |
| `serverUrl` | `string` | URL WebSocket del servidor puente (ej. `"ws://localhost:8080"`)         |

## Uso

```ts
import {
  AbstractSerialDevice,
  delimiter,
  createWebSocketProvider,
} from "webserial-core";

AbstractSerialDevice.setProvider(
  createWebSocketProvider("ws://localhost:8080"),
);

class MyDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
      parser: delimiter("\n"),
      autoReconnect: true,
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
  }
}

const device = new MyDevice();
await device.connect(); // Conecta al primer puerto listado por el puente
```

## Servidor puente

Se incluye un servidor puente Node.js listo para usar en
`demos/websocket/server.js`. Ve el
[README del demo del puente WebSocket](https://github.com/danidoble/webserial-core/tree/main/demos/websocket)
para las instrucciones de configuración.

## Protocolo de comunicación

Todos los mensajes son objetos JSON enviados sobre la conexión WebSocket.

| Dirección          | Tipo         | Descripción del payload                                  |
| ------------------ | ------------ | -------------------------------------------------------- |
| Navegador → Server | `list-ports` | `{ filters: SerialPortFilter[] }`                        |
| Server → Navegador | `port-list`  | `{ payload: PortInfo[] }`                                |
| Navegador → Server | `open`       | `{ path, baudRate, dataBits, stopBits, parity, parser }` |
| Server → Navegador | `opened`     | confirmación                                             |
| Navegador → Server | `write`      | `{ bytes: number[] }`                                    |
| Server → Navegador | `data`       | `{ bytes: number[] }`                                    |
| Navegador → Server | `close`      | —                                                        |
| Server → Navegador | `closed`     | —                                                        |
| Server → Navegador | `error`      | `{ payload: { message: string } }`                       |

## Selección de puerto

`requestPort()` abre una nueva conexión WebSocket, solicita la lista de puertos y
**selecciona automáticamente el primer puerto disponible**. Para aplicaciones en
producción, muestra un selector de UI sobre la lista de puertos devuelta antes de
llamar a `open`.

## Nota de seguridad

El servidor puente tiene acceso directo a los puertos seriales. Despliégalo
solo en redes de confianza y añade autenticación para cualquier configuración
expuesta a internet.
