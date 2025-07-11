import { ManagerOptions, SocketOptions } from "socket.io-client";
declare class MySocket {
    #private;
    set uri(uri: string);
    get uri(): string;
    set options(options: Partial<ManagerOptions & SocketOptions>);
    get options(): Partial<ManagerOptions & SocketOptions>;
    constructor();
    disconnect(): void;
    prepare(): void;
    connectDevice(config: object): void;
    disconnectDevice(config: object): void;
    disconnectAllDevices(): void;
    write(data: object): void;
    onResponse(data: any): void;
}
export declare const Socket: MySocket;
export {};
//# sourceMappingURL=Socket.d.ts.map