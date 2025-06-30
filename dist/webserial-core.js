var J = Object.defineProperty;
var k = (l) => {
  throw TypeError(l);
};
var K = (l, i, e) => i in l ? J(l, i, { enumerable: !0, configurable: !0, writable: !0, value: e }) : l[i] = e;
var y = (l, i, e) => K(l, typeof i != "symbol" ? i + "" : i, e), T = (l, i, e) => i.has(l) || k("Cannot " + e);
var m = (l, i, e) => (T(l, i, "read from private field"), e ? e.call(l) : i.get(l)), S = (l, i, e) => i.has(l) ? k("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(l) : i.set(l, e), P = (l, i, e, t) => (T(l, i, "write to private field"), t ? t.call(l, e) : i.set(l, e), e), o = (l, i, e) => (T(l, i, "access private method"), e);
class D extends CustomEvent {
  constructor(i, e) {
    super(i, e);
  }
}
class U extends EventTarget {
  constructor() {
    super(...arguments);
    y(this, "__listeners__", {
      debug: !1
    });
    y(this, "__debug__", !1);
    y(this, "__listenersCallbacks__", []);
  }
  dispatch(e, t = null) {
    const n = new D(e, { detail: t });
    this.dispatchEvent(n), this.__debug__ && this.dispatchEvent(new D("debug", { detail: { type: e, data: t } }));
  }
  dispatchAsync(e, t = null, n = 100) {
    const r = this;
    setTimeout(() => {
      r.dispatch(e, t);
    }, n);
  }
  on(e, t) {
    typeof this.__listeners__[e] < "u" && !this.__listeners__[e] && (this.__listeners__[e] = !0), this.__listenersCallbacks__.push({ key: e, callback: t }), this.addEventListener(e, t);
  }
  off(e, t) {
    this.__listenersCallbacks__ = this.__listenersCallbacks__.filter((n) => !(n.key === e && n.callback === t)), this.removeEventListener(e, t);
  }
  serialRegisterAvailableListener(e) {
    this.__listeners__[e] || (this.__listeners__[e] = !1);
  }
  get availableListeners() {
    return Object.keys(this.__listeners__).sort().map((t) => ({
      type: t,
      listening: this.__listeners__[t]
    }));
  }
  removeAllListeners() {
    for (const e of this.__listenersCallbacks__)
      ["internal:queue"].includes(e.key) || (this.__listenersCallbacks__ = this.__listenersCallbacks__.filter((t) => !(t.key === e.key && t.callback === e.callback)), this.removeEventListener(e.key, e.callback));
    for (const e of Object.keys(this.__listeners__))
      this.__listeners__[e] = !1;
  }
}
const a = class a extends U {
  constructor() {
    super(), ["change"].forEach((e) => {
      this.serialRegisterAvailableListener(e);
    });
  }
  static $dispatchChange(i = null) {
    i && i.$checkAndDispatchConnection(), a.instance.dispatch("change", { devices: a.devices, dispatcher: i });
  }
  static typeError(i) {
    const e = new Error();
    throw e.message = `Type ${i} is not supported`, e.name = "DeviceTypeError", e;
  }
  static registerType(i) {
    typeof a.devices[i] > "u" && (a.devices = { ...a.devices, [i]: {} });
  }
  static add(i) {
    const e = i.typeDevice;
    typeof a.devices[e] > "u" && a.registerType(e);
    const t = i.uuid;
    if (typeof a.devices[e] > "u" && a.typeError(e), a.devices[e][t])
      throw new Error(`Device with id ${t} already exists`);
    return a.devices[e][t] = i, a.$dispatchChange(i), Object.keys(a.devices[e]).indexOf(t);
  }
  static get(i, e) {
    return typeof a.devices[i] > "u" && a.registerType(i), typeof a.devices[i] > "u" && a.typeError(i), a.devices[i][e];
  }
  static getAll(i = null) {
    return i === null ? a.devices : (typeof a.devices[i] > "u" && a.typeError(i), a.devices[i]);
  }
  static getList() {
    return Object.values(a.devices).map((e) => Object.values(e)).flat();
  }
  static getByNumber(i, e) {
    return typeof a.devices[i] > "u" && a.typeError(i), Object.values(a.devices[i]).find((n) => n.deviceNumber === e) ?? null;
  }
  static getCustom(i, e = 1) {
    return typeof a.devices[i] > "u" && a.typeError(i), Object.values(a.devices[i]).find((n) => n.deviceNumber === e) ?? null;
  }
  static async connectToAll() {
    const i = a.getList();
    for (const e of i)
      e.isConnected || await e.connect().catch(console.warn);
    return Promise.resolve(a.areAllConnected());
  }
  static async disconnectAll() {
    const i = a.getList();
    for (const e of i)
      e.isDisconnected || await e.disconnect().catch(console.warn);
    return Promise.resolve(a.areAllDisconnected());
  }
  static async areAllConnected() {
    const i = a.getList();
    for (const e of i)
      if (!e.isConnected) return Promise.resolve(!1);
    return Promise.resolve(!0);
  }
  static async areAllDisconnected() {
    const i = a.getList();
    for (const e of i)
      if (!e.isDisconnected) return Promise.resolve(!1);
    return Promise.resolve(!0);
  }
  static async getAllConnected() {
    const i = a.getList();
    return Promise.resolve(i.filter((e) => e.isConnected));
  }
  static async getAllDisconnected() {
    const i = a.getList();
    return Promise.resolve(i.filter((e) => e.isDisconnected));
  }
};
y(a, "instance"), y(a, "devices", {});
let h = a;
h.instance || (h.instance = new h());
function B(l = 100) {
  return new Promise(
    (i) => setTimeout(() => i(), l)
  );
}
function X() {
  return "serial" in navigator;
}
const E = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 32768,
  flowControl: "none"
};
var f, s, b, C, $, A, I, p, R, M, q, N, O, F, w, H, j, W, Q, V, z, G;
class Z extends U {
  constructor({
    filters: e = null,
    config_port: t = E,
    no_device: n = 1,
    device_listen_on_channel: r = 1,
    bypassSerialBytesConnection: _ = !1
  } = {
    filters: null,
    config_port: E,
    no_device: 1,
    device_listen_on_channel: 1,
    bypassSerialBytesConnection: !1
  }) {
    super();
    S(this, s);
    y(this, "__internal__", {
      bypassSerialBytesConnection: !1,
      auto_response: !1,
      device_number: 1,
      aux_port_connector: 0,
      last_error: {
        message: null,
        action: null,
        code: null,
        no_code: 0
      },
      serial: {
        aux_connecting: "idle",
        connecting: !1,
        connected: !1,
        port: null,
        last_action: null,
        response: {
          length: null,
          buffer: new Uint8Array([]),
          as: "uint8",
          replacer: /[\n\r]+/g,
          limiter: null,
          prefixLimiter: !1,
          sufixLimiter: !0,
          delimited: !1
        },
        reader: null,
        input_done: null,
        output_done: null,
        input_stream: null,
        output_stream: null,
        keep_reading: !0,
        time_until_send_bytes: void 0,
        delay_first_connection: 200,
        bytes_connection: null,
        filters: [],
        config_port: E,
        queue: [],
        auto_response: ["DD", "DD"],
        free_timeout_ms: 50,
        // In previous versions 400 was used
        useRTSCTS: !1
        // Use RTS/CTS flow control
      },
      device: {
        type: "unknown",
        id: window.crypto.randomUUID(),
        listen_on_port: null
      },
      time: {
        response_connection: 500,
        response_general: 2e3
      },
      timeout: {
        until_response: 0
      },
      interval: {
        reconnection: 0
      }
    });
    S(this, f, null);
    if (!("serial" in navigator))
      throw new Error("Web Serial not supported");
    e && (this.serialFilters = e), t && (this.serialConfigPort = t), _ && (this.__internal__.bypassSerialBytesConnection = _), n && o(this, s, z).call(this, n), r && ["number", "string"].includes(typeof r) && (this.listenOnChannel = r), o(this, s, j).call(this), o(this, s, W).call(this);
  }
  set listenOnChannel(e) {
    if (typeof e == "string" && (e = parseInt(e)), isNaN(e) || e < 1 || e > 255)
      throw new Error("Invalid port number");
    this.__internal__.device.listen_on_port = e, !this.__internal__.bypassSerialBytesConnection && (this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(e));
  }
  get lastAction() {
    return this.__internal__.serial.last_action;
  }
  get listenOnChannel() {
    return this.__internal__.device.listen_on_port ?? 1;
  }
  set serialFilters(e) {
    if (this.isConnected) throw new Error("Cannot change serial filters while connected");
    this.__internal__.serial.filters = e;
  }
  get serialFilters() {
    return this.__internal__.serial.filters;
  }
  set serialConfigPort(e) {
    if (this.isConnected) throw new Error("Cannot change serial filters while connected");
    this.__internal__.serial.config_port = e;
  }
  get serialConfigPort() {
    return this.__internal__.serial.config_port;
  }
  get useRTSCTS() {
    return this.__internal__.serial.useRTSCTS;
  }
  set useRTSCTS(e) {
    this.__internal__.serial.useRTSCTS = e;
  }
  get isConnected() {
    const e = this.__internal__.serial.connected, t = o(this, s, b).call(this, this.__internal__.serial.port);
    return e && !t && o(this, s, C).call(this, { error: "Port is closed, not readable or writable." }), this.__internal__.serial.connected = t, this.__internal__.serial.connected;
  }
  get isConnecting() {
    return this.__internal__.serial.connecting;
  }
  get isDisconnected() {
    const e = this.__internal__.serial.connected, t = o(this, s, b).call(this, this.__internal__.serial.port);
    return !e && t && (this.dispatch("serial:connected"), o(this, s, w).call(this, !1), h.$dispatchChange(this)), this.__internal__.serial.connected = t, !this.__internal__.serial.connected;
  }
  get deviceNumber() {
    return this.__internal__.device_number;
  }
  get uuid() {
    return this.__internal__.device.id;
  }
  get typeDevice() {
    return this.__internal__.device.type;
  }
  get queue() {
    return this.__internal__.serial.queue;
  }
  get responseDelimited() {
    return this.__internal__.serial.response.delimited;
  }
  set responseDelimited(e) {
    if (typeof e != "boolean")
      throw new Error("responseDelimited must be a boolean");
    this.__internal__.serial.response.delimited = e;
  }
  get responsePrefixLimited() {
    return this.__internal__.serial.response.prefixLimiter;
  }
  set responsePrefixLimited(e) {
    if (typeof e != "boolean")
      throw new Error("responsePrefixLimited must be a boolean");
    this.__internal__.serial.response.prefixLimiter = e;
  }
  get responseSufixLimited() {
    return this.__internal__.serial.response.sufixLimiter;
  }
  set responseSufixLimited(e) {
    if (typeof e != "boolean")
      throw new Error("responseSufixLimited must be a boolean");
    this.__internal__.serial.response.sufixLimiter = e;
  }
  get responseLimiter() {
    return this.__internal__.serial.response.limiter;
  }
  set responseLimiter(e) {
    if (typeof e != "string" && !(e instanceof RegExp))
      throw new Error("responseLimiter must be a string or a RegExp");
    this.__internal__.serial.response.limiter = e;
  }
  get fixedBytesMessage() {
    return this.__internal__.serial.response.length;
  }
  set fixedBytesMessage(e) {
    if (e !== null && (typeof e != "number" || e < 1))
      throw new Error("Invalid length for fixed bytes message");
    this.__internal__.serial.response.length = e;
  }
  get timeoutBeforeResponseBytes() {
    return this.__internal__.serial.free_timeout_ms || 50;
  }
  set timeoutBeforeResponseBytes(e) {
    if (e !== void 0 && (typeof e != "number" || e < 1))
      throw new Error("Invalid timeout for response bytes");
    this.__internal__.serial.free_timeout_ms = e ?? 50;
  }
  get bypassSerialBytesConnection() {
    return this.__internal__.bypassSerialBytesConnection;
  }
  set bypassSerialBytesConnection(e) {
    if (typeof e != "boolean")
      throw new Error("bypassSerialBytesConnection must be a boolean");
    this.__internal__.bypassSerialBytesConnection = e;
  }
  async timeout(e, t) {
    this.__internal__.last_error.message = "Operation response timed out.", this.__internal__.last_error.action = t, this.__internal__.last_error.code = e, this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0), t === "connect" ? (this.__internal__.serial.connected = !1, this.dispatch("serial:reconnect", {}), h.$dispatchChange(this)) : t === "connection:start" && (await this.serialDisconnect(), this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector += 1, h.$dispatchChange(this), await this.serialConnect()), this.dispatch("serial:timeout", {
      ...this.__internal__.last_error,
      bytes: e,
      action: t
    });
  }
  async disconnect(e = null) {
    await this.serialDisconnect(), o(this, s, C).call(this, e);
  }
  async connect() {
    return this.isConnected ? !0 : (this.__internal__.serial.aux_connecting = "idle", console.warn(`Connecting to ${this.typeDevice} device ${this.deviceNumber}...`), new Promise((e, t) => {
      X() || t("Web Serial not supported"), m(this, f) || P(this, f, o(this, s, $).bind(this)), this.on("internal:connecting", m(this, f)), console.warn("internal:connecting");
      const n = setInterval(() => {
        console.warn("interval internal:connecting"), this.__internal__.serial.aux_connecting === "finished" ? (clearInterval(n), this.__internal__.serial.aux_connecting = "idle", m(this, f) !== null ? (console.warn(
          this.__listenersCallbacks__.filter(
            (r) => r.key === "internal:connecting" && r.callback === m(this, f)
          )
        ), this.off("internal:connecting", m(this, f))) : console.warn("#boundFinishConnecting is null?"), this.isConnected ? e(!0) : t(`${this.typeDevice} device ${this.deviceNumber} not connected`)) : this.__internal__.serial.aux_connecting === "connecting" && (this.__internal__.serial.aux_connecting = "idle", this.dispatch("internal:connecting", { active: !0 }), this.dispatch("serial:connecting", { active: !0 }));
      }, 100);
      this.serialConnect();
    }));
  }
  async serialDisconnect() {
    try {
      const e = this.__internal__.serial.reader, t = this.__internal__.serial.output_stream;
      e && (await e.cancel().catch((r) => this.serialErrors(r)), await this.__internal__.serial.input_done), t && (await t.getWriter().close(), await this.__internal__.serial.output_done), this.__internal__.serial.connected && this.__internal__.serial && this.__internal__.serial.port && await this.__internal__.serial.port.close();
    } catch (e) {
      this.serialErrors(e);
    } finally {
      this.__internal__.serial.reader = null, this.__internal__.serial.input_done = null, this.__internal__.serial.output_stream = null, this.__internal__.serial.output_done = null, this.__internal__.serial.connected = !1, this.__internal__.serial.port = null, h.$dispatchChange(this);
    }
  }
  getResponseAsArrayBuffer() {
    this.__internal__.serial.response.as = "arraybuffer";
  }
  getResponseAsArrayHex() {
    this.__internal__.serial.response.as = "hex";
  }
  getResponseAsUint8Array() {
    this.__internal__.serial.response.as = "uint8";
  }
  getResponseAsString() {
    this.__internal__.serial.response.as = "string";
  }
  async serialPortsSaved(e) {
    const t = this.serialFilters;
    if (this.__internal__.aux_port_connector < e.length) {
      const n = this.__internal__.aux_port_connector;
      this.__internal__.serial.port = e[n];
    } else
      this.__internal__.aux_port_connector = 0, this.__internal__.serial.port = await navigator.serial.requestPort({
        filters: t
      });
    if (!this.__internal__.serial.port)
      throw new Error("Select another port please");
  }
  serialErrors(e) {
    const t = e.toString().toLowerCase();
    switch (!0) {
      case t.includes("must be handling a user gesture to show a permission request"):
      case t.includes("the port is closed."):
      case t.includes("the port is closed or is not writable"):
      case t.includes("the port is closed or is not readable"):
      case t.includes("the port is closed or is not readable/writable"):
      case t.includes("select another port please"):
      case t.includes("no port selected by the user"):
      case t.includes(
        "this readable stream reader has been released and cannot be used to cancel its previous owner stream"
      ):
        this.dispatch("serial:need-permission", {}), h.$dispatchChange(this);
        break;
      case t.includes("the port is already open."):
      case t.includes("failed to open serial port"):
        this.serialDisconnect().then(async () => {
          this.__internal__.aux_port_connector += 1, await this.serialConnect();
        });
        break;
      case t.includes("cannot read properties of undefined (reading 'writable')"):
      case t.includes("cannot read properties of null (reading 'writable')"):
      case t.includes("cannot read property 'writable' of null"):
      case t.includes("cannot read property 'writable' of undefined"):
        this.serialDisconnect().then(async () => {
          await this.serialConnect();
        });
        break;
      case t.includes("'close' on 'serialport': a call to close() is already in progress."):
        break;
      case t.includes("failed to execute 'open' on 'serialport': a call to open() is already in progress."):
        break;
      case t.includes("the port is already closed."):
        break;
      case t.includes("the device has been lost"):
        this.dispatch("serial:lost", {}), h.$dispatchChange(this);
        break;
      case t.includes("navigator.serial is undefined"):
        this.dispatch("serial:unsupported", {});
        break;
      default:
        console.error(e);
        break;
    }
    this.dispatch("serial:error", e);
  }
  async serialConnect() {
    try {
      o(this, s, w).call(this, !0);
      const e = await o(this, s, R).call(this);
      if (e.length > 0)
        await this.serialPortsSaved(e);
      else {
        const r = this.serialFilters;
        this.__internal__.serial.port = await navigator.serial.requestPort({
          filters: r
        });
      }
      const t = this.__internal__.serial.port;
      if (!t)
        throw new Error("No port selected by the user");
      await t.open(this.serialConfigPort);
      const n = this;
      t.onconnect = (r) => {
        var _;
        n.dispatch("serial:connected", r), o(_ = n, s, w).call(_, !1), h.$dispatchChange(this), n.__internal__.serial.queue.length > 0 && n.dispatch("internal:queue", {});
      }, t.ondisconnect = async () => {
        await n.disconnect();
      }, await B(this.__internal__.serial.delay_first_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
        await n.timeout(n.__internal__.serial.bytes_connection ?? [], "connection:start");
      }, this.__internal__.time.response_connection), this.__internal__.serial.last_action = "connect", await o(this, s, A).call(this, this.__internal__.serial.bytes_connection ?? []), this.dispatch("serial:sent", {
        action: "connect",
        bytes: this.__internal__.serial.bytes_connection
      }), this.__internal__.auto_response && o(this, s, p).call(this, this.__internal__.serial.auto_response), await o(this, s, F).call(this);
    } catch (e) {
      o(this, s, w).call(this, !1), this.serialErrors(e);
    }
  }
  async serialForget() {
    return await o(this, s, H).call(this);
  }
  decToHex(e) {
    return typeof e == "string" && (e = parseInt(e, 10)), e.toString(16);
  }
  hexToDec(e) {
    return parseInt(e, 16);
  }
  hexMaker(e = "00", t = 2) {
    return e.toString().padStart(t, "0").toLowerCase();
  }
  add0x(e) {
    const t = [];
    return e.forEach((n, r) => {
      t[r] = "0x" + n;
    }), t;
  }
  bytesToHex(e) {
    return this.add0x(Array.from(e, (t) => this.hexMaker(t)));
  }
  validateBytes(e) {
    let t = new Uint8Array(0);
    if (e instanceof Uint8Array)
      t = e;
    else if (typeof e == "string")
      t = this.parseStringToTextEncoder(e);
    else if (Array.isArray(e) && typeof e[0] == "string")
      t = this.stringArrayToUint8Array(e);
    else if (Array.isArray(e) && typeof e[0] == "number")
      t = new Uint8Array(e);
    else
      throw new Error("Invalid data type");
    return t;
  }
  async appendToQueue(e, t) {
    const n = this.validateBytes(e);
    if (["connect", "connection:start"].includes(t)) {
      if (this.__internal__.serial.connected) return;
      await this.serialConnect();
      return;
    }
    this.__internal__.serial.queue.push({ bytes: n, action: t }), this.dispatch("internal:queue", {});
  }
  serialSetConnectionConstant(e = 1) {
    if (this.__internal__.bypassSerialBytesConnection) return this.__internal__.serial.bytes_connection;
    throw new Error(`Method not implemented 'serialSetConnectionConstant' to listen on channel ${e}`);
  }
  serialMessage(e) {
    throw console.log(e), this.dispatch("serial:message", { code: e }), new Error("Method not implemented 'serialMessage'");
  }
  serialCorruptMessage(e) {
    throw console.log(e), this.dispatch("serial:corrupt-message", { code: e }), new Error("Method not implemented 'serialCorruptMessage'");
  }
  clearSerialQueue() {
    this.__internal__.serial.queue = [];
  }
  sumHex(e) {
    let t = 0;
    return e.forEach((n) => {
      t += parseInt(n, 16);
    }), t.toString(16);
  }
  toString() {
    return JSON.stringify({
      __class: this.typeDevice,
      device_number: this.deviceNumber,
      uuid: this.uuid,
      connected: this.isConnected,
      connection: this.__internal__.serial.bytes_connection
    });
  }
  softReload() {
    o(this, s, G).call(this), this.dispatch("serial:soft-reload", {});
  }
  async sendConnect() {
    if (!this.__internal__.serial.bytes_connection)
      throw new Error("No connection bytes defined");
    await this.appendToQueue(this.__internal__.serial.bytes_connection, "connect");
  }
  async sendCustomCode({ code: e = [] } = { code: [] }) {
    if (!e)
      throw new Error("No data to send");
    this.__internal__.bypassSerialBytesConnection && (this.__internal__.serial.bytes_connection = this.validateBytes(e)), await this.appendToQueue(e, "custom");
  }
  stringToArrayHex(e) {
    return Array.from(e).map((t) => t.charCodeAt(0).toString(16));
  }
  stringToArrayBuffer(e, t = `
`) {
    return this.parseStringToTextEncoder(e, t).buffer;
  }
  parseStringToTextEncoder(e = "", t = `
`) {
    const n = new TextEncoder();
    return e += t, n.encode(e);
  }
  parseStringToBytes(e = "", t = `
`) {
    const n = this.parseStringToTextEncoder(e, t);
    return Array.from(n).map((r) => r.toString(16));
  }
  parseUint8ToHex(e) {
    return Array.from(e).map((t) => t.toString(16));
  }
  parseHexToUint8(e) {
    return new Uint8Array(e.map((t) => parseInt(t, 16)));
  }
  stringArrayToUint8Array(e) {
    const t = [];
    return typeof e == "string" ? this.parseStringToTextEncoder(e).buffer : (e.forEach((n) => {
      const r = n.replace("0x", "");
      t.push(parseInt(r, 16));
    }), new Uint8Array(t));
  }
  parseUint8ArrayToString(e) {
    let t = new Uint8Array(0);
    e instanceof Uint8Array ? t = e : t = this.stringArrayToUint8Array(e), e = this.parseUint8ToHex(t);
    const n = e.map((r) => parseInt(r, 16));
    return this.__internal__.serial.response.replacer ? String.fromCharCode(...n).replace(this.__internal__.serial.response.replacer, "") : String.fromCharCode(...n);
  }
  hexToAscii(e) {
    const t = e.toString();
    let n = "";
    for (let r = 0; r < t.length; r += 2)
      n += String.fromCharCode(parseInt(t.substring(r, 2), 16));
    return n;
  }
  asciiToHex(e) {
    const t = [];
    for (let n = 0, r = e.length; n < r; n++) {
      const _ = Number(e.charCodeAt(n)).toString(16);
      t.push(_);
    }
    return t.join("");
  }
  $checkAndDispatchConnection() {
    return this.isConnected;
  }
}
f = new WeakMap(), s = new WeakSet(), b = function(e) {
  return !!(e && e.readable && e.writable);
}, C = function(e = null) {
  this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector = 0, this.dispatch("serial:disconnected", e), h.$dispatchChange(this);
}, $ = function(e) {
  this.__internal__.serial.aux_connecting = e.detail.active ? "connecting" : "finished";
}, A = async function(e) {
  const t = this.__internal__.serial.port;
  if (!t || t && (!t.readable || !t.writable))
    throw o(this, s, C).call(this, { error: "Port is closed, not readable or writable." }), new Error("The port is closed or is not readable/writable");
  const n = this.validateBytes(e);
  if (this.useRTSCTS && await o(this, s, I).call(this, t, 5e3), t.writable === null) return;
  const r = t.writable.getWriter();
  await r.write(n), r.releaseLock();
}, I = async function(e, t = 5e3) {
  const n = Date.now();
  for (; ; ) {
    if (Date.now() - n > t)
      throw new Error("Timeout waiting for clearToSend signal");
    const { clearToSend: r } = await e.getSignals();
    if (r) return;
    await B(100);
  }
}, p = function(e = new Uint8Array([]), t = !1) {
  if (e && e.length > 0) {
    const n = this.__internal__.serial.connected;
    if (this.__internal__.serial.connected = o(this, s, b).call(this, this.__internal__.serial.port), h.$dispatchChange(this), !n && this.__internal__.serial.connected && (this.dispatch("serial:connected"), o(this, s, w).call(this, !1)), this.__internal__.interval.reconnection && (clearInterval(this.__internal__.interval.reconnection), this.__internal__.interval.reconnection = 0), this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0), this.__internal__.serial.response.as === "hex")
      t ? this.serialCorruptMessage(this.parseUint8ToHex(e)) : this.serialMessage(this.parseUint8ToHex(e));
    else if (this.__internal__.serial.response.as === "uint8")
      t ? this.serialCorruptMessage(e) : this.serialMessage(e);
    else if (this.__internal__.serial.response.as === "string") {
      const r = this.parseUint8ArrayToString(e);
      if (this.__internal__.serial.response.limiter !== null) {
        const _ = r.split(this.__internal__.serial.response.limiter);
        for (const c in _)
          _[c] && (t ? this.serialCorruptMessage(_[c]) : this.serialMessage(_[c]));
      } else
        t ? this.serialCorruptMessage(r) : this.serialMessage(r);
    } else {
      const r = this.stringToArrayBuffer(this.parseUint8ArrayToString(e));
      t ? this.serialCorruptMessage(r) : this.serialMessage(r);
    }
  }
  this.__internal__.serial.queue.length !== 0 && this.dispatch("internal:queue", {});
}, R = async function() {
  const e = this.serialFilters, t = await navigator.serial.getPorts({ filters: e });
  return e.length === 0 ? t : t.filter((r) => {
    const _ = r.getInfo();
    return e.some((c) => _.usbProductId === c.usbProductId && _.usbVendorId === c.usbVendorId);
  }).filter((r) => !o(this, s, b).call(this, r));
}, M = function(e) {
  if (e) {
    const t = this.__internal__.serial.response.buffer, n = new Uint8Array(t.length + e.byteLength);
    n.set(t, 0), n.set(new Uint8Array(e), t.length), this.__internal__.serial.response.buffer = n;
  }
}, q = async function() {
  this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
    this.__internal__.serial.response.buffer && o(this, s, p).call(this, this.__internal__.serial.response.buffer), this.__internal__.serial.response.buffer = new Uint8Array(0);
  }, this.__internal__.serial.free_timeout_ms || 50);
}, N = async function() {
  const e = this.__internal__.serial.response.length;
  let t = this.__internal__.serial.response.buffer;
  if (this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), !(e === null || !t || t.length === 0)) {
    for (; t.length >= e; ) {
      const n = t.slice(0, e);
      o(this, s, p).call(this, n), t = t.slice(e);
    }
    this.__internal__.serial.response.buffer = t, t.length > 0 && (this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
      o(this, s, p).call(this, this.__internal__.serial.response.buffer, !0);
    }, this.__internal__.serial.free_timeout_ms || 50));
  }
}, O = async function() {
  const {
    limiter: e,
    prefixLimiter: t = !1,
    sufixLimiter: n = !0
  } = this.__internal__.serial.response;
  if (!e)
    throw new Error("No limiter defined for delimited serial response");
  const r = this.__internal__.serial.response.buffer;
  if (!e || !r || r.length === 0) return;
  this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0);
  let c = new TextDecoder().decode(r);
  const v = [];
  if (typeof e == "string") {
    let u;
    if (t && n)
      u = new RegExp(`${e}([^${e}]+)${e}`, "g");
    else if (t)
      u = new RegExp(`${e}([^${e}]*)`, "g");
    else if (n)
      u = new RegExp(`([^${e}]+)${e}`, "g");
    else
      return;
    let g, d = 0;
    for (; (g = u.exec(c)) !== null; )
      v.push(new TextEncoder().encode(g[1])), d = u.lastIndex;
    c = c.slice(d);
  } else if (e instanceof RegExp) {
    let u, g = 0;
    if (t && n) {
      const d = new RegExp(`${e.source}(.*?)${e.source}`, "g");
      for (; (u = d.exec(c)) !== null; )
        v.push(new TextEncoder().encode(u[1])), g = d.lastIndex;
    } else if (n)
      for (; (u = e.exec(c)) !== null; ) {
        const d = u.index, x = c.slice(g, d);
        v.push(new TextEncoder().encode(x)), g = e.lastIndex;
      }
    else if (t) {
      const d = c.split(e);
      d.shift();
      for (const x of d)
        v.push(new TextEncoder().encode(x));
      c = "";
    }
    c = c.slice(g);
  }
  for (const u of v)
    o(this, s, p).call(this, u);
  const L = new TextEncoder().encode(c);
  this.__internal__.serial.response.buffer = L, L.length > 0 && (this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
    o(this, s, p).call(this, this.__internal__.serial.response.buffer, !0), this.__internal__.serial.response.buffer = new Uint8Array(0);
  }, this.__internal__.serial.free_timeout_ms ?? 50));
}, F = async function() {
  const e = this.__internal__.serial.port;
  if (!e || !e.readable) throw new Error("Port is not readable");
  const t = e.readable.getReader();
  this.__internal__.serial.reader = t;
  try {
    for (; this.__internal__.serial.keep_reading; ) {
      const { value: n, done: r } = await t.read();
      if (r) break;
      o(this, s, M).call(this, n), this.__internal__.serial.response.delimited ? await o(this, s, O).call(this) : this.__internal__.serial.response.length === null ? await o(this, s, q).call(this) : await o(this, s, N).call(this);
    }
  } catch (n) {
    this.serialErrors(n);
  } finally {
    t.releaseLock(), this.__internal__.serial.keep_reading = !0, this.__internal__.serial.port && await this.__internal__.serial.port.close();
  }
}, w = function(e) {
  e !== this.__internal__.serial.connecting && (this.__internal__.serial.connecting = e, this.dispatch("serial:connecting", { active: e }));
}, H = async function() {
  return typeof window > "u" ? !1 : "serial" in navigator && "forget" in SerialPort.prototype && this.__internal__.serial.port ? (await this.__internal__.serial.port.forget(), !0) : !1;
}, j = function() {
  [
    "serial:connected",
    "serial:connecting",
    "serial:reconnect",
    "serial:timeout",
    "serial:disconnected",
    "serial:sent",
    "serial:soft-reload",
    "serial:message",
    "serial:corrupt-message",
    "unknown",
    "serial:need-permission",
    "serial:lost",
    "serial:unsupported",
    "serial:error",
    "debug"
  ].forEach((t) => {
    this.serialRegisterAvailableListener(t);
  });
}, W = function() {
  const e = this;
  this.on("internal:queue", async () => {
    var t;
    await o(t = e, s, V).call(t);
  }), o(this, s, Q).call(this);
}, Q = function() {
  const e = this;
  navigator.serial.addEventListener("connect", async () => {
    e.isDisconnected && await e.serialConnect().catch(() => {
    });
  });
}, V = async function() {
  if (!o(this, s, b).call(this, this.__internal__.serial.port)) {
    o(this, s, C).call(this, { error: "Port is closed, not readable or writable." }), await this.serialConnect();
    return;
  }
  if (this.__internal__.timeout.until_response || this.__internal__.serial.queue.length === 0) return;
  const e = this.__internal__.serial.queue[0];
  let t = this.__internal__.time.response_general;
  if (e.action === "connect" && (t = this.__internal__.time.response_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
    await this.timeout(e.bytes, e.action);
  }, t), this.__internal__.serial.last_action = e.action ?? "unknown", await o(this, s, A).call(this, e.bytes), this.dispatch("serial:sent", {
    action: e.action,
    bytes: e.bytes
  }), this.__internal__.auto_response) {
    let r = new Uint8Array(0);
    try {
      r = this.validateBytes(this.__internal__.serial.auto_response);
    } catch (_) {
      this.serialErrors(_);
    }
    o(this, s, p).call(this, r);
  }
  const n = [...this.__internal__.serial.queue];
  this.__internal__.serial.queue = n.splice(1);
}, z = function(e = 1) {
  this.__internal__.device_number = e, !this.__internal__.bypassSerialBytesConnection && (this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(e));
}, G = function() {
  this.__internal__.last_error = {
    message: null,
    action: null,
    code: null,
    no_code: 0
  };
};
export {
  Z as Core,
  h as Devices,
  U as Dispatcher
};
