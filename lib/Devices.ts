import { Core } from "./Core";
import { Dispatcher } from "./Dispatcher";

interface IDevice {
  [key: string]: Core;
}

interface IDevices {
  [key: string]: IDevice;
}

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

  public static registerType(type: string): void {
    if (typeof Devices.devices[type] === "undefined") {
      Devices.devices = { ...Devices.devices, [type]: {} };
    }
  }

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
