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
};

class MySocket {
  #uri: string = "http://localhost:3000";
  #options: Partial<ManagerOptions & SocketOptions> = {
    transports: ["websocket"],
  };
  #socket: SocketIOClient | null = null;
  #connected: boolean = false;

  #boundedFun: BoundedFunction;

  constructor() {
    this.#boundedFun = {
      onResponse: this.onResponse.bind(this),
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

  disconnect() {
    if (this.#socket) {
      this.#socket.off("response", this.#boundedFun.onResponse);

      this.#socket.disconnect();
      this.#socket = null;
    }
    this.#connected = false;
  }

  prepare() {
    if (this.#connected) return;

    this.#socket = io(this.#uri, this.#options);
    this.#connected = true;

    this.#socket.on("response", this.#boundedFun.onResponse);
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
}

export const Socket = new MySocket();
