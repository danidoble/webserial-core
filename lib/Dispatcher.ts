import { SerialEvent } from "./SerialEvent";

type AvailableListener = { type: string; listening: boolean };
type AvailableListeners = AvailableListener[];

type DataType = string | number | boolean | object | null;

interface IDispatcher {
  dispatch(type: string, data?: DataType): void;

  dispatchAsync(type: string, data?: DataType, ms?: number): void;

  on(type: string, callback: EventListener): void;

  off(type: string, callback: EventListener): void;

  serialRegisterAvailableListener(type: string): void;

  availableListeners: AvailableListeners;
}

interface Listeners {
  [key: string]: boolean;

  debug: boolean;
}

export class Dispatcher extends EventTarget implements IDispatcher {
  __listeners__: Listeners = {
    debug: false,
  };
  __debug__: boolean = false;

  __listenersCallbacks__: { key: string; callback: EventListenerOrEventListenerObject }[] = [];

  /**
   * Dispatches an event with the specified type and data
   * @param type - The event type to dispatch
   * @param data - Optional data to attach to the event
   * @example
   * ```typescript
   * dispatcher.dispatch('connected', { port: 'COM3' });
   * ```
   */
  public dispatch(type: string, data: DataType = null) {
    const event = new SerialEvent(type, { detail: data });
    this.dispatchEvent(event);
    if (this.__debug__) {
      this.dispatchEvent(new SerialEvent("debug", { detail: { type, data } }));
    }
  }

  /**
   * Dispatches an event asynchronously after a specified delay
   * @param type - The event type to dispatch
   * @param data - Optional data to attach to the event
   * @param ms - Delay in milliseconds (default: 100)
   * @example
   * ```typescript
   * dispatcher.dispatchAsync('timeout', { reason: 'no response' }, 500);
   * ```
   */
  public dispatchAsync(type: string, data = null, ms = 100) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const this1 = this;
    setTimeout(() => {
      this1.dispatch(type, data);
    }, ms);
  }

  /**
   * Registers an event listener for the specified event type
   * @param type - The event type to listen to
   * @param callback - The callback function to execute when the event is triggered
   * @example
   * ```typescript
   * dispatcher.on('connected', (event) => {
   *   console.log('Device connected', event.detail);
   * });
   * ```
   */
  public on(type: string, callback: EventListenerOrEventListenerObject) {
    if (typeof this.__listeners__[type] !== "undefined" && !this.__listeners__[type]) {
      this.__listeners__[type] = true;
    }

    this.__listenersCallbacks__.push({ key: type, callback });
    this.addEventListener(type, callback);
  }

  /**
   * Removes an event listener for the specified event type
   * @param type - The event type to stop listening to
   * @param callback - The callback function to remove
   * @example
   * ```typescript
   * const handler = (event) => console.log(event.detail);
   * dispatcher.on('data', handler);
   * dispatcher.off('data', handler);
   * ```
   */
  public off(type: string, callback: EventListenerOrEventListenerObject) {
    this.__listenersCallbacks__ = this.__listenersCallbacks__.filter((listener) => {
      return !(listener.key === type && listener.callback === callback);
    });

    this.removeEventListener(type, callback);
  }

  /**
   * Registers an available listener type for tracking
   * @param type - The event type to register
   * @internal
   */
  public serialRegisterAvailableListener(type: string) {
    if (this.__listeners__[type]) return;

    this.__listeners__[type] = false;
  }

  /**
   * Gets the list of all available listeners and their state
   * @returns Array of listener objects with type and listening status
   * @example
   * ```typescript
   * const listeners = dispatcher.availableListeners;
   * console.log(listeners); // [{ type: 'connected', listening: true }, ...]
   * ```
   */
  get availableListeners(): AvailableListeners {
    const keys = Object.keys(this.__listeners__).sort();
    return keys.map((type): AvailableListener => {
      return {
        type,
        listening: this.__listeners__[type],
      };
    });
  }

  /**
   * Removes all event listeners except internal ones (like queue listeners)
   * Resets all listener states to false
   * @example
   * ```typescript
   * dispatcher.removeAllListeners();
   * ```
   */
  public removeAllListeners(): void {
    for (const listener of this.__listenersCallbacks__) {
      if (["internal:queue"].includes(listener.key)) continue; // Skip queue listener

      this.__listenersCallbacks__ = this.__listenersCallbacks__.filter((l) => {
        return !(l.key === listener.key && l.callback === listener.callback);
      });
      this.removeEventListener(listener.key, listener.callback);
    }
    for (const key of Object.keys(this.__listeners__)) {
      this.__listeners__[key] = false;
    }
  }
}
