type AvailableListener = {
    type: string;
    listening: boolean;
};
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
export declare class Dispatcher extends EventTarget implements IDispatcher {
    __listeners__: Listeners;
    __debug__: boolean;
    dispatch(type: string, data?: DataType): void;
    dispatchAsync(type: string, data?: null, ms?: number): void;
    on(type: string, callback: EventListenerOrEventListenerObject): void;
    off(type: string, callback: EventListenerOrEventListenerObject): void;
    serialRegisterAvailableListener(type: string): void;
    get availableListeners(): AvailableListeners;
}
export {};
//# sourceMappingURL=Dispatcher.d.ts.map