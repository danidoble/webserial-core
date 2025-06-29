import { Core } from "./Core.ts";
import { Dispatcher } from "./Dispatcher.ts";
interface IDevice {
    [key: string]: Core;
}
interface IDevices {
    [key: string]: IDevice;
}
export declare class Devices extends Dispatcher {
    static instance: Devices;
    static devices: IDevices;
    constructor();
    static $dispatchChange(device?: Core | null): void;
    static typeError(type: string): void;
    static registerType(type: string): void;
    static add(device: Core): number;
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