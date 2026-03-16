import type { SerialParser } from "../types/index";

export function delimiter(char: string): SerialParser<string> {
  let buffer = "";
  let textDecoder = new TextDecoder();

  return {
    parse(chunk: Uint8Array, emit: (parsed: string) => void) {
      buffer += textDecoder.decode(chunk, { stream: true });
      let index: number;
      while ((index = buffer.indexOf(char)) !== -1) {
        emit(buffer.slice(0, index));
        buffer = buffer.slice(index + char.length);
      }
    },
    reset() {
      buffer = "";
      textDecoder = new TextDecoder(); // Reset decoding stream
    },
  };
}
