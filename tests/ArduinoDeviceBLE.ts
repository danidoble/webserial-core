/// <reference types="web-bluetooth" />
import { AbstractSerialDevice, delimiter } from "../src/index";
import type { SerialProvider } from "../src/index";

// ─── BLE UART Constants (Nordic UART Service) ──────────────────
const NORDIC_UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const TX_CHARACTERISTIC = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // We write to this
const RX_CHARACTERISTIC = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // We read from this (notify)

// ─── Web Bluetooth Provider Implementation ─────────────────────

function createBleSerialPort(device: BluetoothDevice): SerialPort {
  let readable: ReadableStream<Uint8Array> | null = null;
  let writable: WritableStream<Uint8Array> | null = null;
  let server: BluetoothRemoteGATTServer | null = null;

  return {
    get readable() {
      return readable;
    },
    get writable() {
      return writable;
    },
    getInfo() {
      return {};
    },

    async open() {
      if (!device.gatt) throw new Error("GATT not available");

      log("Connecting to GATT server...", "event");
      server = await device.gatt.connect();

      log("Getting primary UART service...", "event");
      const service = await server.getPrimaryService(NORDIC_UART_SERVICE);

      log("Getting RX/TX characteristics...", "event");

      const rxChar = await service.getCharacteristic(RX_CHARACTERISTIC);
      const txChar = await service.getCharacteristic(TX_CHARACTERISTIC);

      // Stream de recepción: escucha notificaciones BLE
      await rxChar.startNotifications();
      readable = new ReadableStream<Uint8Array>({
        start(controller) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rxChar.addEventListener("characteristicvaluechanged", (e: any) => {
            const buffer: ArrayBuffer = e.target.value.buffer;
            controller.enqueue(new Uint8Array(buffer));
          });
        },
      });

      // Stream de escritura: manda bytes al ESP32 via BLE
      writable = new WritableStream<Uint8Array>({
        async write(chunk) {
          // chunking explícito de 20 bytes para respetar el MTU de BLE.
          // writeValueWithoutResponse lanza si el chunk supera el MTU negociado.
          const MTU = 20;
          for (let offset = 0; offset < chunk.length; offset += MTU) {
            const slice = chunk.slice(offset, offset + MTU);
            await txChar.writeValueWithoutResponse(slice as BufferSource);
            // Pequeño delay entre chunks para no saturar el stack BLE
            if (offset + MTU < chunk.length) {
              await new Promise((r) => setTimeout(r, 10));
            }
          }
        },
      });
    },

    async close() {
      if (server) server.disconnect();
      readable = null;
      writable = null;
    },
  } as SerialPort;
}

export function createBluetoothProvider(): SerialProvider {
  return {
    async requestPort() {
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API is not supported in this browser.");
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [NORDIC_UART_SERVICE] }],
      });

      return createBleSerialPort(device);
    },

    async getPorts() {
      return [];
    },
  };
}

// ─── Inject Provider ───────────────────────────────────────────

AbstractSerialDevice.setProvider(createBluetoothProvider());

/**
 * ArduinoDeviceBLE — Uses the Web Bluetooth API to connect
 * to wireless serial modules (e.g. nRF52, ESP32 BLE UART).
 */
export class ArduinoDeviceBLE extends AbstractSerialDevice<string> {
  constructor(baudRate: number = 9600) {
    super({
      baudRate, // Ignorado por BLE, se mantiene por compatibilidad de interfaz
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
      bufferSize: 255,
      commandTimeout: 3000,
      parser: delimiter("\n"),
      autoReconnect: false,
      handshakeTimeout: 2000,
    });
  }

  protected async handshake(): Promise<boolean> {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
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

const arduino = new ArduinoDeviceBLE();

// ─── Events ────────────────────────────────────────────────────

arduino.on("serial:connecting", () => {
  log("Initializing Web Bluetooth connection...", "event");
  connectBtn.disabled = true;
});

arduino.on("serial:connected", () => {
  log("✅ Connected via Web Bluetooth!", "event");
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
  log("⚠️ Permission denied — select a valid BLE device.", "error");
  connectBtn.disabled = false;
});

arduino.on("serial:timeout", (command) => {
  log(`⏱ Timeout for command: ${formatBytes(command)}`, "error");
});

arduino.on("serial:queue-empty", () => {
  log("Queue is empty.", "info");
});

// ─── Button handlers ──────────────────────────────────────────

connectBtn.addEventListener("click", async () => {
  try {
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
      ? "Type a command, e.g. HI"
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
  if (e.key === "Enter") sendBtn.click();
});

if (!navigator.bluetooth) {
  log("❌ Web Bluetooth is NOT supported in this browser/OS.", "error");
  connectBtn.disabled = true;
} else {
  log("🔌 Web Bluetooth ready.", "event");
  log("Click Connect to pair the ESP32-UART device.", "info");
}
