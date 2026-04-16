/**
 * @file PacketLengthParser.ts
 *
 * Creates a parser that frames packets using a leading delimiter byte followed
 * by a length field embedded at a configurable offset.  The length value
 * describes the payload size; the full packet size is derived from that value
 * plus a fixed overhead.
 *
 * Default packet layout (matches the original @serialport/parser-packet-length):
 *   [0xAA] [0x00] [len] [payload 0]...[payload n-1] [footer]
 *                  ^--- lengthOffset=1 from delimiter
 */

import type { SerialParser } from "../types/index.js";

export interface PacketLengthOptions {
  /** Delimiter byte that marks the start of a packet. Defaults to `0xAA`. */
  delimiter?: number;
  /** Total overhead bytes in the packet (delimiter + length field(s) + any footer). Defaults to `2`. */
  packetOverhead?: number;
  /** Number of consecutive bytes that encode the payload length. Defaults to `1`. */
  lengthBytes?: number;
  /** Byte offset from the delimiter to the first length byte. Defaults to `1`. */
  lengthOffset?: number;
  /** Maximum allowed payload length. Packets exceeding this are discarded. Defaults to `0xFF`. */
  maxLen?: number;
}

/**
 * Creates a packet-length parser that buffers bytes, locates the delimiter,
 * reads the embedded length field, and emits complete packets as `Uint8Array`.
 *
 * @param options - Configuration options.
 * @returns A {@link SerialParser} that emits `Uint8Array` values.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, packetLength } from 'webserial-core';
 *
 * // Packets: [0xBC][0x00][len0][len1][cargo...][footer0][footer1]
 * class MyDevice extends AbstractSerialDevice<Uint8Array> {
 *   constructor() {
 *     super({
 *       baudRate: 115200,
 *       parser: packetLength({ delimiter: 0xbc, packetOverhead: 5, lengthBytes: 2, lengthOffset: 2 }),
 *     });
 *   }
 * }
 * ```
 */
export function packetLength(
  options?: PacketLengthOptions,
): SerialParser<Uint8Array> {
  const delimByte = options?.delimiter ?? 0xaa;
  const overhead = options?.packetOverhead ?? 2;
  const lenBytes = options?.lengthBytes ?? 1;
  const lenOffset = options?.lengthOffset ?? 1;
  const maxLen = options?.maxLen ?? 0xff;

  if (lenOffset + lenBytes > overhead) {
    throw new Error(
      "PacketLengthParser: lengthOffset + lengthBytes must not exceed packetOverhead",
    );
  }

  let buffer = new Uint8Array(0);

  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      while (true) {
        const delimIndex = buffer.indexOf(delimByte);
        if (delimIndex === -1) {
          buffer = new Uint8Array(0);
          break;
        }

        if (delimIndex > 0) {
          buffer = buffer.slice(delimIndex);
        }

        const lengthEnd = lenOffset + lenBytes;
        if (buffer.length < lengthEnd) break;

        let payloadLength = 0;
        for (let i = 0; i < lenBytes; i++) {
          payloadLength = (payloadLength << 8) | buffer[lenOffset + i];
        }

        if (payloadLength > maxLen) {
          buffer = buffer.slice(1);
          continue;
        }

        const totalLength = payloadLength + overhead;
        if (buffer.length < totalLength) break;

        emit(buffer.slice(0, totalLength));
        buffer = buffer.slice(totalLength);
      }
    },
    reset() {
      buffer = new Uint8Array(0);
    },
  };
}
