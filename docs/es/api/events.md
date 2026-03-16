# Eventos

`AbstractSerialDevice<T>` emite los siguientes eventos tipados. Todos tienen el prefijo
`serial:` para evitar colisiones con eventos del DOM.

## Referencia de eventos

### `serial:connecting`

Se dispara inmediatamente cuando se llama a `connect()`, antes de que aparezca el selector de puerto.

```ts
device.on("serial:connecting", () => {
  connectButton.disabled = true;
});
```

**Payload:** ninguno

---

### `serial:connected`

Se dispara después de que el puerto está abierto **y** `handshake()` devuelve `true`.

```ts
device.on("serial:connected", () => {
  console.log("Listo para comunicarse!");
});
```

**Payload:** ninguno

---

### `serial:disconnected`

Se dispara después de que el puerto se cierra, por cualquier motivo (desconexión manual,
error, dispositivo desenchufado). Si `autoReconnect` está habilitado, sigue un intento
de reconexión.

```ts
device.on("serial:disconnected", () => {
  console.log("Conexión perdida.");
});
```

**Payload:** ninguno

---

### `serial:data`

Se dispara cada vez que el parser emite un mensaje completo.

```ts
device.on("serial:data", (value) => {
  // `value` está tipado como T (ej. string cuando se usa delimiter())
  console.log("Recibido:", value);
});
```

**Payload:** `T` — el valor parseado

---

### `serial:sent`

Se dispara después de que los bytes son escritos en el puerto.

```ts
device.on("serial:sent", (bytes) => {
  console.log("Enviado:", bytes);
});
```

**Payload:** `Uint8Array` — los bytes exactos escritos

---

### `serial:error`

Se dispara cuando ocurre un error irrecuperable (error de puerto, fallo de escritura, etc.).

```ts
device.on("serial:error", (error) => {
  console.error("Error serial:", error.message);
});
```

**Payload:** `Error`

---

### `serial:need-permission`

Se dispara cuando el usuario deniega el acceso al puerto o no hay puertos autorizados disponibles.
Es el lugar correcto para volver a habilitar tu botón "Conectar".

```ts
device.on("serial:need-permission", () => {
  connectButton.disabled = false;
});
```

**Payload:** ninguno

---

### `serial:timeout`

Se dispara cuando un comando en cola no completa dentro de `commandTimeout` ms.

```ts
device.on("serial:timeout", (command) => {
  console.warn("Comando expiró:", command);
});
```

**Payload:** `Uint8Array` — los bytes del comando que expiró

---

### `serial:queue-empty`

Se dispara cuando el último comando de la cola termina y la cola queda vacía.

```ts
device.on("serial:queue-empty", () => {
  console.log("Todos los comandos enviados.");
});
```

**Payload:** ninguno

---

### `serial:reconnecting`

Se dispara al inicio de cada intento de auto-reconexión.

```ts
device.on("serial:reconnecting", () => {
  statusLabel.textContent = "Reconectando...";
});
```

**Payload:** ninguno

---

## TypeScript: mapa completo de eventos

```ts
import type { SerialEventMap } from "webserial-core";

// SerialEventMap<T> es:
interface SerialEventMap<T> {
  "serial:connecting": () => void;
  "serial:connected": () => void;
  "serial:disconnected": () => void;
  "serial:data": (value: T) => void;
  "serial:sent": (data: Uint8Array) => void;
  "serial:error": (error: Error) => void;
  "serial:need-permission": () => void;
  "serial:timeout": (command: Uint8Array) => void;
  "serial:queue-empty": () => void;
  "serial:reconnecting": () => void;
}
```
