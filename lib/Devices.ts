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
export class Devices extends Dispatcher {
  static instance: Devices;
  static devices: IDevices = {};

  constructor() {
    super();

    const availableListeners: string[] = ["change"];

    availableListeners.forEach((event: string): void => {
      this.serialRegisterAvailableListener(event);
    });
  }

  public static $dispatchChange(device: Core | null = null): void {
    if (device) {
      device.$checkAndDispatchConnection();
    }
    Devices.instance.dispatch("change", { devices: Devices.devices, dispatcher: device });
  }

  public static typeError(type: string): void {
    const error = new Error();
    error.message = `Type ${type} is not supported`;
    error.name = "DeviceTypeError";
    throw error;
  }

  /**
   * Registers a new device type in the registry
   * @param type - The type name of the device (e.g., 'arduino', 'esp32')
   * @internal
   */
  public static registerType(type: string): void {
    if (typeof Devices.devices[type] === "undefined") {
      Devices.devices = { ...Devices.devices, [type]: {} };
    }
  }

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
  public static add(device: Core): number {
    const type = device.typeDevice;
    if (typeof Devices.devices[type] === "undefined") {
      Devices.registerType(type);
    }

    const id: string = device.uuid;

    if (typeof Devices.devices[type] === "undefined") Devices.typeError(type);

    if (Devices.devices[type][id]) {
      throw new Error(`Device with id ${id} already exists`);
    }

    Devices.devices[type][id] = device;

    Devices.$dispatchChange(device);
    return Object.keys(Devices.devices[type]).indexOf(id);
  }

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
  public static get(type: string, id: string): Core {
    if (typeof Devices.devices[type] === "undefined") {
      Devices.registerType(type);
    }

    if (typeof Devices.devices[type] === "undefined") Devices.typeError(type);

    return Devices.devices[type][id];
  }

  public static getAll(type: string | null = null): IDevice | IDevices {
    if (type === null) return Devices.devices;
    if (typeof Devices.devices[type] === "undefined") Devices.typeError(type);

    return Devices.devices[type];
  }

  public static getList(): Core[] {
    // get all devices in list mode no matter the type
    // by some reason the array is empty so we need to use Object.values and map
    const devices: IDevice[] = Object.values(Devices.devices);
    return devices
      .map((device: IDevice): Core[] => {
        return Object.values(device);
      })
      .flat();
  }

  public static getByNumber(type: string, device_number: number): Core | null {
    if (typeof Devices.devices[type] === "undefined") Devices.typeError(type);

    const devices = Object.values(Devices.devices[type]);
    return devices.find((device) => device.deviceNumber === device_number) ?? null;
  }

  public static getCustom(type: string, device_number: number = 1): Core | null {
    if (typeof Devices.devices[type] === "undefined") Devices.typeError(type);

    const devices = Object.values(Devices.devices[type]);
    return devices.find((device) => device.deviceNumber === device_number) ?? null;
  }

  public static async connectToAll(): Promise<boolean> {
    const devices: Core[] = Devices.getList();

    for (const device of devices) {
      if (device.isConnected) continue;
      await device.connect().catch(console.warn);
    }

    return Promise.resolve(Devices.areAllConnected());
  }

  public static async disconnectAll(): Promise<boolean> {
    const devices: Core[] = Devices.getList();

    for (const device of devices) {
      if (device.isDisconnected) continue;
      await device.disconnect().catch(console.warn);
    }

    return Promise.resolve(Devices.areAllDisconnected());
  }

  public static async areAllConnected(): Promise<boolean> {
    const devices: Core[] = Devices.getList();

    for (const device of devices) {
      if (!device.isConnected) return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  public static async areAllDisconnected(): Promise<boolean> {
    const devices: Core[] = Devices.getList();

    for (const device of devices) {
      if (!device.isDisconnected) return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  public static async getAllConnected(): Promise<Core[]> {
    const devices: Core[] = Devices.getList();
    return Promise.resolve(devices.filter((device: Core): boolean => device.isConnected));
  }

  public static async getAllDisconnected(): Promise<Core[]> {
    const devices: Core[] = Devices.getList();
    return Promise.resolve(devices.filter((device: Core): boolean => device.isDisconnected));
  }
}

if (!Devices.instance) {
  Devices.instance = new Devices();
}
