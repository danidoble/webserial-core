type empty = void | PromiseLike<void>;

export function wait(ms: number = 100): Promise<void> {
  return new Promise(
    (resolve: (value: empty) => void): ReturnType<typeof setTimeout> => setTimeout((): void => resolve(), ms),
  );
}

/*
 * @deprecated This function is deprecated and will be removed in future versions.
 */
export function supportWebSerial(): boolean {
  return "serial" in navigator;
}
