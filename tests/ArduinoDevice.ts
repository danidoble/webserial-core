import { AbstractSerialDevice, delimiter } from "../src/index";
import type { SerialPortFilter } from "../src/types";

/**
 * ArduinoDevice — A concrete implementation of AbstractSerialDevice
 * designed for testing communication with an Arduino board.
 *
 * Expects newline-delimited string data (e.g. Serial.println from Arduino).
 * Default baud rate: 9600
 */
export class ArduinoDevice extends AbstractSerialDevice<string> {
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
   * Override handshake to validate the device identity.
   * For this demo we accept all ports. Override with your
   * own call-response logic for real-world use.
   */
  protected async handshake(): Promise<boolean> {
    return true;
    // Example: send "PING\n" and expect "PONG" within handshakeTimeout
    // For now, accept all ports:
    // return true;

    await new Promise((resolve) => setTimeout(resolve, 1000)); // arduino needs time to initialize
    // Send identification command
    await this.send("CONNECT\n");

    // Wait for response via a one-shot listener
    return new Promise((resolve) => {
      const handler = (data: string) => {
        this.off("serial:data", handler);
        console.log(data);
        resolve(data.trim() === "connected");
      };
      this.on("serial:data", handler);
    });
  }
}

// ─── UI helpers ────────────────────────────────────────────────

const logContainer = document.getElementById("log") as HTMLDivElement;
const connectBtn = document.getElementById("btn-connect") as HTMLButtonElement;
const disconnectBtn = document.getElementById(
  "btn-disconnect",
) as HTMLButtonElement;
const sendBtn = document.getElementById("btn-send") as HTMLButtonElement;
const sendInput = document.getElementById("input-send") as HTMLInputElement;
const modeToggle = document.getElementById("mode-toggle") as HTMLButtonElement;

let sendMode: "text" | "hex" = "text";

function log(msg: string, type: "info" | "error" | "data" | "event" = "info") {
  const line = document.createElement("div");
  line.classList.add("log-line", `log-${type}`);
  const ts = new Date().toLocaleTimeString();
  line.textContent = `[${ts}] [${type.toUpperCase()}] ${msg}`;
  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function formatBytes(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

function hexStringToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/\s+/g, "");
  if (cleaned.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters.");
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16);
  }
  return bytes;
}

// ─── Device instance ───────────────────────────────────────────

const arduino = new ArduinoDevice(9600, [
  // {
  //   usbVendorId: 0x10c4,
  //   usbProductId: 0xea60,
  // },
]);

// ─── Events ────────────────────────────────────────────────────

arduino.on("serial:connecting", () => {
  log("Connecting to Arduino...", "event");
  connectBtn.disabled = true;
});

arduino.on("serial:connected", () => {
  log("✅ Connected to Arduino!", "event");
  connectBtn.disabled = true;
  disconnectBtn.disabled = false;
  sendBtn.disabled = false;
  sendInput.disabled = false;
});

arduino.on("serial:disconnected", () => {
  log("🔌 Disconnected from Arduino.", "event");
  connectBtn.disabled = false;
  disconnectBtn.disabled = true;
  sendBtn.disabled = true;
  sendInput.disabled = true;
});

arduino.on("serial:data", (data) => {
  log(`← ${data}`, "data");
});

arduino.on("serial:sent", (data) => {
  log(`→ [SENT] ${formatBytes(data)}`, "info");
});

arduino.on("serial:error", (error) => {
  log(`Error: ${error.message}`, "error");
  connectBtn.disabled = false;
});

arduino.on("serial:need-permission", () => {
  log("⚠️ Permission denied — click Connect and allow the port.", "error");
  connectBtn.disabled = false;
});

arduino.on("serial:timeout", (command) => {
  log(`⏱ Timeout for command: ${formatBytes(command)}`, "error");
});

arduino.on("serial:queue-empty", () => {
  log("Queue is empty.", "info");
});

arduino.on("serial:reconnecting", () => {
  log("🔄 Auto-reconnecting... scanning for device.", "event");
});

// ─── Button handlers ──────────────────────────────────────────

connectBtn.addEventListener("click", async () => {
  try {
    await arduino.connect();
  } catch {
    // Errors are already handled via events
  }
});

disconnectBtn.addEventListener("click", async () => {
  await arduino.disconnect();
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
      await arduino.send(bytes);
    } else {
      log(`→ ${value}`, "info");
      await arduino.send(value + "\n");
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
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

log("Arduino test page ready. Click Connect to begin.", "info");

// Auto-connect on load
document.addEventListener("DOMContentLoaded", () => {
  connectBtn.disabled = false;
  connectBtn.click();
});
