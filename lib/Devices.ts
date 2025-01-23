import { Core } from "./Core.ts";

interface IDevices {
  [key: string]: [];
}

export class Devices{
  static instance: Devices;
  static devices: IDevices = {};

  static typeError(type: string): void {
    const error = new Error();
    error.message = `Type ${type} is not supported`;
    error.name = "DeviceTypeError";
    throw error;
  }

  static add(device: Core) {
    const type = device.typeDevice;
    if (typeof Devices.devices[type] === "undefined") {
      Devices.devices[type] = [];
    }

    const id = device.uuid;

    if (typeof Devices.devices[type] === "undefined")
      return Devices.typeError(type);

    this.instance.dispatch("change", Devices.devices);

    if (Devices.devices[type][id]) return;

    Devices.devices[type][id] = device;

    this.instance.dispatch("change", Devices.devices);
    return Devices.devices[type].indexOf(device);
  }

  static get(type, id) {
    if (typeof Devices.devices[type] === "undefined")
      return Devices.typeError(type);

    return Devices.devices[type][id];
  }

  static getAll(type = null) {
    if (type === null) return Devices.devices;

    if (typeof Devices.devices[type] === "undefined")
      return Devices.typeError(type);

    return Devices.devices[type];
  }

  static getList() {
    // get all devices in list mode no matter the type
    // by some reason the array is empty so we need to use Object.values and map
    const devices = Object.values(Devices.devices);
    return devices
      .map((device) => {
        return Object.values(device);
      })
      .flat();
  }

  static getCustom(type, device_number = 1) {
    if (typeof Devices.devices[type] === "undefined")
      return Devices.typeError(type);

    const devices = Object.values(Devices.devices[type]);
    return (
      devices.find((device) => device.deviceNumber === device_number) ?? null
    );
  }
}

if (!Devices.instance) {
  Devices.instance = new Devices();
}
