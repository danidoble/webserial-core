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
    __listenersCallbacks__: {
        key: string;
        callback: EventListenerOrEventListenerObject;
    }[];
    /**
     * Dispatches an event with the specified type and data
     * @param type - The event type to dispatch
     * @param data - Optional data to attach to the event
     * @example
     * ```typescript
     * dispatcher.dispatch('connected', { port: 'COM3' });
     * ```
     */
    dispatch(type: string, data?: DataType): void;
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
    dispatchAsync(type: string, data?: null, ms?: number): void;
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
    on(type: string, callback: EventListenerOrEventListenerObject): void;
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
    off(type: string, callback: EventListenerOrEventListenerObject): void;
    /**
     * Registers an available listener type for tracking
     * @param type - The event type to register
     * @internal
     */
    serialRegisterAvailableListener(type: string): void;
    /**
     * Gets the list of all available listeners and their state
     * @returns Array of listener objects with type and listening status
     * @example
     * ```typescript
     * const listeners = dispatcher.availableListeners;
     * console.log(listeners); // [{ type: 'connected', listening: true }, ...]
     * ```
     */
    get availableListeners(): AvailableListeners;
    /**
     * Removes all event listeners except internal ones (like queue listeners)
     * Resets all listener states to false
     * @example
     * ```typescript
     * dispatcher.removeAllListeners();
     * ```
     */
    removeAllListeners(): void;
}
export {};
//# sourceMappingURL=Dispatcher.d.ts.map