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

export interface DelimiterOptions {
  /** Whether to include the delimiter at the end of each emitted value. Defaults to false. */
  includeDelimiter?: boolean;
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
 * Returns the index of the first occurrence of `needle` in `haystack`,
 * or -1 if not found.
 */
function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  if (needle.length === 0) return 0;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
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

  if (typeof char === "string") {
    let buffer = new Uint8Array(0);
    let textDecoder = new TextDecoder();

    return {
      parse(chunk: Uint8Array, emit: (parsed: string) => void) {
        const newBuffer = new Uint8Array(buffer.length + chunk.length);
        newBuffer.set(buffer);
        newBuffer.set(chunk, buffer.length);
        buffer = newBuffer;

        let index: number;
        while ((index = indexOfBytes(buffer, delimBytes)) !== -1) {
          const end = includeDelimiter ? index + delimBytes.length : index;
          emit(textDecoder.decode(buffer.slice(0, end)));
          textDecoder = new TextDecoder();
          buffer = buffer.slice(index + delimBytes.length);
        }
      },
      reset() {
        buffer = new Uint8Array(0);
        textDecoder = new TextDecoder();
      },
    } as SerialParser<string>;
  }

  let buffer = new Uint8Array(0);

  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      let index: number;
      while ((index = indexOfBytes(buffer, delimBytes)) !== -1) {
        const end = includeDelimiter ? index + delimBytes.length : index;
        emit(buffer.slice(0, end));
        buffer = buffer.slice(index + delimBytes.length);
      }
    },
    reset() {
      buffer = new Uint8Array(0);
    },
  } as SerialParser<Uint8Array>;
}
