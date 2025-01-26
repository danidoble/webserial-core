import { Arduino } from "./arduino.ts";

let logElement: HTMLElement | null = document.getElementById("log");
document.addEventListener("DOMContentLoaded", (): void => {
  if (!logElement) logElement = document.getElementById("log");
});

const machine = new Arduino();
machine.on("serial:message", (data): void => {
  // @ts-expect-error detail is defined
  const detail = data.detail;
  console.log(detail);
  if (!logElement) return;
  logElement.innerText += 'Response of "' + detail.request + '": ' + detail.code.toString() + "\n\n";
});

machine.on("serial:timeout", (data): void => {
  // @ts-expect-error detail is defined
  console.log("serial:timeout", data.detail);
});

machine.on("serial:sent", (data): void => {
  // @ts-expect-error detail is defined
  const detail = data.detail;
  console.log("serial:sent", detail);
  if (!logElement) return;
  logElement.innerText +=
    'Action "' + detail.action + '": sent: ' + machine.parseUint8ArrayToString(detail.bytes) + "\n\n";
});

machine.on("serial:error", (event): void => {
  if (!logElement) return;
  // @ts-expect-error detail is defined
  logElement.innerText += event.detail.message + "\n\n";
});

machine.on("serial:disconnected", (event): void => {
  console.log(event);
  if (logElement) {
    logElement.innerText += "Disconnected\n\n";
  }

  document.getElementById("disconnected")?.classList.remove("hidden");
  document.getElementById("connect")?.classList.remove("hidden");
});

machine.on("serial:connecting", (): void => {
  if (!logElement) return;
  logElement.innerText += "Connecting\n\n";
});

machine.on("serial:connected", (): void => {
  if (logElement) {
    logElement.innerText += "Connected\n\n";
  }

  document.getElementById("disconnected")?.classList.add("hidden");
  document.getElementById("need-permission")?.classList.add("hidden");
  document.getElementById("connect")?.classList.add("hidden");
});

machine.on("serial:need-permission", (): void => {
  document.getElementById("disconnected")?.classList.remove("hidden");
  document.getElementById("need-permission")?.classList.remove("hidden");
  document.getElementById("connect")?.classList.remove("hidden");
});

machine.on("serial:soft-reload", (): void => {
  // reset your variables
});

machine.on("serial:unsupported", (): void => {
  document.getElementById("unsupported")?.classList.remove("hidden");
});

function tryConnect(): void {
  machine
    .connect()
    .then((): void => {})
    .catch(console.error);
}

document.addEventListener("DOMContentLoaded", (): void => {
  tryConnect();
  document.getElementById("connect")?.addEventListener("click", tryConnect);
});

// just to test in navigator
// @ts-expect-error assign to window object
window.machine = machine;
