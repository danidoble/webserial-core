import { AbstractSerialDevice, delimiter } from "../src/index";
import { WebUsbProvider } from "../src/adapters/web-usb/WebUsbProvider";
import type { SerialPortFilter } from "../src/types";

// ─── Force WebUSB polyfill even on desktop Chrome ──────────────
AbstractSerialDevice.setProvider(
  new WebUsbProvider({
    usbControlInterfaceClass: 255,
    usbTransferInterfaceClass: 255,
  }),
);

//AbstractSerialDevice.setProvider(WebUsbProvider);

/**
 * ArduinoDeviceUSB — Uses the WebUSB polyfill instead of native Web Serial.
 * This simulates Android behavior on desktop Chrome for testing.
 */
export class ArduinoDeviceUSB extends AbstractSerialDevice<string> {
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

  protected async handshake(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // arduino needs time to initialize
    await this.send("CONNECT\n");

    return new Promise((resolve) => {
      const handler = (data: string) => {
        this.off("serial:data", handler);
        console.log("Handshake response:", data);
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

const arduino = new ArduinoDeviceUSB(9600, [
  // {
  //   usbVendorId: 0x1a86, //esp32
  //   usbProductId: 0x7523,
  // },
  {
    // esp32
    usbVendorId: 0x10c4,
    usbProductId: 0xea60,
  },
  // { // arduino
  //   usbVendorId: 9025,
  //   usbProductId: 66,
  // }
]);

// ─── Events ────────────────────────────────────────────────────

arduino.on("serial:connecting", () => {
  log("Connecting via WebUSB polyfill...", "event");
  connectBtn.disabled = true;
});

arduino.on("serial:connected", () => {
  log("✅ Connected via WebUSB!", "event");
  connectBtn.disabled = true;
  disconnectBtn.disabled = false;
  sendBtn.disabled = false;
  sendInput.disabled = false;
});

arduino.on("serial:disconnected", () => {
  log("🔌 Disconnected.", "event");
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
  log("⚠️ Permission denied — click Connect and allow the device.", "error");
  connectBtn.disabled = false;
});

arduino.on("serial:timeout", (command) => {
  log(`⏱ Timeout for command: ${formatBytes(command)}`, "error");
});

arduino.on("serial:queue-empty", () => {
  log("Queue is empty.", "info");
});

arduino.on("serial:reconnecting", () => {
  log("🔄 Auto-reconnecting via WebUSB...", "event");
});

// ─── Button handlers ──────────────────────────────────────────

connectBtn.addEventListener("click", async () => {
  try {
    // navigator.usb.requestDevice({ filters: [{ vendorId: 0x10c4, productId: 0xea60 }] }).then(async (devices) => {
    //   if (devices.length === 0) return;
    //   // await arduino.connect();

    //   navigator.usb.getDevices().then(ports => {
    //     console.log("Dispositivos WebUSB vistos:", ports);
    //   });
    // });

    await arduino.connect();
  } catch {
    // Errors handled via events
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

log("🔌 WebUSB polyfill test. Native Web Serial is bypassed.", "event");
log("Click Connect to select a USB device via WebUSB.", "info");
