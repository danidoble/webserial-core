import { io, ManagerOptions, SocketOptions, Socket as SocketIOClient } from "socket.io-client";
import { Devices } from "./Devices";
import { Core } from "./Core";

interface SocketResponseData {
  name: string;
  uuid: string;
  deviceNumber: number;
  [key: string]: unknown;
}

type BoundedFunction = {
  onResponse: (data: SocketResponseData) => void;
  onDisconnect: () => void;
  onConnect: () => void;
  onConnectError: (error: unknown) => void;
};

class MySocket {
  #uri: string = "http://localhost:3000";
  #options: Partial<ManagerOptions & SocketOptions> = {
    transports: ["websocket"],
  };
  #socket: SocketIOClient | null = null;
  #connected: boolean = false;
  #hasInstance: boolean = false;

  #boundedFun: BoundedFunction;

  constructor() {
    this.#boundedFun = {
      onResponse: this.onResponse.bind(this),
      onDisconnect: () => {
        // console.debug("Socket disconnected", this.#socket?.id);
        this.#connected = false;
        window.dispatchEvent(new Event("serial:socket:disconnected"));
      },
      onConnect: () => {
        // console.debug("Socket connected", this.#socket?.id);
        this.#connected = true;
        window.dispatchEvent(new Event("serial:socket:connected"));
      },
      onConnectError: (error) => {
        console.debug("Socket connection error", error);
        this.#connected = false;
        window.dispatchEvent(new Event("serial:socket:disconnected"));
      },
    };
  }

  set uri(uri: string) {
    const url = new URL(uri);

    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) {
      throw new Error("URI must start with http://, https://, ws://, or wss://");
    }
    this.#uri = uri;
  }

  get uri(): string {
    return this.#uri;
  }

  set options(options: Partial<ManagerOptions & SocketOptions>) {
    if (typeof options !== "object") {
      throw new Error("Options must be an object");
    }
    this.#options = options;
  }

  get options(): Partial<ManagerOptions & SocketOptions> {
    return this.#options;
  }

  get socketId(): string | null {
    return this.#socket && this.#socket.id ? this.#socket.id : null;
  }

  disconnect() {
    if (this.#socket) {
      this.#socket.off("response", this.#boundedFun.onResponse);
      this.#socket.off("disconnect", this.#boundedFun.onDisconnect);
      this.#socket.off("connect", this.#boundedFun.onConnect);
      this.#socket.off("connect_error", this.#boundedFun.onConnectError);

      this.#socket.disconnect();
      this.#socket = null;
      this.#hasInstance = false;
    }
    this.#connected = false;
  }

  prepare() {
    if (this.#connected || this.#hasInstance) return;

    this.#socket = io(this.#uri, this.#options);
    // this.#connected = true; // don't asume connected until onConnect is called
    this.#hasInstance = true;

    this.#socket.on("disconnect", this.#boundedFun.onDisconnect);
    this.#socket.on("response", this.#boundedFun.onResponse);
    this.#socket.on("connect", this.#boundedFun.onConnect);
    this.#socket.on("connect_error", this.#boundedFun.onConnectError);
  }

  connectDevice(config: object): void {
    if (!this.#socket) {
      throw new Error("Socket not connected. Call prepare() first.");
    }
    this.#socket.emit("connectDevice", { config });
  }

  disconnectDevice(config: object): void {
    if (!this.#socket) {
      throw new Error("Socket not connected. Call prepare() first.");
    }
    this.#socket.emit("disconnectDevice", { config });
  }

  disconnectAllDevices(): void {
    if (!this.#socket) {
      throw new Error("Socket not connected. Call prepare() first.");
    }
    this.#socket.emit("disconnectAll");
  }

  write(data: object): void {
    if (!this.#socket) {
      throw new Error("Socket not connected. Call prepare() first.");
    }
    this.#socket.emit("cmd", data);
  }

  onResponse(data: SocketResponseData): void {
    let device: Core | null = Devices.get(data.name, data.uuid);
    if (!device) {
      device = Devices.getByNumber(data.name, data.deviceNumber);
    }
    if (!device) {
      return;
    }
    device.socketResponse(data);
  }

  isConnected(): boolean {
    return this.#connected;
  }

  isDisconnected(): boolean {
    return !this.#connected;
  }
}

export const Socket = new MySocket();
