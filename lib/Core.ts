import { Dispatcher } from "./Dispatcher.ts";
import { Devices } from "./Devices.ts";
import { supportWebSerial, wait } from "./utils.ts";

interface LastError {
  message: string | null;
  action: string | null;
  code: string | Uint8Array | Array<string> | Array<number> | null | number;
  no_code: number;
}

interface DeviceData {
  type: string;
  id: string;
  listen_on_port: number | null;
}

type SerialResponseAs = "hex" | "uint8" | "string" | "arraybuffer";

interface SerialResponse {
  length: number | null;
  buffer: Uint8Array;
  as: SerialResponseAs;
  replacer: RegExp | string;
  limiter: null | string | RegExp;
  prefixLimiter: boolean; // If true, the limiter is at the beginning of the message
  sufixLimiter: boolean; // If true, the limiter is at the end of the message
  delimited: boolean;
}

interface QueueData {
  bytes: string | Uint8Array | Array<string> | Array<number>;
  action: string;
}

type SerialData = {
  aux_connecting: string;
  connecting: boolean;
  connected: boolean;
  port: SerialPort | null;
  last_action: string | null;
  response: SerialResponse;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  input_done: Promise<void> | null;
  output_done: Promise<void> | null;
  input_stream: ReadableStream<Uint8Array> | null;
  output_stream: WritableStream<Uint8Array> | null;
  keep_reading: boolean;
  time_until_send_bytes: number | undefined | ReturnType<typeof setTimeout>;
  delay_first_connection: number;
  bytes_connection: string | Uint8Array | string[] | number[] | null;
  filters: SerialPortFilter[];
  config_port: SerialOptions;
  queue: QueueData[];
  auto_response: any;
  free_timeout_ms: number;
  useRTSCTS: boolean;
};

interface TimeResponse {
  response_connection: number;
  response_general: number;
}

interface Timeout {
  until_response: number | ReturnType<typeof setTimeout>;
}

interface InternalIntervals {
  reconnection: number;
}

export type Internal = {
  bypassSerialBytesConnection: boolean;
  auto_response: boolean;
  device_number: number;
  aux_port_connector: number;
  last_error: LastError;
  serial: SerialData;
  device: DeviceData;
  time: TimeResponse;
  timeout: Timeout;
  interval: InternalIntervals;
};

interface CoreConstructorParams {
  filters?: SerialPortFilter[] | null;
  config_port?: SerialOptions;
  no_device?: number;
  device_listen_on_channel?: number | string;
  bypassSerialBytesConnection?: boolean;
}

const defaultConfigPort: SerialOptions = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 32768,
  flowControl: "none",
};

interface CustomCode {
  code: string | Uint8Array | Array<string> | Array<number>;
}

interface ICore {
  lastAction: string | null;

  set listenOnChannel(channel: string | number);

  set serialFilters(filters: SerialPortFilter[]);

  get serialFilters(): SerialPortFilter[];

  set serialConfigPort(config_port: SerialOptions);

  get serialConfigPort(): SerialOptions;

  get isConnected(): boolean;

  get isConnecting(): boolean;

  get isDisconnected(): boolean;

  get useRTSCTS(): boolean;

  set useRTSCTS(value: boolean);

  get deviceNumber(): number;

  get uuid(): string;

  get typeDevice(): string;

  get queue(): QueueData[];

  get timeoutBeforeResponseBytes(): number;

  set timeoutBeforeResponseBytes(value: number);

  get fixedBytesMessage(): number | null;

  set fixedBytesMessage(length: number | null);

  get responseDelimited(): boolean;

  set responseDelimited(value: boolean);

  get responsePrefixLimited(): boolean;

  set responsePrefixLimited(value: boolean);

  get responseSufixLimited(): boolean;

  set responseSufixLimited(value: boolean);

  get responseLimiter(): string | RegExp | null;

  set responseLimiter(limiter: string | RegExp | null);

  get bypassSerialBytesConnection(): boolean;

  set bypassSerialBytesConnection(value: boolean);

  timeout(bytes: string[], event: string): Promise<void>;

  disconnect(detail?: null): Promise<void>;

  connect(): Promise<boolean>;

  serialDisconnect(): Promise<void>;

  serialPortsSaved(ports: SerialPort[]): Promise<void>;

  serialErrors(error: unknown | Error | DOMException): void;

  serialConnect(): Promise<void>;

  serialForget(): Promise<boolean>;

  decToHex(dec: number | string): string;

  hexToDec(hex: string): number;

  hexMaker(val?: string, min?: number): string;

  add0x(bytes: string[]): string[];

  bytesToHex(bytes: string[]): string[];

  appendToQueue(arr: string[], action: string): Promise<void>;

  serialSetConnectionConstant(listen_on_port?: number): string | Uint8Array | string[] | number[] | null;

  serialMessage(code: string[]): void;

  serialCorruptMessage(data: Uint8Array | number[] | string[] | never | null | string | ArrayBuffer): void;

  clearSerialQueue(): void;

  sumHex(arr: string[]): string;

  softReload(): void;

  sendConnect(): Promise<void>;

  sendCustomCode(customCode: CustomCode): Promise<void>;

  stringToArrayHex(string: string): string[];

  stringToArrayBuffer(string: string, end: string): ArrayBufferLike;

  parseStringToBytes(string: string, end: string): string[];

  parseUint8ToHex(array: Uint8Array): string[];

  parseHexToUint8(array: string[]): Uint8Array;

  stringArrayToUint8Array(strings: string[]): Uint8Array;

  parseUint8ArrayToString(array: string[]): string;

  parseStringToTextEncoder(string: string, end: string): Uint8Array;

  hexToAscii(hex: string | number): string;

  asciiToHex(asciiString: string): string;

  getResponseAsArrayBuffer(): void;

  getResponseAsArrayHex(): void;

  getResponseAsUint8Array(): void;

  getResponseAsString(): void;
}

export class Core extends Dispatcher implements ICore {
  protected __internal__: Internal = {
    bypassSerialBytesConnection: false,
    auto_response: false,
    device_number: 1,
    aux_port_connector: 0,
    last_error: {
      message: null,
      action: null,
      code: null,
      no_code: 0,
    },
    serial: {
      aux_connecting: "idle",
      connecting: false,
      connected: false,
      port: null,
      last_action: null,
      response: {
        length: null,
        buffer: new Uint8Array([]),
        as: "uint8",
        replacer: /[\n\r]+/g,
        limiter: null,
        prefixLimiter: false,
        sufixLimiter: true,
        delimited: false,
      },
      reader: null,
      input_done: null,
      output_done: null,
      input_stream: null,
      output_stream: null,
      keep_reading: true,
      time_until_send_bytes: undefined,
      delay_first_connection: 200,
      bytes_connection: null,
      filters: [],
      config_port: defaultConfigPort,
      queue: [],
      auto_response: ["DD", "DD"],
      free_timeout_ms: 50, // In previous versions 400 was used
      useRTSCTS: false, // Use RTS/CTS flow control
    },
    device: {
      type: "unknown",
      id: window.crypto.randomUUID(),
      listen_on_port: null,
    },
    time: {
      response_connection: 500,
      response_general: 2e3,
    },
    timeout: {
      until_response: 0,
    },
    interval: {
      reconnection: 0,
    },
  };

  #boundFinishConnecting: EventListenerOrEventListenerObject | null = null;

  constructor(
    {
      filters = null,
      config_port = defaultConfigPort,
      no_device = 1,
      device_listen_on_channel = 1,
      bypassSerialBytesConnection = false,
    }: CoreConstructorParams = {
      filters: null,
      config_port: defaultConfigPort,
      no_device: 1,
      device_listen_on_channel: 1,
      bypassSerialBytesConnection: false,
    },
  ) {
    super();

    if (!("serial" in navigator)) {
      throw new Error("Web Serial not supported");
    }

    if (filters) {
      this.serialFilters = filters;
    }

    if (config_port) {
      this.serialConfigPort = config_port;
    }

    if (bypassSerialBytesConnection) {
      this.__internal__.bypassSerialBytesConnection = bypassSerialBytesConnection;
    }

    if (no_device) {
      this.#serialSetBytesConnection(no_device);
    }

    if (device_listen_on_channel && ["number", "string"].includes(typeof device_listen_on_channel)) {
      this.listenOnChannel = device_listen_on_channel;
    }

    this.#registerDefaultListeners();
    this.#internalEvents();
  }

  set listenOnChannel(channel: string | number) {
    if (typeof channel === "string") {
      channel = parseInt(channel);
    }
    if (isNaN(channel) || channel < 1 || channel > 255) {
      throw new Error("Invalid port number");
    }
    this.__internal__.device.listen_on_port = channel;
    if (this.__internal__.bypassSerialBytesConnection) return;
    this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(channel);
  }

  get lastAction(): string | null {
    return this.__internal__.serial.last_action;
  }

  get listenOnChannel(): number {
    return this.__internal__.device.listen_on_port ?? 1;
  }

  set serialFilters(filters: SerialPortFilter[]) {
    if (this.isConnected) throw new Error("Cannot change serial filters while connected");
    this.__internal__.serial.filters = filters;
  }

  get serialFilters(): SerialPortFilter[] {
    return this.__internal__.serial.filters;
  }

  set serialConfigPort(config_port: SerialOptions) {
    if (this.isConnected) throw new Error("Cannot change serial filters while connected");
    this.__internal__.serial.config_port = config_port;
  }

  get serialConfigPort(): SerialOptions {
    return this.__internal__.serial.config_port;
  }

  get useRTSCTS(): boolean {
    return this.__internal__.serial.useRTSCTS;
  }

  set useRTSCTS(value: boolean) {
    this.__internal__.serial.useRTSCTS = value;
  }

  get isConnected(): boolean {
    const prevConnected = this.__internal__.serial.connected;
    const connected = this.#checkIfPortIsOpen(this.__internal__.serial.port);
    if (prevConnected && !connected) {
      this.#disconnected({ error: "Port is closed, not readable or writable." });
    }
    this.__internal__.serial.connected = connected;
    return this.__internal__.serial.connected;
  }

  get isConnecting(): boolean {
    return this.__internal__.serial.connecting;
  }

  get isDisconnected(): boolean {
    const prevConnected = this.__internal__.serial.connected;
    const connected = this.#checkIfPortIsOpen(this.__internal__.serial.port);
    if (!prevConnected && connected) {
      this.dispatch("serial:connected");
      this.#connectingChange(false);
      Devices.$dispatchChange(this);
    }
    this.__internal__.serial.connected = connected;
    return !this.__internal__.serial.connected;
  }

  get deviceNumber(): number {
    return this.__internal__.device_number;
  }

  get uuid(): string {
    return this.__internal__.device.id;
  }

  get typeDevice(): string {
    return this.__internal__.device.type;
  }

  get queue(): QueueData[] {
    return this.__internal__.serial.queue;
  }

  get responseDelimited(): boolean {
    return this.__internal__.serial.response.delimited;
  }

  set responseDelimited(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("responseDelimited must be a boolean");
    }
    this.__internal__.serial.response.delimited = value;
  }

  get responsePrefixLimited(): boolean {
    return this.__internal__.serial.response.prefixLimiter;
  }

  set responsePrefixLimited(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("responsePrefixLimited must be a boolean");
    }
    this.__internal__.serial.response.prefixLimiter = value;
  }

  get responseSufixLimited(): boolean {
    return this.__internal__.serial.response.sufixLimiter;
  }

  set responseSufixLimited(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("responseSufixLimited must be a boolean");
    }
    this.__internal__.serial.response.sufixLimiter = value;
  }

  get responseLimiter(): string | RegExp | null {
    return this.__internal__.serial.response.limiter;
  }

  set responseLimiter(limiter: string | RegExp | null) {
    if (typeof limiter !== "string" && !(limiter instanceof RegExp)) {
      throw new Error("responseLimiter must be a string or a RegExp");
    }

    this.__internal__.serial.response.limiter = limiter;
  }

  get fixedBytesMessage(): number | null {
    return this.__internal__.serial.response.length;
  }

  set fixedBytesMessage(length: number | null) {
    if (length !== null && (typeof length !== "number" || length < 1)) {
      throw new Error("Invalid length for fixed bytes message");
    }
    this.__internal__.serial.response.length = length;
  }

  get timeoutBeforeResponseBytes(): number {
    return this.__internal__.serial.free_timeout_ms || 50;
  }

  set timeoutBeforeResponseBytes(value: number) {
    if (value !== undefined && (typeof value !== "number" || value < 1)) {
      throw new Error("Invalid timeout for response bytes");
    }
    this.__internal__.serial.free_timeout_ms = value ?? 50;
  }

  get bypassSerialBytesConnection(): boolean {
    return this.__internal__.bypassSerialBytesConnection;
  }

  set bypassSerialBytesConnection(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("bypassSerialBytesConnection must be a boolean");
    }
    this.__internal__.bypassSerialBytesConnection = value;
  }

  #checkIfPortIsOpen(port: SerialPort | null): boolean {
    return !!(port && port.readable && port.writable);
  }

  public async timeout(bytes: string | Uint8Array | Array<string> | Array<number>, event: string): Promise<void> {
    this.__internal__.last_error.message = "Operation response timed out.";
    this.__internal__.last_error.action = event;
    this.__internal__.last_error.code = bytes;
    if (this.__internal__.timeout.until_response) {
      clearTimeout(this.__internal__.timeout.until_response);
      this.__internal__.timeout.until_response = 0;
    }
    if (event === "connect") {
      this.__internal__.serial.connected = false;
      this.dispatch("serial:reconnect", {});
      Devices.$dispatchChange(this);
    } else if (event === "connection:start") {
      await this.serialDisconnect();
      this.__internal__.serial.connected = false;
      this.__internal__.aux_port_connector += 1;
      Devices.$dispatchChange(this);
      await this.serialConnect();
    }

    this.dispatch("serial:timeout", {
      ...this.__internal__.last_error,
      bytes,
      action: event,
    });
  }

  public async disconnect(detail = null): Promise<void> {
    await this.serialDisconnect();
    this.#disconnected(detail);
  }

  #disconnected(detail: object | null = null): void {
    this.__internal__.serial.connected = false;
    this.__internal__.aux_port_connector = 0;
    this.dispatch("serial:disconnected", detail);
    Devices.$dispatchChange(this);
  }

  #onFinishConnecting(event: any): void {
    this.__internal__.serial.aux_connecting = event.detail.active ? "connecting" : "finished";
  }

  public async connect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
      // return `${this.typeDevice} device ${this.deviceNumber} already connected`;
    }

    this.__internal__.serial.aux_connecting = "idle";

    return new Promise((resolve: (value: boolean) => void, reject: (reason: string) => void): void => {
      if (!supportWebSerial()) {
        reject(`Web Serial not supported`);
      }

      if (!this.#boundFinishConnecting) {
        this.#boundFinishConnecting = this.#onFinishConnecting.bind(this);
      }

      this.on("internal:connecting", this.#boundFinishConnecting);

      const interval: number = setInterval((): void => {
        if (this.__internal__.serial.aux_connecting === "finished") {
          clearInterval(interval);
          this.__internal__.serial.aux_connecting = "idle";
          if (null !== this.#boundFinishConnecting) {
            this.off("internal:connecting", this.#boundFinishConnecting);
          }

          if (this.isConnected) {
            resolve(true);
          } else {
            reject(`${this.typeDevice} device ${this.deviceNumber} not connected`);
          }
        } else if (this.__internal__.serial.aux_connecting === "connecting") {
          this.__internal__.serial.aux_connecting = "idle";
          this.dispatch("internal:connecting", { active: true });
          this.dispatch("serial:connecting", { active: true });
        }
      }, 100);

      this.serialConnect();

      // setTimeout(async (): Promise<void> => {
      //   // await wait(499);
      //   this.serialConnect();//.then(()=>{}).catch((): void => {});

      //   if (this.isConnected) {
      //     resolve(true);
      //     // resolve(`${this.typeDevice} device ${this.deviceNumber} connected`);
      //   } else {
      //     reject(false);
      //     //reject(`${this.typeDevice} device ${this.deviceNumber} not connected`);
      //   }
      // }, 1);
    });
  }

  public async serialDisconnect(): Promise<void> {
    try {
      const reader: ReadableStreamDefaultReader<Uint8Array> | null = this.__internal__.serial.reader;
      const output_stream: WritableStream<Uint8Array> | null = this.__internal__.serial.output_stream;
      if (reader) {
        const reader_promise: Promise<void> = reader.cancel();
        await reader_promise.catch((err: unknown): void => this.serialErrors(err));
        await this.__internal__.serial.input_done;
      }

      if (output_stream) {
        await output_stream.getWriter().close();
        await this.__internal__.serial.output_done;
      }

      if (this.__internal__.serial.connected && this.__internal__.serial && this.__internal__.serial.port) {
        await this.__internal__.serial.port.close();
      }
    } catch (err: unknown) {
      this.serialErrors(err);
    } finally {
      this.__internal__.serial.reader = null;
      this.__internal__.serial.input_done = null;

      this.__internal__.serial.output_stream = null;
      this.__internal__.serial.output_done = null;

      this.__internal__.serial.connected = false;
      this.__internal__.serial.port = null;
      Devices.$dispatchChange(this);
    }
  }

  async #serialWrite(data: string | Uint8Array | Array<string> | Array<number>): Promise<void> {
    const port: SerialPort | null = this.__internal__.serial.port;
    if (!port || (port && (!port.readable || !port.writable))) {
      this.#disconnected({ error: "Port is closed, not readable or writable." });
      throw new Error("The port is closed or is not readable/writable");
    }
    const bytes: Uint8Array = this.validateBytes(data);

    if (this.useRTSCTS) {
      await this.#waitForCTS(port, 5000);
    }

    if (port.writable === null) return; // never happens, it's already checked, but to suppress TS error
    const writer: WritableStreamDefaultWriter<Uint8Array> = port.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
  }

  async #waitForCTS(port: SerialPort, timeoutMs: number = 5000): Promise<void> {
    const start = Date.now();
    while (true) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("Timeout waiting for clearToSend signal");
      }

      const { clearToSend } = await port.getSignals();
      if (clearToSend) return;
      await wait(100);
    }
  }

  #serialGetResponse(code: Uint8Array = new Uint8Array([]), corrupt: boolean = false) {
    if (code && code.length > 0) {
      const auxPrevConnected: boolean = this.__internal__.serial.connected;
      this.__internal__.serial.connected = this.#checkIfPortIsOpen(this.__internal__.serial.port);
      Devices.$dispatchChange(this);
      if (!auxPrevConnected && this.__internal__.serial.connected) {
        this.dispatch("serial:connected");
        this.#connectingChange(false);
      }

      if (this.__internal__.interval.reconnection) {
        clearInterval(this.__internal__.interval.reconnection);
        this.__internal__.interval.reconnection = 0;
      }

      if (this.__internal__.timeout.until_response) {
        clearTimeout(this.__internal__.timeout.until_response);
        this.__internal__.timeout.until_response = 0;
      }

      if (this.__internal__.serial.response.as === "hex") {
        if (corrupt) {
          this.serialCorruptMessage(this.parseUint8ToHex(code));
        } else {
          this.serialMessage(this.parseUint8ToHex(code));
        }
      } else if (this.__internal__.serial.response.as === "uint8") {
        if (corrupt) {
          this.serialCorruptMessage(code);
        } else {
          this.serialMessage(code);
        }
      } else if (this.__internal__.serial.response.as === "string") {
        const str = this.parseUint8ArrayToString(code);
        if (this.__internal__.serial.response.limiter !== null) {
          const splited = str.split(this.__internal__.serial.response.limiter);
          for (const s in splited) {
            if (!splited[s]) continue;
            if (corrupt) {
              this.serialCorruptMessage(splited[s]);
            } else {
              this.serialMessage(splited[s]);
            }
          }
        } else {
          if (corrupt) {
            this.serialCorruptMessage(str);
          } else {
            this.serialMessage(str);
          }
        }
      } else {
        const arraybuffer: ArrayBuffer = this.stringToArrayBuffer(this.parseUint8ArrayToString(code));
        if (corrupt) {
          this.serialCorruptMessage(arraybuffer);
        } else {
          this.serialMessage(arraybuffer);
        }
      }
    }

    if (this.__internal__.serial.queue.length === 0) return;
    this.dispatch("internal:queue", {});
  }

  public getResponseAsArrayBuffer(): void {
    this.__internal__.serial.response.as = "arraybuffer";
  }

  public getResponseAsArrayHex(): void {
    this.__internal__.serial.response.as = "hex";
  }

  public getResponseAsUint8Array(): void {
    this.__internal__.serial.response.as = "uint8";
  }

  public getResponseAsString(): void {
    this.__internal__.serial.response.as = "string";
  }

  async #serialPortsFiltered(): Promise<SerialPort[]> {
    const filters: SerialPortFilter[] = this.serialFilters;
    // @ts-expect-error getPorts can use parameters
    const ports: SerialPort[] = await navigator.serial.getPorts({ filters });
    if (filters.length === 0) return ports;

    const filteredPorts: SerialPort[] = ports.filter((port: SerialPort): boolean => {
      const info: SerialPortInfo = port.getInfo();
      return filters.some((filter: SerialPortFilter): boolean => {
        return info.usbProductId === filter.usbProductId && info.usbVendorId === filter.usbVendorId;
      });
    });

    // return only ports that are not open
    return filteredPorts.filter((port: SerialPort): boolean => !this.#checkIfPortIsOpen(port));
  }

  public async serialPortsSaved(ports: SerialPort[]): Promise<void> {
    const filters: SerialPortFilter[] = this.serialFilters;
    if (this.__internal__.aux_port_connector < ports.length) {
      const aux = this.__internal__.aux_port_connector;
      this.__internal__.serial.port = ports[aux];
    } else {
      this.__internal__.aux_port_connector = 0;
      this.__internal__.serial.port = await navigator.serial.requestPort({
        filters,
      });
    }
    if (!this.__internal__.serial.port) {
      throw new Error("Select another port please");
    }
  }

  public serialErrors(error: any): void {
    const err = error.toString().toLowerCase();
    switch (true) {
      case err.includes("must be handling a user gesture to show a permission request"):
      case err.includes("the port is closed."):
      case err.includes("the port is closed or is not writable"):
      case err.includes("the port is closed or is not readable"):
      case err.includes("the port is closed or is not readable/writable"):
      case err.includes("select another port please"):
      case err.includes("no port selected by the user"):
      case err.includes(
        "this readable stream reader has been released and cannot be used to cancel its previous owner stream",
      ):
        this.dispatch("serial:need-permission", {});
        Devices.$dispatchChange(this);
        break;
      case err.includes("the port is already open."):
      case err.includes("failed to open serial port"):
        this.serialDisconnect().then(async () => {
          this.__internal__.aux_port_connector += 1;
          await this.serialConnect();
        });
        break;
      case err.includes("cannot read properties of undefined (reading 'writable')"):
      case err.includes("cannot read properties of null (reading 'writable')"):
      case err.includes("cannot read property 'writable' of null"):
      case err.includes("cannot read property 'writable' of undefined"):
        this.serialDisconnect().then(async () => {
          await this.serialConnect();
        });
        break;
      case err.includes("'close' on 'serialport': a call to close() is already in progress."):
        // ... do something?
        break;
      case err.includes("failed to execute 'open' on 'serialport': a call to open() is already in progress."):
        // ... do something?
        break;
      case err.includes("the port is already closed."):
        // ... do something?
        break;
      case err.includes("the device has been lost"):
        this.dispatch("serial:lost", {});
        Devices.$dispatchChange(this);
        // dispatch event
        break;
      case err.includes("navigator.serial is undefined"):
        this.dispatch("serial:unsupported", {});
        // dispatch event
        break;
      default:
        // unhandled error
        console.error(error);
        break;
    }

    this.dispatch("serial:error", error);
  }

  #appendBuffer(arraybuffer: Uint8Array | ArrayBuffer | null): void {
    if (arraybuffer) {
      const incoming: Uint8Array = this.__internal__.serial.response.buffer;
      const tmp: Uint8Array = new Uint8Array(incoming.length + arraybuffer.byteLength);
      tmp.set(incoming, 0);
      tmp.set(new Uint8Array(arraybuffer), incoming.length);
      this.__internal__.serial.response.buffer = tmp;
    }
  }

  async #freeSerialLoop(): Promise<void> {
    if (this.__internal__.serial.time_until_send_bytes) {
      clearTimeout(this.__internal__.serial.time_until_send_bytes);
      this.__internal__.serial.time_until_send_bytes = 0;
    }

    this.__internal__.serial.time_until_send_bytes = setTimeout((): void => {
      if (this.__internal__.serial.response.buffer) {
        this.#serialGetResponse(this.__internal__.serial.response.buffer);
      }

      this.__internal__.serial.response.buffer = new Uint8Array(0);
    }, this.__internal__.serial.free_timeout_ms || 50);
  }

  async #slicedSerialLoop(): Promise<void> {
    const expectedLength = this.__internal__.serial.response.length;
    let buffer = this.__internal__.serial.response.buffer;

    if (this.__internal__.serial.time_until_send_bytes) {
      clearTimeout(this.__internal__.serial.time_until_send_bytes);
      this.__internal__.serial.time_until_send_bytes = 0;
    }

    if (expectedLength === null || !buffer || buffer.length === 0) return;

    while (buffer.length >= expectedLength) {
      const message = buffer.slice(0, expectedLength);
      this.#serialGetResponse(message);

      buffer = buffer.slice(expectedLength);
    }
    this.__internal__.serial.response.buffer = buffer;

    if (buffer.length > 0) {
      this.__internal__.serial.time_until_send_bytes = setTimeout((): void => {
        this.#serialGetResponse(this.__internal__.serial.response.buffer, true);
      }, this.__internal__.serial.free_timeout_ms || 50);
    }
  }

  async #delimitedSerialLoop(): Promise<void> {
    const {
      limiter,
      prefixLimiter = false,
      sufixLimiter = true,
    }: {
      limiter: string | RegExp | null;
      prefixLimiter?: boolean;
      sufixLimiter?: boolean;
    } = this.__internal__.serial.response;

    if (!limiter) {
      throw new Error("No limiter defined for delimited serial response");
    }

    const buffer = this.__internal__.serial.response.buffer;

    if (!limiter || !buffer || buffer.length === 0) return;

    if (this.__internal__.serial.time_until_send_bytes) {
      clearTimeout(this.__internal__.serial.time_until_send_bytes);
      this.__internal__.serial.time_until_send_bytes = 0;
    }

    const decoder = new TextDecoder();
    let decoded = decoder.decode(buffer);
    const messages: Uint8Array[] = [];

    if (typeof limiter === "string") {
      let pattern: RegExp;
      if (prefixLimiter && sufixLimiter) {
        pattern = new RegExp(`${limiter}([^${limiter}]+)${limiter}`, "g");
      } else if (prefixLimiter) {
        pattern = new RegExp(`${limiter}([^${limiter}]*)`, "g");
      } else if (sufixLimiter) {
        pattern = new RegExp(`([^${limiter}]+)${limiter}`, "g");
      } else {
        return;
      }

      let match;
      let lastIndex = 0;
      while ((match = pattern.exec(decoded)) !== null) {
        messages.push(new TextEncoder().encode(match[1]));
        lastIndex = pattern.lastIndex;
      }

      decoded = decoded.slice(lastIndex);
    } else if (limiter instanceof RegExp) {
      let match;
      let lastIndex = 0;
      if (prefixLimiter && sufixLimiter) {
        const pattern = new RegExp(`${limiter.source}(.*?)${limiter.source}`, "g");
        while ((match = pattern.exec(decoded)) !== null) {
          messages.push(new TextEncoder().encode(match[1]));
          lastIndex = pattern.lastIndex;
        }
      } else if (sufixLimiter) {
        while ((match = limiter.exec(decoded)) !== null) {
          const end = match.index;
          const chunk = decoded.slice(lastIndex, end);
          messages.push(new TextEncoder().encode(chunk));
          lastIndex = limiter.lastIndex;
        }
      } else if (prefixLimiter) {
        const parts = decoded.split(limiter);
        parts.shift();
        for (const part of parts) {
          messages.push(new TextEncoder().encode(part));
        }
        decoded = "";
      }

      decoded = decoded.slice(lastIndex);
    }

    for (const msg of messages) {
      this.#serialGetResponse(msg);
    }

    const leftoverBytes = new TextEncoder().encode(decoded);
    this.__internal__.serial.response.buffer = leftoverBytes;

    if (leftoverBytes.length > 0) {
      this.__internal__.serial.time_until_send_bytes = setTimeout((): void => {
        this.#serialGetResponse(this.__internal__.serial.response.buffer, true);
        this.__internal__.serial.response.buffer = new Uint8Array(0);
      }, this.__internal__.serial.free_timeout_ms ?? 50);
    }
  }

  async #readSerialLoop(): Promise<void> {
    const port: SerialPort | null = this.__internal__.serial.port;
    if (!port || !port.readable) throw new Error("Port is not readable");

    const reader: ReadableStreamDefaultReader<Uint8Array> = port.readable.getReader();
    this.__internal__.serial.reader = reader;

    try {
      while (this.__internal__.serial.keep_reading) {
        const { value, done } = await reader.read();
        if (done) break;

        this.#appendBuffer(value);

        if (this.__internal__.serial.response.delimited) {
          await this.#delimitedSerialLoop();
        } else if (this.__internal__.serial.response.length === null) {
          await this.#freeSerialLoop();
        } else {
          await this.#slicedSerialLoop();
        }
      }
    } catch (err: unknown) {
      this.serialErrors(err);
    } finally {
      reader.releaseLock();
      this.__internal__.serial.keep_reading = true;

      if (this.__internal__.serial.port) {
        await this.__internal__.serial.port.close();
      }
    }
  }

  #connectingChange(value: boolean): void {
    if (value === this.__internal__.serial.connecting) return;

    this.__internal__.serial.connecting = value;
    this.dispatch("serial:connecting", { active: value });
  }

  public async serialConnect(): Promise<void> {
    try {
      this.#connectingChange(true);

      const ports: SerialPort[] = await this.#serialPortsFiltered();
      if (ports.length > 0) {
        await this.serialPortsSaved(ports);
      } else {
        const filters: SerialPortFilter[] = this.serialFilters;
        this.__internal__.serial.port = await navigator.serial.requestPort({
          filters,
        });
      }

      const port: SerialPort | null = this.__internal__.serial.port;
      if (!port) {
        throw new Error("No port selected by the user");
      }
      await port.open(this.serialConfigPort);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const this1: this = this;
      port.onconnect = (event: Event): void => {
        // console.log(event);
        this1.dispatch("serial:connected", event);
        this1.#connectingChange(false);
        Devices.$dispatchChange(this);
        if (this1.__internal__.serial.queue.length > 0) {
          this1.dispatch("internal:queue", {});
        }
      };
      port.ondisconnect = async (): Promise<void> => {
        await this1.disconnect();
      };

      await wait(this.__internal__.serial.delay_first_connection);

      this.__internal__.timeout.until_response = setTimeout(async (): Promise<void> => {
        await this1.timeout(this1.__internal__.serial.bytes_connection ?? [], "connection:start");
      }, this.__internal__.time.response_connection);

      this.__internal__.serial.last_action = "connect";
      await this.#serialWrite(this.__internal__.serial.bytes_connection ?? []);

      this.dispatch("serial:sent", {
        action: "connect",
        bytes: this.__internal__.serial.bytes_connection,
      });

      if (this.__internal__.auto_response) {
        this.#serialGetResponse(this.__internal__.serial.auto_response);
      }
      await this.#readSerialLoop();
    } catch (e: unknown) {
      this.#connectingChange(false);
      this.serialErrors(e);
    }
  }

  async #forget(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    if ("serial" in navigator && "forget" in SerialPort.prototype && this.__internal__.serial.port) {
      await this.__internal__.serial.port.forget();
      return true;
    }
    return false;
  }

  public async serialForget(): Promise<boolean> {
    return await this.#forget();
  }

  public decToHex(dec: number | string): string {
    if (typeof dec === "string") {
      dec = parseInt(dec, 10);
    }
    return dec.toString(16);
  }

  public hexToDec(hex: string): number {
    return parseInt(hex, 16);
  }

  public hexMaker(val = "00", min = 2): string {
    return val.toString().padStart(min, "0").toLowerCase();
  }

  public add0x(bytes: string[]): string[] {
    const new_bytes: string[] = [];
    bytes.forEach((value: string, index: number): void => {
      new_bytes[index] = "0x" + value;
    });
    return new_bytes;
  }

  public bytesToHex(bytes: string[]): string[] {
    return this.add0x(Array.from(bytes, (byte: string): string => this.hexMaker(byte)));
  }

  #registerDefaultListeners(): void {
    const availableListeners: string[] = [
      "serial:connected",
      "serial:connecting",
      "serial:reconnect",
      "serial:timeout",
      "serial:disconnected",
      "serial:sent",
      "serial:soft-reload",
      "serial:message",
      "serial:corrupt-message",
      "unknown",
      "serial:need-permission",
      "serial:lost",
      "serial:unsupported",
      "serial:error",
      "debug",
    ];

    availableListeners.forEach((event: string): void => {
      this.serialRegisterAvailableListener(event);
    });
  }

  #internalEvents(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const this1: this = this;
    this.on("internal:queue", async (): Promise<void> => {
      await this1.#runQueue();
    });

    this.#browserEvents();
  }

  #browserEvents(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const this1: this = this;
    navigator.serial.addEventListener("connect", async (): Promise<void> => {
      if (!this1.isDisconnected) return;
      await this1.serialConnect().catch((): void => {});
    });
  }

  async #runQueue(): Promise<void> {
    if (!this.#checkIfPortIsOpen(this.__internal__.serial.port)) {
      this.#disconnected({ error: "Port is closed, not readable or writable." });
      await this.serialConnect();
      return;
    }

    // check if something is waiting for a response, when response arrives, the queue will be processed
    if (this.__internal__.timeout.until_response) return;

    if (this.__internal__.serial.queue.length === 0) return;

    // first element in queue
    const first: QueueData = this.__internal__.serial.queue[0];
    let limit_response: number = this.__internal__.time.response_general;
    if (first.action === "connect") {
      limit_response = this.__internal__.time.response_connection;
    }

    this.__internal__.timeout.until_response = setTimeout(async (): Promise<void> => {
      await this.timeout(first.bytes, first.action);
    }, limit_response);

    this.__internal__.serial.last_action = first.action ?? "unknown";
    await this.#serialWrite(first.bytes);

    this.dispatch("serial:sent", {
      action: first.action,
      bytes: first.bytes,
    });

    if (this.__internal__.auto_response) {
      let bytes: Uint8Array = new Uint8Array(0);
      try {
        bytes = this.validateBytes(this.__internal__.serial.auto_response);
      } catch (e: unknown) {
        this.serialErrors(e);
      }

      this.#serialGetResponse(bytes);
    }
    const copy_queue: QueueData[] = [...this.__internal__.serial.queue];
    this.__internal__.serial.queue = copy_queue.splice(1);
  }

  public validateBytes(data: string | Uint8Array | Array<string> | Array<number>): Uint8Array {
    let bytes: Uint8Array = new Uint8Array(0);
    if (data instanceof Uint8Array) {
      bytes = data;
    } else if (typeof data === "string") {
      bytes = this.parseStringToTextEncoder(data);
    } else if (Array.isArray(data) && typeof data[0] === "string") {
      bytes = this.stringArrayToUint8Array(data as string[]);
    } else if (Array.isArray(data) && typeof data[0] === "number") {
      bytes = new Uint8Array(data as unknown as number[]);
    } else {
      throw new Error("Invalid data type");
    }
    return bytes;
  }

  public async appendToQueue(arr: string | Uint8Array | string[] | number[], action: string): Promise<void> {
    const bytes: Uint8Array = this.validateBytes(arr);

    if (["connect", "connection:start"].includes(action)) {
      if (this.__internal__.serial.connected) return;

      // ignore queue because the connection is not established, so first message is connection
      // queue will never send a message before connection is established

      await this.serialConnect();
      return;
    }

    this.__internal__.serial.queue.push({ bytes, action });
    this.dispatch("internal:queue", {});
  }

  #serialSetBytesConnection(no_device = 1): void {
    this.__internal__.device_number = no_device;
    if (this.__internal__.bypassSerialBytesConnection) return;
    this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(no_device);
  }

  public serialSetConnectionConstant(listen_on_port = 1): string | Uint8Array | string[] | number[] | null {
    if (this.__internal__.bypassSerialBytesConnection) return this.__internal__.serial.bytes_connection;

    // console.warn("wtf?", this.bypassSerialBytesConnection);

    throw new Error(`Method not implemented 'serialSetConnectionConstant' to listen on channel ${listen_on_port}`);
    // ... implement in subclass
    // return [];
  }

  public serialMessage(code: string[] | Uint8Array<ArrayBufferLike> | string | ArrayBuffer): void {
    // this.dispatch('serial:message', code);
    // ... implement in subclass
    console.log(code);
    this.dispatch("serial:message", { code: code });
    throw new Error("Method not implemented 'serialMessage'");
  }

  public serialCorruptMessage(code: Uint8Array | number[] | string[] | never | null | string | ArrayBuffer): void {
    // ... implement in subclass
    console.log(code);
    this.dispatch("serial:corrupt-message", { code });
    throw new Error("Method not implemented 'serialCorruptMessage'");
  }

  #clearLastError(): void {
    this.__internal__.last_error = {
      message: null,
      action: null,
      code: null,
      no_code: 0,
    };
  }

  public clearSerialQueue(): void {
    this.__internal__.serial.queue = [];
  }

  public sumHex(arr: string[]): string {
    let sum: number = 0;
    arr.forEach((value: string): void => {
      sum += parseInt(value, 16);
    });
    return sum.toString(16);
  }

  public toString(): string {
    return JSON.stringify({
      __class: this.typeDevice,
      device_number: this.deviceNumber,
      uuid: this.uuid,
      connected: this.isConnected,
      connection: this.__internal__.serial.bytes_connection,
    });
  }

  public softReload(): void {
    this.#clearLastError();
    this.dispatch("serial:soft-reload", {});
  }

  public async sendConnect(): Promise<void> {
    if (!this.__internal__.serial.bytes_connection) {
      throw new Error("No connection bytes defined");
    }
    await this.appendToQueue(this.__internal__.serial.bytes_connection, "connect");
  }

  public async sendCustomCode({ code = [] }: CustomCode = { code: [] }): Promise<void> {
    if (!code) {
      throw new Error("No data to send");
    }

    if (this.__internal__.bypassSerialBytesConnection) {
      this.__internal__.serial.bytes_connection = this.validateBytes(code);
    }

    await this.appendToQueue(code, "custom");
  }

  public stringToArrayHex(string: string): string[] {
    return Array.from(string).map((char: string): string => char.charCodeAt(0).toString(16));
  }

  public stringToArrayBuffer(string: string, end: string = "\n"): ArrayBufferLike {
    return this.parseStringToTextEncoder(string, end).buffer;
  }

  public parseStringToTextEncoder(string: string = "", end: string = "\n"): Uint8Array {
    const encoder = new TextEncoder();
    string += end; // to finish the command
    return encoder.encode(string);
  }

  public parseStringToBytes(string: string = "", end: string = "\n"): string[] {
    const encoded: Uint8Array = this.parseStringToTextEncoder(string, end);
    return Array.from(encoded).map((byte: number): string => byte.toString(16));
  }

  public parseUint8ToHex(array: Uint8Array): string[] {
    return Array.from(array).map((byte: number): string => byte.toString(16));
  }

  public parseHexToUint8(array: string[]): Uint8Array {
    return new Uint8Array(array.map((hexString: string): number => parseInt(hexString, 16)));
  }

  public stringArrayToUint8Array(strings: string[]): Uint8Array {
    const bytes: number[] = [];
    if (typeof strings === "string") {
      return this.parseStringToTextEncoder(strings).buffer as Uint8Array;
    }
    strings.forEach((str: string): void => {
      const hex = str.replace("0x", "");
      bytes.push(parseInt(hex, 16));
    });

    return new Uint8Array(bytes);
  }

  public parseUint8ArrayToString(array: Uint8Array | string[]): string {
    let arrayUint8: Uint8Array = new Uint8Array(0);
    if (array instanceof Uint8Array) {
      arrayUint8 = array;
    } else {
      arrayUint8 = this.stringArrayToUint8Array(array as string[]);
    }

    array = this.parseUint8ToHex(arrayUint8);
    const byteArray: number[] = array.map((hexString: string): number => parseInt(hexString, 16));
    if (this.__internal__.serial.response.replacer) {
      return String.fromCharCode(...byteArray).replace(this.__internal__.serial.response.replacer, "");
    }
    return String.fromCharCode(...byteArray);
  }

  public hexToAscii(hex: string | number): string {
    const hexString: string = hex.toString();
    let asciiString: string = "";
    for (let i: number = 0; i < hexString.length; i += 2) {
      asciiString += String.fromCharCode(parseInt(hexString.substring(i, 2), 16));
    }
    return asciiString;
  }

  public asciiToHex(asciiString: string): string {
    const hexArray: string[] = [];
    for (let i: number = 0, length: number = asciiString.length; i < length; i++) {
      const hex: string = Number(asciiString.charCodeAt(i)).toString(16);
      hexArray.push(hex);
    }
    return hexArray.join("");
  }

  public $checkAndDispatchConnection(): boolean {
    return this.isConnected;
  }
}
