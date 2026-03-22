/**
 * @file types/index.ts
 *
 * All public TypeScript types, interfaces, and ambient declarations for
 * `webserial-core`. Import these in consuming code for full type safety
 * and IDE autocomplete.
 */

import type { AbstractSerialDevice } from "../core/AbstractSerialDevice.js";

export interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
  bluetoothServiceClassId?: string;
}

/**
 * Options forwarded to the WebUSB polyfill when using a custom serial
 * provider.  These map directly to `SerialPolyfillOptions` in
 * `web-serial-polyfill`.
 */
export interface SerialPolyfillOptions {
  /** USB interface class for the CDC control interface.  Default: `2`.
   *  Set to `255` (vendor-specific) for non-standard devices. */
  usbControlInterfaceClass?: number;
  /** USB interface class for the CDC data/transfer interface.  Default: `10`. */
  usbTransferInterfaceClass?: number;
  /**
   * USB-to-serial protocol used for device initialization.
   *
   * - `'cdc_acm'` — Standard CDC ACM (class 2). Sends `SetLineCoding` +
   *   `SetControlLineState`.
   * - `'cp210x'` — Silicon Labs CP2102 / CP2104 vendor protocol. Sends
   *   vendor-specific commands to enable UART, set baud rate, set line
   *   control, and activate DTR/RTS.
   * - `'none'` — Skip all initialization. The device is opened and interfaces
   *   claimed, but no control transfers are sent.
   *
   * When omitted the provider auto-detects:
   *   interface class 2 → `cdc_acm`,
   *   vendorId `0x10c4` → `cp210x`,
   *   otherwise → `none`.
   */
  protocol?: "cdc_acm" | "cp210x" | "none";
}

/**
 * A serial provider that abstracts the browser's `navigator.serial` API.
 * Pass a custom implementation (e.g. a WebUSB polyfill) via
 * `AbstractSerialDevice.setProvider()` for platforms that don't
 * support the native Web Serial API.
 *
 * The second argument on each method is **optional** and only used by
 * polyfill providers — the native `navigator.serial` ignores it.
 */
export interface SerialProvider {
  requestPort(
    options?: { filters?: SerialPortFilter[] },
    polyfillOptions?: SerialPolyfillOptions,
  ): Promise<SerialPort>;
  getPorts(polyfillOptions?: SerialPolyfillOptions): Promise<SerialPort[]>;
}

export interface SerialParser<T> {
  /**
   * Defines how to parse raw byte chunks into the target type T.
   * Emit can be called multiple times if the chunk contains multiple complete frames.
   */
  parse(chunk: Uint8Array, emit: (parsed: T) => void): void;
  /**
   * Resets the internal state of the parser (e.g. discards partial buffers).
   */
  reset?(): void;
}

export interface SerialDeviceOptions<T> {
  filters?: SerialPortFilter[];
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
  bufferSize?: number;
  flowControl?: "none" | "hardware";
  commandTimeout?: number;
  /**
   * Parser that transforms raw `Uint8Array` chunks into the device data type `T`.
   * Use `delimiter()` for line-based text protocols, `raw()` or `fixedLength()`
   * for binary data (declare the device as `AbstractSerialDevice<Uint8Array>`),
   * or any custom `SerialParser<T>`.
   */
  parser?: SerialParser<T>;
  /** Enable automatic reconnection when the device disconnects unexpectedly. */
  autoReconnect?: boolean;
  /** Polling interval in ms for scanning authorized ports during reconnection. Default: 1500 */
  autoReconnectInterval?: number;
  /** Timeout in ms for the handshake to complete. Default: 2000 */
  handshakeTimeout?: number;
  /** Optional custom serial provider (e.g. WebUsbProvider) for THIS specific device instance. Overrides the global static Provider. */
  provider?: SerialProvider;
  /** Options forwarded to the custom provider when requesting or getting ports for THIS instance. */
  polyfillOptions?: SerialPolyfillOptions;
}

export interface SerialEventMap<T> {
  "serial:connecting": (instance: AbstractSerialDevice<T>) => void;
  "serial:connected": (instance: AbstractSerialDevice<T>) => void;
  "serial:disconnected": (instance: AbstractSerialDevice<T>) => void;
  "serial:reconnecting": (instance: AbstractSerialDevice<T>) => void;
  "serial:data": (data: T, instance: AbstractSerialDevice<T>) => void;
  "serial:sent": (data: Uint8Array, instance: AbstractSerialDevice<T>) => void;
  "serial:error": (error: Error, instance: AbstractSerialDevice<T>) => void;
  "serial:need-permission": (instance: AbstractSerialDevice<T>) => void;
  "serial:queue-empty": (instance: AbstractSerialDevice<T>) => void;
  "serial:timeout": (
    command: Uint8Array,
    instance: AbstractSerialDevice<T>,
  ) => void;
}
