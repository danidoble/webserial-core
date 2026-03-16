import { AbstractSerialDevice, delimiter } from "../../src/index";
import { createWebSocketProvider } from "../../src/adapters/websocket/index";

// Inject the WebSocket provider. Update the URL to point at your
// running Node.js bridge server (see demos/websocket/README.md).
const wsProvider = createWebSocketProvider("ws://localhost:8080");
AbstractSerialDevice.setProvider(wsProvider);

/**
 * DemoWsDevice — Concrete implementation backed by a WebSocket bridge.
 *
 * The WebSocket bridge (Node.js server) relays serial I/O between this
 * browser client and a physical serial port on the server machine.
 *
 * Start the bridge before clicking Connect:
 *   cd demos/websocket && node server.js
 */
export class DemoWsDevice extends AbstractSerialDevice<string> {
  constructor() {
    super({
      baudRate: 9600,
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
    });
  }

  /**
   * Handshake skipped for demo purposes.
   * For real use, implement a call-response: send "PING\n", wait for "PONG".
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

const device = new DemoWsDevice();

// ─── Event handlers ──────────────────────────────────────────

device.on("serial:connecting", () => {
  log("Connecting via WebSocket to Node.js bridge...", "event");
  connectBtn.disabled = true;
});

device.on("serial:connected", () => {
  log("Connected via WebSocket!", "event");
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
  log("Permission denied — check your WebSocket server.", "error");
  connectBtn.disabled = false;
});

device.on("serial:timeout", (command) => {
  log(`Timeout for command: ${formatBytes(command)}`, "error");
});

device.on("serial:reconnecting", () => {
  log("Auto-reconnecting via WebSocket...", "event");
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

log("WebSocket bridge demo. Make sure the Node.js bridge is running.", "info");
log("Run: cd demos/websocket && node server.js", "info");
