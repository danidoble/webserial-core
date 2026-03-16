import { AbstractSerialDevice, delimiter } from "../src/index";
import type { SerialProvider, SerialPortFilter } from "../src/index";

// ─── WebSocket Provider Implementation ─────────────────────────

interface PortInfo {
  path: string;
  vendorId?: number;
  productId?: number;
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", (e) => reject(e), { once: true });
  });
}

function waitForMessage<T>(ws: WebSocket, expectedType: string): Promise<T> {
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type === expectedType) {
        ws.removeEventListener("message", handler);
        resolve(msg.payload as T);
      }
    };
    ws.addEventListener("message", handler);
  });
}

function createWsSerialPort(ws: WebSocket, info: PortInfo): SerialPort {
  let readable: ReadableStream<Uint8Array> | null = null;
  let writable: WritableStream<Uint8Array> | null = null;

  return {
    get readable() {
      return readable;
    },
    get writable() {
      return writable;
    },

    getInfo() {
      return {
        usbVendorId: info.vendorId,
        usbProductId: info.productId,
      };
    },

    async open(options) {
      ws.send(
        JSON.stringify({
          type: "open",
          path: info.path,
          baudRate: options.baudRate,
          dataBits: options.dataBits,
          stopBits: options.stopBits,
          parity: options.parity,
          // Indica al servidor qué parser usar antes de reenviar.
          // Debe coincidir con el parser que le pasas a AbstractSerialDevice.
          // Opciones: { type: "delimiter", value: "\n" }
          //           { type: "fixed", length: N }
          //           { type: "raw" }
          parser: { type: "delimiter", value: "\\n" },
        }),
      );

      await waitForMessage(ws, "opened");

      // ── Buffer interno ──────────────────────────────────────────────────
      // Acumula tramas que llegan por WS antes de que ReadableStream
      // tenga un reader activo. readLoop() las drena al hacer reader.read().
      const pendingChunks: Uint8Array[] = [];
      let streamController: ReadableStreamDefaultController<Uint8Array> | null =
        null;
      let streamClosed = false;

      // Listener único para todos los mensajes del WS durante esta conexión
      function onMessage(event: MessageEvent) {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "data") {
          const chunk = new Uint8Array(msg.bytes);

          if (streamController) {
            // El ReadableStream ya tiene un reader — entregar directo
            streamController.enqueue(chunk);
          } else {
            // Aún no hay reader — guardar en buffer
            pendingChunks.push(chunk);
          }
        }

        if (msg.type === "closed") {
          streamClosed = true;
          if (streamController) {
            streamController.close();
          }
        }
      }

      ws.addEventListener("message", onMessage);

      // ── ReadableStream ──────────────────────────────────────────────────
      readable = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;

          // Drenar el buffer acumulado antes de que hubiera reader
          for (const chunk of pendingChunks) {
            controller.enqueue(chunk);
          }
          pendingChunks.length = 0;

          // Si el puerto ya se cerró mientras esperábamos al reader
          if (streamClosed) {
            controller.close();
          }
        },

        cancel() {
          // Cleanup: remover el listener cuando la clase abstracta
          // cancela el reader (disconnect / reconnect / teardown)
          ws.removeEventListener("message", onMessage);
          streamController = null;
        },
      });

      // ── WritableStream ──────────────────────────────────────────────────
      writable = new WritableStream<Uint8Array>({
        write(chunk) {
          ws.send(
            JSON.stringify({
              type: "write",
              bytes: Array.from(chunk),
            }),
          );
        },
      });
    },

    async close() {
      ws.send(JSON.stringify({ type: "close" }));
      readable = null;
      writable = null;
      ws.close();
    },
  } as SerialPort;
}

function createWebSocketProvider(serverUrl: string): SerialProvider {
  return {
    async requestPort(options?: { filters?: SerialPortFilter[] }) {
      // 1. Ask the server for available ports (filtered)
      const ws = new WebSocket(serverUrl);
      await waitForOpen(ws);

      ws.send(
        JSON.stringify({
          type: "list-ports",
          filters: options?.filters ?? [],
        }),
      );

      const ports = await waitForMessage<PortInfo[]>(ws, "port-list");

      // 2. Let the user pick a port (here we auto-select the first one for testing)
      // In a real app, you would show a UI picker if there are multiple ports
      const selected = ports[0];
      if (!selected) {
        throw new Error(
          "No ports available on the server. Make sure the Node.js bridge is running and a device is connected.",
        );
      }

      // 3. Return a SerialPort-compatible object backed by this WebSocket
      return createWsSerialPort(ws, selected);
    },

    async getPorts() {
      const ws = new WebSocket(serverUrl);
      await waitForOpen(ws);

      ws.send(JSON.stringify({ type: "list-ports", filters: [] }));
      const ports = await waitForMessage<PortInfo[]>(ws, "port-list");

      return ports.map((info) => createWsSerialPort(ws, info));
    },
  };
}

// ─── Inject Provider ───────────────────────────────────────────

// Configure the provider with your Node.js server address
// (See README.md for the Node.js server implementation)
const wsProvider = createWebSocketProvider("ws://localhost:8080");
AbstractSerialDevice.setProvider(wsProvider);

/**
 * ArduinoDeviceWS — Uses the WebSocket Polyfill to communicate
 * with a backend Node.js server instead of Web Serial.
 */
export class ArduinoDeviceWS extends AbstractSerialDevice<string> {
  constructor(baudRate: number = 9600) {
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
    });
  }

  protected async handshake(): Promise<boolean> {
    return true;
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

const arduino = new ArduinoDeviceWS();

// ─── Events ────────────────────────────────────────────────────

arduino.on("serial:connecting", () => {
  log("Connecting via WebSocket to Node.js...", "event");
  connectBtn.disabled = true;
});

arduino.on("serial:connected", () => {
  log("✅ Connected via WebSocket!", "event");
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
  log("⚠️ Permission denied — check your WebSocket server.", "error");
  connectBtn.disabled = false;
});

arduino.on("serial:timeout", (command) => {
  log(`⏱ Timeout for command: ${formatBytes(command)}`, "error");
});

arduino.on("serial:queue-empty", () => {
  log("Queue is empty.", "info");
});

arduino.on("serial:reconnecting", () => {
  log("🔄 Auto-reconnecting via WebSocket...", "event");
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

log("🔌 WebSocket polyfill test. Native Web Serial is bypassed.", "event");
log("Ensure the Node.js WS server is running on ws://localhost:8080", "info");
