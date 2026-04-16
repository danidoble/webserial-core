/**
 * @file SpacePacketParser.ts
 *
 * Creates a parser for CCSDS Space Packet Protocol (SPP) as defined in
 * CCSDS 133.0-B-2.
 *
 * Primary Header (always 6 bytes):
 *   Bits  0– 2: Version Number (3 bits)
 *   Bit   3   : Packet Type (0 = telemetry, 1 = telecommand)
 *   Bit   4   : Secondary Header Flag
 *   Bits  5–15: APID (11 bits)
 *   Bits 16–17: Sequence Flags (2 bits)
 *   Bits 18–31: Packet Sequence Count (14 bits)
 *   Bits 32–47: Packet Data Length (16 bits) — octets in data field minus 1
 *
 * Secondary Header (optional, present when Secondary Header Flag = 1):
 *   First `timeCodeFieldLength` bytes  → Time Code Field
 *   Next `ancillaryDataFieldLength` bytes → Ancillary Data Field
 *
 * Total packet byte count = 6 + Packet Data Length + 1
 */

import type { SerialParser } from "../types/index.js";

export interface SpacePacketOptions {
  /** Length in bytes of the Time Code Field in the secondary header. Defaults to 0. */
  timeCodeFieldLength?: number;
  /** Length in bytes of the Ancillary Data Field in the secondary header. Defaults to 0. */
  ancillaryDataFieldLength?: number;
}

export interface SpacePacketHeader {
  versionNumber: number;
  identification: {
    apid: number;
    secondaryHeader: number;
    type: number;
  };
  sequenceControl: {
    packetName: number;
    sequenceFlags: number;
  };
  dataLength: number;
}

export interface SpacePacketSecondaryHeader {
  timeCode?: string;
  ancillaryData?: string;
}

export interface SpacePacket {
  header: SpacePacketHeader;
  secondaryHeader?: SpacePacketSecondaryHeader;
  data: string;
}

/**
 * Creates a Space Packet Protocol parser that buffers bytes and emits a
 * structured {@link SpacePacket} object for each complete packet received.
 *
 * @param options - Optional secondary-header field lengths.
 * @returns A {@link SerialParser} that emits {@link SpacePacket} objects.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, spacePacket } from 'webserial-core';
 *
 * class TelemetryDevice extends AbstractSerialDevice<SpacePacket> {
 *   constructor() {
 *     super({ baudRate: 115200, parser: spacePacket({ timeCodeFieldLength: 8 }) });
 *   }
 * }
 * ```
 */
export function spacePacket(
  options?: SpacePacketOptions,
): SerialParser<SpacePacket> {
  const timeCodeLen = options?.timeCodeFieldLength ?? 0;
  const ancillaryLen = options?.ancillaryDataFieldLength ?? 0;

  const PRIMARY_HEADER_SIZE = 6;
  let buffer = new Uint8Array(0);

  function parsePacket(raw: Uint8Array): SpacePacket {
    const byte0 = raw[0];
    const byte1 = raw[1];
    const byte2 = raw[2];
    const byte3 = raw[3];
    const byte4 = raw[4];
    const byte5 = raw[5];

    const versionNumber = (byte0 >> 5) & 0x07;
    const type = (byte0 >> 4) & 0x01;
    const secondaryHeaderFlag = (byte0 >> 3) & 0x01;
    const apid = ((byte0 & 0x07) << 8) | byte1;
    const sequenceFlags = (byte2 >> 6) & 0x03;
    const packetName = ((byte2 & 0x3f) << 8) | byte3;
    const dataLength = (byte4 << 8) | byte5;

    const header: SpacePacketHeader = {
      versionNumber,
      identification: { apid, secondaryHeader: secondaryHeaderFlag, type },
      sequenceControl: { packetName, sequenceFlags },
      dataLength,
    };

    let secondaryHeader: SpacePacketSecondaryHeader | undefined;
    let dataOffset = PRIMARY_HEADER_SIZE;

    if (secondaryHeaderFlag === 1) {
      secondaryHeader = {};
      const decoder = new TextDecoder("latin1");
      if (timeCodeLen > 0) {
        secondaryHeader.timeCode = decoder.decode(
          raw.slice(dataOffset, dataOffset + timeCodeLen),
        );
        dataOffset += timeCodeLen;
      }
      if (ancillaryLen > 0) {
        secondaryHeader.ancillaryData = decoder.decode(
          raw.slice(dataOffset, dataOffset + ancillaryLen),
        );
        dataOffset += ancillaryLen;
      }
    }

    const dataDecoder = new TextDecoder("latin1");
    const data = dataDecoder.decode(raw.slice(dataOffset));

    return { header, secondaryHeader, data };
  }

  return {
    parse(chunk: Uint8Array, emit: (parsed: SpacePacket) => void) {
      const newBuffer = new Uint8Array(buffer.length + chunk.length);
      newBuffer.set(buffer);
      newBuffer.set(chunk, buffer.length);
      buffer = newBuffer;

      while (buffer.length >= PRIMARY_HEADER_SIZE) {
        const dataLength = (buffer[4] << 8) | buffer[5];
        const totalLength = PRIMARY_HEADER_SIZE + dataLength + 1;

        if (buffer.length < totalLength) break;

        emit(parsePacket(buffer.slice(0, totalLength)));
        buffer = buffer.slice(totalLength);
      }
    },
    reset() {
      buffer = new Uint8Array(0);
    },
  };
}
