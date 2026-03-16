# Arquitectura

## Visión general

```
┌──────────────────────────────────────────────────────────┐
│                    Tu clase de dispositivo               │
│              (extends AbstractSerialDevice<T>)           │
└───────────────────────┬──────────────────────────────────┘
                        │ hereda
                        ▼
┌──────────────────────────────────────────────────────────┐
│              AbstractSerialDevice<T>                     │
│  ┌─────────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  SerialRegistry │  │ CmdQueue │  │ SerialEventEmit│  │
│  │  (bloqueo port) │  │ (FIFO)   │  │  ter<EventMap> │  │
│  └─────────────────┘  └──────────┘  └────────────────┘  │
│                                                          │
│  connect() / disconnect() / send() / handshake()         │
└───────────────────────┬──────────────────────────────────┘
                        │ delega en
                        ▼
┌──────────────────────────────────────────────────────────┐
│                   SerialProvider                         │
│  (requestPort, getPorts — devuelve objetos SerialPort)   │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────┐ ┌──────────────────┐ ┌───────────┐  │
│  │ Navigator      │ │  WebUsbProvider  │ │ WebBT/WS  │  │
│  │ (Web Serial    │ │  (polyfill USB)  │ │ providers │  │
│  │  API nativa)   │ │                  │ │           │  │
│  └────────────────┘ └──────────────────┘ └───────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Componentes principales

### `AbstractSerialDevice<T>`

La clase base de la que hereda tu dispositivo. Gestiona el ciclo de vida completo de la conexión:

1. **`connect()`** — llama a `provider.requestPort()`, abre el puerto, ejecuta
   `handshake()` y luego inicia el bucle de lectura.
2. **Bucle de lectura** — lee continuamente chunks `Uint8Array` del `ReadableStream`
   del puerto y los procesa con el `SerialParser<T>` configurado.
   Cada vez que el parser emite un valor, se dispara el evento `serial:data`.
3. **`send(data)`** — codifica strings/bytes, encola la escritura en `CommandQueue`
   y la envía al `WritableStream` del puerto.
4. **`disconnect()`** — cancela el bucle de lectura, vacía la cola, cierra el puerto
   y emite `serial:disconnected`.
5. **Auto-reconexión** — si `autoReconnect: true` y la conexión se pierde,
   el dispositivo espera `autoReconnectInterval` ms y llama a `connect()` de nuevo.

### `SerialProvider`

```ts
interface SerialProvider {
  requestPort(options?: { filters?: SerialPortFilter[] }): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}
```

El proveedor predeterminado usa `navigator.serial` (Web Serial API nativa). Inyecta
un proveedor personalizado para WebUSB, Web Bluetooth o WebSocket.

### `SerialParser<T>`

```ts
interface SerialParser<T> {
  transform(chunk: Uint8Array, push: (value: T) => void): void;
  flush?(push: (value: T) => void): void;
}
```

Recibe bytes sin procesar y llama a `push()` por cada mensaje completo. Se incluyen
tres parsers integrados:

| Parser          | Fábrica          | Descripción                                       |
| --------------- | ---------------- | ------------------------------------------------- |
| Delimitador     | `delimiter(sep)` | Divide en una secuencia de bytes (ej. `"\n"`)     |
| Longitud fija   | `fixedLength(n)` | Emite exactamente N bytes                         |
| Sin procesar    | `raw()`          | Pasa cada chunk sin cambios como `Uint8Array`     |

### `CommandQueue`

Una cola FIFO que serializa las escrituras al puerto. Cada llamada a `send()` encola
una escritura. Si un comando no completa en `commandTimeout` ms, se dispara el evento
`serial:timeout` y el siguiente comando continúa.

### `SerialRegistry`

Un singleton global que registra qué puertos están abiertos. Evita que dos instancias
de `AbstractSerialDevice` abran el mismo puerto simultáneamente.

### `SerialEventEmitter<EventMap>`

Un emisor de eventos tipado mínimo. `on`, `off` y `emit` están totalmente tipados
usando el genérico `SerialEventMap<T>`, de modo que TypeScript conoce el tipo exacto
del payload para cada evento.

## Flujo de datos

```
SerialPort.readable (ReadableStream<Uint8Array>)
        │
        ▼
   Bucle de lectura (pump)
        │  Chunks de Uint8Array
        ▼
   SerialParser<T>.transform(chunk, push)
        │  Valores de tipo T
        ▼
   emit("serial:data", value)
        │
        ▼
   Tu manejador de eventos
```

## Inyección de proveedor

```ts
// Global — afecta a todas las instancias de AbstractSerialDevice
AbstractSerialDevice.setProvider(myProvider);

// O pásalo directamente al constructor (por instancia)
super({ ...options, provider: myProvider });
```
