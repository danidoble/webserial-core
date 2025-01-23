import { SerialEvent } from "./SerialEvent.ts";

type AvailableListener = { type: string; listening: boolean };
type AvailableListeners = AvailableListener[];

interface IDispatcher {
  dispatch(type: string, data?: any): void;

  dispatchAsync(type: string, data?: any, ms?: number): void;

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

  dispatch(type: string, data: any = null) {
    const event = new SerialEvent(type, { detail: data });
    this.dispatchEvent(event);
    if (this.__debug__) {
      this.dispatchEvent(new SerialEvent("debug", { detail: { type, data } }));
    }
  }

  dispatchAsync(type: string, data = null, ms = 100) {
    const this1 = this;
    setTimeout(() => {
      this1.dispatch(type, data);
    }, ms);
  }

  on(type: string, callback: EventListenerOrEventListenerObject) {
    if (
      typeof this.__listeners__[type] !== "undefined" &&
      !this.__listeners__[type]
    ) {
      this.__listeners__[type] = true;
    }

    this.addEventListener(type, callback);
  }

  off(type: string, callback: EventListenerOrEventListenerObject) {
    this.removeEventListener(type, callback);
  }

  serialRegisterAvailableListener(type: string) {
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
}
