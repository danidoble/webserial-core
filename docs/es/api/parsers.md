# Parsers

Los parsers transforman un flujo de chunks `Uint8Array` sin procesar en valores
estructurados de tipo `T`. Pasa un parser a `SerialDeviceOptions.parser`.

## Parsers integrados

### `delimiter(separator)`

Acumula bytes hasta encontrar la secuencia delimitadora, luego emite el frame
como un **string decodificado en UTF-8** (sin el delimitador).

```ts
import { delimiter } from "webserial-core";

// Dividir en nueva línea — ideal para Arduino Serial.println()
parser: delimiter("\n");

// Dividir en retorno de carro + nueva línea
parser: delimiter("\r\n");

// Dividir en una secuencia binaria personalizada
parser: delimiter(new Uint8Array([0xaa, 0xff]));
```

| Parámetro   | Tipo                   | Descripción                                        |
| ----------- | ---------------------- | -------------------------------------------------- |
| `separator` | `string \| Uint8Array` | Secuencia de bytes que marca el fin de un frame    |

**Emite:** `string`

---

### `fixedLength(length)`

Emite exactamente N bytes como un `Uint8Array` sin procesar. Útil para protocolos
binarios con paquetes de tamaño fijo.

```ts
import { fixedLength } from "webserial-core";

// Emitir cada 16 bytes
parser: fixedLength(16);
```

| Parámetro | Tipo     | Descripción                |
| --------- | -------- | -------------------------- |
| `length`  | `number` | Número de bytes por frame  |

**Emite:** `Uint8Array`

---

### `raw()`

Pasa cada chunk del puerto sin cambios. Úsalo cuando quieras manejar el
encuadre por tu cuenta.

```ts
import { raw } from "webserial-core";

parser: raw();
```

**Emite:** `Uint8Array`

---

## Parsers personalizados

Implementa `SerialParser<T>` para manejar cualquier protocolo personalizado:

```ts
import type { SerialParser } from "webserial-core";

interface MyPacket {
  command: number;
  payload: Uint8Array;
}

function myProtocolParser(): SerialParser<MyPacket> {
  const buffer: number[] = [];

  return {
    transform(chunk, push) {
      for (const byte of chunk) {
        buffer.push(byte);

        // Encuadre simple: los paquetes empiezan con 0xAA y miden 5 bytes
        if (buffer[0] !== 0xaa) {
          buffer.shift();
          continue;
        }
        if (buffer.length < 5) continue;

        push({
          command: buffer[1],
          payload: new Uint8Array(buffer.splice(0, 5).slice(2)),
        });
      }
    },

    flush(push) {
      // Llamado cuando el puerto se cierra — emite cualquier dato en buffer restante
      buffer.length = 0;
    },
  };
}
```

Luego úsalo en tu dispositivo:

```ts
super({
  baudRate: 115200,
  parser: myProtocolParser(),
});
```

El parámetro de tipo `T` en `AbstractSerialDevice<T>` y `SerialEventMap<T>`
coincidirá automáticamente con el tipo que emite tu parser.

## Interfaz del parser

```ts
interface SerialParser<T> {
  /** Llamado para cada chunk recibido del puerto. */
  transform(chunk: Uint8Array, push: (value: T) => void): void;

  /** Opcional — llamado cuando el puerto se cierra. Vacía los datos en buffer. */
  flush?(push: (value: T) => void): void;
}
```
