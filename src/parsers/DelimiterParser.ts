/**
 * @file DelimiterParser.ts
 *
 * Creates a parser that buffers incoming bytes and emits one complete
 * message for each occurrence of the delimiter sequence.
 * When the delimiter is a string, messages are emitted as strings.
 * When the delimiter is a Uint8Array or number[], messages are emitted as Uint8Array.
 * Trailing delimiters are consumed and not included in the emitted value unless
 * `includeDelimiter` is set to true.
 */

import type { SerialParser } from "../types/index.js";
import { FramedByteBuffer } from "./FramedByteBuffer.js";

export interface DelimiterOptions {
  /** Whether to include the delimiter at the end of each emitted value. Defaults to false. */
  includeDelimiter?: boolean;
  /** Maximum bytes retained without a delimiter. Defaults to 1 MiB. */
  maxFrameLength?: number;
}

/**
 * Normalizes a string | Uint8Array | number[] delimiter into a Uint8Array.
 */
function toDelimiterBytes(char: string | Uint8Array | number[]): Uint8Array {
  if (typeof char === "string") {
    return new TextEncoder().encode(char);
  }
  return char instanceof Uint8Array ? char : new Uint8Array(char);
}

/**
 * Creates a delimiter-based parser that splits the byte stream on the given
 * delimiter and emits string messages.
 *
 * Commonly used with `'\n'` for Arduino `Serial.println()` output.
 *
 * @param char - The delimiter string (e.g. `'\n'`, `'\r\n'`, `';'`).
 * @param options - Optional configuration.
 * @returns A {@link SerialParser} that emits `string` values.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, delimiter } from 'webserial-core';
 *
 * class MyDevice extends AbstractSerialDevice<string> {
 *   constructor() {
 *     super({ baudRate: 9600, parser: delimiter('\n') });
 *   }
 * }
 * ```
 */
export function delimiter(
  char: string,
  options?: DelimiterOptions,
): SerialParser<string>;

/**
 * Creates a delimiter-based parser that splits the byte stream on the given
 * binary delimiter and emits Uint8Array chunks.
 *
 * @param char - The delimiter as a `Uint8Array` or `number[]`.
 * @param options - Optional configuration.
 * @returns A {@link SerialParser} that emits `Uint8Array` values.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, delimiter } from 'webserial-core';
 *
 * class MyDevice extends AbstractSerialDevice<Uint8Array> {
 *   constructor() {
 *     super({ baudRate: 9600, parser: delimiter(new Uint8Array([0x0d, 0x0a])) });
 *   }
 * }
 * ```
 */
export function delimiter(
  char: Uint8Array | number[],
  options?: DelimiterOptions,
): SerialParser<Uint8Array>;

export function delimiter(
  char: string | Uint8Array | number[],
  options?: DelimiterOptions,
): SerialParser<string> | SerialParser<Uint8Array> {
  const includeDelimiter = options?.includeDelimiter ?? false;
  const delimBytes = toDelimiterBytes(char);
  const maxFrameLength = options?.maxFrameLength ?? 1024 * 1024;
  if (delimBytes.length === 0)
    throw new RangeError("Delimiter must not be empty");
  if (!Number.isSafeInteger(maxFrameLength) || maxFrameLength < 1)
    throw new RangeError("maxFrameLength must be a positive integer");

  if (typeof char === "string") {
    const buffer = new FramedByteBuffer();

    return {
      parse(chunk: Uint8Array, emit: (parsed: string) => void) {
        buffer.append(chunk);

        let index: number;
        while ((index = buffer.nextIndex(delimBytes)) !== -1) {
          const end = includeDelimiter ? index + delimBytes.length : index;
          if (index > maxFrameLength)
            throw new RangeError("Delimiter frame exceeds maxFrameLength");
          emit(new TextDecoder().decode(buffer.slice(end)));
          buffer.consume(index + delimBytes.length);
        }
        if (buffer.length > maxFrameLength + delimBytes.length - 1)
          throw new RangeError("Delimiter frame exceeds maxFrameLength");
      },
      reset() {
        buffer.reset();
      },
    } as SerialParser<string>;
  }

  const buffer = new FramedByteBuffer();

  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      buffer.append(chunk);

      let index: number;
      while ((index = buffer.nextIndex(delimBytes)) !== -1) {
        const end = includeDelimiter ? index + delimBytes.length : index;
        if (index > maxFrameLength)
          throw new RangeError("Delimiter frame exceeds maxFrameLength");
        emit(buffer.slice(end));
        buffer.consume(index + delimBytes.length);
      }
      if (buffer.length > maxFrameLength + delimBytes.length - 1)
        throw new RangeError("Delimiter frame exceeds maxFrameLength");
    },
    reset() {
      buffer.reset();
    },
  } as SerialParser<Uint8Array>;
}
