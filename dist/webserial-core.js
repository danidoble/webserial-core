var j = Object.defineProperty;
var T = (l) => {
  throw TypeError(l);
};
var W = (l, s, e) => s in l ? j(l, s, { enumerable: !0, configurable: !0, writable: !0, value: e }) : l[s] = e;
var g = (l, s, e) => W(l, typeof s != "symbol" ? s + "" : s, e), Q = (l, s, e) => s.has(l) || T("Cannot " + e);
var E = (l, s, e) => s.has(l) ? T("Cannot add the same private member more than once") : s instanceof WeakSet ? s.add(l) : s.set(l, e);
var a = (l, s, e) => (Q(l, s, "access private method"), e);
class A extends CustomEvent {
  constructor(s, e) {
    super(s, e);
  }
}
class L extends EventTarget {
  constructor() {
    super(...arguments);
    g(this, "__listeners__", {
      debug: !1
    });
    g(this, "__debug__", !1);
  }
  dispatch(e, t = null) {
    const i = new A(e, { detail: t });
    this.dispatchEvent(i), this.__debug__ && this.dispatchEvent(new A("debug", { detail: { type: e, data: t } }));
  }
  dispatchAsync(e, t = null, i = 100) {
    const r = this;
    setTimeout(() => {
      r.dispatch(e, t);
    }, i);
  }
  on(e, t) {
    typeof this.__listeners__[e] < "u" && !this.__listeners__[e] && (this.__listeners__[e] = !0), this.addEventListener(e, t);
  }
  off(e, t) {
    this.removeEventListener(e, t);
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
}
const o = class o extends L {
  constructor() {
    super(), ["change"].forEach((e) => {
      this.serialRegisterAvailableListener(e);
    });
  }
  static $dispatchChange(s = null) {
    s && s.$checkAndDispatchConnection(), o.instance.dispatch("change", { devices: o.devices, dispatcher: s });
  }
  static typeError(s) {
    const e = new Error();
    throw e.message = `Type ${s} is not supported`, e.name = "DeviceTypeError", e;
  }
  static registerType(s) {
    typeof o.devices[s] > "u" && (o.devices[s] = {});
  }
  static add(s) {
    const e = s.typeDevice;
    typeof o.devices[e] > "u" && (o.devices[e] = {});
    const t = s.uuid;
    if (typeof o.devices[e] > "u" && o.typeError(e), o.devices[e][t])
      throw new Error(`Device with id ${t} already exists`);
    return o.devices[e][t] = s, o.$dispatchChange(s), Object.keys(o.devices[e]).indexOf(t);
  }
  static get(s, e) {
    return typeof o.devices[s] > "u" && (o.devices[s] = {}), typeof o.devices[s] > "u" && o.typeError(s), o.devices[s][e];
  }
  static getAll(s = null) {
    return s === null ? o.devices : (typeof o.devices[s] > "u" && o.typeError(s), o.devices[s]);
  }
  static getList() {
    return Object.values(o.devices).map((e) => Object.values(e)).flat();
  }
  static getByNumber(s, e) {
    return typeof o.devices[s] > "u" && o.typeError(s), Object.values(o.devices[s]).find((i) => i.deviceNumber === e) ?? null;
  }
  static getCustom(s, e = 1) {
    return typeof o.devices[s] > "u" && o.typeError(s), Object.values(o.devices[s]).find((i) => i.deviceNumber === e) ?? null;
  }
};
g(o, "instance"), g(o, "devices", {});
let h = o;
h.instance || (h.instance = new h());
function C(l = 100) {
  return new Promise(
    (s) => setTimeout(() => s(), l)
  );
}
function V() {
  return "serial" in navigator;
}
const v = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 32768,
  flowControl: "none"
};
var n, y, b, x, B, p, $, U, k, D, P, I, R, M, q, N, O, H, F;
class G extends L {
  constructor({
    filters: e = null,
    config_port: t = v,
    no_device: i = 1,
    device_listen_on_channel: r = 1,
    bypassSerialBytesConnection: c = !1
  } = {
    filters: null,
    config_port: v,
    no_device: 1,
    device_listen_on_channel: 1,
    bypassSerialBytesConnection: !1
  }) {
    super();
    E(this, n);
    g(this, "__internal__", {
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
        config_port: v,
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
    if (!("serial" in navigator))
      throw new Error("Web Serial not supported");
    e && (this.serialFilters = e), t && (this.serialConfigPort = t), c && (this.__internal__.bypassSerialBytesConnection = c), i && a(this, n, H).call(this, i), r && ["number", "string"].includes(typeof r) && (this.listenOnChannel = r), a(this, n, M).call(this), a(this, n, q).call(this);
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
    const e = this.__internal__.serial.connected, t = a(this, n, y).call(this, this.__internal__.serial.port);
    return e && !t && a(this, n, b).call(this, { error: "Port is closed, not readable or writable." }), this.__internal__.serial.connected = t, this.__internal__.serial.connected;
  }
  get isDisconnected() {
    const e = this.__internal__.serial.connected, t = a(this, n, y).call(this, this.__internal__.serial.port);
    return !e && t && (this.dispatch("serial:connected"), h.$dispatchChange(this)), this.__internal__.serial.connected = t, !this.__internal__.serial.connected;
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
    await this.serialDisconnect(), a(this, n, b).call(this, e);
  }
  async connect() {
    return this.isConnected ? `${this.typeDevice} device ${this.deviceNumber} already connected` : new Promise((e, t) => {
      V() || t("Web Serial not supported"), setTimeout(async () => {
        await C(499), await this.serialConnect(), this.isConnected ? e(`${this.typeDevice} device ${this.deviceNumber} connected`) : t(`${this.typeDevice} device ${this.deviceNumber} not connected`);
      }, 1);
    });
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
      const i = this.__internal__.aux_port_connector;
      this.__internal__.serial.port = e[i];
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
      this.dispatch("serial:connecting", {});
      const e = await a(this, n, $).call(this);
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
      const i = this;
      t.onconnect = (r) => {
        console.log(r), i.dispatch("serial:connected", r), h.$dispatchChange(this), i.__internal__.serial.queue.length > 0 && i.dispatch("internal:queue", {});
      }, t.ondisconnect = async () => {
        await i.disconnect();
      }, await C(this.__internal__.serial.delay_first_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
        await i.timeout(i.__internal__.serial.bytes_connection ?? [], "connection:start");
      }, this.__internal__.time.response_connection), this.__internal__.serial.last_action = "connect", await a(this, n, x).call(this, this.__internal__.serial.bytes_connection ?? []), this.dispatch("serial:sent", {
        action: "connect",
        bytes: this.__internal__.serial.bytes_connection
      }), this.__internal__.auto_response && a(this, n, p).call(this, this.__internal__.serial.auto_response), await a(this, n, I).call(this);
    } catch (e) {
      this.serialErrors(e);
    }
  }
  async serialForget() {
    return await a(this, n, R).call(this);
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
    return e.forEach((i, r) => {
      t[r] = "0x" + i;
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
    const i = this.validateBytes(e);
    if (["connect", "connection:start"].includes(t)) {
      if (this.__internal__.serial.connected) return;
      await this.serialConnect();
      return;
    }
    this.__internal__.serial.queue.push({ bytes: i, action: t }), this.dispatch("internal:queue", {});
  }
  serialSetConnectionConstant(e = 1) {
    if (this.__internal__.bypassSerialBytesConnection) return this.__internal__.serial.bytes_connection;
    throw console.warn("wtf?", this.bypassSerialBytesConnection), new Error(`Method not implemented 'serialSetConnectionConstant' to listen on channel ${e}`);
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
    return e.forEach((i) => {
      t += parseInt(i, 16);
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
    a(this, n, F).call(this), this.dispatch("serial:soft-reload", {});
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
    const i = new TextEncoder();
    return e += t, i.encode(e);
  }
  parseStringToBytes(e = "", t = `
`) {
    const i = this.parseStringToTextEncoder(e, t);
    return Array.from(i).map((r) => r.toString(16));
  }
  parseUint8ToHex(e) {
    return Array.from(e).map((t) => t.toString(16));
  }
  parseHexToUint8(e) {
    return new Uint8Array(e.map((t) => parseInt(t, 16)));
  }
  stringArrayToUint8Array(e) {
    const t = [];
    return typeof e == "string" ? this.parseStringToTextEncoder(e).buffer : (e.forEach((i) => {
      const r = i.replace("0x", "");
      t.push(parseInt(r, 16));
    }), new Uint8Array(t));
  }
  parseUint8ArrayToString(e) {
    let t = new Uint8Array(0);
    e instanceof Uint8Array ? t = e : t = this.stringArrayToUint8Array(e), e = this.parseUint8ToHex(t);
    const i = e.map((r) => parseInt(r, 16));
    return this.__internal__.serial.response.replacer ? String.fromCharCode(...i).replace(this.__internal__.serial.response.replacer, "") : String.fromCharCode(...i);
  }
  hexToAscii(e) {
    const t = e.toString();
    let i = "";
    for (let r = 0; r < t.length; r += 2)
      i += String.fromCharCode(parseInt(t.substring(r, 2), 16));
    return i;
  }
  asciiToHex(e) {
    const t = [];
    for (let i = 0, r = e.length; i < r; i++) {
      const c = Number(e.charCodeAt(i)).toString(16);
      t.push(c);
    }
    return t.join("");
  }
  $checkAndDispatchConnection() {
    return this.isConnected;
  }
}
n = new WeakSet(), y = function(e) {
  return !!(e && e.readable && e.writable);
}, b = function(e = null) {
  this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector = 0, this.dispatch("serial:disconnected", e), h.$dispatchChange(this);
}, x = async function(e) {
  const t = this.__internal__.serial.port;
  if (!t || t && (!t.readable || !t.writable))
    throw a(this, n, b).call(this, { error: "Port is closed, not readable or writable." }), new Error("The port is closed or is not readable/writable");
  const i = this.validateBytes(e);
  if (this.useRTSCTS && await a(this, n, B).call(this, t, 5e3), t.writable === null) return;
  const r = t.writable.getWriter();
  await r.write(i), r.releaseLock();
}, B = async function(e, t = 5e3) {
  const i = Date.now();
  for (; ; ) {
    if (Date.now() - i > t)
      throw new Error("Timeout waiting for clearToSend signal");
    const { clearToSend: r } = await e.getSignals();
    if (r) return;
    await C(100);
  }
}, p = function(e = new Uint8Array([]), t = !1) {
  if (e && e.length > 0) {
    const i = this.__internal__.serial.connected;
    if (this.__internal__.serial.connected = a(this, n, y).call(this, this.__internal__.serial.port), h.$dispatchChange(this), !i && this.__internal__.serial.connected && this.dispatch("serial:connected"), this.__internal__.interval.reconnection && (clearInterval(this.__internal__.interval.reconnection), this.__internal__.interval.reconnection = 0), this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0), this.__internal__.serial.response.as === "hex")
      t ? this.serialCorruptMessage(this.parseUint8ToHex(e)) : this.serialMessage(this.parseUint8ToHex(e));
    else if (this.__internal__.serial.response.as === "uint8")
      t ? this.serialCorruptMessage(e) : this.serialMessage(e);
    else if (this.__internal__.serial.response.as === "string") {
      const r = this.parseUint8ArrayToString(e);
      if (this.__internal__.serial.response.limiter !== null) {
        const c = r.split(this.__internal__.serial.response.limiter);
        for (const _ in c)
          c[_] && (t ? this.serialCorruptMessage(c[_]) : this.serialMessage(c[_]));
      } else
        t ? this.serialCorruptMessage(r) : this.serialMessage(r);
    } else {
      const r = this.stringToArrayBuffer(this.parseUint8ArrayToString(e));
      t ? this.serialCorruptMessage(r) : this.serialMessage(r);
    }
  }
  this.__internal__.serial.queue.length !== 0 && this.dispatch("internal:queue", {});
}, $ = async function() {
  const e = this.serialFilters, t = await navigator.serial.getPorts({ filters: e });
  return e.length === 0 ? t : t.filter((r) => {
    const c = r.getInfo();
    return e.some((_) => c.usbProductId === _.usbProductId && c.usbVendorId === _.usbVendorId);
  }).filter((r) => !a(this, n, y).call(this, r));
}, U = function(e) {
  if (e) {
    const t = this.__internal__.serial.response.buffer, i = new Uint8Array(t.length + e.byteLength);
    i.set(t, 0), i.set(new Uint8Array(e), t.length), this.__internal__.serial.response.buffer = i;
  }
}, k = async function() {
  this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
    this.__internal__.serial.response.buffer && a(this, n, p).call(this, this.__internal__.serial.response.buffer), this.__internal__.serial.response.buffer = new Uint8Array(0);
  }, this.__internal__.serial.free_timeout_ms || 50);
}, D = async function() {
  const e = this.__internal__.serial.response.length;
  let t = this.__internal__.serial.response.buffer;
  if (this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), !(e === null || !t || t.length === 0)) {
    for (; t.length >= e; ) {
      const i = t.slice(0, e);
      a(this, n, p).call(this, i), t = t.slice(e);
    }
    this.__internal__.serial.response.buffer = t, t.length > 0 && (this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
      a(this, n, p).call(this, this.__internal__.serial.response.buffer, !0);
    }, this.__internal__.serial.free_timeout_ms || 50));
  }
}, P = async function() {
  const {
    limiter: e,
    prefixLimiter: t = !1,
    sufixLimiter: i = !0
  } = this.__internal__.serial.response;
  if (!e)
    throw new Error("No limiter defined for delimited serial response");
  const r = this.__internal__.serial.response.buffer;
  if (!e || !r || r.length === 0) return;
  this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0);
  let _ = new TextDecoder().decode(r);
  const m = [];
  if (typeof e == "string") {
    let u;
    if (t && i)
      u = new RegExp(`${e}([^${e}]+)${e}`, "g");
    else if (t)
      u = new RegExp(`${e}([^${e}]*)`, "g");
    else if (i)
      u = new RegExp(`([^${e}]+)${e}`, "g");
    else
      return;
    let f, d = 0;
    for (; (f = u.exec(_)) !== null; )
      m.push(new TextEncoder().encode(f[1])), d = u.lastIndex;
    _ = _.slice(d);
  } else if (e instanceof RegExp) {
    let u, f = 0;
    if (t && i) {
      const d = new RegExp(`${e.source}(.*?)${e.source}`, "g");
      for (; (u = d.exec(_)) !== null; )
        m.push(new TextEncoder().encode(u[1])), f = d.lastIndex;
    } else if (i)
      for (; (u = e.exec(_)) !== null; ) {
        const d = u.index, w = _.slice(f, d);
        m.push(new TextEncoder().encode(w)), f = e.lastIndex;
      }
    else if (t) {
      const d = _.split(e);
      d.shift();
      for (const w of d)
        m.push(new TextEncoder().encode(w));
      _ = "";
    }
    _ = _.slice(f);
  }
  for (const u of m)
    a(this, n, p).call(this, u);
  const S = new TextEncoder().encode(_);
  this.__internal__.serial.response.buffer = S, S.length > 0 && (this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
    a(this, n, p).call(this, this.__internal__.serial.response.buffer, !0), this.__internal__.serial.response.buffer = new Uint8Array(0);
  }, this.__internal__.serial.free_timeout_ms ?? 50));
}, I = async function() {
  const e = this.__internal__.serial.port;
  if (!e || !e.readable) throw new Error("Port is not readable");
  const t = e.readable.getReader();
  this.__internal__.serial.reader = t;
  try {
    for (; this.__internal__.serial.keep_reading; ) {
      const { value: i, done: r } = await t.read();
      if (r) break;
      a(this, n, U).call(this, i), this.__internal__.serial.response.delimited ? await a(this, n, P).call(this) : this.__internal__.serial.response.length === null ? await a(this, n, k).call(this) : await a(this, n, D).call(this);
    }
  } catch (i) {
    this.serialErrors(i);
  } finally {
    t.releaseLock(), this.__internal__.serial.keep_reading = !0, this.__internal__.serial.port && await this.__internal__.serial.port.close();
  }
}, R = async function() {
  return typeof window > "u" ? !1 : "serial" in navigator && "forget" in SerialPort.prototype && this.__internal__.serial.port ? (await this.__internal__.serial.port.forget(), !0) : !1;
}, M = function() {
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
}, q = function() {
  const e = this;
  this.on("internal:queue", async () => {
    var t;
    await a(t = e, n, O).call(t);
  }), a(this, n, N).call(this);
}, N = function() {
  const e = this;
  navigator.serial.addEventListener("connect", async () => {
    e.isDisconnected && await e.serialConnect().catch(() => {
    });
  });
}, O = async function() {
  if (!a(this, n, y).call(this, this.__internal__.serial.port)) {
    a(this, n, b).call(this, { error: "Port is closed, not readable or writable." }), await this.serialConnect();
    return;
  }
  if (this.__internal__.timeout.until_response || this.__internal__.serial.queue.length === 0) return;
  const e = this.__internal__.serial.queue[0];
  let t = this.__internal__.time.response_general;
  if (e.action === "connect" && (t = this.__internal__.time.response_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
    await this.timeout(e.bytes, e.action);
  }, t), this.__internal__.serial.last_action = e.action ?? "unknown", await a(this, n, x).call(this, e.bytes), this.dispatch("serial:sent", {
    action: e.action,
    bytes: e.bytes
  }), this.__internal__.auto_response) {
    let r = new Uint8Array(0);
    try {
      r = this.validateBytes(this.__internal__.serial.auto_response);
    } catch (c) {
      this.serialErrors(c);
    }
    a(this, n, p).call(this, r);
  }
  const i = [...this.__internal__.serial.queue];
  this.__internal__.serial.queue = i.splice(1);
}, H = function(e = 1) {
  this.__internal__.device_number = e, !this.__internal__.bypassSerialBytesConnection && (this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(e));
}, F = function() {
  this.__internal__.last_error = {
    message: null,
    action: null,
    code: null,
    no_code: 0
  };
};
export {
  G as Core,
  h as Devices,
  L as Dispatcher
};
