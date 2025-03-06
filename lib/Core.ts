import { v4 as uuidv4 } from "uuid";
import { Dispatcher } from "./Dispatcher.ts";
import { Devices } from "./Devices.ts";
import { supportWebSerial, wait } from "./utils.ts";

interface LastError {
  message: string | null;
  action: string | null;
  code: number | Array<Uint8Array> | Array<string> | null;
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
}

interface QueueData {
  bytes: string[];
  action: string;
}

type SerialData = {
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
  bytes_connection: Array<string> | null;
  filters: SerialPortFilter[];
  config_port: SerialOptions;
  queue: QueueData[];
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
  code: Array<string>;
}

interface ICore {
  lastAction: string | null;

  set listenOnChannel(channel: string | number);

  set serialFilters(filters: SerialPortFilter[]);

  get serialFilters(): SerialPortFilter[];

  set serialConfigPort(config_port: SerialOptions);

  get serialConfigPort(): SerialOptions;

  get isConnected(): boolean;

  get isDisconnected(): boolean;

  get deviceNumber(): number;

  get uuid(): string;

  get typeDevice(): string;

  get queue(): QueueData[];

  timeout(bytes: string[], event: string): Promise<void>;

  disconnect(detail?: null): Promise<void>;

  connect(): Promise<string>;

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

  serialSetConnectionConstant(listen_on_port?: number): never[] | string[];

  serialMessage(hex: string[]): void;

  serialCorruptMessage(code: string[], data: never | null): void;

  clearSerialQueue(): void;

  sumHex(arr: string[]): string;

  softReload(): void;

  sendConnect(): Promise<void>;

  sendCustomCode({ code }: { code: CustomCode }): Promise<void>;

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
      connected: false,
      port: null,
      last_action: null,
      response: {
        length: null,
        buffer: new Uint8Array([]),
        as: "hex",
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
    },
    device: {
      type: "unknown",
      id: uuidv4(),
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

  constructor(
    {
      filters = null,
      config_port = defaultConfigPort,
      no_device = 1,
      device_listen_on_channel = 1,
    }: CoreConstructorParams = {
      filters: null,
      config_port: defaultConfigPort,
      no_device: 1,
      device_listen_on_channel: 1,
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
    this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(channel);
  }

  get lastAction(): string | null {
    return this.__internal__.serial.last_action;
  }

  get listenOnChannel(): number {
    return this.__internal__.device.listen_on_port ?? 1;
  }

  set serialFilters(filters: SerialPortFilter[]) {
    this.__internal__.serial.filters = filters;
  }

  get serialFilters(): SerialPortFilter[] {
    return this.__internal__.serial.filters;
  }

  set serialConfigPort(config_port: SerialOptions) {
    this.__internal__.serial.config_port = config_port;
  }

  get serialConfigPort(): SerialOptions {
    return this.__internal__.serial.config_port;
  }

  get isConnected(): boolean {
    return this.__internal__.serial.connected;
  }

  get isDisconnected(): boolean {
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

  #checkIfPortIsOpen(port: SerialPort | null): boolean {
    return !!(port && port.readable && port.writable);
  }

  async timeout(bytes: string[], event: string): Promise<void> {
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
    } else if (event === "connection:start") {
      await this.serialDisconnect();
      this.__internal__.serial.connected = false;
      this.__internal__.aux_port_connector += 1;
      await this.serialConnect();
    }

    this.dispatch("serial:timeout", {
      ...this.__internal__.last_error,
      bytes,
      action: event,
    });
  }

  async disconnect(detail = null): Promise<void> {
    await this.serialDisconnect();
    this.__internal__.serial.connected = false;
    this.__internal__.aux_port_connector = 0;
    this.dispatch("serial:disconnected", detail);
    Devices.instance.dispatch("change");
  }

  async connect(): Promise<string> {
    return new Promise((resolve: (value: string) => void, reject: (reason: string) => void): void => {
      if (!supportWebSerial()) {
        reject(`Web Serial not supported`);
      }

      setTimeout(async (): Promise<void> => {
        await wait(499);
        await this.serialConnect();
        if (this.isConnected) {
          resolve(`${this.typeDevice} device ${this.deviceNumber} connected`);
        } else {
          reject(`${this.typeDevice} device ${this.deviceNumber} not connected`);
        }
      }, 1);
    });
  }

  async serialDisconnect(): Promise<void> {
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
    }
  }

  async #serialWrite(data: Array<string>): Promise<void> {
    const port: SerialPort | null = this.__internal__.serial.port;
    if (!port || !port.readable || !port.writable) {
      throw new Error("The port is closed or is not writable");
    }
    const bytes = this.stringArrayToUint8Array(data);
    const writer: WritableStreamDefaultWriter<Uint8Array> = port.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
  }

  #serialGetResponse(code: string[] = [], data = null) {
    if (code && code.length > 0) {
      if (!this.__internal__.serial.connected) {
        this.dispatch("serial:connected");
        Devices.instance.dispatch("change");
      }
      this.__internal__.serial.connected = true;
      if (this.__internal__.interval.reconnection) {
        clearInterval(this.__internal__.interval.reconnection);
        this.__internal__.interval.reconnection = 0;
      }

      if (this.__internal__.timeout.until_response) {
        clearTimeout(this.__internal__.timeout.until_response);
        this.__internal__.timeout.until_response = 0;
      }

      const serial_data: string[] = [];
      for (const byte in code) {
        serial_data.push(code[byte].toString().padStart(2, "0").toLowerCase());
      }

      if (this.__internal__.serial.response.as === "hex") {
        this.serialMessage(serial_data);
      } else if (this.__internal__.serial.response.as === "uint8") {
        this.serialMessage(this.parseHexToUint8(this.add0x(serial_data)));
      } else if (this.__internal__.serial.response.as === "string") {
        this.serialMessage(this.parseUint8ArrayToString(this.add0x(serial_data)));
      } else {
        const arraybuffer: ArrayBuffer = this.stringToArrayBuffer(
          this.parseUint8ArrayToString(this.add0x(serial_data)),
        );
        this.serialMessage(arraybuffer);
      }
    } else {
      this.serialCorruptMessage(code, data);
    }

    if (this.__internal__.serial.queue.length === 0) return;
    this.dispatch("internal:queue", {});
  }

  getResponseAsArrayBuffer(): void {
    this.__internal__.serial.response.as = "arraybuffer";
  }

  getResponseAsArrayHex(): void {
    this.__internal__.serial.response.as = "hex";
  }

  getResponseAsUint8Array(): void {
    this.__internal__.serial.response.as = "uint8";
  }

  getResponseAsString(): void {
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

  async serialPortsSaved(ports: SerialPort[]): Promise<void> {
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

  serialErrors(error: any): void {
    const err = error.toString().toLowerCase();
    switch (true) {
      case err.includes("must be handling a user gesture to show a permission request"):
      case err.includes("the port is closed."):
      case err.includes("the port is closed or is not writable"):
      case err.includes("select another port please"):
      case err.includes("no port selected by the user"):
      case err.includes(
        "this readable stream reader has been released and cannot be used to cancel its previous owner stream",
      ):
        this.dispatch("serial:need-permission", {});
        Devices.instance.dispatch("change");
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
        Devices.instance.dispatch("change");
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
      const hex: string[] = [];
      for (const byte in this.__internal__.serial.response.buffer) {
        hex.push(this.__internal__.serial.response.buffer[byte].toString(16));
      }

      if (this.__internal__.serial.response.buffer) {
        this.#serialGetResponse(hex);
      }

      this.__internal__.serial.response.buffer = new Uint8Array(0);
    }, 400);
  }

  async #slicedSerialLoop(): Promise<void> {
    if (this.__internal__.serial.response.length === null) return;

    if (this.__internal__.serial.response.length === this.__internal__.serial.response.buffer.length) {
      const hex: string[] = [];
      for (const byte in this.__internal__.serial.response.buffer) {
        hex.push(this.__internal__.serial.response.buffer[byte].toString(16));
      }

      this.#serialGetResponse(hex);
      this.__internal__.serial.response.buffer = new Uint8Array(0);
    } else if (this.__internal__.serial.response.length < this.__internal__.serial.response.buffer.length) {
      let incoming: Uint8Array = new Uint8Array(0);
      for (let jk: number = 0; jk < this.__internal__.serial.response.length; jk++) {
        incoming[jk] = this.__internal__.serial.response.buffer[jk];
      }

      if (incoming.length === this.__internal__.serial.response.length) {
        const hex: string[] = [];
        for (const byte in incoming) {
          hex.push(incoming[byte].toString(16));
        }
        this.#serialGetResponse(hex);
        this.__internal__.serial.response.buffer = new Uint8Array(0);
        return;
      }
      incoming = new Uint8Array(0);

      const double_length: number = this.__internal__.serial.response.length * 2;
      if (this.__internal__.serial.response.buffer.length === double_length) {
        for (let jk: number = 14; jk < double_length; jk++) {
          incoming[jk - this.__internal__.serial.response.length] = this.__internal__.serial.response.buffer[jk];
        }
        if (incoming.length === this.__internal__.serial.response.length) {
          const hex: string[] = [];
          for (const byte in incoming) {
            hex.push(incoming[byte].toString(16));
          }
          this.#serialGetResponse(hex);
          this.__internal__.serial.response.buffer = new Uint8Array(0);
        }
      }
    }
  }

  async #readSerialLoop(): Promise<void> {
    const port: SerialPort | null = this.__internal__.serial.port;
    if (!port || !port.readable) throw new Error("Port is not readable");
    while (port.readable && this.__internal__.serial.keep_reading) {
      const reader: ReadableStreamDefaultReader<Uint8Array> = port.readable.getReader();
      this.__internal__.serial.reader = reader;
      try {
        let run: boolean = true;
        while (run) {
          const { value, done } = await reader.read();
          if (done) {
            reader.releaseLock();
            this.__internal__.serial.keep_reading = false;
            run = false;
            break;
          }

          this.#appendBuffer(value);

          if (this.__internal__.serial.response.length === null) {
            await this.#freeSerialLoop();
          } else {
            await this.#slicedSerialLoop();
          }
        }
      } catch (err: unknown) {
        this.serialErrors(err);
      } finally {
        reader.releaseLock();
      }
    }
    this.__internal__.serial.keep_reading = true;
    if (!this.__internal__.serial.port) return;
    await this.__internal__.serial.port.close();
  }

  async serialConnect(): Promise<void> {
    try {
      this.dispatch("serial:connecting", {});

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
        this1.dispatch("serial:connected", event);
        Devices.instance.dispatch("change");
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
        this.#serialGetResponse(["DD", "DD"], null);
      }
      await this.#readSerialLoop();
    } catch (e: unknown) {
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

  async serialForget(): Promise<boolean> {
    return await this.#forget();
  }

  decToHex(dec: number | string): string {
    if (typeof dec === "string") {
      dec = parseInt(dec, 10);
    }
    return dec.toString(16);
  }

  hexToDec(hex: string): number {
    return parseInt(hex, 16);
  }

  hexMaker(val = "00", min = 2): string {
    return val.toString().padStart(min, "0").toLowerCase();
  }

  add0x(bytes: string[]): string[] {
    const new_bytes: string[] = [];
    bytes.forEach((value: string, index: number): void => {
      new_bytes[index] = "0x" + value;
    });
    return new_bytes;
  }

  bytesToHex(bytes: string[]): string[] {
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
      this.__internal__.serial.connected = false;
      this.__internal__.aux_port_connector = 0;
      this.dispatch("serial:disconnected", { error: "Port is closed, not readable or writable." });
      Devices.instance.dispatch("change");
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
      this.#serialGetResponse(["DD", "DD"], null);
    }
    const copy_queue: QueueData[] = [...this.__internal__.serial.queue];
    this.__internal__.serial.queue = copy_queue.splice(1);
  }

  async appendToQueue(arr: string[], action: string): Promise<void> {
    const bytes: string[] = this.bytesToHex(arr);

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
    this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(no_device);
  }

  serialSetConnectionConstant(listen_on_port = 1): never[] | string[] {
    throw new Error(`Method not implemented 'serialSetConnectionConstant' to listen on channel ${listen_on_port}`);
    // ... implement in subclass
    // return [];
  }

  serialMessage(hex: string[] | Uint8Array<ArrayBufferLike> | string | ArrayBuffer): void {
    // this.dispatch('serial:message', code);
    // ... implement in subclass
    console.log(hex);
    throw new Error("Method not implemented 'serialMessage'");
  }

  serialCorruptMessage(code: string[], data: never | null): void {
    // ... implement in subclass
    console.log(code, data);
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

  clearSerialQueue(): void {
    this.__internal__.serial.queue = [];
  }

  sumHex(arr: string[]): string {
    let sum: number = 0;
    arr.forEach((value: string): void => {
      sum += parseInt(value, 16);
    });
    return sum.toString(16);
  }

  toString(): string {
    return JSON.stringify({
      __class: this.typeDevice,
      device_number: this.deviceNumber,
      uuid: this.uuid,
      connected: this.isConnected,
      connection: this.__internal__.serial.bytes_connection,
    });
  }

  softReload(): void {
    this.#clearLastError();
    this.dispatch("serial:soft-reload", {});
  }

  async sendConnect(): Promise<void> {
    if (!this.__internal__.serial.bytes_connection) {
      throw new Error("No connection bytes defined");
    }
    await this.appendToQueue(this.__internal__.serial.bytes_connection, "connect");
  }

  // @ts-expect-error code is required but can be empty
  async sendCustomCode({ code = [] }: CustomCode = { code: [] }): Promise<void> {
    if (code === null || code.length === 0) {
      throw new Error("No data to send");
    }
    await this.appendToQueue(code, "custom");
  }

  stringToArrayHex(string: string): string[] {
    return Array.from(string).map((char: string): string => char.charCodeAt(0).toString(16));
  }

  stringToArrayBuffer(string: string, end: string = "\n"): ArrayBufferLike {
    return this.parseStringToTextEncoder(string, end).buffer;
  }

  parseStringToTextEncoder(string: string = "", end: string = "\n"): Uint8Array {
    const encoder = new TextEncoder();
    string += end; // to finish the command
    return encoder.encode(string);
  }

  parseStringToBytes(string: string = "", end: string = "\n"): string[] {
    const encoded: Uint8Array = this.parseStringToTextEncoder(string, end);
    return Array.from(encoded).map((byte: number): string => byte.toString(16));
  }

  parseUint8ToHex(array: Uint8Array): string[] {
    return Array.from(array).map((byte: number): string => byte.toString(16));
  }

  parseHexToUint8(array: string[]): Uint8Array {
    return new Uint8Array(array.map((hexString: string): number => parseInt(hexString, 16)));
  }

  stringArrayToUint8Array(strings: string[]): Uint8Array {
    const bytes: number[] = [];
    strings.forEach((str: string): void => {
      const hex = str.replace("0x", "");
      bytes.push(parseInt(hex, 16));
    });

    return new Uint8Array(bytes);
  }

  parseUint8ArrayToString(array: string[]): string {
    const arrayUint8: Uint8Array = this.stringArrayToUint8Array(array as string[]);
    array = this.parseUint8ToHex(arrayUint8);
    const byteArray: number[] = array.map((hexString: string): number => parseInt(hexString, 16));
    return String.fromCharCode(...byteArray).replace(/[\n\r]+/g, "");
  }

  hexToAscii(hex: string | number): string {
    const hexString: string = hex.toString();
    let asciiString: string = "";
    for (let i: number = 0; i < hexString.length; i += 2) {
      asciiString += String.fromCharCode(parseInt(hexString.substring(i, 2), 16));
    }
    return asciiString;
  }

  asciiToHex(asciiString: string): string {
    const hexArray: string[] = [];
    for (let i: number = 0, length: number = asciiString.length; i < length; i++) {
      const hex: string = Number(asciiString.charCodeAt(i)).toString(16);
      hexArray.push(hex);
    }
    return hexArray.join("");
  }
}
