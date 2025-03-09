import { Internal } from "./Core";

declare class Core {
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
  );

  protected __internal__: Internal;

  set listenOnChannel(channel: string | number);

  get lastAction(): string | null;

  get listenOnChannel(): number;

  set serialFilters(filters: SerialPortFilter[] | null);
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

  parseHexToUint8(array: string[]): Uint8Array;

  parseUint8ArrayToString(array: string[]): string;

  parseStringToTextEncoder(string: string, end: string): Uint8Array;

  parseUint8ToHex(array: Uint8Array): string[];

  stringArrayToUint8Array(strings: string[]): Uint8Array;

  hexToAscii(hex: string | number): string;

  asciiToHex(asciiString: string): string;

  getResponseAsArrayBuffer(): void;

  getResponseAsArrayHex(): void;

  getResponseAsUint8Array(): void;

  getResponseAsString(): void;

  $checkAndDispatchConnection(): boolean;
}
