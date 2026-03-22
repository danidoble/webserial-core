/// <reference types="@types/w3c-web-serial" />

/**
 * demos/web-serial/main.ts
 * Full-featured Web Serial demo with configurable sidebar,
 * chat-style console, code preview, and download support.
 */

import { AbstractSerialDevice, delimiter, raw } from "../../src/index";
import type { SerialDeviceOptions, SerialParser } from "../../src/types";
import {
  initTheme,
  toggleTheme,
  addMessage,
  clearMessages,
  renderCodePreview,
  generateSerialCode,
  downloadFile,
  downloadZip,
  makePackageJson,
  makeTsConfig,
  makeIndexHtml,
  makeReadme,
  delimRuntime,
  downloadConfig,
  type SerialCfg,
  type SavedCommand,
  type DataListener,
  type DemoConfig,
  initCircuitBackground,
  initMobileNav,
} from "../demo-shared";

/* ================================================================
   MODULE STATE
   ================================================================ */

let savedCommands: SavedCommand[] = [];
let dataListeners: DataListener[] = [];

/* ================================================================
   DEVICE CLASS — instantiated fresh on every Connect click
   ================================================================ */

class ConfigurableSerialDevice extends AbstractSerialDevice<string> {
  private readonly _hsCmd: string;
  private readonly _hsCmdMode: "text" | "hex";
  private readonly _hsExpect: string;
  private readonly _hsExpectMode: "text" | "hex";

  constructor(
    opts: SerialDeviceOptions<string>,
    hsCmd: string,
    hsCmdMode: "text" | "hex",
    hsExpect: string,
    hsExpectMode: "text" | "hex",
  ) {
    super(opts);
    this._hsCmd = hsCmd;
    this._hsCmdMode = hsCmdMode;
    this._hsExpect = hsExpect;
    this._hsExpectMode = hsExpectMode;
  }

  protected async handshake(): Promise<boolean> {
    if (!this._hsCmd) return true;
    if (this._hsCmdMode === "hex") {
      await this.send(hexToBytes(this._hsCmd));
    } else {
      await this.send(delimRuntime(this._hsCmd));
    }
    if (!this._hsExpect) return true;
    const expected = this._hsExpect.trim();
    return new Promise<boolean>((resolve) => {
      const onData = (data: string) => {
        this.off("serial:data", onData);
        if (this._hsExpectMode === "hex") {
          const enc = new TextEncoder().encode(String(data));
          const ex = hexToBytes(this._hsExpect);
          resolve(enc.length === ex.length && enc.every((b, i) => b === ex[i]));
        } else {
          resolve(String(data).trim() === expected);
        }
      };
      this.on("serial:data", onData);
    });
  }
}

/* ================================================================
   DOM REFERENCES
   ================================================================ */

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const messages = $<HTMLDivElement>("messages");
const connectBtn = $<HTMLButtonElement>("btn-connect");
const disconnectBtn = $<HTMLButtonElement>("btn-disconnect");
const sendBtn = $<HTMLButtonElement>("btn-send");
const sendInput = $<HTMLInputElement>("input-send");
const modeToggle = $<HTMLButtonElement>("mode-toggle");
const statusDot = $<HTMLElement>("status-dot");
const statusText = $<HTMLElement>("status-text");
const consoleDot = $<HTMLElement>("console-dot");
const consoleText = $<HTMLElement>("console-text");
const sidebar = $<HTMLElement>("sidebar");
const codePanel = $<HTMLElement>("code-panel");
const codeView = $<HTMLPreElement>("code-view");
const codeTab = $<HTMLElement>("code-tab");
const menuBtn = $<HTMLButtonElement>("menu-btn");
const codeToggleBtn = $<HTMLButtonElement>("code-toggle-btn");
const themeBtn = $<HTMLButtonElement>("theme-btn");
const clearBtn = $<HTMLButtonElement>("clear-btn");
const copyBtn = $<HTMLButtonElement>("copy-btn");
const dlBtn = $<HTMLButtonElement>("dl-btn");
const cfgExportBtn = $<HTMLButtonElement>("cfg-export-btn");
const cfgImportInput = $<HTMLInputElement>("cfg-import-input");

/* ================================================================
   CONFIG READING
   ================================================================ */

function readCfg(): SerialCfg {
  const val = (id: string) => ($<HTMLInputElement>(id)?.value ?? "").trim();
  const num = (id: string, def: number) => parseInt(val(id)) || def;
  const sel = (id: string) => $<HTMLSelectElement>(id)?.value ?? "";
  const chk = (id: string) => $<HTMLInputElement>(id)?.checked ?? false;

  const vid = val("cfg-vendor");
  const pid = val("cfg-product");
  const filters: SerialCfg["filters"] = [];
  if (vid || pid) {
    const f: { usbVendorId?: number; usbProductId?: number } = {};
    if (vid) f.usbVendorId = parseInt(vid, 16);
    if (pid) f.usbProductId = parseInt(pid, 16);
    filters.push(f);
  }

  return {
    baudRate: num("cfg-baud", 9600),
    dataBits: num("cfg-databits", 8) as 7 | 8,
    stopBits: num("cfg-stopbits", 1) as 1 | 2,
    parity: (sel("cfg-parity") || "none") as SerialCfg["parity"],
    flowControl: (sel("cfg-flow") || "none") as SerialCfg["flowControl"],
    bufferSize: num("cfg-bufsize", 255),
    commandTimeout: num("cfg-timeout", 3000),
    autoReconnect: chk("cfg-autoreconnect"),
    autoReconnectInterval: num("cfg-reconnect-ms", 1500),
    handshakeTimeout: num("cfg-handshake", 2000),
    delimiter: val("cfg-delim"),
    prepend: val("cfg-prepend"),
    append: val("cfg-append"),
    hsCmd: val("cfg-hs-cmd"),
    hsCmdMode: (sel("cfg-hs-cmd-mode") as "text" | "hex") || "text",
    hsExpect: val("cfg-hs-expect"),
    hsExpectMode: (sel("cfg-hs-expect-mode") as "text" | "hex") || "text",
    filters,
  };
}

function writeCfg(cfg: SerialCfg): void {
  const set = (id: string, v: string | number | boolean) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      (el as HTMLInputElement).checked = Boolean(v);
    } else if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement
    ) {
      el.value = String(v ?? "");
    }
  };
  set("cfg-baud", cfg.baudRate ?? 9600);
  set("cfg-databits", cfg.dataBits ?? 8);
  set("cfg-stopbits", cfg.stopBits ?? 1);
  set("cfg-parity", cfg.parity ?? "none");
  set("cfg-flow", cfg.flowControl ?? "none");
  set("cfg-bufsize", cfg.bufferSize ?? 255);
  set("cfg-timeout", cfg.commandTimeout ?? 3000);
  set("cfg-handshake", cfg.handshakeTimeout ?? 2000);
  set("cfg-reconnect-ms", cfg.autoReconnectInterval ?? 1500);
  set("cfg-autoreconnect", cfg.autoReconnect ?? false);
  set(
    "cfg-vendor",
    cfg.filters?.[0]?.usbVendorId != null
      ? cfg.filters[0].usbVendorId!.toString(16)
      : "",
  );
  set(
    "cfg-product",
    cfg.filters?.[0]?.usbProductId != null
      ? cfg.filters[0].usbProductId!.toString(16)
      : "",
  );
  set("cfg-delim", cfg.delimiter ?? "\\n");
  set("cfg-prepend", cfg.prepend ?? "");
  set("cfg-append", cfg.append ?? "");
  set("cfg-hs-cmd", cfg.hsCmd ?? "");
  set("cfg-hs-cmd-mode", cfg.hsCmdMode ?? "text");
  set("cfg-hs-expect", cfg.hsExpect ?? "");
  set("cfg-hs-expect-mode", cfg.hsExpectMode ?? "text");
}

function sanitizeClassName(raw: string): string {
  const s = raw.replace(/[^a-zA-Z0-9_$]/g, "").replace(/^[^a-zA-Z_$]/, "C");
  return s.charAt(0).toUpperCase() + s.slice(1) || "MyDevice";
}

/* ================================================================
   HELPERS
   ================================================================ */

function formatBytes(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.replace(/\s+/g, "");
  if (h.length % 2 !== 0) throw new Error("Odd number of hex characters.");
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < h.length; i += 2)
    bytes[i / 2] = parseInt(h.substring(i, i + 2), 16);
  return bytes;
}

/* ================================================================
   STATUS
   ================================================================ */

type ConnState = "disconnected" | "connecting" | "connected" | "error";

function setStatus(state: ConnState, label: string): void {
  [statusDot, consoleDot].forEach((d) => {
    if (!d) return;
    d.className = "status-dot";
    if (state !== "disconnected") d.classList.add(state);
  });
  if (statusText) statusText.textContent = label;
  if (consoleText) consoleText.textContent = label;
}

/* ================================================================
   CODE PREVIEW
   ================================================================ */

let previewTimer: ReturnType<typeof setTimeout> | null = null;

function updatePreview(): void {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    const cfg = readCfg();
    const rawName = (
      $<HTMLInputElement>("dl-name")?.value ?? "MySerialDevice"
    ).trim();
    const className = sanitizeClassName(rawName);
    const isTS =
      (document.querySelector<HTMLInputElement>("input[name='dl-lang']:checked")
        ?.value ?? "ts") === "ts";
    const ext = isTS ? "ts" : "js";
    const code = generateSerialCode(
      cfg,
      className,
      isTS,
      savedCommands,
      dataListeners,
    );
    renderCodePreview(codeView, code);
    if (codeTab)
      codeTab.textContent = `${className.substring(0, 10).toLowerCase()}.${ext}`;
  }, 180);
}

/* ================================================================
   INIT THEME
   ================================================================ */

const theme = initTheme();
if (themeBtn) themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";

/* ================================================================
   TOPBAR / SIDEBAR / PANEL
   ================================================================ */

menuBtn?.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

codeToggleBtn?.addEventListener("click", () =>
  codePanel.classList.toggle("collapsed"),
);

/* ── Resize handle ──────────────────────────────────────── */
const resizeHandle = $<HTMLDivElement>("resize-handle");
if (resizeHandle) {
  let startX = 0;
  let startW = 0;
  const onMove = (e: PointerEvent) => {
    const w = Math.max(180, Math.min(700, startW + (startX - e.clientX)));
    document.documentElement.style.setProperty("--code-w", `${w}px`);
  };
  const onUp = () => {
    resizeHandle.classList.remove("dragging");
    document.removeEventListener("pointermove", onMove);
  };
  resizeHandle.addEventListener("pointerdown", (e: PointerEvent) => {
    startX = e.clientX;
    startW = codePanel.getBoundingClientRect().width;
    resizeHandle.classList.add("dragging");
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
    e.preventDefault();
  });
}

/* ── Sidebar resize handle ────────────────────────────────────── */
const sidebarResizeHandle = $<HTMLDivElement>("sidebar-resize-handle");
if (sidebarResizeHandle) {
  let startX = 0;
  let startW = 0;
  const onMove = (e: PointerEvent) => {
    const w = Math.max(200, Math.min(600, startW + (e.clientX - startX)));
    document.documentElement.style.setProperty("--sidebar-w", `${w}px`);
  };
  const onUp = () => {
    sidebarResizeHandle.classList.remove("dragging");
    document.removeEventListener("pointermove", onMove);
  };
  sidebarResizeHandle.addEventListener("pointerdown", (e: PointerEvent) => {
    startX = e.clientX;
    startW = sidebar.getBoundingClientRect().width;
    sidebarResizeHandle.classList.add("dragging");
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
    e.preventDefault();
  });
}

/* ── Mobile defaults: collapse sidebar & code panel ────── */
if (window.innerWidth <= 960) codePanel.classList.add("collapsed");
if (window.innerWidth <= 640) sidebar.classList.add("collapsed");

themeBtn?.addEventListener("click", () => {
  const next = toggleTheme();
  if (themeBtn) themeBtn.textContent = next === "dark" ? "☀️" : "🌙";
});

clearBtn?.addEventListener("click", () => clearMessages(messages));

copyBtn?.addEventListener("click", async () => {
  const code = codeView?.textContent ?? "";
  try {
    await navigator.clipboard.writeText(code);
    if (copyBtn) {
      copyBtn.textContent = "Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("copied");
      }, 1500);
    }
  } catch {
    /* clipboard not available */
  }
});

/* ================================================================
   DOWNLOAD
   ================================================================ */

dlBtn?.addEventListener("click", () => {
  const cfg = readCfg();
  const rawName = ($<HTMLInputElement>("dl-name")?.value ?? "my-device").trim();
  const className = sanitizeClassName(rawName);
  const isTS =
    (document.querySelector<HTMLInputElement>("input[name='dl-lang']:checked")
      ?.value ?? "ts") === "ts";
  const dlType =
    document.querySelector<HTMLInputElement>("input[name='dl-type']:checked")
      ?.value ?? "project";
  const ext = isTS ? "ts" : "js";
  const code = generateSerialCode(
    cfg,
    className,
    isTS,
    savedCommands,
    dataListeners,
  );

  if (dlType === "project") {
    downloadZip(
      [
        { name: `device.${ext}`, content: code },
        {
          name: "package.json",
          content: makePackageJson(rawName, isTS, "serial"),
        },
        {
          name: "index.html",
          content: makeIndexHtml(className, ext, "Web Serial"),
        },
        {
          name: "README.md",
          content: makeReadme(
            className,
            ext,
            "Web Serial",
            "Requires a Chromium browser with Web Serial API support.",
          ),
        },
        ...(isTS ? [{ name: "tsconfig.json", content: makeTsConfig() }] : []),
      ],
      `${rawName}-project-${ext}`,
    );
  } else {
    downloadFile(`${rawName}.${ext}`, code);
  }
});

cfgExportBtn?.addEventListener("click", () => {
  const rawName = ($<HTMLInputElement>("dl-name")?.value ?? "my-device").trim();
  const className = sanitizeClassName(rawName);
  const language = (document.querySelector<HTMLInputElement>(
    "input[name='dl-lang']:checked",
  )?.value ?? "ts") as "ts" | "js";
  const dlType = (document.querySelector<HTMLInputElement>(
    "input[name='dl-type']:checked",
  )?.value ?? "file") as "file" | "project";
  const config: DemoConfig = {
    $version: 1,
    provider: "serial",
    className: rawName,
    language,
    dlType,
    cfg: readCfg(),
    commands: savedCommands,
    listeners: dataListeners,
  };
  downloadConfig(config, className + "-config");
});

cfgImportInput?.addEventListener("change", () => {
  const file = cfgImportInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target?.result as string) as DemoConfig;
      if (config.$version !== 1 || config.provider !== "serial") return;
      const nameInput = $<HTMLInputElement>("dl-name");
      if (nameInput) nameInput.value = config.className;
      document
        .querySelectorAll<HTMLInputElement>("input[name='dl-lang']")
        .forEach((r) => {
          r.checked = r.value === config.language;
        });
      document
        .querySelectorAll<HTMLInputElement>("input[name='dl-type']")
        .forEach((r) => {
          r.checked = r.value === config.dlType;
        });
      writeCfg(config.cfg as SerialCfg);
      savedCommands = config.commands.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
      }));
      dataListeners = config.listeners.map((l) => ({
        ...l,
        id: crypto.randomUUID(),
      }));
      renderCommands();
      renderListeners();
      updatePreview();
    } catch {
      /* invalid JSON */
    }
    cfgImportInput.value = "";
  };
  reader.readAsText(file);
});

/* ================================================================
   CONFIG LISTENERS — update code preview on any change
   ================================================================ */

[
  "cfg-baud",
  "cfg-databits",
  "cfg-stopbits",
  "cfg-parity",
  "cfg-flow",
  "cfg-bufsize",
  "cfg-timeout",
  "cfg-handshake",
  "cfg-reconnect-ms",
  "cfg-autoreconnect",
  "cfg-vendor",
  "cfg-product",
  "cfg-delim",
  "cfg-prepend",
  "cfg-append",
  "cfg-hs-cmd",
  "cfg-hs-cmd-mode",
  "cfg-hs-expect",
  "cfg-hs-expect-mode",
  "dl-name",
].forEach((id) => {
  const el = document.getElementById(id);
  el?.addEventListener("change", updatePreview);
  el?.addEventListener("input", updatePreview);
});
document
  .querySelectorAll("input[name='dl-lang']")
  .forEach((el) => el.addEventListener("change", updatePreview));

// Initial render
updatePreview();

/* ================================================================
   SEND MODE
   ================================================================ */

let sendMode: "text" | "hex" = "text";

modeToggle?.addEventListener("click", () => {
  sendMode = sendMode === "text" ? "hex" : "text";
  modeToggle.textContent = sendMode === "text" ? "TXT" : "HEX";
  sendInput.placeholder =
    sendMode === "text"
      ? "Type a command, e.g. LED_ON"
      : "Hex bytes, e.g. FF 01 A3";
});

/* ================================================================
   DEVICE STATE
   ================================================================ */

let device: ConfigurableSerialDevice | null = null;

function enableInput(on: boolean): void {
  sendBtn.disabled = !on;
  sendInput.disabled = !on;
  disconnectBtn.disabled = !on;
  connectBtn.disabled = on;
}

/* ================================================================
   CONNECT
   ================================================================ */

connectBtn?.addEventListener("click", async () => {
  if (device) {
    try {
      await device.disconnect();
    } catch {
      /* ignore */
    }
    device = null;
  }

  const cfg = readCfg();
  const delim = cfg.delimiter ? delimRuntime(cfg.delimiter) : "";

  device = new ConfigurableSerialDevice(
    {
      baudRate: cfg.baudRate,
      dataBits: cfg.dataBits,
      stopBits: cfg.stopBits,
      parity: cfg.parity,
      flowControl: cfg.flowControl,
      bufferSize: cfg.bufferSize,
      commandTimeout: cfg.commandTimeout,
      parser: delim
        ? delimiter(delim)
        : (raw() as unknown as SerialParser<string>),
      autoReconnect: cfg.autoReconnect,
      autoReconnectInterval: cfg.autoReconnectInterval,
      handshakeTimeout: cfg.handshakeTimeout,
      filters: cfg.filters ?? [],
    },
    cfg.hsCmd,
    cfg.hsCmdMode,
    cfg.hsExpect,
    cfg.hsExpectMode,
  );

  device.on("serial:connecting", () => {
    setStatus("connecting", "Connecting…");
    connectBtn.disabled = true;
    addMessage(messages, "Connecting to serial device…", { kind: "system" });
  });

  device.on("serial:connected", () => {
    setStatus("connected", "Connected");
    enableInput(true);
    addMessage(messages, "Connected via Web Serial!", { kind: "system" });
  });

  device.on("serial:disconnected", () => {
    setStatus("disconnected", "Disconnected");
    enableInput(false);
    addMessage(messages, "Disconnected.", { kind: "system" });
    device = null;
  });

  device.on("serial:data", (data) => {
    addMessage(messages, String(data), { kind: "received", label: "Device" });
  });

  device.on("serial:error", (err) => {
    setStatus("error", "Error");
    addMessage(messages, `Error: ${err.message}`, { kind: "error" });
    connectBtn.disabled = false;
  });

  device.on("serial:need-permission", () => {
    setStatus("error", "Permission denied");
    addMessage(
      messages,
      "Permission denied — select a port and allow access.",
      {
        kind: "error",
      },
    );
    connectBtn.disabled = false;
  });

  device.on("serial:timeout", (cmd) => {
    addMessage(messages, `Timeout: ${formatBytes(cmd)}`, { kind: "error" });
  });

  device.on("serial:reconnecting", () => {
    setStatus("connecting", "Reconnecting…");
    addMessage(messages, "Auto-reconnecting…", { kind: "system" });
  });

  try {
    await device.connect();
  } catch {
    /* handled via events */
  }
});

/* ================================================================
   DISCONNECT
   ================================================================ */

disconnectBtn?.addEventListener("click", async () => {
  await device?.disconnect();
});

/* ================================================================
   SEND
   ================================================================ */

async function doSend(): Promise<void> {
  const value = sendInput.value.trim();
  if (!value || !device) return;

  const cfg = readCfg();
  const appendStr = cfg.append
    ? delimRuntime(cfg.append)
    : cfg.delimiter
      ? delimRuntime(cfg.delimiter)
      : "";

  try {
    if (sendMode === "hex") {
      const bytes = hexToBytes(value);
      addMessage(messages, `HEX: ${formatBytes(bytes)}`, {
        kind: "sent",
        label: "You",
      });
      await device.send(bytes);
    } else {
      const text = cfg.prepend + value + appendStr;
      addMessage(messages, value, { kind: "sent", label: "You" });
      await device.send(text);
    }
    sendInput.value = "";
    sendInput.focus();
  } catch (err) {
    addMessage(
      messages,
      `Send error: ${err instanceof Error ? err.message : String(err)}`,
      { kind: "error" },
    );
  }
}

sendBtn?.addEventListener("click", doSend);
sendInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSend();
});
/* ================================================================
   SAVED COMMANDS & DATA LISTENERS
   ================================================================ */

const cmdNameInput = $<HTMLInputElement>("cmd-name");
const cmdValueInput = $<HTMLInputElement>("cmd-value");
const cmdModeSelect = $<HTMLSelectElement>("cmd-mode");
const cmdAddBtn = $<HTMLButtonElement>("cmd-add");
const cmdList = $<HTMLDivElement>("cmd-list");
const lstNameInput = $<HTMLInputElement>("lst-name");
const lstPatternInput = $<HTMLInputElement>("lst-pattern");
const lstMatchSelect = $<HTMLSelectElement>("lst-match");
const lstAddBtn = $<HTMLButtonElement>("lst-add");
const lstList = $<HTMLDivElement>("lst-list");

function renderCommands(): void {
  if (!cmdList) return;
  cmdList.innerHTML = "";
  for (const cmd of savedCommands) {
    const chip = document.createElement("div");
    chip.className = "chip";
    const badge = document.createElement("span");
    badge.className = "chip-badge";
    badge.textContent = cmd.mode.toUpperCase();
    const nm = document.createElement("span");
    nm.className = "chip-name";
    nm.textContent = cmd.name;
    const vl = document.createElement("span");
    vl.className = "chip-val";
    vl.textContent = cmd.value;
    const playBtn = document.createElement("button");
    playBtn.className = "chip-send";
    playBtn.title = "Send now";
    playBtn.textContent = "\u25B6";
    playBtn.addEventListener("click", () => {
      if (!device) return;
      if (cmd.mode === "hex") {
        const bytes = hexToBytes(cmd.value);
        device.send(bytes).catch(() => {});
        addMessage(messages, `HEX: ${formatBytes(bytes)}`, {
          kind: "sent",
          label: "You",
        });
      } else {
        const cfg = readCfg();
        const ap = cfg.append
          ? delimRuntime(cfg.append)
          : delimRuntime(cfg.delimiter);
        device.send(cfg.prepend + cmd.value + ap).catch(() => {});
        addMessage(messages, cmd.name, { kind: "sent", label: "You" });
      }
    });
    const delBtn = document.createElement("button");
    delBtn.className = "chip-del";
    delBtn.title = "Remove";
    delBtn.textContent = "\u00D7";
    delBtn.addEventListener("click", () => {
      savedCommands = savedCommands.filter((c) => c.id !== cmd.id);
      renderCommands();
      updatePreview();
    });
    chip.append(badge, nm, vl, playBtn, delBtn);
    cmdList.appendChild(chip);
  }
}

function renderListeners(): void {
  if (!lstList) return;
  lstList.innerHTML = "";
  for (const lst of dataListeners) {
    const chip = document.createElement("div");
    chip.className = "chip";
    const badge = document.createElement("span");
    badge.className = "chip-badge";
    badge.textContent = lst.match;
    const nm = document.createElement("span");
    nm.className = "chip-name";
    nm.textContent = lst.name;
    const vl = document.createElement("span");
    vl.className = "chip-val";
    vl.textContent = lst.pattern;
    const delBtn = document.createElement("button");
    delBtn.className = "chip-del";
    delBtn.title = "Remove";
    delBtn.textContent = "\u00D7";
    delBtn.addEventListener("click", () => {
      dataListeners = dataListeners.filter((l) => l.id !== lst.id);
      renderListeners();
      updatePreview();
    });
    chip.append(badge, nm, vl, delBtn);
    lstList.appendChild(chip);
  }
}

cmdAddBtn?.addEventListener("click", () => {
  const n = cmdNameInput?.value.trim();
  const v = cmdValueInput?.value.trim();
  if (!n || !v) return;
  const m = (cmdModeSelect?.value ?? "text") as "text" | "hex";
  savedCommands.push({ id: crypto.randomUUID(), name: n, value: v, mode: m });
  if (cmdNameInput) cmdNameInput.value = "";
  if (cmdValueInput) cmdValueInput.value = "";
  renderCommands();
  updatePreview();
});

lstAddBtn?.addEventListener("click", () => {
  const n = lstNameInput?.value.trim();
  const p = lstPatternInput?.value.trim();
  if (!n || !p) return;
  const m = (lstMatchSelect?.value ?? "exact") as DataListener["match"];
  dataListeners.push({
    id: crypto.randomUUID(),
    name: n,
    pattern: p,
    match: m,
  });
  if (lstNameInput) lstNameInput.value = "";
  if (lstPatternInput) lstPatternInput.value = "";
  renderListeners();
  updatePreview();
});
/* ── Welcome message ─────────────────────────────────────── */
addMessage(
  messages,
  "Web Serial demo ready — configure settings and click Connect.",
  { kind: "system" },
);

/* ── Background & mobile nav ────────────────────────────── */
initCircuitBackground(messages);
initMobileNav();
