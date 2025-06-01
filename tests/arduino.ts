"use strict";

import { Core } from "../lib/Core.ts";
import { Devices } from "../lib/Devices.ts";

interface SerialMessage {
  code: string[] | Uint8Array<ArrayBufferLike> | string | ArrayBuffer;
  name: string;
  description: string;
  request: string;
  no_code: number;
}

interface ConstructorParams {
  filters?: SerialPortFilter[] | null;
  config_port?: SerialOptions;
  no_device?: number;
  device_listen_on_channel?: number | string;
  bypassSerialBytesConnection?: boolean;
}

export class Arduino extends Core {
  constructor(
    {
      filters = null,
      config_port = {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        bufferSize: 32768,
        flowControl: "none",
      },
      no_device = 1,
      bypassSerialBytesConnection = false,
    } : ConstructorParams = {
      filters: null,
      config_port: {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        bufferSize: 32768,
        flowControl: "none",
      },
      no_device: 1,
      bypassSerialBytesConnection: false,
    },
  ) {
    super({ filters, config_port, no_device, bypassSerialBytesConnection });
    
    this.__internal__.device.type = "arduino";
    Devices.registerType(this.__internal__.device.type);
    if (Devices.getByNumber(this.typeDevice, no_device)) {
      throw new Error(`Device ${this.typeDevice} ${no_device} already exists`);
    }
    this.__internal__.time.response_connection = 2e3;
    this.__internal__.time.response_general = 2e3;
    this.__internal__.serial.delay_first_connection = 1_000;
    this.#registerAvailableListenersLocker();
    // @ts-expect-error extends Core
    Devices.add(this);
    this.getResponseAsString();
  }

  #registerAvailableListenersLocker(): void {
    /*const _ = [];
    for (const event of _) {
        this.serialRegisterAvailableListener(event)
    }
    */
  }

  public serialCorruptMessage(code: Uint8Array | number[] | string[] | never | null | string | ArrayBuffer): void {
    console.warn("serialCorruptMessage", code);
    this.dispatch("serial:corrupt-message", {code});
    this.dispatch("serial:message", {code});
  }

  serialMessage(codex: string[] | Uint8Array<ArrayBufferLike> | string | ArrayBuffer): void {
    const message: SerialMessage = {
      code: [],
      name: "",
      description: "",
      request: "",
      no_code: 0,
    };

    message.code = codex;

    switch (codex) {
      case "connected":
        message.name = "connected";
        message.description = "Connection established";
        message.request = "connect";
        message.no_code = 100;
        break;
      case "created by danidoble":
        message.name = "thanks";
        message.description = "thanks for using this software";
        message.request = "credits";
        message.no_code = 101;
        break;
      case "hello there":
        message.name = "hello there";
        message.description = "hi human";
        message.request = "hi";
        message.no_code = 102;
        break;
      case "ara ara":
        message.name = "ara ara";
        message.description = "troll";
        message.request = "ara ara";
        message.no_code = 404;
        break;
      default:
        message.name = "unknown";
        message.description = "Unknown command";
        message.request = "unknown";
        message.no_code = 400;
        break;
    }
    //console.warn(codex);

    this.dispatch("serial:message", message);
  }

  serialSetConnectionConstant(): string {
    return "CONNECT";
  }

  async sayCredits(): Promise<void> {
    await this.appendToQueue("CREDITS", "credits");
  }

  async sayHi(): Promise<void> {
    await this.appendToQueue("HI", "hi");
  }

  async sayAra(): Promise<void> {
    await this.appendToQueue("OTHER", "ara");
  }

  async doSomething(): Promise<void> {
    await this.sayCredits();
    await this.sayAra();
    await this.sayHi();
  }
}
