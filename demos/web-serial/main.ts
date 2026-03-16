import { AbstractSerialDevice, delimiter } from "../../src/index";
import type { SerialPortFilter } from "../../src/types";

/**
 * DemoSerialDevice — Concrete implementation of AbstractSerialDevice
 * using the native Web Serial API.
 *
 * Expects newline-delimited string data (e.g. Serial.println() on Arduino).
 */
export class DemoSerialDevice extends AbstractSerialDevice<string> {
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
   * Handshake is skipped in this demo — the device is accepted immediately.
   * Override with a real call-response sequence for production use:
   *
   * @example
   * await this.send("PING\n");
   * return new Promise((resolve) => {
   *   this.once("serial:data", (data) => resolve(data.trim() === "PONG"));
   * });
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

// ─── Logging ──────────────────────────────────────────────────

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

const device = new DemoSerialDevice(9600);

// ─── Event handlers ──────────────────────────────────────────

device.on("serial:connecting", () => {
  log("Connecting to device...", "event");
  connectBtn.disabled = true;
});

device.on("serial:connected", () => {
  log("Connected!", "event");
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
  log("Permission denied — click Connect and select a port.", "error");
  connectBtn.disabled = false;
});

device.on("serial:timeout", (command) => {
  log(`Timeout for command: ${formatBytes(command)}`, "error");
});

device.on("serial:reconnecting", () => {
  log("Auto-reconnecting...", "event");
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

log("Web Serial demo ready. Click Connect to select a port.", "info");
