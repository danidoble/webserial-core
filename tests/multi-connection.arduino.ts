import { Arduino } from "./arduino.ts";
import { Devices } from "../lib/Devices.ts";
import { Core } from "../lib/Core.ts";

let logElement: HTMLElement | null = document.getElementById("log");

function prepareDevice(board: Core): void {
  // board.__debug__ = true;
  // board.on("debug", (event): void => {
  //   // @ts-expect-error detail is defined
  //   const detail = event.detail;
  //   console.log("debug", detail);
  // })

  // board.useRTSCTS = true; // Enable RTS/CTS flow control
  // board.fixedBytesMessage = 11;
  // board.timeoutBeforeResponseBytes = 50; // prev versions 400ms
  // board.responseDelimited = true;
  // board.responseLimiter = '\n';
  // board.responseSufixLimited = true;
  // board.responsePrefixLimited = true;

  board.on("serial:message", (data): void => {
    // @ts-expect-error detail is defined
    const detail = data.detail;
    // @ts-expect-error target is defined
    const target: Core = data.target;
    //console.log(detail);
    if (!logElement) return;
    logElement.innerText +=
      "Board: " + target.deviceNumber + '. Response of "' + detail.request + '": ' + detail.code.toString() + "\n\n";
  });

  board.on("serial:timeout", (data): void => {
    // @ts-expect-error detail and target are defined
    console.warn("Board: " + data.target.deviceNumber + ". serial:timeout", data.detail);
  });

  board.on("serial:sent", (data): void => {
    // @ts-expect-error detail is defined
    const detail = data.detail;
    // @ts-expect-error target is defined
    const target: Core = data.target;
    //console.log("serial:sent", detail);
    if (!logElement) return;
    logElement.innerText +=
      "Board: " +
      target.deviceNumber +
      '. Action "' +
      detail.action +
      '": sent: ' +
      board.parseUint8ArrayToString(detail.bytes) +
      "\n\n";
  });

  board.on("serial:error", (data): void => {
    if (!logElement) return;
    // @ts-expect-error detail is defined
    const detail = data.detail;
    // @ts-expect-error target is defined
    const target: Core = data.target;
    logElement.innerText += "Board: " + target.deviceNumber + ". " + detail.message + "\n\n";
  });

  board.on("serial:disconnected", (data): void => {
    // @ts-expect-error detail is defined
    const target: Core = data.target;
    if (logElement) {
      logElement.innerText += "Board: " + target.deviceNumber + ". Disconnected\n\n";
    }

    document.getElementById("disconnected")?.classList.remove("hidden");
    document.getElementById("connect")?.classList.remove("hidden");
    document.getElementById("disconnect")?.classList.add("hidden");
  });

  board.on("serial:connecting", (data: any): void => {
    if (!logElement || data.detail.active) return;

    const target: Core = data.target;
    logElement.innerText += "Board: " + target.deviceNumber + ". Connecting finished\n\n";
  });

  board.on("serial:connected", (data): void => {
    if (logElement) {
      // @ts-expect-error target is defined
      const target: Core = data.target;
      logElement.innerText += "Board: " + target.deviceNumber + ". Connected\n\n";
    }

    document.getElementById("disconnected")?.classList.add("hidden");
    document.getElementById("need-permission")?.classList.add("hidden");
    document.getElementById("connect")?.classList.add("hidden");
    document.getElementById("disconnect")?.classList.remove("hidden");
  });

  board.on("serial:need-permission", (): void => {
    document.getElementById("disconnected")?.classList.remove("hidden");
    document.getElementById("need-permission")?.classList.remove("hidden");
    document.getElementById("connect")?.classList.remove("hidden");
    document.getElementById("disconnect")?.classList.add("hidden");
  });

  board.on("serial:soft-reload", (): void => {
    // reset your variables
  });

  board.on("serial:unsupported", (): void => {
    document.getElementById("unsupported")?.classList.remove("hidden");
  });
}

const board = new Arduino({
  // bypassSerialBytesConnection: true,
  // socket: true,
});

const board2 = new Arduino({ 
  // bypassSerialBytesConnection: true,
  // socket: true,
  no_device: 2 
});

prepareDevice(board);
prepareDevice(board2);

async function tryConnect(): Promise<void> {
  const r = await Devices.connectToAll();
  console.log("Devices connected", r);
  if (!logElement) return;
  logElement.innerText += "All devices connected: " + r + "\n\n";
}

async function tryDisconnect(): Promise<void> {
  const r = await Devices.disconnectAll();
  console.log("Devices disconnected", r);
  if (!logElement) return;
  logElement.innerText += "All devices disconnected: " + r + "\n\n";
}

document.addEventListener("DOMContentLoaded", (): void => {
  if (!logElement) logElement = document.getElementById("log");
  
  tryConnect();
  document.getElementById("connect")?.addEventListener("click", tryConnect);
  document.getElementById("disconnect")?.addEventListener("click", tryDisconnect);
});

// just to test in navigator
// @ts-expect-error assign to window object
window.board = board;
// @ts-expect-error assign to window object
window.board2 = board2;
// @ts-expect-error assign to window object
window.devices = Devices;
