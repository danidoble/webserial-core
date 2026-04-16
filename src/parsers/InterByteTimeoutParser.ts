/**
 * @file InterByteTimeoutParser.ts
 *
 * Creates a parser that accumulates bytes and emits the buffered data after a
 * period of silence (no incoming bytes) for at least `interval` milliseconds,
 * or when the internal buffer reaches `maxBufferSize` bytes.
 */

import type { SerialParser } from "../types/index.js";

export interface InterByteTimeoutOptions {
  /** Period of silence in milliseconds after which buffered data is emitted. */
  interval: number;
  /** Maximum number of bytes to buffer before forcing an emit. Defaults to 65536. */
  maxBufferSize?: number;
}

/**
 * Creates an inter-byte timeout parser that buffers incoming bytes and emits
 * the accumulated data after a silence period of at least `interval` ms, or
 * when the buffer reaches `maxBufferSize`.
 *
 * @param options - Configuration options.
 * @returns A {@link SerialParser} that emits `Uint8Array` values.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, interByteTimeout } from 'webserial-core';
 *
 * class MyDevice extends AbstractSerialDevice<Uint8Array> {
 *   constructor() {
 *     super({ baudRate: 9600, parser: interByteTimeout({ interval: 30 }) });
 *   }
 * }
 * ```
 */
export function interByteTimeout(
  options: InterByteTimeoutOptions,
): SerialParser<Uint8Array> {
  if (options.interval <= 0) {
    throw new Error("InterByteTimeoutParser: interval must be greater than 0");
  }

  const maxBufferSize = options.maxBufferSize ?? 65536;
  let buffer = new Uint8Array(0);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastEmit: ((parsed: Uint8Array) => void) | null = null;

  function flush(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (buffer.length > 0 && lastEmit !== null) {
      lastEmit(buffer.slice());
      buffer = new Uint8Array(0);
    }
  }

  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      lastEmit = emit;

      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }

      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      if (buffer.length >= maxBufferSize) {
        flush();
        return;
      }

      timer = setTimeout(() => {
        timer = null;
        flush();
      }, options.interval);
    },
    reset() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      buffer = new Uint8Array(0);
      lastEmit = null;
    },
  };
}
