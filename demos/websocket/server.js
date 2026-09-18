/**
 * demos/websocket/server.js
 *
 * WebSocket ↔ SerialPort bridge for webserial-core.
 * Runs on Node.js (v18+). Browsers connect via WebSocketProvider and this
 * server relays bytes to/from a physical serial port.
 *
 * Install dependencies:
 *   npm install
 *
 * Usage:
 *   node server.js [--port 8080]
 *
 * Wire protocol (JSON over WebSocket):
 *   Browser → Server: list-ports | open | write | close
 *   Server → Browser: port-list  | opened | data | closed | error
 */

import { WebSocketServer } from "ws";
import { SerialPort, ByteLengthParser, DelimiterParser } from "serialport";
import { randomBytes, timingSafeEqual } from "node:crypto";

// ─── CLI arguments ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const WS_PORT = parseInt(args[args.indexOf("--port") + 1] ?? "8080", 10);
const WS_HOST = process.env.BRIDGE_HOST ?? "127.0.0.1";
const BRIDGE_TOKEN =
  process.env.BRIDGE_TOKEN ?? randomBytes(32).toString("hex");
const ALLOWED_ORIGINS = new Set(
  (
    process.env.BRIDGE_ORIGINS ??
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const MAX_MESSAGE_BYTES = 512 * 1024;
const MAX_FRAME_BYTES = 64 * 1024;
const MAX_BACKLOG_BYTES = 1024 * 1024;
const MAX_CONNECTIONS = 8;
const ALLOWED_PORTS = new Set(
  (process.env.BRIDGE_PORTS ?? "")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean),
);

if (
  !Number.isInteger(WS_PORT) ||
  WS_PORT < 1 ||
  WS_PORT > 65535 ||
  !BRIDGE_TOKEN
) {
  throw new Error("Invalid bridge port or token");
}

function authorized(info) {
  if (!ALLOWED_ORIGINS.has(info.origin)) return false;
  const supplied =
    new URL(info.req.url, "http://localhost").searchParams.get("token") ?? "";
  const expected = Buffer.from(BRIDGE_TOKEN);
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function validBytes(value) {
  return (
    Array.isArray(value) &&
    value.length <= MAX_FRAME_BYTES &&
    value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Send a JSON message to the browser client.
 *
 * @param {import('ws').WebSocket} ws
 * @param {string} type
 * @param {unknown} payload
 * @param {number[]} [bytes]
 */
function send(ws, type, payload, bytes = []) {
  if (ws.readyState === ws.OPEN) {
    if (ws.bufferedAmount > MAX_BACKLOG_BYTES) {
      ws.close(1009, "Client too slow");
      return;
    }
    ws.send(JSON.stringify({ type, payload, bytes }));
  }
}

function log(tag, msg) {
  const ts = new Date().toISOString().split("T")[1].slice(0, -1);
  console.log(`[${ts}] [${tag}] ${msg}`);
}

// ─── Parser factory ──────────────────────────────────────────────────────────

/**
 * Build a serialport Transform parser from the config sent in the `open` message.
 *
 * Supported configs:
 *   { type: "delimiter", value: "\\n" }  — one event per delimited frame (default)
 *   { type: "fixed",     length: N }     — one event per N-byte block
 *   { type: "raw" }                      — no accumulation, pass through raw bytes
 *
 * @param {{ type?: string, value?: string, length?: number } | null} parserConfig
 * @returns {import('@serialport/stream').Transform | null}
 */
function createParser(parserConfig) {
  if (!parserConfig || parserConfig.type === "raw") {
    return null; // raw mode — listen directly on port "data" events
  }

  if (parserConfig.type === "fixed") {
    const length = parserConfig.length;
    if (!Number.isSafeInteger(length) || length < 1 || length > MAX_FRAME_BYTES)
      throw new Error("fixed parser length out of range");
    return new ByteLengthParser({ length });
  }

  // "delimiter" is the default
  const raw = parserConfig.value ?? "\n";
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 32)
    throw new Error("delimiter length out of range");
  const delimiter = raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");

  return new DelimiterParser({ delimiter, includeDelimiter: true });
}

// ─── Port discovery ──────────────────────────────────────────────────────────

/**
 * Return a list of connected serial ports, optionally filtered by vendor/product ID.
 *
 * @param {Array<{ usbVendorId?: number, usbProductId?: number }>} filters
 */
async function listPorts(filters = []) {
  const all = await SerialPort.list();
  // Only include ports with recognized USB IDs
  const recognized = all.filter((p) => p.vendorId && p.productId);

  if (!filters.length) return recognized;

  return recognized.filter((p) =>
    filters.some((f) => {
      const matchVendor =
        !f.usbVendorId ||
        p.vendorId?.toLowerCase() ===
          f.usbVendorId.toString(16).padStart(4, "0").toLowerCase();
      const matchProduct =
        !f.usbProductId ||
        p.productId?.toLowerCase() ===
          f.usbProductId.toString(16).padStart(4, "0").toLowerCase();
      return matchVendor && matchProduct;
    }),
  );
}

// ─── Per-connection handler ───────────────────────────────────────────────────

/**
 * Handle one browser WebSocket connection.
 *
 * @param {import('ws').WebSocket} ws
 */
async function handleConnection(ws) {
  log("WS", "New connection");

  /** @type {SerialPort | null} */
  let port = null;
  let opening = false;

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      log("WS", "Non-JSON message ignored");
      return;
    }
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") {
      ws.close(1007, "Invalid message");
      return;
    }

    // ── list-ports ───────────────────────────────────────────────────────────
    if (msg.type === "list-ports") {
      if (!Array.isArray(msg.filters ?? [])) {
        ws.close(1007, "Invalid filters");
        return;
      }
      try {
        const ports = await listPorts(msg.filters ?? []);
        const payload = ports.map((p) => ({
          path: p.path,
          vendorId: p.vendorId ? parseInt(p.vendorId, 16) : undefined,
          productId: p.productId ? parseInt(p.productId, 16) : undefined,
        }));
        log(
          "SERIAL",
          `Available ports: ${payload.map((p) => p.path).join(", ") || "none"}`,
        );
        send(ws, "port-list", payload);
      } catch (err) {
        log("ERROR", `list-ports: ${err.message}`);
        send(ws, "port-list", []);
      }
      return;
    }

    // ── open ─────────────────────────────────────────────────────────────────
    if (msg.type === "open") {
      if (port || opening) {
        send(ws, "error", { message: "A port is already opening or open" });
        return;
      }
      opening = true;

      let allowed;
      try {
        allowed = await listPorts();
      } catch (error) {
        opening = false;
        send(ws, "error", { message: error.message });
        return;
      }
      if (ws.readyState !== ws.OPEN) {
        opening = false;
        return;
      }
      if (
        typeof msg.path !== "string" ||
        !allowed.some((entry) => entry.path === msg.path) ||
        (ALLOWED_PORTS.size > 0 && !ALLOWED_PORTS.has(msg.path)) ||
        !Number.isSafeInteger(msg.baudRate ?? 9600) ||
        (msg.baudRate ?? 9600) < 1
      ) {
        opening = false;
        send(ws, "error", { message: "Port or baud rate not allowed" });
        return;
      }
      let parser;
      try {
        parser = createParser(msg.parser);
      } catch (error) {
        opening = false;
        send(ws, "error", { message: error.message });
        return;
      }
      if (
        (msg.dataBits !== undefined && ![7, 8].includes(msg.dataBits)) ||
        (msg.stopBits !== undefined && ![1, 2].includes(msg.stopBits)) ||
        (msg.parity !== undefined &&
          !["none", "odd", "even"].includes(msg.parity))
      ) {
        opening = false;
        send(ws, "error", { message: "Invalid serial options" });
        return;
      }
      try {
        port = new SerialPort({
          path: msg.path,
          baudRate: msg.baudRate ?? 9600,
          dataBits: msg.dataBits ?? 8,
          stopBits: msg.stopBits ?? 1,
          parity: msg.parity ?? "none",
          autoOpen: false,
        });
      } catch (error) {
        opening = false;
        send(ws, "error", { message: error.message });
        return;
      }
      opening = false;
      const activePort = port;

      activePort.open((err) => {
        if (err) {
          if (port === activePort) port = null;
          log("ERROR", `open ${msg.path}: ${err.message}`);
          send(ws, "error", { message: err.message });
          return;
        }
        if (ws.readyState !== ws.OPEN) {
          activePort.close();
          if (port === activePort) port = null;
          return;
        }
        log("SERIAL", `Port opened: ${msg.path} @ ${msg.baudRate} baud`);
        send(ws, "opened", null);
      });

      // Attach parser (or use the raw port) as the data source
      let dataSource;
      let frameBytes = 0;
      try {
        if (parser) {
          activePort.on("data", (chunk) => {
            frameBytes += chunk.length;
            if (frameBytes > MAX_FRAME_BYTES) ws.close(1009, "Frame too large");
          });
          dataSource = activePort.pipe(parser);
          log("SERIAL", `Parser: ${JSON.stringify(msg.parser)}`);
        } else {
          dataSource = activePort;
          log("SERIAL", "No parser — raw mode");
        }
      } catch (parserErr) {
        if (activePort.isOpen) activePort.close();
        if (port === activePort) port = null;
        log("ERROR", `createParser: ${parserErr.message}`);
        send(ws, "error", { message: parserErr.message });
        return;
      }

      // Forward complete frames to the browser
      dataSource.on("data", (chunk) => {
        frameBytes = 0;
        if (chunk.length > MAX_FRAME_BYTES) {
          ws.close(1009, "Frame too large");
          return;
        }
        log("SERIAL", `← ${chunk.length} bytes`);
        send(ws, "data", null, Array.from(chunk));
      });
      if (dataSource !== activePort) {
        dataSource.on("error", (error) => {
          send(ws, "error", { message: error.message });
          ws.close(1011, "Parser error");
        });
      }

      activePort.on("error", (err) => {
        log("ERROR", `serial: ${err.message}`);
        send(ws, "error", { message: err.message });
      });

      activePort.on("close", () => {
        if (port === activePort) port = null;
        log("SERIAL", "Port closed");
        send(ws, "closed", null);
      });

      return;
    }

    // ── write ─────────────────────────────────────────────────────────────────
    if (msg.type === "write") {
      if (!port?.isOpen) {
        log("WS", "write ignored — port not open");
        return;
      }
      if (!validBytes(msg.bytes)) {
        ws.close(1007, "Invalid bytes");
        return;
      }
      const buf = Buffer.from(msg.bytes);
      log("SERIAL", `→ ${buf.length} bytes`);
      port.write(buf, (err) => {
        if (err) log("ERROR", `write: ${err.message}`);
      });
      return;
    }

    // ── close ─────────────────────────────────────────────────────────────────
    if (msg.type === "close") {
      if (port?.isOpen) port.close();
      return;
    }

    log("WS", `Unknown message type: ${msg.type}`);
  });

  ws.on("close", () => {
    opening = false;
    log("WS", "Connection closed — cleaning up");
    if (port?.isOpen) port.close();
    port = null;
  });

  ws.on("error", (err) => {
    log("WS-ERR", err.message);
  });
}

// ─── Start server ─────────────────────────────────────────────────────────────

const wss = new WebSocketServer({
  host: WS_HOST,
  port: WS_PORT,
  maxPayload: MAX_MESSAGE_BYTES,
  verifyClient(info, done) {
    done(authorized(info), 403, "Forbidden");
  },
});

wss.on("listening", () => {
  log("SERVER", `ws-serial-bridge listening on ws://${WS_HOST}:${WS_PORT}`);
  log("SERVER", `Connect with ?token=${BRIDGE_TOKEN}`);
  log("SERVER", "Waiting for browser connections...");
});

wss.on("connection", (ws) => {
  if (wss.clients.size > MAX_CONNECTIONS) {
    ws.close(1013, "Too many connections");
    return;
  }
  handleConnection(ws);
});

wss.on("error", (err) => {
  console.error(`[SERVER-ERR] ${err.message}`);
  process.exit(1);
});
