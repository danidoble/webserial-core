import { ManagerOptions, SocketOptions } from "socket.io-client";
interface SocketResponseData {
    name: string;
    uuid: string;
    deviceNumber: number;
    [key: string]: unknown;
}
declare class MySocket {
    #private;
    constructor();
    set uri(uri: string);
    get uri(): string;
    set options(options: Partial<ManagerOptions & SocketOptions>);
    get options(): Partial<ManagerOptions & SocketOptions>;
    disconnect(): void;
    prepare(): void;
    connectDevice(config: object): void;
    disconnectDevice(config: object): void;
    disconnectAllDevices(): void;
    write(data: object): void;
    onResponse(data: SocketResponseData): void;
}
export declare const Socket: MySocket;
export {};
//# sourceMappingURL=Socket.d.ts.map