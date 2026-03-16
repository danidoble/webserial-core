import type { AbstractSerialDevice } from "./AbstractSerialDevice";

export class SerialRegistry {
  private static instances = new Set<AbstractSerialDevice<unknown>>();
  private static portInstanceMap = new WeakMap<
    SerialPort,
    AbstractSerialDevice<unknown>
  >();

  public static getInstances(): AbstractSerialDevice<unknown>[] {
    return Array.from(this.instances);
  }

  public static register(instance: AbstractSerialDevice<unknown>): void {
    this.instances.add(instance);
  }

  public static unregister(instance: AbstractSerialDevice<unknown>): void {
    this.instances.delete(instance);
  }

  public static isPortInUse(
    port: SerialPort,
    instance: AbstractSerialDevice<unknown>,
  ): boolean {
    const existing = this.portInstanceMap.get(port);
    return existing !== undefined && existing !== instance;
  }

  public static lockPort(
    port: SerialPort,
    instance: AbstractSerialDevice<unknown>,
  ): void {
    this.portInstanceMap.set(port, instance);
  }

  public static unlockPort(port: SerialPort): void {
    this.portInstanceMap.delete(port);
  }
}
