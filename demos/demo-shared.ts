/**
 * demo-shared.ts
 * Shared utilities for all webserial-core provider demo pages.
 * Handles: theme, chat messages, code preview (with syntax highlighting),
 *          code generation templates, file download, and ZIP creation.
 */

/* ================================================================
   THEME
   ================================================================ */

export type Theme = "light" | "dark";
const THEME_KEY = "wsc-demo-theme";

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function initTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  const theme = stored ?? getSystemTheme();
  document.documentElement.setAttribute("data-theme", theme);

  // Auto-track system changes (only when user hasn't manually set a preference)
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        document.documentElement.setAttribute(
          "data-theme",
          e.matches ? "dark" : "light",
        );
      }
    });
  return theme;
}

export function toggleTheme(): Theme {
  const cur =
    (document.documentElement.getAttribute("data-theme") as Theme) ??
    getSystemTheme();
  const next: Theme = cur === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  document.documentElement.setAttribute("data-theme", next);
  return next;
}

/* ================================================================
   CHAT MESSAGES
   ================================================================ */

export type MsgKind = "sent" | "received" | "system" | "error";

export interface MsgOptions {
  kind: MsgKind;
  label?: string;
  time?: Date;
}

export function addMessage(
  container: HTMLElement,
  text: string,
  opts: MsgOptions,
): void {
  // Remove empty-state on first real message
  const empty = container.querySelector(".empty-state");
  if (empty) empty.remove();

  const { kind, label, time = new Date() } = opts;
  const wrap = document.createElement("div");
  wrap.className = `msg ${kind}`;

  if (label && (kind === "sent" || kind === "received")) {
    const lbl = document.createElement("div");
    lbl.className = "msg-label";
    lbl.textContent = label;
    wrap.appendChild(lbl);
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;
  wrap.appendChild(bubble);

  const ts = document.createElement("div");
  ts.className = "msg-time";
  ts.textContent = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  wrap.appendChild(ts);

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

export function clearMessages(container: HTMLElement): void {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">💬</div>
      <span>Messages cleared</span>
    </div>`;
}

/* ================================================================
   SYNTAX HIGHLIGHTER  (lightweight, TypeScript/JS oriented)
   ================================================================ */

const TS_KW = new Set([
  "import",
  "export",
  "from",
  "default",
  "as",
  "class",
  "extends",
  "implements",
  "constructor",
  "super",
  "new",
  "this",
  "return",
  "const",
  "let",
  "var",
  "async",
  "await",
  "function",
  "protected",
  "public",
  "private",
  "static",
  "abstract",
  "interface",
  "type",
  "enum",
  "namespace",
  "declare",
  "readonly",
  "true",
  "false",
  "null",
  "undefined",
  "void",
  "never",
  "any",
  "unknown",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "throw",
  "typeof",
  "instanceof",
  "in",
  "of",
  "keyof",
  "infer",
  "string",
  "number",
  "boolean",
  "object",
  "symbol",
  "bigint",
  "Promise",
  "Array",
  "Set",
  "Map",
]);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightLine(line: string): string {
  let out = "";
  let i = 0;
  const len = line.length;

  while (i < len) {
    // Single-line comment
    if (line[i] === "/" && line[i + 1] === "/") {
      out += `<span class="t-cmt">${esc(line.slice(i))}</span>`;
      break;
    }

    // String literals
    const q = line[i];
    if (q === "'" || q === '"' || q === "`") {
      let j = i + 1;
      while (j < len) {
        if (line[j] === "\\" && j + 1 < len) {
          j += 2;
          continue;
        }
        if (line[j] === q) {
          j++;
          break;
        }
        j++;
      }
      out += `<span class="t-str">${esc(line.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // Number literal
    if (/\d/.test(line[i]) && (i === 0 || !/\w/.test(line[i - 1]))) {
      let j = i;
      while (j < len && /[\d.xXa-fA-F_n]/.test(line[j])) j++;
      out += `<span class="t-num">${esc(line.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // Identifier / keyword
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < len && /[\w$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (TS_KW.has(word)) {
        out += `<span class="t-kw">${esc(word)}</span>`;
      } else if (j < len && line[j] === "(") {
        out += `<span class="t-fn">${esc(word)}</span>`;
      } else if (/^[A-Z]/.test(word)) {
        out += `<span class="t-cls">${esc(word)}</span>`;
      } else {
        out += `<span class="t-var">${esc(word)}</span>`;
      }
      i = j;
      continue;
    }

    out += esc(line[i]);
    i++;
  }
  return out;
}

export function renderCodePreview(container: HTMLElement, code: string): void {
  const lines = code.split("\n");
  container.innerHTML = "";
  lines.forEach((line, idx) => {
    const row = document.createElement("div");
    row.className = "code-line";

    const num = document.createElement("span");
    num.className = "cl-num";
    num.textContent = String(idx + 1);

    const txt = document.createElement("span");
    txt.className = "cl-txt";
    txt.innerHTML = highlightLine(line) || " ";

    row.appendChild(num);
    row.appendChild(txt);
    container.appendChild(row);
  });
}

/* ================================================================
   CODE GENERATION — CONFIG TYPES
   ================================================================ */

export interface SerialCfg {
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: "none" | "even" | "odd";
  flowControl: "none" | "hardware";
  bufferSize: number;
  commandTimeout: number;
  autoReconnect: boolean;
  autoReconnectInterval: number;
  handshakeTimeout: number;
  delimiter: string;
  prepend: string;
  append: string;
  hsCmd: string;
  hsCmdMode: "text" | "hex";
  hsExpect: string;
  hsExpectMode: "text" | "hex";
  filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
}

export interface BleCfg {
  bufferSize: number;
  commandTimeout: number;
  handshakeTimeout: number;
  delimiter: string;
  prepend: string;
  append: string;
  hsCmd: string;
  hsCmdMode: "text" | "hex";
  hsExpect: string;
  hsExpectMode: "text" | "hex";
}

export interface UsbCfg {
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: "none" | "even" | "odd";
  flowControl: "none" | "hardware";
  bufferSize: number;
  commandTimeout: number;
  autoReconnect: boolean;
  autoReconnectInterval: number;
  handshakeTimeout: number;
  usbControlInterfaceClass: number;
  usbTransferInterfaceClass: number;
  delimiter: string;
  prepend: string;
  append: string;
  hsCmd: string;
  hsCmdMode: "text" | "hex";
  hsExpect: string;
  hsExpectMode: "text" | "hex";
  filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
}

export interface WsCfg {
  wsUrl: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: "none" | "even" | "odd";
  flowControl: "none" | "hardware";
  bufferSize: number;
  commandTimeout: number;
  autoReconnect: boolean;
  autoReconnectInterval: number;
  handshakeTimeout: number;
  delimiter: string;
  prepend: string;
  append: string;
  hsCmd: string;
  hsCmdMode: "text" | "hex";
  hsExpect: string;
  hsExpectMode: "text" | "hex";
}

export interface SavedCommand {
  id: string;
  name: string;
  value: string;
  mode: "text" | "hex";
}

export interface DataListener {
  id: string;
  name: string;
  pattern: string;
  match: "exact" | "contains" | "startsWith" | "hex";
}

/* ── Helpers ───────────────────────────────────────────────── */

/** Convert user-facing delimiter string (e.g. "\n") to JS string literal source */
function delimLit(d: string): string {
  // d is user input where \n, \r, \t, \0 are intended as escape sequences.
  // Only escape backslashes that are NOT part of a recognised escape sequence.
  const lit = d.replace(/\\(?![nrt0\\'])/g, "\\\\").replace(/'/g, "\\'");
  return `'${lit}'`;
}

/** Convert user-facing delimiter string to the actual character(s) for runtime use */
export function delimRuntime(d: string): string {
  return d
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\0/g, "\0");
}

/** Build a filter array literal (`[{ usbVendorId: 0x10c4, ... }]`) for usage examples */
function filterArrayLit(
  filters: Array<{ usbVendorId?: number; usbProductId?: number }> | undefined,
): string {
  if (!filters || filters.length === 0) return "[]";
  const entries = filters.map((f) => {
    const parts: string[] = [];
    if (f.usbVendorId !== undefined)
      parts.push(
        `usbVendorId: 0x${f.usbVendorId.toString(16).padStart(4, "0")}`,
      );
    if (f.usbProductId !== undefined)
      parts.push(
        `usbProductId: 0x${f.usbProductId.toString(16).padStart(4, "0")}`,
      );
    return `{ ${parts.join(", ")} }`;
  });
  return `[${entries.join(", ")}]`;
}

/** Convert a hex string (e.g. "FF 01 A3") to an array of byte values */
function hexStringToByteArray(hex: string): number[] {
  return hex
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((h) => parseInt(h, 16))
    .filter((n) => !isNaN(n));
}

/** Generate a Uint8Array literal from a hex string for code generation */
function uint8ArrayLit(hex: string): string {
  const bytes = hexStringToByteArray(hex);
  if (bytes.length === 0) return "new Uint8Array([])";
  return `new Uint8Array([${bytes.map((b) => `0x${b.toString(16).padStart(2, "0")}`).join(", ")}])`;
}

/* ================================================================
   CODE GENERATION — SAVED COMMANDS / DATA LISTENERS
   ================================================================ */

function toCamelCase(s: string): string {
  return (
    s
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((w, i) =>
        i === 0
          ? w.charAt(0).toLowerCase() + w.slice(1).toLowerCase()
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
      )
      .join("") || "cmd"
  );
}

function eventMapCode(listeners: DataListener[], className: string): string {
  if (listeners.length === 0) return "";
  const classLower = className.charAt(0).toLowerCase() + className.slice(1);
  const entries = listeners.map((lst) => {
    const name = lst.name || "listener";
    return `  '${classLower}:${toCamelCase(name)}': (data: string) => void;`;
  });
  return (
    `\ndeclare module 'webserial-core' {\n` +
    `  interface SerialEventMap<T> {\n` +
    entries.join("\n") +
    "\n" +
    `  }\n` +
    `}\n`
  );
}

function commandsCode(commands: SavedCommand[], isTS: boolean): string {
  if (commands.length === 0) return "";
  const ret = isTS ? ": Promise<void>" : "";
  const pub = isTS ? "public " : "";
  const lines = commands.map((cmd) => {
    const camel = toCamelCase(cmd.name);
    const fn = "send" + camel.charAt(0).toUpperCase() + camel.slice(1);
    if (cmd.mode === "hex") {
      return `  ${pub}${fn}()${ret} { return this.send(${uint8ArrayLit(cmd.value)}); } // ${cmd.name}`;
    }
    return `  ${pub}${fn}()${ret} { return this.send('${cmd.value.replace(/'/g, "\\'")}'); } // ${cmd.name}`;
  });
  return "\n" + lines.join("\n") + "\n";
}

function listenersCode(
  listeners: DataListener[],
  className: string,
  isTS: boolean,
): string {
  if (listeners.length === 0) return "";
  const classLower = className.charAt(0).toLowerCase() + className.slice(1);
  const param = isTS ? "(data: string)" : "(data)";
  const ret = isTS ? ": void" : "";
  const checks = listeners
    .map((lst) => {
      const name = lst.name || "listener";
      const eventName = `${classLower}:${toCamelCase(name)}`;
      let cond: string;
      switch (lst.match) {
        case "contains":
          cond = `String(data).includes('${lst.pattern.replace(/'/g, "\\'")}')`;
          break;
        case "startsWith":
          cond = `String(data).startsWith('${lst.pattern.replace(/'/g, "\\'")}')`;
          break;
        case "hex": {
          const bytes = hexStringToByteArray(lst.pattern);
          const lit = `[${bytes.map((b) => `0x${b.toString(16).padStart(2, "0")}`).join(", ")}]`;
          cond = `(() => { const enc = new TextEncoder().encode(String(data)); const ex = ${lit}; return enc.length === ex.length && enc.every((b, i) => b === ex[i]); })()`;
          break;
        }
        default:
          cond = `String(data).trim() === '${lst.pattern.replace(/'/g, "\\'")}' `;
      }
      return `    // ${name}\n    if (${cond}) {\n      this.emit('${eventName}', data);\n    }`;
    })
    .join("\n");
  const priv = isTS ? "private " : "";
  return (
    `\n  ${priv}startListening()${ret} {\n` +
    `    this.on('serial:data', ${param} => {\n` +
    `${checks}\n` +
    `    });\n` +
    `  }\n`
  );
}

/* ================================================================
   CODE GENERATION — HANDSHAKE BODY HELPER
   ================================================================ */

/**
 * Generates the body of the `handshake()` method for the code preview.
 * - No hsCmd  → passthrough (return true)
 * - hsCmd only → send command, return true
 * - both      → send command, wait for a matching reply
 */
function hsBody(
  hsCmd: string,
  hsCmdMode: "text" | "hex",
  hsExpect: string,
  hsExpectMode: "text" | "hex",
  isTS: boolean,
): string {
  if (!hsCmd) {
    return `    // No handshake configured — accept any device.\n    return true;`;
  }
  let sendLine: string;
  if (hsCmdMode === "hex") {
    sendLine = `    await this.send(${uint8ArrayLit(hsCmd)});`;
  } else {
    sendLine = `    await this.send('${hsCmd.replace(/'/g, "\\'")}');`;
  }
  if (!hsExpect) {
    return `${sendLine}\n    return true;`;
  }
  const param = isTS ? `(data: string)` : `(data)`;
  let matchExpr: string;
  if (hsExpectMode === "hex") {
    const bytes = hexStringToByteArray(hsExpect);
    const lit = `[${bytes.map((b) => `0x${b.toString(16).padStart(2, "0")}`).join(", ")}]`;
    matchExpr = `(() => { const enc = new TextEncoder().encode(String(data)); const ex = ${lit}; return enc.length === ex.length && enc.every((b, i) => b === ex[i]); })()`;
  } else {
    matchExpr = `String(data).trim() === '${hsExpect.replace(/'/g, "\\'")}'`;
  }
  return (
    `${sendLine}\n` +
    `    return new Promise((resolve) => {\n` +
    `      const _h = ${param} => {\n` +
    `        this.off('serial:data', _h);\n` +
    `        resolve(${matchExpr});\n` +
    `      };\n` +
    `      this.on('serial:data', _h);\n` +
    `    });`
  );
}

/* ================================================================
   CODE GENERATION — WEB SERIAL
   ================================================================ */

export function generateSerialCode(
  cfg: SerialCfg,
  className: string,
  isTS: boolean,
  commands: SavedCommand[] = [],
  listeners: DataListener[] = [],
): string {
  const ext = isTS ? "ts" : "js";
  const delim = cfg.delimiter ? delimLit(cfg.delimiter) : null;
  const parserImport = delim ? "delimiter" : "raw";
  const parserCall = delim ? `delimiter(${delim})` : "raw()";
  const ts = isTS ? ": Promise<boolean>" : "";
  const tsFilters = isTS ? ": SerialPortFilter[]" : "";
  const tsImport = isTS
    ? `\nimport type { SerialPortFilter } from 'webserial-core';`
    : "";
  const usageFilters = filterArrayLit(cfg.filters);

  return `// device.${ext} — Generated by webserial-core demo
import { AbstractSerialDevice, ${parserImport} } from 'webserial-core';${tsImport}
${isTS ? eventMapCode(listeners, className) : ""}
export class ${className} extends AbstractSerialDevice${isTS ? "<string>" : ""} {
  constructor(filters${isTS ? `${tsFilters}` : " = []"}) {
    super({
      baudRate: ${cfg.baudRate},
      dataBits: ${cfg.dataBits},
      stopBits: ${cfg.stopBits},
      parity: '${cfg.parity}',
      flowControl: '${cfg.flowControl}',
      bufferSize: ${cfg.bufferSize},
      commandTimeout: ${cfg.commandTimeout},
      parser: ${parserCall},
      autoReconnect: ${cfg.autoReconnect},
      autoReconnectInterval: ${cfg.autoReconnectInterval},
      handshakeTimeout: ${cfg.handshakeTimeout},
      filters,
    });${listeners.length > 0 ? "\n    this.startListening();" : ""}
  }

  ${isTS ? "protected " : ""}async handshake()${ts} {
${hsBody(cfg.hsCmd, cfg.hsCmdMode, cfg.hsExpect, cfg.hsExpectMode, isTS)}
  }
${commandsCode(commands, isTS)}${listenersCode(listeners, className, isTS)}}

// ── Usage ────────────────────────────────────────────────────────
const device = new ${className}(${usageFilters});

device.on('serial:connected',    () => console.log('Connected!'));
device.on('serial:disconnected', () => console.log('Disconnected.'));
device.on('serial:data',         (data) => console.log('← ', data));
device.on('serial:error',        (err)  => console.error(err.message));

// Must be called from a user-gesture (click handler):
// await device.connect();

// Send a message (prepend/append applied in your UI layer):
// await device.send('${cfg.prepend}COMMAND${cfg.append}');

// Disconnect:
// await device.disconnect();
`;
}

/* ================================================================
   CODE GENERATION — WEB BLUETOOTH
   ================================================================ */

export function generateBleCode(
  cfg: BleCfg,
  className: string,
  isTS: boolean,
  commands: SavedCommand[] = [],
  listeners: DataListener[] = [],
): string {
  const ext = isTS ? "ts" : "js";
  const delim = cfg.delimiter ? delimLit(cfg.delimiter) : null;
  const parserImport = delim ? "delimiter" : "raw";
  const parserCall = delim ? `delimiter(${delim})` : "raw()";
  const ts = isTS ? ": Promise<boolean>" : "";

  return `// device.${ext} — Generated by webserial-core demo
import { AbstractSerialDevice, ${parserImport}, createBluetoothProvider } from 'webserial-core';

// Inject the BLE provider before creating any device instance.
AbstractSerialDevice.setProvider(createBluetoothProvider());
${isTS ? eventMapCode(listeners, className) : ""}
export class ${className} extends AbstractSerialDevice${isTS ? "<string>" : ""} {
  constructor() {
    super({
      baudRate: 9600,           // Nominal — not used over BLE GATT
      bufferSize: ${cfg.bufferSize},
      commandTimeout: ${cfg.commandTimeout},
      parser: ${parserCall},
      autoReconnect: false,     // BLE requires user gesture to reconnect
      handshakeTimeout: ${cfg.handshakeTimeout},
    });${listeners.length > 0 ? "\n    this.startListening();" : ""}
  }

  ${isTS ? "protected " : ""}async handshake()${ts} {
${hsBody(cfg.hsCmd, cfg.hsCmdMode, cfg.hsExpect, cfg.hsExpectMode, isTS)}
  }
${commandsCode(commands, isTS)}${listenersCode(listeners, className, isTS)}}

// ── Usage ────────────────────────────────────────────────────────
const device = new ${className}();

device.on('serial:connected',    () => console.log('BLE connected!'));
device.on('serial:disconnected', () => console.log('Disconnected.'));
device.on('serial:data',         (data) => console.log('← ', data));
device.on('serial:error',        (err)  => console.error(err.message));

// Must be called from a user-gesture:
// await device.connect();
// await device.send('${cfg.prepend}COMMAND${cfg.append}');
// await device.disconnect();
`;
}

/* ================================================================
   CODE GENERATION — WEBUSB
   ================================================================ */

export function generateUsbCode(
  cfg: UsbCfg,
  className: string,
  isTS: boolean,
  commands: SavedCommand[] = [],
  listeners: DataListener[] = [],
): string {
  const ext = isTS ? "ts" : "js";
  const delim = cfg.delimiter ? delimLit(cfg.delimiter) : null;
  const parserImport = delim ? "delimiter" : "raw";
  const parserCall = delim ? `delimiter(${delim})` : "raw()";
  const ts = isTS ? ": Promise<boolean>" : "";
  const tsFilters = isTS ? ": SerialPortFilter[]" : "";
  const tsImport = isTS
    ? `\nimport type { SerialPortFilter } from 'webserial-core';`
    : "";
  const usageFilters = filterArrayLit(cfg.filters);

  return `// device.${ext} — Generated by webserial-core demo
import { AbstractSerialDevice, ${parserImport}, WebUsbProvider } from 'webserial-core';${tsImport}

// Inject the WebUSB polyfill provider.
AbstractSerialDevice.setProvider(
  new WebUsbProvider({
    usbControlInterfaceClass: ${cfg.usbControlInterfaceClass},
    usbTransferInterfaceClass: ${cfg.usbTransferInterfaceClass},
  })
);
${isTS ? eventMapCode(listeners, className) : ""}
export class ${className} extends AbstractSerialDevice${isTS ? "<string>" : ""} {
  constructor(filters${isTS ? `${tsFilters}` : " = []"}) {
    super({
      baudRate: ${cfg.baudRate},
      dataBits: ${cfg.dataBits},
      stopBits: ${cfg.stopBits},
      parity: '${cfg.parity}',
      flowControl: '${cfg.flowControl}',
      bufferSize: ${cfg.bufferSize},
      commandTimeout: ${cfg.commandTimeout},
      parser: ${parserCall},
      autoReconnect: ${cfg.autoReconnect},
      autoReconnectInterval: ${cfg.autoReconnectInterval},
      handshakeTimeout: ${cfg.handshakeTimeout},
      filters,
    });${listeners.length > 0 ? "\n    this.startListening();" : ""}
  }

  ${isTS ? "protected " : ""}async handshake()${ts} {
${hsBody(cfg.hsCmd, cfg.hsCmdMode, cfg.hsExpect, cfg.hsExpectMode, isTS)}
  }
${commandsCode(commands, isTS)}${listenersCode(listeners, className, isTS)}}

// ── Usage ────────────────────────────────────────────────────────
// CP2102/ESP32: { usbVendorId: 0x10c4, usbProductId: 0xea60 }
// CH340/Arduino: { usbVendorId: 0x1a86, usbProductId: 0x7523 }
const device = new ${className}(${usageFilters});

device.on('serial:connected',    () => console.log('USB connected!'));
device.on('serial:disconnected', () => console.log('Disconnected.'));
device.on('serial:data',         (data) => console.log('← ', data));
device.on('serial:error',        (err)  => console.error(err.message));

// await device.connect();
// await device.send('${cfg.prepend}COMMAND${cfg.append}');
// await device.disconnect();
`;
}

/* ================================================================
   CODE GENERATION — WEBSOCKET
   ================================================================ */

export function generateWsCode(
  cfg: WsCfg,
  className: string,
  isTS: boolean,
  commands: SavedCommand[] = [],
  listeners: DataListener[] = [],
): string {
  const ext = isTS ? "ts" : "js";
  const delim = cfg.delimiter ? delimLit(cfg.delimiter) : null;
  const parserImport = delim ? "delimiter" : "raw";
  const parserCall = delim ? `delimiter(${delim})` : "raw()";
  const ts = isTS ? ": Promise<boolean>" : "";

  return `// device.${ext} — Generated by webserial-core demo
import { AbstractSerialDevice, ${parserImport}, createWebSocketProvider } from 'webserial-core';

// Inject the WebSocket bridge provider.
// Start the Node.js bridge first: cd demos/websocket && node server.js
const wsProvider = createWebSocketProvider('${cfg.wsUrl}');
AbstractSerialDevice.setProvider(wsProvider);
${isTS ? eventMapCode(listeners, className) : ""}
export class ${className} extends AbstractSerialDevice${isTS ? "<string>" : ""} {
  constructor() {
    super({
      baudRate: ${cfg.baudRate},
      dataBits: ${cfg.dataBits},
      stopBits: ${cfg.stopBits},
      parity: '${cfg.parity}',
      flowControl: '${cfg.flowControl}',
      bufferSize: ${cfg.bufferSize},
      commandTimeout: ${cfg.commandTimeout},
      parser: ${parserCall},
      autoReconnect: ${cfg.autoReconnect},
      autoReconnectInterval: ${cfg.autoReconnectInterval},
      handshakeTimeout: ${cfg.handshakeTimeout},
    });${listeners.length > 0 ? "\n    this.startListening();" : ""}
  }

  ${isTS ? "protected " : ""}async handshake()${ts} {
${hsBody(cfg.hsCmd, cfg.hsCmdMode, cfg.hsExpect, cfg.hsExpectMode, isTS)}
  }
${commandsCode(commands, isTS)}${listenersCode(listeners, className, isTS)}}

// ── Usage ────────────────────────────────────────────────────────
const device = new ${className}();

device.on('serial:connected',    () => console.log('WS connected!'));
device.on('serial:disconnected', () => console.log('Disconnected.'));
device.on('serial:data',         (data) => console.log('← ', data));
device.on('serial:error',        (err)  => console.error(err.message));

// await device.connect();
// await device.send('${cfg.prepend}COMMAND${cfg.append}');
// await device.disconnect();
`;
}

/* ================================================================
   PROJECT FILE HELPERS
   ================================================================ */

export function makePackageJson(
  name: string,
  isTS: boolean,
  provider: "serial" | "ble" | "usb" | "ws",
): string {
  const providerDeps = provider === "ws" ? { ws: "^8.0.0" } : {};
  const devDeps: Record<string, string> = {
    vite: "^8.0.0",
    ...(isTS ? { typescript: "~5.9.3" } : {}),
  };

  return JSON.stringify(
    {
      name: name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        "webserial-core": "^2.0.0",
        ...providerDeps,
      },
      devDependencies: devDeps,
    },
    null,
    2,
  );
}

export function makeTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        strict: true,
        noEmit: true,
      },
      include: ["**/*.ts"],
    },
    null,
    2,
  );
}

export function makeIndexHtml(
  className: string,
  ext: string,
  providerName: string,
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${className} — ${providerName}</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 16px; }
      pre  { background: #0f0f0f; color: #4ade80; padding: 12px; border-radius: 8px; font-size: 0.82rem; min-height: 120px; overflow-y: auto; }
      .controls { display: flex; gap: 8px; margin-bottom: 12px; }
      button { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; }
      #btn-connect    { background: #22c55e; color: #fff; }
      #btn-disconnect { background: #ef4444; color: #fff; }
      #btn-send       { background: #6366f1; color: #fff; }
      input { flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; }
    </style>
  </head>
  <body>
    <h2>${className}</h2>
    <div class="controls">
      <button id="btn-connect">Connect</button>
      <button id="btn-disconnect" disabled>Disconnect</button>
    </div>
    <div class="controls">
      <input id="input-send" type="text" placeholder="Command, e.g. LED_ON" disabled />
      <button id="btn-send" disabled>Send</button>
    </div>
    <pre id="log">Waiting for connection...</pre>

    <script type="module">
      import { ${className} } from './device.${ext}';
      const device = new ${className}();
      const log = (msg) => {
        document.getElementById('log').textContent += msg + '\\n';
      };
      device.on('serial:connected',    () => { log('✓ Connected'); document.getElementById('btn-disconnect').disabled = false; document.getElementById('btn-send').disabled = false; document.getElementById('input-send').disabled = false; });
      device.on('serial:disconnected', () => { log('✗ Disconnected'); document.getElementById('btn-disconnect').disabled = true; document.getElementById('btn-send').disabled = true; document.getElementById('input-send').disabled = true; });
      device.on('serial:data',         (data) => log('← ' + data));
      device.on('serial:error',        (err)  => log('⚠ ' + err.message));
      document.getElementById('btn-connect').onclick    = () => device.connect();
      document.getElementById('btn-disconnect').onclick = () => device.disconnect();
      document.getElementById('btn-send').onclick       = () => {
        const v = document.getElementById('input-send').value.trim();
        if (v) { device.send(v + '\\n'); document.getElementById('input-send').value = ''; }
      };
      document.getElementById('input-send').onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('btn-send').click(); };
    </script>
  </body>
</html>
`;
}

export function makeReadme(
  className: string,
  ext: string,
  providerName: string,
  providerNote: string,
): string {
  return `# ${className}

A ${providerName} device using [webserial-core](https://github.com/danidoble/webserial-core).

${providerNote}

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Usage

\`\`\`typescript
import { ${className} } from './device.${ext}';

const device = new ${className}();

device.on('serial:data', (data) => {
  console.log('Received:', data);
});

// Must be called from a user-gesture (button click):
await device.connect();

// Send data:
await device.send('LED_ON\\n');

// Disconnect:
await device.disconnect();
\`\`\`
`;
}

/* ================================================================
   DOWNLOAD – single file
   ================================================================ */

export function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ================================================================
   DOWNLOAD – config JSON
   ================================================================ */

export interface DemoConfig {
  $version: 1;
  provider: "serial" | "ble" | "usb" | "ws";
  className: string;
  language: "ts" | "js";
  dlType: "file" | "project";
  cfg: SerialCfg | BleCfg | UsbCfg | WsCfg;
  commands: SavedCommand[];
  listeners: DataListener[];
}

export function downloadConfig(config: DemoConfig, filename: string): void {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : filename + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ================================================================
   DOWNLOAD – ZIP (STORED, no compression — no external deps)
   ================================================================ */

export function downloadZip(
  files: Array<{ name: string; content: string }>,
  zipName: string,
): void {
  const encoder = new TextEncoder();
  const bytes = files.map((f) => ({
    name: f.name,
    data: encoder.encode(f.content),
  }));
  const zip = buildZip(bytes);
  const blob = new Blob([zip.buffer as ArrayBuffer], {
    type: "application/zip",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName.endsWith(".zip") ? zipName : zipName + ".zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── CRC-32 ──────────────────────────────────────────────── */
let _crc32Table: Uint32Array | null = null;

function getCrc32Table(): Uint32Array {
  if (_crc32Table) return _crc32Table;
  _crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    _crc32Table[i] = c >>> 0;
  }
  return _crc32Table;
}

function crc32(data: Uint8Array): number {
  const tbl = getCrc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++)
    crc = (crc >>> 8) ^ tbl[(crc ^ data[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

/* ── ZIP builder ─────────────────────────────────────────── */
function w16(buf: Uint8Array, off: number, v: number): void {
  new DataView(buf.buffer, buf.byteOffset + off).setUint16(0, v, true);
}
function w32(buf: Uint8Array, off: number, v: number): void {
  new DataView(buf.buffer, buf.byteOffset + off).setUint32(0, v, true);
}

function buildZip(
  files: Array<{ name: string; data: Uint8Array }>,
): Uint8Array {
  const enc = new TextEncoder();
  type Entry = {
    localHdr: Uint8Array;
    data: Uint8Array;
    cdHdr: Uint8Array;
    offset: number;
  };
  const entries: Entry[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);

    const localHdr = new Uint8Array(30 + nameBytes.length);
    w32(localHdr, 0, 0x04034b50); // signature
    w16(localHdr, 4, 20); // version needed
    w16(localHdr, 6, 0); // flags
    w16(localHdr, 8, 0); // compression: STORED
    w16(localHdr, 10, 0); // mod time
    w16(localHdr, 12, 0); // mod date
    w32(localHdr, 14, crc); // crc32
    w32(localHdr, 18, f.data.length); // compressed size
    w32(localHdr, 22, f.data.length); // uncompressed size
    w16(localHdr, 26, nameBytes.length); // name length
    w16(localHdr, 28, 0); // extra length
    localHdr.set(nameBytes, 30);

    const cdHdr = new Uint8Array(46 + nameBytes.length);
    w32(cdHdr, 0, 0x02014b50); // signature
    w16(cdHdr, 4, 20); // version made by
    w16(cdHdr, 6, 20); // version needed
    w16(cdHdr, 8, 0); // flags
    w16(cdHdr, 10, 0); // compression
    w16(cdHdr, 12, 0); // mod time
    w16(cdHdr, 14, 0); // mod date
    w32(cdHdr, 16, crc); // crc32
    w32(cdHdr, 20, f.data.length);
    w32(cdHdr, 24, f.data.length);
    w16(cdHdr, 28, nameBytes.length);
    w16(cdHdr, 30, 0);
    w16(cdHdr, 32, 0);
    w16(cdHdr, 34, 0);
    w16(cdHdr, 36, 0);
    w32(cdHdr, 38, 0);
    w32(cdHdr, 42, offset); // local header relative offset
    cdHdr.set(nameBytes, 46);

    entries.push({ localHdr, data: f.data, cdHdr, offset });
    offset += localHdr.length + f.data.length;
  }

  const cdSize = entries.reduce((s, e) => s + e.cdHdr.length, 0);
  const eocd = new Uint8Array(22);
  w32(eocd, 0, 0x06054b50);
  w16(eocd, 4, 0);
  w16(eocd, 6, 0);
  w16(eocd, 8, entries.length);
  w16(eocd, 10, entries.length);
  w32(eocd, 12, cdSize);
  w32(eocd, 16, offset);
  w16(eocd, 20, 0);

  const out = new Uint8Array(offset + cdSize + eocd.length);
  let pos = 0;
  for (const e of entries) {
    out.set(e.localHdr, pos);
    pos += e.localHdr.length;
    out.set(e.data, pos);
    pos += e.data.length;
  }
  for (const e of entries) {
    out.set(e.cdHdr, pos);
    pos += e.cdHdr.length;
  }
  out.set(eocd, pos);
  return out;
}

/* ================================================================
   CIRCUIT BACKGROUND ANIMATION
   ================================================================ */

export function initCircuitBackground(): void {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.55;";
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;

  type Seg = { x1: number; y1: number; x2: number; y2: number };
  type Pkt = { seg: number; t: number; speed: number; sz: number };

  let segs: Seg[] = [];
  let nodeCoords: [number, number][] = [];
  let pkts: Pkt[] = [];
  let W = 0;
  let H = 0;

  function setup(): void {
    W = Math.max(window.innerWidth, 1);
    H = Math.max(window.innerHeight, 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const STEP = 52;
    const cols = Math.ceil(W / STEP);
    const rows = Math.ceil(H / STEP);
    segs = [];
    const degMap = new Map<string, number>();
    const addNode = (x: number, y: number): void => {
      degMap.set(`${x},${y}`, (degMap.get(`${x},${y}`) ?? 0) + 1);
    };

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const x = c * STEP;
        const y = r * STEP;
        if (c < cols && Math.random() > 0.22) {
          segs.push({ x1: x, y1: y, x2: x + STEP, y2: y });
          addNode(x, y);
          addNode(x + STEP, y);
        }
        if (r < rows && Math.random() > 0.22) {
          segs.push({ x1: x, y1: y, x2: x, y2: y + STEP });
          addNode(x, y);
          addNode(x, y + STEP);
        }
      }
    }

    nodeCoords = Array.from(degMap.keys()).map((k) => {
      const [nx, ny] = k.split(",").map(Number);
      return [nx, ny] as [number, number];
    });

    const NPK = Math.max(10, Math.min(35, Math.floor((W * H) / 11000)));
    pkts = Array.from({ length: NPK }, () => ({
      seg: Math.floor(Math.random() * Math.max(1, segs.length)),
      t: Math.random(),
      speed: 0.004 + Math.random() * 0.009,
      sz: 1.5 + Math.random() * 2,
    }));
  }

  function getAccentRgb(): string {
    const c = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
    if (c.startsWith("#")) {
      const h =
        c.length === 4
          ? c
              .slice(1)
              .split("")
              .map((x) => x + x)
              .join("")
          : c.slice(1);
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
    }
    return "34,197,94";
  }

  let raf = 0;

  function draw(): void {
    ctx.clearRect(0, 0, W, H);
    const rgb = getAccentRgb();

    // ── Traces ────────────────────────────────────────────────────────
    ctx.strokeStyle = `rgba(${rgb},0.07)`;
    ctx.lineWidth = 0.8;
    for (const s of segs) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }

    // ── Pads at every node ────────────────────────────────────────────
    for (const [nx, ny] of nodeCoords) {
      ctx.beginPath();
      ctx.arc(nx, ny, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},0.05)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},0.2)`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(nx, ny, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},0.25)`;
      ctx.fill();
    }

    // ── Data packets ──────────────────────────────────────────────────
    for (const p of pkts) {
      const s = segs[p.seg];
      if (!s) continue;

      const x = s.x1 + (s.x2 - s.x1) * p.t;
      const y = s.y1 + (s.y2 - s.y1) * p.t;

      // Trailing glow gradient along the trace
      const TRAIL = 0.24;
      const t0 = Math.max(0, p.t - TRAIL);
      const tx0 = s.x1 + (s.x2 - s.x1) * t0;
      const ty0 = s.y1 + (s.y2 - s.y1) * t0;
      const trailGrad = ctx.createLinearGradient(tx0, ty0, x, y);
      trailGrad.addColorStop(0, `rgba(${rgb},0)`);
      trailGrad.addColorStop(1, `rgba(${rgb},0.42)`);
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx0, ty0);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Outer glow halo
      const glow = ctx.createRadialGradient(x, y, 0, x, y, p.sz * 7);
      glow.addColorStop(0, `rgba(${rgb},0.5)`);
      glow.addColorStop(0.4, `rgba(${rgb},0.15)`);
      glow.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, p.sz * 7, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.fillStyle = `rgba(${rgb},1)`;
      ctx.beginPath();
      ctx.arc(x, y, p.sz, 0, Math.PI * 2);
      ctx.fill();

      // White-hot centre spark
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(x, y, p.sz * 0.4, 0, Math.PI * 2);
      ctx.fill();

      p.t += p.speed;
      if (p.t >= 1) {
        p.t = 0;
        p.seg = Math.floor(Math.random() * segs.length);
      }
    }

    raf = requestAnimationFrame(draw);
  }

  setup();
  draw();
  new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    setup();
    draw();
  }).observe(document.body);
}

/* ================================================================
   MOBILE NAV DRAWER
   ================================================================ */

export function initMobileNav(): void {
  const topbar = document.querySelector<HTMLElement>(".topbar");
  if (!topbar) return;

  // ── Toggle button (3-dot menu icon) ───────────────────────────────
  const btn = document.createElement("button");
  btn.className = "icon-btn mob-toggle";
  btn.title = "Navigation menu";
  btn.innerHTML =
    `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" ` +
    `stroke-width="2.2" fill="none" stroke-linecap="round">` +
    `<circle cx="12" cy="5"  r="1.3"/>` +
    `<circle cx="12" cy="12" r="1.3"/>` +
    `<circle cx="12" cy="19" r="1.3"/>` +
    `</svg>`;
  topbar.appendChild(btn);

  // ── Drawer ──────────────────────────────────────────────────────────
  const drawer = document.createElement("div");
  drawer.className = "mob-nav-drawer";
  const inner = document.createElement("div");
  inner.className = "mob-nav-inner";

  // Clone nav links from topbar-nav
  const origNav = topbar.querySelector<HTMLElement>(".topbar-nav");
  if (origNav) {
    const linkRow = document.createElement("div");
    linkRow.className = "mob-nav-links";
    origNav.querySelectorAll<HTMLAnchorElement>(".nav-item").forEach((a) => {
      linkRow.appendChild(a.cloneNode(true));
    });
    inner.appendChild(linkRow);
  }

  // Separator
  const hr = document.createElement("div");
  hr.className = "mob-nav-sep";
  inner.appendChild(hr);

  // Action buttons (proxy → real buttons so original event listeners still fire)
  const actions = document.createElement("div");
  actions.className = "mob-nav-actions";

  const realConnect = document.getElementById(
    "btn-connect",
  ) as HTMLButtonElement | null;
  const realDisconnect = document.getElementById(
    "btn-disconnect",
  ) as HTMLButtonElement | null;

  const makeProxy = (
    real: HTMLButtonElement | null,
    cls: string,
    label: string,
  ): HTMLButtonElement => {
    const b = document.createElement("button");
    b.className = `btn ${cls}`;
    b.textContent = label;
    if (real) {
      b.disabled = real.disabled;
      new MutationObserver(() => {
        b.disabled = real.disabled;
      }).observe(real, { attributes: true, attributeFilter: ["disabled"] });
      b.addEventListener("click", () => {
        real.click();
        drawer.classList.remove("open");
      });
    }
    return b;
  };

  actions.appendChild(makeProxy(realConnect, "btn-connect", "Connect"));
  actions.appendChild(
    makeProxy(realDisconnect, "btn-disconnect", "Disconnect"),
  );
  inner.appendChild(actions);
  drawer.appendChild(inner);
  document.body.appendChild(drawer);

  // ── Events ──────────────────────────────────────────────────────────
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    drawer.classList.toggle("open");
  });
  document.addEventListener("click", () => drawer.classList.remove("open"));
  drawer.addEventListener("click", (e) => e.stopPropagation());
}
