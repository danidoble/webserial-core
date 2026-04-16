/**
 * @file ReadyParser.ts
 *
 * Creates a parser that discards all incoming bytes until a configurable
 * "ready" byte sequence is detected.  Once the sequence is found an optional
 * `onReady` callback is invoked and all subsequent bytes are passed through
 * as-is (emitted as raw `Uint8Array` chunks).
 *
 * This mirrors the behaviour of @serialport/parser-ready.
 */

import type { SerialParser } from "../types/index.js";

export interface ReadyParserOptions {
  /** Byte sequence that signals the device is ready. Accepts a string, Uint8Array, or number[]. */
  delimiter: string | Uint8Array | number[];
  /** Called once when the ready sequence is detected. */
  onReady?: () => void;
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
 * Creates a ready parser that waits for the given delimiter sequence and then
 * emits all subsequent data as raw `Uint8Array` chunks.
 *
 * @param options - Configuration options including the ready delimiter.
 * @returns A {@link SerialParser} that emits `Uint8Array` values.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, readyParser } from 'webserial-core';
 *
 * class MyDevice extends AbstractSerialDevice<Uint8Array> {
 *   constructor() {
 *     super({
 *       baudRate: 9600,
 *       parser: readyParser({ delimiter: 'READY\n', onReady: () => console.log('device ready') }),
 *     });
 *   }
 * }
 * ```
 */
export function readyParser(
  options: ReadyParserOptions,
): SerialParser<Uint8Array> {
  const rawDelim = options.delimiter;
  let delimBytes: Uint8Array;
  if (typeof rawDelim === "string") {
    delimBytes = new TextEncoder().encode(rawDelim);
  } else {
    delimBytes =
      rawDelim instanceof Uint8Array ? rawDelim : new Uint8Array(rawDelim);
  }

  let ready = false;
  let buffer = new Uint8Array(0);

  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      if (ready) {
        emit(chunk);
        return;
      }

      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      const index = indexOfBytes(buffer, delimBytes);
      if (index === -1) return;

      ready = true;
      options.onReady?.();

      const remaining = buffer.slice(index + delimBytes.length);
      buffer = new Uint8Array(0);

      if (remaining.length > 0) {
        emit(remaining);
      }
    },
    reset() {
      ready = false;
      buffer = new Uint8Array(0);
    },
  };
}
