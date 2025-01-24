import { Core } from "./Core.ts";
import { Dispatcher } from "./Dispatcher.ts";

interface IDevice {
  [key: string]: Core;
}

interface IDevices {
  [key: string]: IDevice;
}

export class Devices extends Dispatcher {
  static instance: Devices;
  static devices: IDevices = {};

  static typeError(type: string): void {
    const error = new Error();
    error.message = `Type ${type} is not supported`;
    error.name = "DeviceTypeError";
    throw error;
  }

  static add(device: Core): number {
    const type = device.typeDevice;
    if (typeof Devices.devices[type] === "undefined") {
      Devices.devices[type] = {};
    }

    const id: string = device.uuid;

    if (typeof Devices.devices[type] === "undefined") Devices.typeError(type);

    this.instance.dispatch("change", Devices.devices);

    if (Devices.devices[type][id]) {
      throw new Error(`Device with id ${id} already exists`);
    }

    Devices.devices[type][id] = device;

    this.instance.dispatch("change", Devices.devices);
    return Object.keys(Devices.devices[type]).indexOf(id);
  }

  static get(type: string, id: string): Core {
    if (typeof Devices.devices[type] === "undefined") Devices.typeError(type);

    return Devices.devices[type][id];
  }

  static getAll(type: string | null = null): IDevice | IDevices {
    if (type === null) return Devices.devices;

    if (typeof Devices.devices[type] === "undefined") Devices.typeError(type);

    return Devices.devices[type];
  }

  static getList(): Core[] {
    // get all devices in list mode no matter the type
    // by some reason the array is empty so we need to use Object.values and map
    const devices: IDevice[] = Object.values(Devices.devices);
    return devices
      .map((device: IDevice): Core[] => {
        return Object.values(device);
      })
      .flat();
  }

  static getCustom(type: string, device_number: number = 1): Core | null {
    if (typeof Devices.devices[type] === "undefined") Devices.typeError(type);

    const devices = Object.values(Devices.devices[type]);
    return devices.find((device) => device.deviceNumber === device_number) ?? null;
  }
}

if (!Devices.instance) {
  Devices.instance = new Devices();
}
