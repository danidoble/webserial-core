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

  public dispatch(type: string, data: DataType = null) {
    const event = new SerialEvent(type, { detail: data });
    this.dispatchEvent(event);
    if (this.__debug__) {
      this.dispatchEvent(new SerialEvent("debug", { detail: { type, data } }));
    }
  }

  public dispatchAsync(type: string, data = null, ms = 100) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const this1 = this;
    setTimeout(() => {
      this1.dispatch(type, data);
    }, ms);
  }

  public on(type: string, callback: EventListenerOrEventListenerObject) {
    if (typeof this.__listeners__[type] !== "undefined" && !this.__listeners__[type]) {
      this.__listeners__[type] = true;
    }

    this.__listenersCallbacks__.push({ key: type, callback });
    this.addEventListener(type, callback);
  }

  public off(type: string, callback: EventListenerOrEventListenerObject) {
    this.__listenersCallbacks__ = this.__listenersCallbacks__.filter((listener) => {
      return !(listener.key === type && listener.callback === callback);
    });

    this.removeEventListener(type, callback);
  }

  public serialRegisterAvailableListener(type: string) {
    if (this.__listeners__[type]) return;

    this.__listeners__[type] = false;
  }

  get availableListeners(): AvailableListeners {
    const keys = Object.keys(this.__listeners__).sort();
    return keys.map((type): AvailableListener => {
      return {
        type,
        listening: this.__listeners__[type],
      };
    });
  }

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
