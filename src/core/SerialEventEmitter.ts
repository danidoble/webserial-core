import type { SerialEventMap } from "../types/index";

export class SerialEventEmitter<T> {
  private listeners: {
    [K in keyof SerialEventMap<T>]?: Set<SerialEventMap<T>[K]>;
  } = {};

  public on<K extends keyof SerialEventMap<T>>(
    event: K,
    listener: SerialEventMap<T>[K],
  ): this {
    if (!this.listeners[event]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.listeners[event] = new Set() as any;
    }
    this.listeners[event]!.add(listener);
    return this;
  }

  public off<K extends keyof SerialEventMap<T>>(
    event: K,
    listener: SerialEventMap<T>[K],
  ): this {
    if (this.listeners[event]) {
      this.listeners[event]!.delete(listener);
    }
    return this;
  }

  public emit<K extends keyof SerialEventMap<T>>(
    event: K,
    ...args: Parameters<SerialEventMap<T>[K]>
  ): boolean {
    const eventListeners = this.listeners[event];
    if (!eventListeners || eventListeners.size === 0) {
      return false;
    }
    for (const listener of eventListeners) {
      // @ts-expect-error - Expected TS limitation when spreading destructured args over mapped types
      listener(...args);
    }
    return true;
  }
}
