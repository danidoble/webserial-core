# ws-serial-bridge

Puente **WebSocket ↔ SerialPort** para usar con `AbstractSerialDevice` y el
provider WebSocket de `webserial-core` (v2).

```
Browser (WebSocket provider)
        │  ws://localhost:8080
        ▼
  Node.js server.js          ← este paquete
        │  serialport
        ▼
   ESP32 / Arduino
```

## Instalación

```bash
cd ws-serial-bridge
npm install
```

## Uso

```bash
# Arrancar el bridge
npm start

# Modo watch (desarrollo)
npm run dev
```

El servidor escucha por defecto en `ws://localhost:8080`.

## Protocolo de mensajes

Todos los mensajes son JSON stringificado.

### Browser → Node

| `type`       | Payload                                          | Descripción               |
| ------------ | ------------------------------------------------ | ------------------------- |
| `list-ports` | `{ filters: SerialPortFilter[] }`                | Lista puertos disponibles |
| `open`       | `{ path, baudRate, dataBits, stopBits, parity }` | Abre el puerto serial     |
| `write`      | `{ bytes: number[] }`                            | Escribe bytes al puerto   |
| `close`      | —                                                | Cierra el puerto          |

### Node → Browser

| `type`      | Payload               | Descripción                                |
| ----------- | --------------------- | ------------------------------------------ |
| `port-list` | `PortInfo[]`          | Lista de puertos (responde a `list-ports`) |
| `opened`    | `null`                | Puerto abierto correctamente               |
| `data`      | `{ bytes: number[] }` | Datos recibidos del dispositivo            |
| `closed`    | `null`                | Puerto cerrado                             |
| `error`     | `{ message: string }` | Error de puerto                            |

## Firmware ESP32

Flashea `firmware.ino` con el Arduino IDE o PlatformIO.

### Comandos disponibles

| Comando        | Respuesta                               |
| -------------- | --------------------------------------- |
| `CONNECT\n`    | `connected\n` ← requerido por handshake |
| `CREDITS\n`    | `created by danidoble\n`                |
| `LED_ON\n`     | `LED:ON\n`                              |
| `HI\n`         | `hello there\n`                         |
| `OTHERTHING\n` | `ara ara, what are you doing?\n`        |

### Ajustar BAUD_RATE

En el `.ino` cambia la constante y en tu `ArduinoDeviceWS` pasa el mismo valor:

```ts
const arduino = new ArduinoDeviceWS(9600);
```

## Filtros de puerto

Puedes filtrar por VendorId/ProductId en el provider:

```ts
const wsProvider = createWebSocketProvider("ws://localhost:8080");
// Los filtros se pasan en requestPort() al hacer .connect()
```

Los IDs del ESP32 varían por chip USB-serial:

- **CP2102**: `{ usbVendorId: 0x10C4, usbProductId: 0xEA60 }`
- **CH340**: `{ usbVendorId: 0x1A86, usbProductId: 0x7523 }`
- **FTDI**: `{ usbVendorId: 0x0403, usbProductId: 0x6001 }`
