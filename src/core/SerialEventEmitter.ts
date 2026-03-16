/**
 * @file SerialEventEmitter.ts
 *
 * A minimal, fully type-safe event emitter used as the base for
 * {@link AbstractSerialDevice}. All event names and callback signatures
 * are constrained by the {@link SerialEventMap} type parameter.
 */

import type { SerialEventMap } from "../types/index.js";

/**
 * Type-safe event emitter base class for serial device events.
 *
 * All event names and listener signatures are derived from the
 * {@link SerialEventMap} generic type, providing full IDE autocomplete
 * and compile-time safety.
 *
 * @typeParam T - The parsed data type, forwarded to `SerialEventMap<T>`.
 */
export class SerialEventEmitter<T> {
  private listeners: {
    [K in keyof SerialEventMap<T>]?: Set<SerialEventMap<T>[K]>;
  } = {};

  /**
   * Registers a listener for the given event.
   *
   * @param event - The event name (constrained to `SerialEventMap` keys).
   * @param listener - The callback to invoke when the event fires.
   * @returns `this` for method chaining.
   */
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

  /**
   * Removes a previously registered listener.
   *
   * @param event - The event name.
   * @param listener - The exact listener reference to remove.
   * @returns `this` for method chaining.
   */
  public off<K extends keyof SerialEventMap<T>>(
    event: K,
    listener: SerialEventMap<T>[K],
  ): this {
    if (this.listeners[event]) {
      this.listeners[event]!.delete(listener);
    }
    return this;
  }

  /**
   * Emits an event, invoking all registered listeners synchronously.
   *
   * @param event - The event name.
   * @param args - Arguments passed to each listener (type-inferred from `SerialEventMap`).
   * @returns `true` if any listeners were invoked, `false` otherwise.
   */
  public emit<K extends keyof SerialEventMap<T>>(
    event: K,
    ...args: Parameters<SerialEventMap<T>[K]>
  ): boolean {
    const eventListeners = this.listeners[event];
    if (!eventListeners || eventListeners.size === 0) {
      return false;
    }
    for (const listener of eventListeners) {
      // @ts-expect-error - TypeScript limitation when spreading over mapped union types
      listener(...args);
    }
    return true;
  }
}
