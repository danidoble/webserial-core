type empty = void | PromiseLike<void>;

export function wait(ms: number = 100): Promise<void> {
  return new Promise(
    (resolve: (value: empty) => void): ReturnType<typeof setTimeout> => setTimeout((): void => resolve(), ms),
  );
}

export function supportWebSerial(): boolean {
  return "serial" in navigator;
}

export function getSeconds(seconds = 1): number {
  return seconds * 1000;
}
