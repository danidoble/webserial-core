/**
 * @file DelimiterParser.ts
 *
 * Creates a parser that buffers incoming bytes and emits one complete
 * string message for each occurrence of the delimiter character(s).
 * Trailing delimiters are consumed and not included in the emitted value.
 */

import type { SerialParser } from "../types/index.js";

/**
 * Creates a delimiter-based parser that splits the byte stream into
 * string messages separated by the given delimiter string.
 *
 * Commonly used with `'\n'` for Arduino `Serial.println()` output.
 *
 * @param char - The delimiter string (e.g. `'\n'`, `'\r\n'`, `';'`).
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
export function delimiter(char: string): SerialParser<string> {
  let buffer = "";
  let textDecoder = new TextDecoder();

  return {
    parse(chunk: Uint8Array, emit: (parsed: string) => void) {
      buffer += textDecoder.decode(chunk, { stream: true });
      let index: number;
      while ((index = buffer.indexOf(char)) !== -1) {
        emit(buffer.slice(0, index));
        buffer = buffer.slice(index + char.length);
      }
    },
    reset() {
      buffer = "";
      textDecoder = new TextDecoder(); // Reset decoding stream
    },
  };
}
