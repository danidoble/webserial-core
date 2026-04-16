# Parsers

Parsers transform a stream of raw `Uint8Array` chunks into structured values
of type `T`. Pass a parser to `SerialDeviceOptions.parser`.

## Built-in parsers

### `delimiter(separator, options?)`

Accumulates bytes until the delimiter sequence is found, then emits the frame
with the delimiter stripped (unless `includeDelimiter` is `true`).

- When `separator` is a **string**, bytes are decoded as UTF-8 and a `string` is emitted.
- When `separator` is a **`Uint8Array`** or **`number[]`**, raw bytes are emitted as `Uint8Array`.

```ts
import { delimiter } from "webserial-core";

// Split on newline — good for Arduino Serial.println()
parser: delimiter("\n");

// Split on carriage-return + newline
parser: delimiter("\r\n");

// Include the delimiter in the emitted value
parser: delimiter("\n", { includeDelimiter: true });

// Split on a binary sequence — emits Uint8Array
parser: delimiter(new Uint8Array([0x0d, 0x0a]));

// Split using a number array — emits Uint8Array
parser: delimiter([0xaa, 0xff]);
```

| Parameter          | Type                                | Description                                               |
| ------------------ | ----------------------------------- | --------------------------------------------------------- |
| `separator`        | `string \| Uint8Array \| number[]`  | Byte sequence that marks the end of a frame               |
| `options.includeDelimiter` | `boolean`                  | Append the delimiter to each emitted value. Default: `false` |

**Emits:** `string` (when separator is `string`) · `Uint8Array` (when separator is binary)

---

### `readline(options?)`

Splits the byte stream on a configurable line delimiter and emits each line as
a decoded string. Equivalent to `@serialport/parser-readline`.

```ts
import { readline } from "webserial-core";

// Default — split on '\n', UTF-8
parser: readline();

// Custom delimiter and encoding
parser: readline({ delimiter: "\r\n", encoding: "ascii" });

// Include the delimiter
parser: readline({ delimiter: "\n", includeDelimiter: true });
```

| Option             | Type                               | Default  | Description                                     |
| ------------------ | ---------------------------------- | -------- | ----------------------------------------------- |
| `delimiter`        | `string \| Uint8Array \| number[]` | `'\n'`   | Line terminator sequence                        |
| `includeDelimiter` | `boolean`                          | `false`  | Append the delimiter to each emitted string     |
| `encoding`         | `string`                           | `'utf-8'`| Text encoding used to decode bytes              |

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

### `interByteTimeout(options)`

Buffers incoming bytes and emits them after a period of silence (`interval` ms
with no new bytes), or when the buffer reaches `maxBufferSize`. Equivalent to
`@serialport/parser-inter-byte-timeout`.

```ts
import { interByteTimeout } from "webserial-core";

// Emit buffered data after 30 ms of silence
parser: interByteTimeout({ interval: 30 });

// With a max buffer cap
parser: interByteTimeout({ interval: 30, maxBufferSize: 1024 });
```

| Option          | Type     | Default  | Description                                                    |
| --------------- | -------- | -------- | -------------------------------------------------------------- |
| `interval`      | `number` | —        | Silence period in milliseconds before emitting (**required**)  |
| `maxBufferSize` | `number` | `65536`  | Maximum bytes to buffer before forcing an emit                 |

**Emits:** `Uint8Array`

---

### `packetLength(options?)`

Frames packets using a leading delimiter byte and an embedded length field.
Equivalent to `@serialport/parser-packet-length`.

Default packet layout: `[0xAA][0x00][len][payload...][footer]`

```ts
import { packetLength } from "webserial-core";

// Default options
parser: packetLength();

// Custom packet structure: [0xBC][0x00][lenHi][lenLo][cargo...][footer0][footer1]
parser: packetLength({ delimiter: 0xbc, packetOverhead: 5, lengthBytes: 2, lengthOffset: 2 });
```

| Option          | Type     | Default | Description                                                           |
| --------------- | -------- | ------- | --------------------------------------------------------------------- |
| `delimiter`     | `number` | `0xAA`  | Byte value that marks the start of each packet                        |
| `packetOverhead`| `number` | `2`     | Total fixed overhead bytes (delimiter + length field(s) + any footer) |
| `lengthBytes`   | `number` | `1`     | Number of bytes that encode the payload length                        |
| `lengthOffset`  | `number` | `1`     | Byte offset from the delimiter to the first length byte               |
| `maxLen`        | `number` | `0xFF`  | Maximum allowed payload length; packets exceeding this are discarded  |

**Emits:** `Uint8Array`

---

### `regexParser(options)`

Decodes incoming bytes and splits the resulting string on a regular expression,
emitting each segment. Equivalent to `@serialport/parser-regex`.

```ts
import { regexParser } from "webserial-core";

// Split on any combination of \r and \n
parser: regexParser({ regex: /[\r\n]+/ });

// Split on semicolons, case-insensitive
parser: regexParser({ regex: /;+/ });
```

| Option     | Type               | Default   | Description                              |
| ---------- | ------------------ | --------- | ---------------------------------------- |
| `regex`    | `RegExp \| string` | —         | Pattern used to split the incoming text  |
| `encoding` | `string`           | `'utf-8'` | Text encoding used to decode bytes       |

**Emits:** `string`

---

### `readyParser(options)`

Discards all incoming bytes until a configurable "ready" sequence is detected.
After that, every subsequent byte chunk is emitted as-is. Fires an optional
`onReady` callback when the sequence is found. Equivalent to
`@serialport/parser-ready`.

```ts
import { readyParser } from "webserial-core";

parser: readyParser({
  delimiter: "READY\n",
  onReady: () => console.log("device is ready"),
});
```

| Option      | Type                               | Description                                              |
| ----------- | ---------------------------------- | -------------------------------------------------------- |
| `delimiter` | `string \| Uint8Array \| number[]` | Byte sequence that signals the device is ready (**required**) |
| `onReady`   | `() => void`                       | Called once when the ready sequence is detected          |

**Emits:** `Uint8Array` (all data received after the ready sequence)

---

### `ccTalk(maxDelayBetweenBytesMs?)`

Parses [ccTalk](https://en.wikipedia.org/wiki/CcTalk) bus packets. Each packet
is `N + 5` bytes where `N` is the data length in byte 1. The internal buffer is
discarded if no byte arrives within `maxDelayBetweenBytesMs`. Equivalent to
`@serialport/parser-cctalk`.

```ts
import { ccTalk } from "webserial-core";

// Default 50 ms inter-byte timeout
parser: ccTalk();

// Custom timeout
parser: ccTalk(100);
```

| Parameter                | Type     | Default | Description                                             |
| ------------------------ | -------- | ------- | ------------------------------------------------------- |
| `maxDelayBetweenBytesMs` | `number` | `50`    | Maximum silence between bytes before the buffer is reset|

**Emits:** `Uint8Array`

---

### `slipDecoder(options?)`

Decodes a SLIP-framed byte stream (RFC 1055) and emits each packet. Optional
custom escape / end bytes are supported. Equivalent to `SlipDecoder` from
`@serialport/parser-slip-encoder`.

```ts
import { slipDecoder } from "webserial-core";

// Standard SLIP
parser: slipDecoder();

// Custom framing bytes
parser: slipDecoder({ END: 0xc0, ESC: 0xdb, ESC_END: 0xdc, ESC_ESC: 0xdd });

// Bluetooth quirk — expects a START byte before each packet
parser: slipDecoder({ START: 0xc0 });
```

| Option      | Type     | Default | Description                                     |
| ----------- | -------- | ------- | ----------------------------------------------- |
| `END`       | `number` | `0xC0`  | Packet end byte                                 |
| `ESC`       | `number` | `0xDB`  | Escape byte                                     |
| `ESC_END`   | `number` | `0xDC`  | ESC sequence for the END byte                   |
| `ESC_ESC`   | `number` | `0xDD`  | ESC sequence for the ESC byte                   |
| `START`     | `number` | —       | Optional packet start byte                      |
| `ESC_START` | `number` | `ESC`   | ESC sequence for the START byte                 |

**Emits:** `Uint8Array`

#### `slipEncode(data, options?)`

Utility function (not a parser) that SLIP-encodes an outgoing packet before
writing it to the serial port.

```ts
import { slipEncode } from "webserial-core";

const frame = slipEncode(new Uint8Array([0x01, 0xc0, 0x02]));
await device.send(frame);

// Bluetooth quirk — prepends an extra END byte
const frame = slipEncode(payload, { bluetoothQuirk: true });
```

| Option           | Type      | Default | Description                                             |
| ---------------- | --------- | ------- | ------------------------------------------------------- |
| `bluetoothQuirk` | `boolean` | `false` | Prepend an END byte at the beginning of each packet     |
| *(+ all SLIP bytes from above)* | | | |

**Returns:** `Uint8Array`

---

### `spacePacket(options?)`

Parses [CCSDS Space Packet Protocol](https://ccsds.org/Pubs/133x0b2e2.pdf)
frames and emits a structured `SpacePacket` object for each complete packet.
Equivalent to `@serialport/parser-spacepacket`.

```ts
import { spacePacket } from "webserial-core";

// No secondary header
parser: spacePacket();

// With a time code field in the secondary header
parser: spacePacket({ timeCodeFieldLength: 8 });

// With both time code and ancillary data fields
parser: spacePacket({ timeCodeFieldLength: 4, ancillaryDataFieldLength: 2 });
```

| Option                     | Type     | Default | Description                                         |
| -------------------------- | -------- | ------- | --------------------------------------------------- |
| `timeCodeFieldLength`      | `number` | `0`     | Length in bytes of the Time Code Field              |
| `ancillaryDataFieldLength` | `number` | `0`     | Length in bytes of the Ancillary Data Field         |

**Emits:** `SpacePacket`

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
    parse(chunk, emit) {
      for (const byte of chunk) {
        buffer.push(byte);

        // Simple framing: packets start with 0xAA and are 5 bytes long
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
  parse(chunk: Uint8Array, emit: (value: T) => void): void;

  /** Optional — resets internal buffer state (e.g. on reconnect). */
  reset?(): void;
}
```
