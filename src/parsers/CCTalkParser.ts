/**
 * @file CCTalkParser.ts
 *
 * Creates a parser for the ccTalk bus protocol.
 *
 * Each ccTalk message has the following structure:
 *   Byte 0: Destination address
 *   Byte 1: Number of data bytes (N)
 *   Byte 2: Source address
 *   Byte 3: Header
 *   Bytes 4..4+N-1: Data bytes
 *   Last byte: Checksum
 *
 * Total packet length = N + 5.
 *
 * The `maxDelayBetweenBytesMs` option resets the internal buffer if no byte is
 * received within the given interval, preventing stale partial packets from
 * blocking future messages.
 */

import type { SerialParser } from "../types/index.js";

/**
 * Creates a ccTalk parser that emits complete ccTalk packets as `Uint8Array`.
 *
 * @param maxDelayBetweenBytesMs - Maximum allowed silence between bytes before
 *   the buffer is discarded. Defaults to `50`.
 * @returns A {@link SerialParser} that emits `Uint8Array` values.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, ccTalk } from 'webserial-core';
 *
 * class CoinAcceptor extends AbstractSerialDevice<Uint8Array> {
 *   constructor() {
 *     super({ baudRate: 9600, parser: ccTalk(100) });
 *   }
 * }
 * ```
 */
export function ccTalk(maxDelayBetweenBytesMs: number = 50): SerialParser<Uint8Array> {
  let buffer = new Uint8Array(0);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function processBuffer(emit: (parsed: Uint8Array) => void): void {
    while (true) {
      if (buffer.length < 2) break;
      const dataLength = buffer[1];
      const packetLength = dataLength + 5;
      if (buffer.length < packetLength) break;
      emit(buffer.slice(0, packetLength));
      buffer = buffer.slice(packetLength);
    }
  }

  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }

      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      processBuffer(emit);

      if (buffer.length > 0) {
        timer = setTimeout(() => {
          buffer = new Uint8Array(0);
          timer = null;
        }, maxDelayBetweenBytesMs);
      }
    },
    reset() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      buffer = new Uint8Array(0);
    },
  };
}
