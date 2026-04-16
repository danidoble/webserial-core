/**
 * @file RegexParser.ts
 *
 * Creates a parser that accumulates incoming bytes into a string and splits it
 * on the provided regular expression, emitting each segment as a string.
 *
 * Equivalent to @serialport/parser-regex adapted to the SerialParser interface.
 */

import type { SerialParser } from "../types/index.js";

export interface RegexParserOptions {
  /** Regular expression used to split the incoming text stream. */
  regex: RegExp | string;
  /** Text encoding used to decode bytes. Defaults to `'utf-8'`. */
  encoding?: string;
}

/**
 * Creates a regex parser that decodes incoming bytes and emits string segments
 * split by the provided regular expression.
 *
 * @param options - Configuration options.
 * @returns A {@link SerialParser} that emits `string` values.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, regexParser } from 'webserial-core';
 *
 * class MyDevice extends AbstractSerialDevice<string> {
 *   constructor() {
 *     super({ baudRate: 9600, parser: regexParser({ regex: /[\r\n]+/ }) });
 *   }
 * }
 * ```
 */
export function regexParser(options: RegexParserOptions): SerialParser<string> {
  const re =
    options.regex instanceof RegExp ? options.regex : new RegExp(options.regex);
  const encoding = options.encoding ?? "utf-8";

  let buffer = "";

  return {
    parse(chunk: Uint8Array, emit: (parsed: string) => void) {
      const decoder = new TextDecoder(encoding);
      buffer += decoder.decode(chunk);

      const parts = buffer.split(re);
      // The last element is the incomplete segment still being accumulated.
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        emit(part);
      }
    },
    reset() {
      buffer = "";
    },
  };
}
