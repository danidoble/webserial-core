/**
 * @file RawParser.ts
 *
 * A pass-through parser that emits each incoming `Uint8Array` chunk as-is,
 * without any buffering or transformation.
 */

import type { SerialParser } from "../types/index.js";

/**
 * Creates a raw pass-through parser that emits each incoming byte chunk
 * directly without any buffering or splitting.
 *
 * Use this when you want to handle framing yourself, or when the device
 * sends infrequent, self-contained binary packets.
 *
 * @returns A {@link SerialParser} that emits raw `Uint8Array` chunks.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, raw } from 'webserial-core';
 *
 * class RawDevice extends AbstractSerialDevice<Uint8Array> {
 *   constructor() {
 *     super({ baudRate: 115200, parser: raw() });
 *   }
 * }
 * ```
 */
export function raw(): SerialParser<Uint8Array> {
  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      emit(chunk);
    },
    reset() {
      // Nothing to reset
    },
  };
}
