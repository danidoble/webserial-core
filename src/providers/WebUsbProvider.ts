/**
 * WebUSB Serial Provider — a drop-in replacement for `web-serial-polyfill`
 * that properly supports vendor-specific USB devices (class 255).
 *
 * The Google polyfill **always** sends CDC ACM commands (SetLineCoding,
 * SetControlLineState) during `open()`. Devices that don't implement
 * CDC ACM reject those commands, causing `open()` to fail.
 *
 * This provider supports multiple protocols:
 * - **CDC ACM** — standard USB serial (class 2).
 * - **CP210x** — Silicon Labs CP2102 / CP2104 vendor protocol.
 * - **none** — skip all init (just open + claim).
 *
 * @example
 * ```ts
 * import { WebUsbProvider, AbstractSerialDevice } from 'webserial-core';
 *
 * // CP210x on Android (auto-detected by vendorId)
 * AbstractSerialDevice.setProvider(new WebUsbProvider({
 *   usbControlInterfaceClass: 255,
 *   usbTransferInterfaceClass: 255,
 * }));
 *
 * // Explicit protocol
 * AbstractSerialDevice.setProvider(new WebUsbProvider({
 *   usbControlInterfaceClass: 255,
 *   usbTransferInterfaceClass: 255,
 *   protocol: 'cp210x',
 * }));
 * ```
 */

import type {
  SerialPolyfillOptions,
  SerialPortFilter,
  SerialProvider,
} from "../types/index";

// ─── WebUSB type declarations (not shipped by default) ─────────

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

interface USBEndpoint {
  readonly endpointNumber: number;
  readonly direction: "in" | "out";
  readonly type: "bulk" | "interrupt" | "isochronous";
  readonly packetSize: number;
}

interface USBAlternateInterface {
  readonly alternateSetting: number;
  readonly interfaceClass: number;
  readonly interfaceSubclass: number;
  readonly interfaceProtocol: number;
  readonly interfaceName: string | undefined;
  readonly endpoints: readonly USBEndpoint[];
}

interface USBInterface {
  readonly interfaceNumber: number;
  readonly alternate: USBAlternateInterface;
  readonly alternates: readonly USBAlternateInterface[];
  readonly claimed: boolean;
}

interface USBConfiguration {
  readonly configurationValue: number;
  readonly configurationName: string | undefined;
  readonly interfaces: readonly USBInterface[];
}

interface USBInTransferResult {
  readonly data: DataView | undefined;
  readonly status: "ok" | "stall" | "babble";
}

interface USBOutTransferResult {
  readonly bytesWritten: number;
  readonly status: "ok" | "stall";
}

interface USBControlTransferParameters {
  requestType: "standard" | "class" | "vendor";
  recipient: "device" | "interface" | "endpoint" | "other";
  request: number;
  value: number;
  index: number;
}

interface USBDevice {
  readonly vendorId: number;
  readonly productId: number;
  readonly configuration: USBConfiguration | null;
  readonly configurations: readonly USBConfiguration[];
  readonly opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  forget(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  controlTransferOut(
    setup: USBControlTransferParameters,
    data?: BufferSource,
  ): Promise<USBOutTransferResult>;
  transferIn(
    endpointNumber: number,
    length: number,
  ): Promise<USBInTransferResult>;
  transferOut(
    endpointNumber: number,
    data: ArrayBuffer,
  ): Promise<USBOutTransferResult>;
}

interface USB {
  requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>;
  getDevices(): Promise<USBDevice[]>;
}

declare global {
  interface Navigator {
    readonly usb: USB;
  }
}

// ─── CDC ACM protocol constants ────────────────────────────────
const kCdcSetLineCoding = 0x20;
const kCdcSetControlLineState = 0x22;

// ─── CP210x protocol constants (Silicon Labs) ──────────────────
const kCp210xIfcEnable = 0x00;
const kCp210xSetBaudrate = 0x1e;
const kCp210xSetLineCtl = 0x03;
const kCp210xSetMhs = 0x07;

const kCp210xUartEnable = 0x0001;
const kCp210xUartDisable = 0x0000;

// DTR=1, RTS=1, change both
const kCp210xDtrRtsOn = 0x0303;
// DTR=0, RTS=0, change both
const kCp210xDtrRtsOff = 0x0300;

// ─── Shared constants ──────────────────────────────────────────
const kDefaultBufferSize = 255;
const kDefaultDataBits = 8;
const kDefaultParity = "none";
const kDefaultStopBits = 1;

const kAcceptableDataBits = [16, 8, 7, 6, 5];
const kAcceptableStopBits = [1, 2];
const kAcceptableParity = ["none", "even", "odd"];

type ParityType = "none" | "odd" | "even";
const kCdcParityIndexMapping: ParityType[] = ["none", "odd", "even"];
const kCdcStopBitsIndexMapping = [1, 1.5, 2];

type ResolvedProtocol = "cdc_acm" | "cp210x" | "none";

const kDefaultOptions = {
  usbControlInterfaceClass: 2,
  usbTransferInterfaceClass: 10,
  protocol: undefined as "cdc_acm" | "cp210x" | "none" | undefined,
};

// ─── Helpers ───────────────────────────────────────────────────

function findInterfaceByClass(
  device: USBDevice,
  classCode: number,
): USBInterface | null {
  const config = device.configurations[0];
  for (const iface of config.interfaces) {
    if (iface.alternates[0].interfaceClass === classCode) {
      return iface;
    }
  }
  return null;
}

/**
 * Find the first interface with the given class that also has
 * both IN and OUT endpoints (i.e. a data interface).
 */
function findDataInterface(
  device: USBDevice,
  classCode: number,
): USBInterface | null {
  const config = device.configurations[0];
  for (const iface of config.interfaces) {
    const alt = iface.alternates[0];
    if (alt.interfaceClass !== classCode) continue;
    const hasIn = alt.endpoints.some(
      (ep: USBEndpoint) => ep.direction === "in",
    );
    const hasOut = alt.endpoints.some(
      (ep: USBEndpoint) => ep.direction === "out",
    );
    if (hasIn && hasOut) return iface;
  }
  return null;
}

function findEndpoint(
  iface: USBInterface,
  direction: "in" | "out",
): USBEndpoint {
  const alt = iface.alternates[0];
  for (const ep of alt.endpoints) {
    if (ep.direction === direction) return ep;
  }
  throw new TypeError(
    `Interface ${iface.interfaceNumber} does not have an ${direction} endpoint.`,
  );
}

/**
 * Auto-detect the USB-to-serial protocol when the user hasn't
 * explicitly specified one.
 */
function detectProtocol(
  device: USBDevice,
  controlClass: number,
): ResolvedProtocol {
  if (controlClass === 2) return "cdc_acm";
  // Silicon Labs CP2102 / CP2104 / CP2105
  if (device.vendorId === 0x10c4) return "cp210x";
  return "none";
}

// ─── Underlying Source / Sink for streams ──────────────────────

class UsbEndpointUnderlyingSource implements UnderlyingDefaultSource<Uint8Array> {
  private device_: USBDevice;
  private endpoint_: USBEndpoint;
  private onError_: () => void;

  constructor(device: USBDevice, endpoint: USBEndpoint, onError: () => void) {
    this.device_ = device;
    this.endpoint_ = endpoint;
    this.onError_ = onError;
  }

  pull(controller: ReadableStreamDefaultController<Uint8Array>): void {
    (async (): Promise<void> => {
      const chunkSize = this.endpoint_.packetSize;
      try {
        const result = await this.device_.transferIn(
          this.endpoint_.endpointNumber,
          chunkSize,
        );
        if (result.status !== "ok") {
          controller.error(`USB error: ${result.status}`);
          this.onError_();
          return;
        }
        if (result.data?.buffer && result.data.byteLength > 0) {
          const chunk = new Uint8Array(
            result.data.buffer,
            result.data.byteOffset,
            result.data.byteLength,
          );
          if (chunk.length > 0) {
            controller.enqueue(chunk);
          }
        }
      } catch (error) {
        controller.error(String(error));
        this.onError_();
      }
    })();
  }
}

class UsbEndpointUnderlyingSink implements UnderlyingSink<Uint8Array> {
  private device_: USBDevice;
  private endpoint_: USBEndpoint;
  private onError_: () => void;

  constructor(device: USBDevice, endpoint: USBEndpoint, onError: () => void) {
    this.device_ = device;
    this.endpoint_ = endpoint;
    this.onError_ = onError;
  }

  async write(
    chunk: Uint8Array,
    controller: WritableStreamDefaultController,
  ): Promise<void> {
    try {
      const result = await this.device_.transferOut(
        this.endpoint_.endpointNumber,
        chunk.buffer as ArrayBuffer,
      );
      if (result.status !== "ok") {
        controller.error(result.status);
        this.onError_();
      }
    } catch (error) {
      controller.error(String(error));
      this.onError_();
    }
  }
}

// ─── WebUsbSerialPort ──────────────────────────────────────────

interface OutputSignals {
  dataTerminalReady?: boolean;
  requestToSend?: boolean;
  break?: boolean;
}

/**
 * A `SerialPort`-compatible class backed by a WebUSB device.
 *
 * Supports CDC ACM, CP210x, and raw (no-init) protocols.
 */
class WebUsbSerialPort {
  private device_: USBDevice;
  private protocol_: ResolvedProtocol;

  private controlInterface_: USBInterface;
  private transferInterface_: USBInterface;
  private inEndpoint_: USBEndpoint;
  private outEndpoint_: USBEndpoint;

  private serialOptions_!: SerialOptions;
  private readable_: ReadableStream<Uint8Array> | null = null;
  private writable_: WritableStream<Uint8Array> | null = null;
  private cdcOutputSignals_: OutputSignals = {
    dataTerminalReady: false,
    requestToSend: false,
    break: false,
  };

  constructor(device: USBDevice, options?: SerialPolyfillOptions) {
    this.device_ = device;
    const opts = { ...kDefaultOptions, ...options };

    // Resolve protocol
    this.protocol_ =
      opts.protocol ?? detectProtocol(device, opts.usbControlInterfaceClass);

    // ── Discover interfaces ────────────────────────────────────
    const controlClass = opts.usbControlInterfaceClass;
    const transferClass = opts.usbTransferInterfaceClass;

    if (controlClass === transferClass) {
      const dataIface = findDataInterface(device, transferClass);
      if (!dataIface) {
        throw new TypeError(
          `Unable to find interface with class ${transferClass} that has ` +
            `both IN and OUT endpoints.`,
        );
      }
      this.controlInterface_ = dataIface;
      this.transferInterface_ = dataIface;
    } else {
      const ctrl = findInterfaceByClass(device, controlClass);
      if (!ctrl) {
        throw new TypeError(
          `Unable to find control interface with class ${controlClass}.`,
        );
      }
      const xfer =
        findDataInterface(device, transferClass) ??
        findInterfaceByClass(device, transferClass);
      if (!xfer) {
        throw new TypeError(
          `Unable to find transfer interface with class ${transferClass}.`,
        );
      }
      this.controlInterface_ = ctrl;
      this.transferInterface_ = xfer;
    }

    this.inEndpoint_ = findEndpoint(this.transferInterface_, "in");
    this.outEndpoint_ = findEndpoint(this.transferInterface_, "out");
  }

  // ── Streams ──────────────────────────────────────────────────

  get readable(): ReadableStream<Uint8Array> | null {
    if (!this.readable_ && this.device_.opened) {
      this.readable_ = new ReadableStream<Uint8Array>(
        new UsbEndpointUnderlyingSource(this.device_, this.inEndpoint_, () => {
          this.readable_ = null;
        }),
        {
          highWaterMark: this.serialOptions_?.bufferSize ?? kDefaultBufferSize,
        },
      );
    }
    return this.readable_;
  }

  get writable(): WritableStream<Uint8Array> | null {
    if (!this.writable_ && this.device_.opened) {
      this.writable_ = new WritableStream(
        new UsbEndpointUnderlyingSink(this.device_, this.outEndpoint_, () => {
          this.writable_ = null;
        }),
        new ByteLengthQueuingStrategy({
          highWaterMark: this.serialOptions_?.bufferSize ?? kDefaultBufferSize,
        }),
      );
    }
    return this.writable_;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  async open(options: SerialOptions): Promise<void> {
    this.serialOptions_ = options;
    this.validateOptions();

    try {
      await this.device_.open();
      if (this.device_.configuration === null) {
        await this.device_.selectConfiguration(1);
      }

      await this.device_.claimInterface(this.controlInterface_.interfaceNumber);
      if (this.controlInterface_ !== this.transferInterface_) {
        await this.device_.claimInterface(
          this.transferInterface_.interfaceNumber,
        );
      }

      // Protocol-specific initialization
      switch (this.protocol_) {
        case "cdc_acm":
          await this.cdcInit();
          break;
        case "cp210x":
          await this.cp210xInit();
          break;
        case "none":
          // No init needed
          break;
      }
    } catch (error) {
      if (this.device_.opened) {
        await this.device_.close();
      }
      throw new Error(
        "Error setting up device: " +
          (error instanceof Error ? error.message : String(error)),
        { cause: error },
      );
    }
  }

  async close(): Promise<void> {
    const promises: Promise<void>[] = [];
    if (this.readable_) promises.push(this.readable_.cancel());
    if (this.writable_) promises.push(this.writable_.abort());
    await Promise.all(promises);
    this.readable_ = null;
    this.writable_ = null;

    if (this.device_.opened) {
      switch (this.protocol_) {
        case "cdc_acm":
          await this.cdcSetSignals({
            dataTerminalReady: false,
            requestToSend: false,
          });
          break;
        case "cp210x":
          await this.cp210xDeinit();
          break;
      }
      await this.device_.close();
    }
  }

  async forget(): Promise<void> {
    return this.device_.forget();
  }

  getInfo(): SerialPortInfo {
    return {
      usbVendorId: this.device_.vendorId,
      usbProductId: this.device_.productId,
    };
  }

  // ── CDC ACM protocol ─────────────────────────────────────────

  private async cdcInit(): Promise<void> {
    await this.cdcSetLineCoding();
    await this.cdcSetSignals({ dataTerminalReady: true });
  }

  private async cdcSetSignals(signals: OutputSignals): Promise<void> {
    this.cdcOutputSignals_ = { ...this.cdcOutputSignals_, ...signals };

    if (
      signals.dataTerminalReady !== undefined ||
      signals.requestToSend !== undefined
    ) {
      const value =
        (this.cdcOutputSignals_.dataTerminalReady ? 1 << 0 : 0) |
        (this.cdcOutputSignals_.requestToSend ? 1 << 1 : 0);

      await this.device_.controlTransferOut({
        requestType: "class",
        recipient: "interface",
        request: kCdcSetControlLineState,
        value: value,
        index: this.controlInterface_.interfaceNumber,
      });
    }
  }

  private async cdcSetLineCoding(): Promise<void> {
    const buffer = new ArrayBuffer(7);
    const view = new DataView(buffer);
    view.setUint32(0, this.serialOptions_.baudRate, true);
    view.setUint8(
      4,
      kCdcStopBitsIndexMapping.indexOf(
        this.serialOptions_.stopBits ?? kDefaultStopBits,
      ),
    );
    view.setUint8(
      5,
      kCdcParityIndexMapping.indexOf(
        (this.serialOptions_.parity ?? kDefaultParity) as ParityType,
      ),
    );
    view.setUint8(6, this.serialOptions_.dataBits ?? kDefaultDataBits);

    const result = await this.device_.controlTransferOut(
      {
        requestType: "class",
        recipient: "interface",
        request: kCdcSetLineCoding,
        value: 0x00,
        index: this.controlInterface_.interfaceNumber,
      },
      buffer,
    );
    if (result.status !== "ok") {
      throw new DOMException("Failed to set line coding.", "NetworkError");
    }
  }

  // ── CP210x protocol (Silicon Labs) ───────────────────────────
  //
  // Based on the Linux cp210x driver and the usb-serial-for-android
  // library.  Request type 0x41 = vendor + host-to-interface.

  private async cp210xInit(): Promise<void> {
    const ifNum = this.controlInterface_.interfaceNumber;

    // 1. Enable UART
    await this.device_.controlTransferOut({
      requestType: "vendor",
      recipient: "interface",
      request: kCp210xIfcEnable,
      value: kCp210xUartEnable,
      index: ifNum,
    });

    // 2. Set baud rate (4-byte LE uint32 in data phase)
    const baudBuf = new ArrayBuffer(4);
    new DataView(baudBuf).setUint32(0, this.serialOptions_.baudRate, true);
    await this.device_.controlTransferOut(
      {
        requestType: "vendor",
        recipient: "interface",
        request: kCp210xSetBaudrate,
        value: 0,
        index: ifNum,
      },
      baudBuf,
    );

    // 3. Set line control  (data bits | parity | stop bits)
    //    Encoding (wValue):
    //      bits 15-8 : stop bits  →  0x0000 = 1,  0x0002 = 2
    //      bits  7-4 : parity     →  0x00 = none, 0x10 = odd, 0x20 = even
    //      bits  3-0 : data bits  →  0x05 .. 0x08
    const dataBits = this.serialOptions_.dataBits ?? kDefaultDataBits;
    const parityMap: Record<string, number> = {
      none: 0x00,
      odd: 0x10,
      even: 0x20,
    };
    const parity =
      parityMap[this.serialOptions_.parity ?? kDefaultParity] ?? 0x00;
    const stopMap: Record<number, number> = { 1: 0x0000, 2: 0x0002 };
    const stop =
      stopMap[this.serialOptions_.stopBits ?? kDefaultStopBits] ?? 0x0000;
    // data bits and parity fit in the low byte; stop bits in the high byte
    const lineCtl = (stop << 8) | parity | dataBits;

    await this.device_.controlTransferOut({
      requestType: "vendor",
      recipient: "interface",
      request: kCp210xSetLineCtl,
      value: lineCtl,
      index: ifNum,
    });

    // 4. Raise DTR + RTS
    await this.device_.controlTransferOut({
      requestType: "vendor",
      recipient: "interface",
      request: kCp210xSetMhs,
      value: kCp210xDtrRtsOn,
      index: ifNum,
    });
  }

  private async cp210xDeinit(): Promise<void> {
    const ifNum = this.controlInterface_.interfaceNumber;

    // Lower DTR + RTS
    await this.device_.controlTransferOut({
      requestType: "vendor",
      recipient: "interface",
      request: kCp210xSetMhs,
      value: kCp210xDtrRtsOff,
      index: ifNum,
    });

    // Disable UART
    await this.device_.controlTransferOut({
      requestType: "vendor",
      recipient: "interface",
      request: kCp210xIfcEnable,
      value: kCp210xUartDisable,
      index: ifNum,
    });
  }

  // ── Validation ───────────────────────────────────────────────

  private validateOptions(): void {
    if (this.serialOptions_.baudRate % 1 !== 0) {
      throw new RangeError("invalid Baud Rate " + this.serialOptions_.baudRate);
    }
    if (
      this.serialOptions_.dataBits !== undefined &&
      !kAcceptableDataBits.includes(this.serialOptions_.dataBits)
    ) {
      throw new RangeError("invalid dataBits " + this.serialOptions_.dataBits);
    }
    if (
      this.serialOptions_.stopBits !== undefined &&
      !kAcceptableStopBits.includes(this.serialOptions_.stopBits)
    ) {
      throw new RangeError("invalid stopBits " + this.serialOptions_.stopBits);
    }
    if (
      this.serialOptions_.parity !== undefined &&
      !kAcceptableParity.includes(this.serialOptions_.parity)
    ) {
      throw new RangeError("invalid parity " + this.serialOptions_.parity);
    }
  }
}

// ─── WebUsbProvider (implements SerialProvider) ─────────────────

/**
 * A `SerialProvider` that uses the WebUSB API under the hood.
 *
 * Supported protocols:
 * - `cdc_acm` — standard CDC ACM (auto-detected for class 2).
 * - `cp210x`  — Silicon Labs CP2102/CP2104 (auto-detected for vendorId 0x10c4).
 * - `none`    — raw bulk transfer, no init commands.
 *
 * @example
 * ```ts
 * import { WebUsbProvider, AbstractSerialDevice } from 'webserial-core';
 *
 * // Standard CDC ACM device
 * AbstractSerialDevice.setProvider(new WebUsbProvider());
 *
 * // Silicon Labs CP210x (auto-detected)
 * AbstractSerialDevice.setProvider(new WebUsbProvider({
 *   usbControlInterfaceClass: 255,
 *   usbTransferInterfaceClass: 255,
 * }));
 *
 * // Explicit protocol override
 * AbstractSerialDevice.setProvider(new WebUsbProvider({
 *   usbControlInterfaceClass: 255,
 *   usbTransferInterfaceClass: 255,
 *   protocol: 'cp210x',
 * }));
 * ```
 */
export class WebUsbProvider implements SerialProvider {
  private options_: typeof kDefaultOptions;

  constructor(options?: SerialPolyfillOptions) {
    this.options_ = { ...kDefaultOptions, ...options };
  }

  async requestPort(
    options?: { filters?: SerialPortFilter[] },
    polyfillOptions?: SerialPolyfillOptions,
  ): Promise<SerialPort> {
    const opts = { ...this.options_, ...polyfillOptions };

    const usbFilters: USBDeviceFilter[] = [];
    if (options?.filters && options.filters.length > 0) {
      for (const filter of options.filters) {
        const usbFilter: USBDeviceFilter = {};
        if (filter.usbVendorId !== undefined) {
          usbFilter.vendorId = filter.usbVendorId;
        }
        if (filter.usbProductId !== undefined) {
          usbFilter.productId = filter.usbProductId;
        }

        // Only enforce classCode if we are specifically looking for a class,
        // OR if no vendor/product ID was specified
        if (
          opts.usbControlInterfaceClass !== undefined &&
          opts.usbControlInterfaceClass !== 255
        ) {
          usbFilter.classCode = opts.usbControlInterfaceClass;
        } else if (
          usbFilter.vendorId === undefined &&
          usbFilter.productId === undefined
        ) {
          usbFilter.classCode = opts.usbControlInterfaceClass ?? 2;
        }

        usbFilters.push(usbFilter);
      }
    } else {
      // If no filters are provided, default to the control interface class or class 2 (CDC)
      usbFilters.push({ classCode: opts.usbControlInterfaceClass ?? 2 });
    }

    const device = await navigator.usb.requestDevice({ filters: usbFilters });
    return new WebUsbSerialPort(device, opts) as unknown as SerialPort;
  }

  async getPorts(
    polyfillOptions?: SerialPolyfillOptions,
  ): Promise<SerialPort[]> {
    const opts = { ...this.options_, ...polyfillOptions };
    const devices = await navigator.usb.getDevices();
    const ports: SerialPort[] = [];

    for (const device of devices) {
      try {
        const port = new WebUsbSerialPort(device, opts);
        ports.push(port as unknown as SerialPort);
      } catch {
        // Skip devices whose interfaces don't match
      }
    }
    return ports;
  }
}
