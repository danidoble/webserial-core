import { AbstractSerialDevice, delimiter } from "../../src/index";
import { WebUsbProvider } from "../../src/adapters/web-usb/index";
import type { SerialPortFilter } from "../../src/types";

// Force WebUSB polyfill so the device is accessed via WebUSB instead of native Web Serial.
// This is useful on Android Chrome, or on desktop when testing the polyfill path.
AbstractSerialDevice.setProvider(
  new WebUsbProvider({
    usbControlInterfaceClass: 255,
    usbTransferInterfaceClass: 255,
  }),
);

/**
 * DemoUsbDevice — Concrete implementation using the WebUSB polyfill.
 *
 * The provider is injected above so the same AbstractSerialDevice API
 * talks to WebUSB endpoints instead of the native Web Serial API.
 */
export class DemoUsbDevice extends AbstractSerialDevice<string> {
  constructor(baudRate: number = 9600, filters?: SerialPortFilter[]) {
    super({
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
      bufferSize: 255,
      commandTimeout: 3000,
      parser: delimiter("\n"),
      autoReconnect: true,
      autoReconnectInterval: 1500,
      handshakeTimeout: 2000,
      filters: filters ?? [],
    });
  }

  /**
   * Handshake sends an identification command and waits for confirmation.
   * Replace the `return true` with a real call-response if needed.
   */
  protected async handshake(): Promise<boolean> {
    return true;
  }
}

// ─── UI element references ────────────────────────────────────

const logContainer = document.getElementById("log") as HTMLDivElement;
const connectBtn = document.getElementById("btn-connect") as HTMLButtonElement;
const disconnectBtn = document.getElementById(
  "btn-disconnect",
) as HTMLButtonElement;
const sendBtn = document.getElementById("btn-send") as HTMLButtonElement;
const sendInput = document.getElementById("input-send") as HTMLInputElement;
const modeToggle = document.getElementById("mode-toggle") as HTMLButtonElement;

let sendMode: "text" | "hex" = "text";

// ─── Logging ─────────────────────────────────────────────────

function log(
  msg: string,
  type: "info" | "error" | "data" | "event" = "info",
): void {
  const line = document.createElement("div");
  line.classList.add("log-line", `log-${type}`);
  line.textContent = `[${new Date().toLocaleTimeString()}] [${type.toUpperCase()}] ${msg}`;
  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatBytes(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

function hexStringToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/\s+/g, "");
  if (cleaned.length % 2 !== 0)
    throw new Error("Hex string must have an even number of characters.");
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16);
  }
  return bytes;
}

// ─── Device instance ─────────────────────────────────────────

// Adjust vendor/product IDs to match your hardware.
// CP2102 / ESP32: { usbVendorId: 0x10c4, usbProductId: 0xea60 }
// CH340 / Arduino nano: { usbVendorId: 0x1a86, usbProductId: 0x7523 }
const device = new DemoUsbDevice(9600, [
  { usbVendorId: 0x10c4, usbProductId: 0xea60 },
]);

// ─── Event handlers ──────────────────────────────────────────

device.on("serial:connecting", () => {
  log("Connecting via WebUSB polyfill...", "event");
  connectBtn.disabled = true;
});

device.on("serial:connected", () => {
  log("Connected via WebUSB!", "event");
  connectBtn.disabled = true;
  disconnectBtn.disabled = false;
  sendBtn.disabled = false;
  sendInput.disabled = false;
});

device.on("serial:disconnected", () => {
  log("Disconnected.", "event");
  connectBtn.disabled = false;
  disconnectBtn.disabled = true;
  sendBtn.disabled = true;
  sendInput.disabled = true;
});

device.on("serial:data", (data) => {
  log(`← ${data}`, "data");
});

device.on("serial:sent", (data) => {
  log(`→ [SENT] ${formatBytes(data)}`, "info");
});

device.on("serial:error", (error) => {
  log(`Error: ${error.message}`, "error");
  connectBtn.disabled = false;
});

device.on("serial:need-permission", () => {
  log("Permission denied — click Connect and allow the USB device.", "error");
  connectBtn.disabled = false;
});

device.on("serial:timeout", (command) => {
  log(`Timeout for command: ${formatBytes(command)}`, "error");
});

device.on("serial:reconnecting", () => {
  log("Auto-reconnecting via WebUSB...", "event");
});

// ─── Button handlers ─────────────────────────────────────────

connectBtn.addEventListener("click", async () => {
  try {
    await device.connect();
  } catch {
    /* handled via events */
  }
});

disconnectBtn.addEventListener("click", async () => {
  await device.disconnect();
});

modeToggle.addEventListener("click", () => {
  sendMode = sendMode === "text" ? "hex" : "text";
  modeToggle.textContent = sendMode === "text" ? "TXT" : "HEX";
  sendInput.placeholder =
    sendMode === "text"
      ? "Type a command, e.g. LED_ON"
      : "Hex bytes, e.g. FF 01 A3";
});

sendBtn.addEventListener("click", async () => {
  const value = sendInput.value.trim();
  if (!value) return;
  try {
    if (sendMode === "hex") {
      const bytes = hexStringToBytes(value);
      log(`→ HEX: ${formatBytes(bytes)}`, "info");
      await device.send(bytes);
    } else {
      log(`→ ${value}`, "info");
      await device.send(value + "\n");
    }
  } catch (err) {
    log(
      `Send error: ${err instanceof Error ? err.message : String(err)}`,
      "error",
    );
  }
  sendInput.value = "";
  sendInput.focus();
});

sendInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

log("WebUSB polyfill demo. Native Web Serial is bypassed.", "event");
log("Click Connect to select a USB device via WebUSB.", "info");
