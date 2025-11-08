import { Core } from "./Core";
import { Dispatcher } from "./Dispatcher";
interface IDevice {
    [key: string]: Core;
}
interface IDevices {
    [key: string]: IDevice;
}
/**
 * Manages and tracks all serial devices in the application
 * Provides a centralized registry for device instances
 * @extends Dispatcher
 */
export declare class Devices extends Dispatcher {
    static instance: Devices;
    static devices: IDevices;
    constructor();
    static $dispatchChange(device?: Core | null): void;
    static typeError(type: string): void;
    /**
     * Registers a new device type in the registry
     * @param type - The type name of the device (e.g., 'arduino', 'esp32')
     * @internal
     */
    static registerType(type: string): void;
    /**
     * Adds a device to the registry
     * @param device - The Core device instance to add
     * @returns The index of the device in its type registry
     * @throws {Error} If device with the same ID already exists
     * @example
     * ```typescript
     * const arduino = new Arduino();
     * Devices.add(arduino);
     * ```
     */
    static add(device: Core): number;
    /**
     * Gets a specific device by type and UUID
     * @param type - The device type
     * @param id - The device UUID
     * @returns The device instance
     * @throws {Error} If the device type is not supported
     * @example
     * ```typescript
     * const device = Devices.get('arduino', 'uuid-123');
     * ```
     */
    static get(type: string, id: string): Core;
    static getAll(type?: string | null): IDevice | IDevices;
    static getList(): Core[];
    static getByNumber(type: string, device_number: number): Core | null;
    static getCustom(type: string, device_number?: number): Core | null;
    static connectToAll(): Promise<boolean>;
    static disconnectAll(): Promise<boolean>;
    static areAllConnected(): Promise<boolean>;
    static areAllDisconnected(): Promise<boolean>;
    static getAllConnected(): Promise<Core[]>;
    static getAllDisconnected(): Promise<Core[]>;
}
export {};
//# sourceMappingURL=Devices.d.ts.map