import { Dispatcher } from "./Dispatcher.ts";
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
}
interface QueueData {
    bytes: string | Uint8Array | Array<string> | Array<number>;
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
    bytes_connection: string | Uint8Array | string[] | number[] | null;
    filters: SerialPortFilter[];
    config_port: SerialOptions;
    queue: QueueData[];
    auto_response: any;
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
    serialSetConnectionConstant(listen_on_port?: number): string | Uint8Array | string[] | number[] | null;
    serialMessage(hex: string[]): void;
    serialCorruptMessage(code: string[], data: never | null): void;
    clearSerialQueue(): void;
    sumHex(arr: string[]): string;
    softReload(): void;
    sendConnect(): Promise<void>;
    sendCustomCode({ code }: {
        code: CustomCode;
    }): Promise<void>;
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
export declare class Core extends Dispatcher implements ICore {
    #private;
    protected __internal__: Internal;
    constructor({ filters, config_port, no_device, device_listen_on_channel, }?: CoreConstructorParams);
    set listenOnChannel(channel: string | number);
    get lastAction(): string | null;
    get listenOnChannel(): number;
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
    timeout(bytes: string | Uint8Array | Array<string> | Array<number>, event: string): Promise<void>;
    disconnect(detail?: null): Promise<void>;
    connect(): Promise<string>;
    serialDisconnect(): Promise<void>;
    getResponseAsArrayBuffer(): void;
    getResponseAsArrayHex(): void;
    getResponseAsUint8Array(): void;
    getResponseAsString(): void;
    serialPortsSaved(ports: SerialPort[]): Promise<void>;
    serialErrors(error: any): void;
    serialConnect(): Promise<void>;
    serialForget(): Promise<boolean>;
    decToHex(dec: number | string): string;
    hexToDec(hex: string): number;
    hexMaker(val?: string, min?: number): string;
    add0x(bytes: string[]): string[];
    bytesToHex(bytes: string[]): string[];
    validateBytes(data: string | Uint8Array | Array<string> | Array<number>): Uint8Array;
    appendToQueue(arr: string | Uint8Array | string[] | number[], action: string): Promise<void>;
    serialSetConnectionConstant(listen_on_port?: number): string | Uint8Array | string[] | number[] | null;
    serialMessage(hex: string[] | Uint8Array<ArrayBufferLike> | string | ArrayBuffer): void;
    serialCorruptMessage(code: Uint8Array | number[] | string[], data: never | null): void;
    clearSerialQueue(): void;
    sumHex(arr: string[]): string;
    toString(): string;
    softReload(): void;
    sendConnect(): Promise<void>;
    sendCustomCode({ code }?: CustomCode): Promise<void>;
    stringToArrayHex(string: string): string[];
    stringToArrayBuffer(string: string, end?: string): ArrayBufferLike;
    parseStringToTextEncoder(string?: string, end?: string): Uint8Array;
    parseStringToBytes(string?: string, end?: string): string[];
    parseUint8ToHex(array: Uint8Array): string[];
    parseHexToUint8(array: string[]): Uint8Array;
    stringArrayToUint8Array(strings: string[]): Uint8Array;
    parseUint8ArrayToString(array: Uint8Array | string[]): string;
    hexToAscii(hex: string | number): string;
    asciiToHex(asciiString: string): string;
    $checkAndDispatchConnection(): boolean;
}
export {};
//# sourceMappingURL=Core.d.ts.map