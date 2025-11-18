import { Arduino } from "./arduino.ts";

let logElement: HTMLElement | null = document.getElementById("log");
document.addEventListener("DOMContentLoaded", (): void => {
  if (!logElement) logElement = document.getElementById("log");
});

const board = new Arduino({
  // bypassSerialBytesConnection: true 
  // socket: true,
});
// board.portPath='/dev/ttyUSB0';

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
  //console.log(detail);
  if (!logElement) return;
  logElement.innerText += 'Response of "' + detail.request + '": ' + detail.code.toString() + "\n\n";
});

board.on("serial:timeout", (data): void => {
  // @ts-expect-error detail is defined
  console.warn("serial:timeout", data.detail);
});

board.on("serial:sent", (data): void => {
  // @ts-expect-error detail is defined
  const detail = data.detail;
  //console.log("serial:sent", detail);
  if (!logElement) return;
  logElement.innerText +=
    'Action "' + detail.action + '": sent: ' + board.parseUint8ArrayToString(detail.bytes) + "\n\n";
});

board.on("serial:error", (event): void => {
  if (!logElement) return;
  // @ts-expect-error detail is defined
  logElement.innerText += event.detail.message + "\n\n";
});

board.on("serial:disconnected", (): void => {
  // console.log(event);
  if (logElement) {
    logElement.innerText += "Disconnected\n\n";
  }

  document.getElementById("disconnected")?.classList.remove("hidden");
  document.getElementById("connect")?.classList.remove("hidden");
  document.getElementById("disconnect")?.classList.add("hidden");
});

board.on("serial:connecting", (event: any): void => {
  if (!logElement || event.detail.active) return;
  logElement.innerText += "Connecting finished\n\n";
});

board.on("serial:connected", (): void => {
  if (logElement) {
    logElement.innerText += "Connected\n\n";
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

async function tryConnect(): Promise<void> {
  board
    .connect()
    .then((): void => {})
    .catch(console.error);
}

document.addEventListener("DOMContentLoaded", (): void => {
  tryConnect();
  document.getElementById("connect")?.addEventListener("click", tryConnect);
  document.getElementById("disconnect")?.addEventListener("click", async () => {
    await board.disconnect().catch(console.error);
    if (!logElement) return;
    logElement.innerText += "Disconnected by user\n\n";
  });
});

// just to test in navigator
// @ts-expect-error assign to window object
window.board = board;