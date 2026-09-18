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
import { FramedByteBuffer } from "./FramedByteBuffer.js";

export interface ReadlineOptions {
  /** Line delimiter. Defaults to `'\n'`. Accepts a string, Uint8Array, or number[]. */
  delimiter?: string | Uint8Array | number[];
  /** Include the delimiter at the end of each emitted string. Defaults to false. */
  includeDelimiter?: boolean;
  /** Text encoding used to decode bytes. Defaults to `'utf-8'`. */
  encoding?: string;
  /** Maximum bytes retained without a delimiter. Defaults to 1 MiB. */
  maxFrameLength?: number;
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
  const maxFrameLength = options?.maxFrameLength ?? 1024 * 1024;
  if (!Number.isSafeInteger(maxFrameLength) || maxFrameLength < 1)
    throw new RangeError("maxFrameLength must be a positive integer");

  const rawDelim = options?.delimiter ?? "\n";
  let delimBytes: Uint8Array;
  if (typeof rawDelim === "string") {
    delimBytes = new TextEncoder().encode(rawDelim);
  } else {
    delimBytes =
      rawDelim instanceof Uint8Array ? rawDelim : new Uint8Array(rawDelim);
  }
  if (delimBytes.length === 0)
    throw new RangeError("Delimiter must not be empty");

  const buffer = new FramedByteBuffer();

  return {
    parse(chunk: Uint8Array, emit: (parsed: string) => void) {
      buffer.append(chunk);

      let index: number;
      while ((index = buffer.nextIndex(delimBytes)) !== -1) {
        const end = includeDelimiter ? index + delimBytes.length : index;
        if (index > maxFrameLength)
          throw new RangeError("Readline frame exceeds maxFrameLength");
        const decoder = new TextDecoder(encoding);
        emit(decoder.decode(buffer.slice(end)));
        buffer.consume(index + delimBytes.length);
      }
      if (buffer.length > maxFrameLength + delimBytes.length - 1)
        throw new RangeError("Readline frame exceeds maxFrameLength");
    },
    reset() {
      buffer.reset();
    },
  };
}
