/**
 * @file SerialRegistry.ts
 *
 * Global registry that tracks all {@link AbstractSerialDevice} instances and
 * maps open serial ports to their owning devices. Used to prevent two device
 * instances from trying to open the same physical port simultaneously.
 */

import type { AbstractSerialDevice } from "./AbstractSerialDevice.js";

/**
 * Global registry for serial device instances and port locks.
 *
 * Maintains:
 * - A `Set` of all registered {@link AbstractSerialDevice} instances.
 * - A `WeakMap` from `SerialPort` to the device instance that currently owns it.
 *
 * All methods are static; this class acts as a module-level singleton.
 */
export class SerialRegistry {
  private static instances = new Set<AbstractSerialDevice<unknown>>();
  private static portInstanceMap = new WeakMap<
    SerialPort,
    AbstractSerialDevice<unknown>
  >();

  /**
   * Returns all currently registered device instances.
   *
   * @returns An array snapshot of all registered devices.
   */
  public static getInstances(): AbstractSerialDevice<unknown>[] {
    return Array.from(this.instances);
  }

  /**
   * Registers a device instance so it appears in `getInstances()`.
   *
   * @param instance - The device to register.
   */
  public static register(instance: AbstractSerialDevice<unknown>): void {
    this.instances.add(instance);
  }

  /**
   * Removes a device instance from the registry.
   *
   * @param instance - The device to unregister.
   */
  public static unregister(instance: AbstractSerialDevice<unknown>): void {
    this.instances.delete(instance);
  }

  /**
   * Returns `true` if the port is held by a **different** device instance.
   *
   * @param port - The serial port to check.
   * @param instance - The device requesting access.
   * @returns `true` if the port is locked by another device.
   */
  public static isPortInUse(
    port: SerialPort,
    instance: AbstractSerialDevice<unknown>,
  ): boolean {
    const existing = this.portInstanceMap.get(port);
    return existing !== undefined && existing !== instance;
  }

  /**
   * Assigns exclusive ownership of a port to an instance.
   *
   * @param port - The port to lock.
   * @param instance - The device claiming the port.
   */
  public static lockPort(
    port: SerialPort,
    instance: AbstractSerialDevice<unknown>,
  ): void {
    this.portInstanceMap.set(port, instance);
  }

  /**
   * Releases the exclusive lock on a port.
   *
   * @param port - The port to unlock.
   */
  public static unlockPort(port: SerialPort): void {
    this.portInstanceMap.delete(port);
  }
}
