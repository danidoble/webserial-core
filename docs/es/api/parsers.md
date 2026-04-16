# Parsers

Los parsers transforman un flujo de chunks `Uint8Array` sin procesar en valores
estructurados de tipo `T`. Pasa un parser a `SerialDeviceOptions.parser`.

## Parsers integrados

### `delimiter(separator, options?)`

Acumula bytes hasta encontrar la secuencia delimitadora y emite el frame sin el
delimitador (a menos que `includeDelimiter` sea `true`).

- Cuando `separator` es un **string**, los bytes se decodifican como UTF-8 y se
  emite un `string`.
- Cuando `separator` es **`Uint8Array`** o **`number[]`**, se emiten los bytes
  crudos como `Uint8Array`.

```ts
import { delimiter } from "webserial-core";

// Dividir en nueva línea — ideal para Arduino Serial.println()
parser: delimiter("\n");

// Dividir en retorno de carro + nueva línea
parser: delimiter("\r\n");

// Incluir el delimitador en el valor emitido
parser: delimiter("\n", { includeDelimiter: true });

// Dividir en secuencia binaria — emite Uint8Array
parser: delimiter(new Uint8Array([0x0d, 0x0a]));

// Dividir con un array de números — emite Uint8Array
parser: delimiter([0xaa, 0xff]);
```

| Parámetro                     | Tipo                               | Descripción                                                      |
| ----------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `separator`                   | `string \| Uint8Array \| number[]` | Secuencia de bytes que marca el fin de un frame                  |
| `options.includeDelimiter`    | `boolean`                          | Incluir el delimitador al final de cada valor emitido. Por defecto: `false` |

**Emite:** `string` (cuando separator es `string`) · `Uint8Array` (cuando es binario)

---

### `readline(options?)`

Divide el flujo de bytes en líneas usando un delimitador configurable y emite
cada línea como string decodificado. Equivalente a `@serialport/parser-readline`.

```ts
import { readline } from "webserial-core";

// Por defecto — divide en '\n', UTF-8
parser: readline();

// Delimitador y codificación personalizados
parser: readline({ delimiter: "\r\n", encoding: "ascii" });

// Incluir el delimitador
parser: readline({ delimiter: "\n", includeDelimiter: true });
```

| Opción             | Tipo                               | Por defecto | Descripción                                          |
| ------------------ | ---------------------------------- | ----------- | ---------------------------------------------------- |
| `delimiter`        | `string \| Uint8Array \| number[]` | `'\n'`      | Secuencia de fin de línea                            |
| `includeDelimiter` | `boolean`                          | `false`     | Incluir el delimitador al final de cada string       |
| `encoding`         | `string`                           | `'utf-8'`   | Codificación de texto utilizada para decodificar     |

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

| Parámetro | Tipo     | Descripción               |
| --------- | -------- | ------------------------- |
| `length`  | `number` | Número de bytes por frame |

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

### `interByteTimeout(options)`

Acumula bytes y los emite tras un período de silencio (`interval` ms sin bytes
nuevos), o cuando el buffer alcanza `maxBufferSize`. Equivalente a
`@serialport/parser-inter-byte-timeout`.

```ts
import { interByteTimeout } from "webserial-core";

// Emitir datos después de 30 ms de silencio
parser: interByteTimeout({ interval: 30 });

// Con límite máximo de buffer
parser: interByteTimeout({ interval: 30, maxBufferSize: 1024 });
```

| Opción          | Tipo     | Por defecto | Descripción                                                         |
| --------------- | -------- | ----------- | ------------------------------------------------------------------- |
| `interval`      | `number` | —           | Período de silencio en milisegundos antes de emitir (**requerido**) |
| `maxBufferSize` | `number` | `65536`     | Máximo de bytes a acumular antes de forzar la emisión               |

**Emite:** `Uint8Array`

---

### `packetLength(options?)`

Enmarca paquetes usando un byte delimitador inicial y un campo de longitud
embebido. Equivalente a `@serialport/parser-packet-length`.

Estructura de paquete por defecto: `[0xAA][0x00][len][payload...][footer]`

```ts
import { packetLength } from "webserial-core";

// Opciones por defecto
parser: packetLength();

// Estructura personalizada: [0xBC][0x00][lenHi][lenLo][cargo...][footer0][footer1]
parser: packetLength({ delimiter: 0xbc, packetOverhead: 5, lengthBytes: 2, lengthOffset: 2 });
```

| Opción           | Tipo     | Por defecto | Descripción                                                                     |
| ---------------- | -------- | ----------- | ------------------------------------------------------------------------------- |
| `delimiter`      | `number` | `0xAA`      | Byte que marca el inicio de cada paquete                                        |
| `packetOverhead` | `number` | `2`         | Bytes fijos de overhead (delimitador + campo(s) de longitud + footer)           |
| `lengthBytes`    | `number` | `1`         | Número de bytes que codifican la longitud del payload                           |
| `lengthOffset`   | `number` | `1`         | Desplazamiento en bytes desde el delimitador hasta el primer byte de longitud   |
| `maxLen`         | `number` | `0xFF`      | Longitud máxima de payload permitida; paquetes que la superen se descartan      |

**Emite:** `Uint8Array`

---

### `regexParser(options)`

Decodifica los bytes entrantes y divide el texto resultante por una expresión
regular, emitiendo cada segmento. Equivalente a `@serialport/parser-regex`.

```ts
import { regexParser } from "webserial-core";

// Dividir en cualquier combinación de \r y \n
parser: regexParser({ regex: /[\r\n]+/ });

// Dividir en punto y coma
parser: regexParser({ regex: /;+/ });
```

| Opción     | Tipo               | Por defecto | Descripción                                 |
| ---------- | ------------------ | ----------- | ------------------------------------------- |
| `regex`    | `RegExp \| string` | —           | Patrón para dividir el texto entrante       |
| `encoding` | `string`           | `'utf-8'`   | Codificación de texto para decodificar bytes|

**Emite:** `string`

---

### `readyParser(options)`

Descarta todos los bytes hasta detectar una secuencia de "listo" configurable.
A partir de ahí, cada chunk recibido se emite tal cual. Dispara un callback
opcional `onReady` al encontrar la secuencia. Equivalente a
`@serialport/parser-ready`.

```ts
import { readyParser } from "webserial-core";

parser: readyParser({
  delimiter: "READY\n",
  onReady: () => console.log("dispositivo listo"),
});
```

| Opción      | Tipo                               | Descripción                                                        |
| ----------- | ---------------------------------- | ------------------------------------------------------------------ |
| `delimiter` | `string \| Uint8Array \| number[]` | Secuencia que indica que el dispositivo está listo (**requerido**) |
| `onReady`   | `() => void`                       | Llamado una vez cuando se detecta la secuencia de listo            |

**Emite:** `Uint8Array` (todos los datos recibidos después de la secuencia de listo)

---

### `ccTalk(maxDelayBetweenBytesMs?)`

Parsea paquetes del protocolo de bus [ccTalk](https://en.wikipedia.org/wiki/CcTalk).
Cada paquete tiene `N + 5` bytes, donde `N` es la longitud de datos en el byte 1.
El buffer interno se descarta si no llegan bytes dentro de `maxDelayBetweenBytesMs`.
Equivalente a `@serialport/parser-cctalk`.

```ts
import { ccTalk } from "webserial-core";

// Timeout entre bytes por defecto de 50 ms
parser: ccTalk();

// Timeout personalizado
parser: ccTalk(100);
```

| Parámetro                | Tipo     | Por defecto | Descripción                                                  |
| ------------------------ | -------- | ----------- | ------------------------------------------------------------ |
| `maxDelayBetweenBytesMs` | `number` | `50`        | Silencio máximo entre bytes antes de reiniciar el buffer     |

**Emite:** `Uint8Array`

---

### `slipDecoder(options?)`

Decodifica un flujo de bytes con encuadre SLIP (RFC 1055) y emite cada paquete.
Se admiten bytes de escape y fin personalizados. Equivalente a `SlipDecoder` de
`@serialport/parser-slip-encoder`.

```ts
import { slipDecoder } from "webserial-core";

// SLIP estándar
parser: slipDecoder();

// Bytes de encuadre personalizados
parser: slipDecoder({ END: 0xc0, ESC: 0xdb, ESC_END: 0xdc, ESC_ESC: 0xdd });

// Quirk Bluetooth — espera un byte START antes de cada paquete
parser: slipDecoder({ START: 0xc0 });
```

| Opción      | Tipo     | Por defecto | Descripción                                  |
| ----------- | -------- | ----------- | -------------------------------------------- |
| `END`       | `number` | `0xC0`      | Byte de fin de paquete                       |
| `ESC`       | `number` | `0xDB`      | Byte de escape                               |
| `ESC_END`   | `number` | `0xDC`      | Secuencia ESC para el byte END               |
| `ESC_ESC`   | `number` | `0xDD`      | Secuencia ESC para el byte ESC               |
| `START`     | `number` | —           | Byte de inicio de paquete (opcional)         |
| `ESC_START` | `number` | `ESC`       | Secuencia ESC para el byte START             |

**Emite:** `Uint8Array`

#### `slipEncode(data, options?)`

Función utilitaria (no es un parser) que codifica un paquete saliente con SLIP
antes de enviarlo al puerto serie.

```ts
import { slipEncode } from "webserial-core";

const frame = slipEncode(new Uint8Array([0x01, 0xc0, 0x02]));
await device.send(frame);

// Quirk Bluetooth — antepone un byte END extra
const frame = slipEncode(payload, { bluetoothQuirk: true });
```

| Opción           | Tipo      | Por defecto | Descripción                                              |
| ---------------- | --------- | ----------- | -------------------------------------------------------- |
| `bluetoothQuirk` | `boolean` | `false`     | Anteponer un byte END al inicio de cada paquete          |
| *(+ todos los bytes SLIP descritos arriba)* | | | |

**Retorna:** `Uint8Array`

---

### `spacePacket(options?)`

Parsea tramas del [Protocolo de Paquete Espacial CCSDS](https://public.ccsds.org/Pubs/133x0b2e1.pdf)
y emite un objeto `SpacePacket` estructurado por cada paquete completo recibido.
Equivalente a `@serialport/parser-spacepacket`.

```ts
import { spacePacket } from "webserial-core";

// Sin cabecera secundaria
parser: spacePacket();

// Con campo de código de tiempo en la cabecera secundaria
parser: spacePacket({ timeCodeFieldLength: 8 });

// Con campo de código de tiempo y datos auxiliares
parser: spacePacket({ timeCodeFieldLength: 4, ancillaryDataFieldLength: 2 });
```

| Opción                     | Tipo     | Por defecto | Descripción                                            |
| -------------------------- | -------- | ----------- | ------------------------------------------------------ |
| `timeCodeFieldLength`      | `number` | `0`         | Longitud en bytes del campo Time Code                  |
| `ancillaryDataFieldLength` | `number` | `0`         | Longitud en bytes del campo Ancillary Data             |

**Emite:** `SpacePacket`

```ts
interface SpacePacket {
  header: {
    versionNumber: number;
    identification: { apid: number; secondaryHeader: number; type: number };
    sequenceControl: { packetName: number; sequenceFlags: number };
    dataLength: number;
  };
  secondaryHeader?: {
    timeCode?: string;
    ancillaryData?: string;
  };
  data: string;
}
```

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
    parse(chunk, emit) {
      for (const byte of chunk) {
        buffer.push(byte);

        // Encuadre simple: los paquetes empiezan con 0xAA y miden 5 bytes
        if (buffer[0] !== 0xaa) {
          buffer.shift();
          continue;
        }
        if (buffer.length < 5) continue;

        emit({
          command: buffer[1],
          payload: new Uint8Array(buffer.splice(0, 5).slice(2)),
        });
      }
    },

    reset() {
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
  parse(chunk: Uint8Array, emit: (value: T) => void): void;

  /** Opcional — reinicia el estado interno del buffer (por ejemplo, al reconectar). */
  reset?(): void;
}
```
