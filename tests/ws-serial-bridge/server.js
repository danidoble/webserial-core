/**
 * ws-serial-bridge/server.js
 *
 * Puente WebSocket ↔ SerialPort para AbstractSerialDevice.
 * Compatible con el WebSocket provider que ya tienes en tu librería.
 *
 * Instalar dependencias:
 *   npm install ws serialport @serialport/parser-delimiter @serialport/parser-readline @serialport/parser-length-prefixed
 *
 * Uso:
 *   node server.js [--port 8080] [--baud 9600]
 */

import { WebSocketServer } from "ws";
import { SerialPort, ByteLengthParser, DelimiterParser } from "serialport";

// ─── CLI args ────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-undef
const args = process.argv.slice(2);
const WS_PORT = parseInt(args[args.indexOf("--port") + 1] ?? "8080");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function send(ws, type, payload, bytes = []) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload, bytes }));
  }
}

function log(tag, msg) {
  const ts = new Date().toISOString().split("T")[1].slice(0, -1);
  console.log(`[${ts}] [${tag}] ${msg}`);
}

// ─── Crear parser según config del browser ───────────────────────────────────
//
// Recibe el campo `parser` del mensaje `open` y devuelve un Transform stream
// de @serialport/parser-* que acumula datos hasta tener una trama completa.
//
// Configs soportadas:
//   { type: "delimiter", value: "\n" }    ← una línea por evento (default)
//   { type: "delimiter", value: "\r\n" }  ← CRLF
//   { type: "fixed",     length: N }      ← N bytes exactos por evento
//   { type: "raw" }                       ← sin acumulación, pasa todo directo
//
function createParser(parserConfig) {
  if (!parserConfig || parserConfig.type === "raw") {
    return null; // sin parser — usar port.on("data") directamente
  }

  if (parserConfig.type === "fixed") {
    const length = parserConfig.length;
    if (!length || length < 1)
      throw new Error("fixed parser requiere length >= 1");
    return new ByteLengthParser({ length });
  }

  // "delimiter" es el default (incluye el caso "readline" con \n)
  const raw = parserConfig.value ?? "\n";
  // Convertir escapes tipo \n, \r a bytes reales
  const delimiter = raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");

  return new DelimiterParser({ delimiter, includeDelimiter: true });
}

// ─── Listar puertos ──────────────────────────────────────────────────────────

async function listPorts(filters = []) {
  const all = await SerialPort.list();

  // only with vendorId and productId
  const filtered = all.filter((p) => {
    return p.vendorId && p.productId;
  });

  if (!filters.length) return filtered;

  return filtered.filter((p) => {
    return filters.some((f) => {
      const matchVendor =
        !f.usbVendorId ||
        p.vendorId?.toLowerCase() ===
          f.usbVendorId.toString(16).padStart(4, "0").toLowerCase();
      const matchProduct =
        !f.usbProductId ||
        p.productId?.toLowerCase() ===
          f.usbProductId.toString(16).padStart(4, "0").toLowerCase();
      return matchVendor && matchProduct;
    });
  });
}

// ─── Manejar cada conexión WS ─────────────────────────────────────────────────

async function handleConnection(ws) {
  log("WS", "Nueva conexión entrante");

  /** @type {SerialPort | null} */
  let port = null;

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      log("WS", "Mensaje no-JSON ignorado");
      return;
    }

    // ── list-ports ──────────────────────────────────────────────────────────
    if (msg.type === "list-ports") {
      try {
        const ports = await listPorts(msg.filters ?? []);
        const payload = ports.map((p) => ({
          path: p.path,
          vendorId: p.vendorId ? parseInt(p.vendorId, 16) : undefined,
          productId: p.productId ? parseInt(p.productId, 16) : undefined,
        }));
        log(
          "SERIAL",
          `Puertos disponibles: ${payload.map((p) => p.path).join(", ") || "ninguno"}`,
        );
        send(ws, "port-list", payload);
      } catch (err) {
        log("ERROR", `list-ports: ${err.message}`);
        send(ws, "port-list", []);
      }
      return;
    }

    // ── open ──────────────// eslint-disable-next-line no-undef──────────────────────────────────────────────────
    if (msg.type === "open") {
      if (port?.isOpen) {
        send(ws, "opened", null);
        return;
      }

      port = new SerialPort({
        path: msg.path,
        baudRate: msg.baudRate ?? 9600,
        dataBits: msg.dataBits ?? 8,
        stopBits: msg.stopBits ?? 1,
        parity: msg.parity ?? "none",
        autoOpen: false,
      });

      port.open((err) => {
        if (err) {
          log("ERROR", `open ${msg.path}: ${err.message}`);
          send(ws, "error", { message: err.message });
          return;
        }
        log("SERIAL", `Puerto abierto: ${msg.path} @ ${msg.baudRate} baud`);
        send(ws, "opened", null);
      });

      // ── Configurar fuente de datos con o sin parser ──────────────────────
      //
      // Con parser (delimiter / fixed): el parser acumula bytes hasta tener
      // una trama completa y emite un único evento "data" por trama.
      //
      // Sin parser (raw / undefined): se reenvía cada chunk tal como llega.
      //
      let dataSource; // puede ser el port crudo o un parser pipe
      try {
        const parser = createParser(msg.parser);
        if (parser) {
          dataSource = port.pipe(parser);
          log("SERIAL", `Parser activo: ${JSON.stringify(msg.parser)}`);
        } else {
          dataSource = port;
          log("SERIAL", "Sin parser — modo raw");
        }
      } catch (parserErr) {
        log("ERROR", `createParser: ${parserErr.message}`);
        send(ws, "error", { message: parserErr.message });
        return;
      }

      // Reenviar tramas completas al browser
      dataSource.on("data", (chunk) => {
        log("SERIAL", `← ${chunk.length} bytes`);
        send(ws, "data", null, Array.from(chunk));
      });

      port.on("error", (err) => {
        log("ERROR", `serial: ${err.message}`);
        send(ws, "error", { message: err.message });
      });

      port.on("close", () => {
        log("SERIAL", "Puerto cerrado");
        send(ws, "closed", null);
      });

      return;
    }

    // ── write ───────────────────────────────────────────────────────────────
    if (msg.type === "write") {
      if (!port?.isOpen) {
        log("WS", "write ignorado — puerto no abierto");
        return;
      }
      // eslint-disable-next-line no-undef
      const buf = Buffer.from(msg.bytes);
      log("SERIAL", `→ ${buf.length} bytes`);
      port.write(buf, (err) => {
        if (err) log("ERROR", `write: ${err.message}`);
      });
      return;
    }

    // ── close ───────────────────────────────────────────────────────────────
    if (msg.type === "close") {
      if (port?.isOpen) {
        port.close();
      }
      return;
    }

    log("WS", `Tipo desconocido: ${msg.type}`);
  });

  ws.on("close", () => {
    log("WS", "Conexión cerrada — limpiando recursos");
    if (port?.isOpen) {
      port.close();
    }
    port = null;
  });

  ws.on("error", (err) => {
    log("WS-ERR", err.message);
  });
}

// ─── Iniciar servidor ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: WS_PORT });

wss.on("listening", () => {
  log("SERVER", `ws-serial-bridge escuchando en ws://localhost:${WS_PORT}`);
  log("SERVER", "Esperando conexiones del browser...");
});

wss.on("connection", handleConnection);

wss.on("error", (err) => {
  console.error(`[SERVER-ERR] ${err.message}`);
  // eslint-disable-next-line no-undef
  process.exit(1);
});
