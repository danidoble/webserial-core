# Parsers

Parsers transform a stream of raw `Uint8Array` chunks into structured values
of type `T`. Pass a parser to `SerialDeviceOptions.parser`.

## Built-in parsers

### `delimiter(separator)`

Accumulates bytes until the delimiter sequence is found, then emits the frame
as a **UTF-8 decoded string** (delimiter stripped).

```ts
import { delimiter } from "webserial-core";

// Split on newline — good for Arduino Serial.println()
parser: delimiter("\n");

// Split on carriage-return + newline
parser: delimiter("\r\n");

// Split on a custom binary sequence
parser: delimiter(new Uint8Array([0xaa, 0xff]));
```

| Parameter   | Type                   | Description                                 |
| ----------- | ---------------------- | ------------------------------------------- |
| `separator` | `string \| Uint8Array` | Byte sequence that marks the end of a frame |

**Emits:** `string`

---

### `fixedLength(length)`

Emits every N bytes as a raw `Uint8Array`. Useful for binary protocols with
fixed-size packets.

```ts
import { fixedLength } from "webserial-core";

// Emit every 16 bytes
parser: fixedLength(16);
```

| Parameter | Type     | Description               |
| --------- | -------- | ------------------------- |
| `length`  | `number` | Number of bytes per frame |

**Emits:** `Uint8Array`

---

### `raw()`

Passes each chunk from the port unchanged. Use this when you want to handle
framing yourself.

```ts
import { raw } from "webserial-core";

parser: raw();
```

**Emits:** `Uint8Array`

---

## Custom parsers

Implement `SerialParser<T>` to handle any custom protocol:

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

        // Simple framing: packets start with 0xAA and are 5 bytes long
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
      // Called when the port closes — emit any remaining buffered data
      buffer.length = 0;
    },
  };
}
```

Then use it in your device:

```ts
super({
  baudRate: 115200,
  parser: myProtocolParser(),
});
```

The `T` type parameter on `AbstractSerialDevice<T>` and `SerialEventMap<T>`
will automatically match the type your parser emits.

## Parser interface

```ts
interface SerialParser<T> {
  /** Called for each raw chunk received from the port. */
  transform(chunk: Uint8Array, push: (value: T) => void): void;

  /** Optional — called when the port closes. Flush remaining buffered data. */
  flush?(push: (value: T) => void): void;
}
```
