/**
 * @file ReadlineParser.ts
 *
 * Creates a parser that buffers incoming bytes and emits one decoded string per
 * line.  Equivalent to @serialport/parser-readline but adapted to the
 * SerialParser interface.
 *
 * The delimiter defaults to `'\n'` and encoding defaults to `'utf-8'`.
 * The delimiter is consumed and not included in the emitted string unless
 * `includeDelimiter` is set to true.
 */

import type { SerialParser } from "../types/index.js";

export interface ReadlineOptions {
  /** Line delimiter. Defaults to `'\n'`. Accepts a string, Uint8Array, or number[]. */
  delimiter?: string | Uint8Array | number[];
  /** Include the delimiter at the end of each emitted string. Defaults to false. */
  includeDelimiter?: boolean;
  /** Text encoding used to decode bytes. Defaults to `'utf-8'`. */
  encoding?: string;
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
 * Creates a readline parser that splits the byte stream on a newline (or
 * custom delimiter) and emits each line as a decoded string.
 *
 * @param options - Optional configuration.
 * @returns A {@link SerialParser} that emits `string` values.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, readline } from 'webserial-core';
 *
 * class MyDevice extends AbstractSerialDevice<string> {
 *   constructor() {
 *     super({ baudRate: 9600, parser: readline() });
 *   }
 * }
 * ```
 */
export function readline(options?: ReadlineOptions): SerialParser<string> {
  const encoding = options?.encoding ?? "utf-8";
  const includeDelimiter = options?.includeDelimiter ?? false;

  const rawDelim = options?.delimiter ?? "\n";
  let delimBytes: Uint8Array;
  if (typeof rawDelim === "string") {
    delimBytes = new TextEncoder().encode(rawDelim);
  } else {
    delimBytes =
      rawDelim instanceof Uint8Array ? rawDelim : new Uint8Array(rawDelim);
  }

  let buffer = new Uint8Array(0);

  return {
    parse(chunk: Uint8Array, emit: (parsed: string) => void) {
      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      let index: number;
      while ((index = indexOfBytes(buffer, delimBytes)) !== -1) {
        const end = includeDelimiter ? index + delimBytes.length : index;
        const decoder = new TextDecoder(encoding);
        emit(decoder.decode(buffer.slice(0, end)));
        buffer = buffer.slice(index + delimBytes.length);
      }
    },
    reset() {
      buffer = new Uint8Array(0);
    },
  };
}
