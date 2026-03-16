/**
 * @file FixedLengthParser.ts
 *
 * Creates a parser that accumulates bytes and emits fixed-size chunks.
 * Used for binary protocols where each frame has a known byte count.
 */

import type { SerialParser } from "../types/index.js";

/**
 * Creates a fixed-length parser that buffers bytes and emits
 * `Uint8Array` chunks of exactly `length` bytes.
 *
 * Excess bytes are retained in the internal buffer for the next emission.
 *
 * @param length - The exact number of bytes per emitted chunk. Must be > 0.
 * @returns A {@link SerialParser} that emits `Uint8Array` values.
 * @throws {Error} If `length` is not a positive integer.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, fixedLength } from 'webserial-core';
 *
 * class SensorDevice extends AbstractSerialDevice<Uint8Array> {
 *   constructor() {
 *     super({ baudRate: 115200, parser: fixedLength(8) });
 *   }
 * }
 * ```
 */
export function fixedLength(length: number): SerialParser<Uint8Array> {
  if (length <= 0) {
    throw new Error("FixedLengthParser: length must be greater than 0");
  }

  let buffer = new Uint8Array(0);

  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      while (buffer.length >= length) {
        emit(buffer.slice(0, length));
        buffer = buffer.slice(length);
      }
    },
    reset() {
      buffer = new Uint8Array(0);
    },
  };
}
