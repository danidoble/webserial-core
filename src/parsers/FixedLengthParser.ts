import type { SerialParser } from "../types/index";

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
