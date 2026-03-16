import type { SerialParser } from "../types/index";

export function raw(): SerialParser<Uint8Array> {
  return {
    parse(chunk: Uint8Array, emit: (parsed: Uint8Array) => void) {
      emit(chunk);
    },
    reset() {
      // Nothing to reset
    },
  };
}
