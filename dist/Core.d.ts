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
    prefixLimiter: boolean;
    sufixLimiter: boolean;
    delimited: boolean;
}
interface QueueData {
    bytes: string | Uint8Array | Array<string> | Array<number>;
    action: string;
}
type ParserSocketPort = {
    name: "byte-length" | "inter-byte-timeout";
    length?: number;
    interval?: number;
};
type PortInfo = {
    path: string | null;
    vendorId: number | string | null;
    productId: number | string | null;
    parser: ParserSocketPort;
};
type SerialData = {
    socket: boolean;
    portInfo: PortInfo;
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
    response_engines: number;
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
    socket?: boolean;
}
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
export declare class Core extends Dispatcher implements ICore {
    #private;
    protected __internal__: Internal;
    constructor({ filters, config_port, no_device, device_listen_on_channel, bypassSerialBytesConnection, socket, }?: CoreConstructorParams);
    set listenOnChannel(channel: string | number);
    get lastAction(): string | null;
    get listenOnChannel(): number;
    set serialFilters(filters: SerialPortFilter[]);
    get serialFilters(): SerialPortFilter[];
    set serialConfigPort(config_port: SerialOptions);
    get serialConfigPort(): SerialOptions;
    get useRTSCTS(): boolean;
    set useRTSCTS(value: boolean);
    get isConnected(): boolean;
    get isConnecting(): boolean;
    get isDisconnected(): boolean;
    get deviceNumber(): number;
    get uuid(): string;
    get typeDevice(): string;
    get queue(): QueueData[];
    get responseDelimited(): boolean;
    set responseDelimited(value: boolean);
    get responsePrefixLimited(): boolean;
    set responsePrefixLimited(value: boolean);
    get responseSufixLimited(): boolean;
    set responseSufixLimited(value: boolean);
    get responseLimiter(): string | RegExp | null;
    set responseLimiter(limiter: string | RegExp | null);
    get fixedBytesMessage(): number | null;
    set fixedBytesMessage(length: number | null);
    get timeoutBeforeResponseBytes(): number;
    set timeoutBeforeResponseBytes(value: number);
    get bypassSerialBytesConnection(): boolean;
    set bypassSerialBytesConnection(value: boolean);
    get useSocket(): boolean;
    get connectionBytes(): Uint8Array;
    set portPath(path: string | null);
    get portPath(): string | null;
    set portVendorId(vendorId: number | string | null);
    get portVendorId(): number | string | null;
    set portProductId(productId: number | string | null);
    get portProductId(): number | string | null;
    set socketPortParser(string: "byte-length" | "inter-byte-timeout");
    get socketPortParser(): "byte-length" | "inter-byte-timeout";
    set socketPortParserInterval(value: number);
    get socketPortParserInterval(): number;
    set socketPortParserLength(value: number);
    get socketPortParserLength(): number;
    get parserForSocket(): {
        name: "byte-length";
        length: number;
        interval?: undefined;
    } | {
        name: "inter-byte-timeout";
        interval: number;
        length?: undefined;
    };
    get configDeviceSocket(): object;
    timeout(bytes: string | Uint8Array | Array<string> | Array<number>, event: string): Promise<void>;
    disconnect(detail?: null): Promise<void>;
    socketResponse(data: any): void;
    connect(): Promise<boolean>;
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
    serialMessage(code: string[] | Uint8Array<ArrayBufferLike> | string | ArrayBuffer): void;
    serialCorruptMessage(code: Uint8Array | number[] | string[] | never | null | string | ArrayBuffer): void;
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