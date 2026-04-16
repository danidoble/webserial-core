/**
 * @file SlipParser.ts
 *
 * Implements SLIP (Serial Line Internet Protocol) framing per RFC 1055.
 *
 * Default byte values:
 *   END      0xC0  — packet delimiter
 *   ESC      0xDB  — escape character
 *   ESC_END  0xDC  — ESC + ESC_END in stream represents END
 *   ESC_ESC  0xDD  — ESC + ESC_ESC in stream represents ESC
 *
 * Optionally a START byte can be configured (used by some Bluetooth SLIP
 * variants per Core Spec 4.0, Volume 4, Part D).
 *
 * `slipDecoder` — SerialParser that decodes incoming SLIP-framed byte streams
 *                  and emits each decoded packet as a Uint8Array.
 *
 * `slipEncode`  — Utility function that SLIP-encodes a single outgoing packet.
 *                  Use this to wrap data before writing to the serial port.
 */

import type { SerialParser } from "../types/index.js";

export interface SlipOptions {
  /** Custom START byte. When set, each packet must begin with this byte. */
  START?: number;
  /** Escape byte for START. Defaults to `0xDB` (same as ESC). */
  ESC_START?: number;
  /** Escape byte. Defaults to `0xDB`. */
  ESC?: number;
  /** Packet end byte. Defaults to `0xC0`. */
  END?: number;
  /** ESC sequence for END byte. Defaults to `0xDC`. */
  ESC_END?: number;
  /** ESC sequence for ESC byte. Defaults to `0xDD`. */
  ESC_ESC?: number;
  /**
   * Adds an END byte at the beginning of each packet (Bluetooth quirk).
   * Only applies to `slipEncode`. Defaults to false.
   */
  bluetoothQuirk?: boolean;
}

const DEFAULTS = {
  END: 0xc0,
  ESC: 0xdb,
  ESC_END: 0xdc,
  ESC_ESC: 0xdd,
};

/**
 * Creates a SLIP decoder parser that strips framing and emits each decoded
 * packet as a `Uint8Array`.
 *
 * @param options - Optional custom framing byte values.
 * @returns A {@link SerialParser} that emits `Uint8Array` values.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, slipDecoder } from 'webserial-core';
 *
 * class MyDevice extends AbstractSerialDevice<Uint8Array> {
 *   constructor() {
 *     super({ baudRate: 115200, parser: slipDecoder() });
 *   }
 * }
 * ```
 */
export function slipDecoder(options?: SlipOptions): SerialParser<Uint8Array> {
  const END = options?.END ?? DEFAULTS.END;
  const ESC = options?.ESC ?? DEFAULTS.ESC;
  const ESC_END = options?.ESC_END ?? DEFAULTS.ESC_END;
  const ESC_ESC = options?.ESC_ESC ?? DEFAULTS.ESC_ESC;
  const START = options?.START;
  const ESC_START = options?.ESC_START ?? ESC;

  let buffer: number[] = [];
  let escaping = false;
  let started = START === undefined;

  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      for (let i = 0; i < chunk.length; i++) {
        const byte = chunk[i];

        if (!started) {
          if (byte === START) {
            started = true;
          }
          continue;
        }

        if (byte === END) {
          if (buffer.length > 0) {
            emit(new Uint8Array(buffer));
            buffer = [];
          }
          if (START !== undefined) {
            started = false;
          }
          escaping = false;
          continue;
        }

        if (escaping) {
          escaping = false;
          if (byte === ESC_END) {
            buffer.push(END);
          } else if (byte === ESC_ESC) {
            buffer.push(ESC);
          } else if (START !== undefined && byte === ESC_START) {
            buffer.push(START);
          } else {
            buffer.push(byte);
          }
          continue;
        }

        if (byte === ESC) {
          escaping = true;
          continue;
        }

        buffer.push(byte);
      }
    },
    reset() {
      buffer = [];
      escaping = false;
      started = START === undefined;
    },
  };
}

/**
 * SLIP-encodes a single outgoing packet.
 *
 * Escapes all END and ESC bytes in `data`, then appends an END byte.
 * If `options.bluetoothQuirk` is true, an additional END byte is prepended.
 *
 * @param data - Raw packet bytes to encode.
 * @param options - Optional custom framing byte values.
 * @returns A new `Uint8Array` containing the SLIP-encoded packet.
 *
 * @example
 * ```ts
 * import { slipEncode } from 'webserial-core';
 *
 * const encoded = slipEncode(new Uint8Array([0x01, 0xC0, 0x02]));
 * // device.send(encoded);
 * ```
 */
export function slipEncode(data: Uint8Array, options?: SlipOptions): Uint8Array {
  const END = options?.END ?? DEFAULTS.END;
  const ESC = options?.ESC ?? DEFAULTS.ESC;
  const ESC_END = options?.ESC_END ?? DEFAULTS.ESC_END;
  const ESC_ESC = options?.ESC_ESC ?? DEFAULTS.ESC_ESC;
  const START = options?.START;
  const ESC_START = options?.ESC_START ?? ESC;
  const bluetoothQuirk = options?.bluetoothQuirk ?? false;

  const out: number[] = [];

  if (bluetoothQuirk) {
    out.push(END);
  }

  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    if (byte === END) {
      out.push(ESC, ESC_END);
    } else if (byte === ESC) {
      out.push(ESC, ESC_ESC);
    } else if (START !== undefined && byte === START) {
      out.push(ESC, ESC_START);
    } else {
      out.push(byte);
    }
  }

  out.push(END);
  return new Uint8Array(out);
}
