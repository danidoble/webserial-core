declare module "Dispatcher" {
  export function dispatch(type: string, data: any): void;
  export function dispatchAsync(type: string, data: any, ms: number): void;
  export function on(type: string, callback: EventListenerOrEventListenerObject): void;
  export function off(type: string, callback: EventListenerOrEventListenerObject): void;
  export function serialRegisterAvailableListener(type: string): void;
  export function availableListeners(): AvailableListeners;
}
