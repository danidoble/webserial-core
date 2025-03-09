var N = Object.defineProperty;
var m = (s) => {
  throw TypeError(s);
};
var O = (s, i, e) => i in s ? N(s, i, { enumerable: !0, configurable: !0, writable: !0, value: e }) : s[i] = e;
var d = (s, i, e) => O(s, typeof i != "symbol" ? i + "" : i, e), H = (s, i, e) => i.has(s) || m("Cannot " + e);
var v = (s, i, e) => i.has(s) ? m("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(s) : i.set(s, e);
var l = (s, i, e) => (H(s, i, "access private method"), e);
const _ = [];
for (let s = 0; s < 256; ++s)
  _.push((s + 256).toString(16).slice(1));
function j(s, i = 0) {
  return (_[s[i + 0]] + _[s[i + 1]] + _[s[i + 2]] + _[s[i + 3]] + "-" + _[s[i + 4]] + _[s[i + 5]] + "-" + _[s[i + 6]] + _[s[i + 7]] + "-" + _[s[i + 8]] + _[s[i + 9]] + "-" + _[s[i + 10]] + _[s[i + 11]] + _[s[i + 12]] + _[s[i + 13]] + _[s[i + 14]] + _[s[i + 15]]).toLowerCase();
}
let g;
const B = new Uint8Array(16);
function F() {
  if (!g) {
    if (typeof crypto > "u" || !crypto.getRandomValues)
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    g = crypto.getRandomValues.bind(crypto);
  }
  return g(B);
}
const V = typeof crypto < "u" && crypto.randomUUID && crypto.randomUUID.bind(crypto), C = { randomUUID: V };
function W(s, i, e) {
  var n;
  if (C.randomUUID && !s)
    return C.randomUUID();
  s = s || {};
  const t = s.random ?? ((n = s.rng) == null ? void 0 : n.call(s)) ?? F();
  if (t.length < 16)
    throw new Error("Random bytes length must be >= 16");
  return t[6] = t[6] & 15 | 64, t[8] = t[8] & 63 | 128, j(t);
}
class x extends CustomEvent {
  constructor(i, e) {
    super(i, e);
  }
}
class A extends EventTarget {
  constructor() {
    super(...arguments);
    d(this, "__listeners__", {
      debug: !1
    });
    d(this, "__debug__", !1);
  }
  dispatch(e, t = null) {
    const n = new x(e, { detail: t });
    this.dispatchEvent(n), this.__debug__ && this.dispatchEvent(new x("debug", { detail: { type: e, data: t } }));
  }
  dispatchAsync(e, t = null, n = 100) {
    const a = this;
    setTimeout(() => {
      a.dispatch(e, t);
    }, n);
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
const o = class o extends A {
  constructor() {
    super(), ["change"].forEach((e) => {
      this.serialRegisterAvailableListener(e);
    });
  }
  static $dispatchChange(i = null) {
    i && i.$checkAndDispatchConnection(), o.instance.dispatch("change", { devices: o.devices, dispatcher: i });
  }
  static typeError(i) {
    const e = new Error();
    throw e.message = `Type ${i} is not supported`, e.name = "DeviceTypeError", e;
  }
  static registerType(i) {
    typeof o.devices[i] > "u" && (o.devices[i] = {});
  }
  static add(i) {
    const e = i.typeDevice;
    typeof o.devices[e] > "u" && (o.devices[e] = {});
    const t = i.uuid;
    if (typeof o.devices[e] > "u" && o.typeError(e), o.devices[e][t])
      throw new Error(`Device with id ${t} already exists`);
    return o.devices[e][t] = i, o.$dispatchChange(i), Object.keys(o.devices[e]).indexOf(t);
  }
  static get(i, e) {
    return typeof o.devices[i] > "u" && (o.devices[i] = {}), typeof o.devices[i] > "u" && o.typeError(i), o.devices[i][e];
  }
  static getAll(i = null) {
    return i === null ? o.devices : (typeof o.devices[i] > "u" && o.typeError(i), o.devices[i]);
  }
  static getList() {
    return Object.values(o.devices).map((e) => Object.values(e)).flat();
  }
  static getByNumber(i, e) {
    return typeof o.devices[i] > "u" && o.typeError(i), Object.values(o.devices[i]).find((n) => n.deviceNumber === e) ?? null;
  }
  static getCustom(i, e = 1) {
    return typeof o.devices[i] > "u" && o.typeError(i), Object.values(o.devices[i]).find((n) => n.deviceNumber === e) ?? null;
  }
};
d(o, "instance"), d(o, "devices", {});
let c = o;
c.instance || (c.instance = new c());
function S(s = 100) {
  return new Promise(
    (i) => setTimeout(() => i(), s)
  );
}
function Q() {
  return "serial" in navigator;
}
const b = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 32768,
  flowControl: "none"
};
var r, p, f, y, u, E, T, U, k, D, L, P, I, q, $, R, M;
class G extends A {
  constructor({
    filters: e = null,
    config_port: t = b,
    no_device: n = 1,
    device_listen_on_channel: a = 1
  } = {
    filters: null,
    config_port: b,
    no_device: 1,
    device_listen_on_channel: 1
  }) {
    super();
    v(this, r);
    d(this, "__internal__", {
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
          as: "hex"
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
        config_port: b,
        queue: [],
        auto_response: ["DD", "DD"]
      },
      device: {
        type: "unknown",
        id: W(),
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
    e && (this.serialFilters = e), t && (this.serialConfigPort = t), n && l(this, r, R).call(this, n), a && ["number", "string"].includes(typeof a) && (this.listenOnChannel = a), l(this, r, P).call(this), l(this, r, I).call(this);
  }
  set listenOnChannel(e) {
    if (typeof e == "string" && (e = parseInt(e)), isNaN(e) || e < 1 || e > 255)
      throw new Error("Invalid port number");
    this.__internal__.device.listen_on_port = e, this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(e);
  }
  get lastAction() {
    return this.__internal__.serial.last_action;
  }
  get listenOnChannel() {
    return this.__internal__.device.listen_on_port ?? 1;
  }
  set serialFilters(e) {
    this.__internal__.serial.filters = e;
  }
  get serialFilters() {
    return this.__internal__.serial.filters;
  }
  set serialConfigPort(e) {
    this.__internal__.serial.config_port = e;
  }
  get serialConfigPort() {
    return this.__internal__.serial.config_port;
  }
  get isConnected() {
    const e = this.__internal__.serial.connected, t = l(this, r, p).call(this, this.__internal__.serial.port);
    return e && !t && l(this, r, f).call(this, { error: "Port is closed, not readable or writable." }), this.__internal__.serial.connected = t, this.__internal__.serial.connected;
  }
  get isDisconnected() {
    const e = this.__internal__.serial.connected, t = l(this, r, p).call(this, this.__internal__.serial.port);
    return !e && t && (this.dispatch("serial:connected"), c.$dispatchChange(this)), this.__internal__.serial.connected = t, !this.__internal__.serial.connected;
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
  async timeout(e, t) {
    this.__internal__.last_error.message = "Operation response timed out.", this.__internal__.last_error.action = t, this.__internal__.last_error.code = e, this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0), t === "connect" ? (this.__internal__.serial.connected = !1, this.dispatch("serial:reconnect", {})) : t === "connection:start" && (await this.serialDisconnect(), this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector += 1, await this.serialConnect()), this.dispatch("serial:timeout", {
      ...this.__internal__.last_error,
      bytes: e,
      action: t
    });
  }
  async disconnect(e = null) {
    await this.serialDisconnect(), l(this, r, f).call(this, e);
  }
  async connect() {
    return new Promise((e, t) => {
      Q() || t("Web Serial not supported"), setTimeout(async () => {
        await S(499), await this.serialConnect(), this.isConnected ? e(`${this.typeDevice} device ${this.deviceNumber} connected`) : t(`${this.typeDevice} device ${this.deviceNumber} not connected`);
      }, 1);
    });
  }
  async serialDisconnect() {
    try {
      const e = this.__internal__.serial.reader, t = this.__internal__.serial.output_stream;
      e && (await e.cancel().catch((a) => this.serialErrors(a)), await this.__internal__.serial.input_done), t && (await t.getWriter().close(), await this.__internal__.serial.output_done), this.__internal__.serial.connected && this.__internal__.serial && this.__internal__.serial.port && await this.__internal__.serial.port.close();
    } catch (e) {
      this.serialErrors(e);
    } finally {
      this.__internal__.serial.reader = null, this.__internal__.serial.input_done = null, this.__internal__.serial.output_stream = null, this.__internal__.serial.output_done = null, this.__internal__.serial.connected = !1, this.__internal__.serial.port = null;
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
        this.dispatch("serial:need-permission", {}), c.$dispatchChange(this);
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
        this.dispatch("serial:lost", {}), c.$dispatchChange(this);
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
      const e = await l(this, r, E).call(this);
      if (e.length > 0)
        await this.serialPortsSaved(e);
      else {
        const a = this.serialFilters;
        this.__internal__.serial.port = await navigator.serial.requestPort({
          filters: a
        });
      }
      const t = this.__internal__.serial.port;
      if (!t)
        throw new Error("No port selected by the user");
      await t.open(this.serialConfigPort);
      const n = this;
      t.onconnect = (a) => {
        console.log(a), n.dispatch("serial:connected", a), c.$dispatchChange(this), n.__internal__.serial.queue.length > 0 && n.dispatch("internal:queue", {});
      }, t.ondisconnect = async () => {
        await n.disconnect();
      }, await S(this.__internal__.serial.delay_first_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
        await n.timeout(n.__internal__.serial.bytes_connection ?? [], "connection:start");
      }, this.__internal__.time.response_connection), this.__internal__.serial.last_action = "connect", await l(this, r, y).call(this, this.__internal__.serial.bytes_connection ?? []), this.dispatch("serial:sent", {
        action: "connect",
        bytes: this.__internal__.serial.bytes_connection
      }), this.__internal__.auto_response && l(this, r, u).call(this, this.__internal__.serial.auto_response, null), await l(this, r, D).call(this);
    } catch (e) {
      this.serialErrors(e);
    }
  }
  async serialForget() {
    return await l(this, r, L).call(this);
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
    return e.forEach((n, a) => {
      t[a] = "0x" + n;
    }), t;
  }
  bytesToHex(e) {
    return this.add0x(Array.from(e, (t) => this.hexMaker(t)));
  }
  async appendToQueue(e, t) {
    const n = this.bytesToHex(e);
    if (["connect", "connection:start"].includes(t)) {
      if (this.__internal__.serial.connected) return;
      await this.serialConnect();
      return;
    }
    this.__internal__.serial.queue.push({ bytes: n, action: t }), this.dispatch("internal:queue", {});
  }
  serialSetConnectionConstant(e = 1) {
    throw new Error(`Method not implemented 'serialSetConnectionConstant' to listen on channel ${e}`);
  }
  serialMessage(e) {
    throw console.log(e), new Error("Method not implemented 'serialMessage'");
  }
  serialCorruptMessage(e, t) {
    throw console.log(e, t), new Error("Method not implemented 'serialCorruptMessage'");
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
    l(this, r, M).call(this), this.dispatch("serial:soft-reload", {});
  }
  async sendConnect() {
    if (!this.__internal__.serial.bytes_connection)
      throw new Error("No connection bytes defined");
    await this.appendToQueue(this.__internal__.serial.bytes_connection, "connect");
  }
  // @ts-expect-error code is required but can be empty
  async sendCustomCode({ code: e = [] } = { code: [] }) {
    if (e === null || e.length === 0)
      throw new Error("No data to send");
    await this.appendToQueue(e, "custom");
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
    return Array.from(n).map((a) => a.toString(16));
  }
  parseUint8ToHex(e) {
    return Array.from(e).map((t) => t.toString(16));
  }
  parseHexToUint8(e) {
    return new Uint8Array(e.map((t) => parseInt(t, 16)));
  }
  stringArrayToUint8Array(e) {
    const t = [];
    return e.forEach((n) => {
      const a = n.replace("0x", "");
      t.push(parseInt(a, 16));
    }), new Uint8Array(t);
  }
  parseUint8ArrayToString(e) {
    const t = this.stringArrayToUint8Array(e);
    e = this.parseUint8ToHex(t);
    const n = e.map((a) => parseInt(a, 16));
    return String.fromCharCode(...n).replace(/[\n\r]+/g, "");
  }
  hexToAscii(e) {
    const t = e.toString();
    let n = "";
    for (let a = 0; a < t.length; a += 2)
      n += String.fromCharCode(parseInt(t.substring(a, 2), 16));
    return n;
  }
  asciiToHex(e) {
    const t = [];
    for (let n = 0, a = e.length; n < a; n++) {
      const h = Number(e.charCodeAt(n)).toString(16);
      t.push(h);
    }
    return t.join("");
  }
  $checkAndDispatchConnection() {
    return this.isConnected;
  }
}
r = new WeakSet(), p = function(e) {
  return !!(e && e.readable && e.writable);
}, f = function(e = null) {
  this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector = 0, this.dispatch("serial:disconnected", e), c.$dispatchChange(this);
}, y = async function(e) {
  const t = this.__internal__.serial.port;
  if (!t || t && (!t.readable || !t.writable))
    throw l(this, r, f).call(this, { error: "Port is closed, not readable or writable." }), new Error("The port is closed or is not readable/writable");
  const n = this.stringArrayToUint8Array(e);
  if (t.writable === null) return;
  const a = t.writable.getWriter();
  await a.write(n), a.releaseLock();
}, u = function(e = [], t = null) {
  if (e && e.length > 0) {
    const n = this.__internal__.serial.connected;
    this.__internal__.serial.connected = l(this, r, p).call(this, this.__internal__.serial.port), !n && this.__internal__.serial.connected && (this.dispatch("serial:connected"), c.$dispatchChange(this)), this.__internal__.interval.reconnection && (clearInterval(this.__internal__.interval.reconnection), this.__internal__.interval.reconnection = 0), this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0);
    const a = [];
    for (const h in e)
      a.push(e[h].toString().padStart(2, "0").toLowerCase());
    if (this.__internal__.serial.response.as === "hex")
      this.serialMessage(a);
    else if (this.__internal__.serial.response.as === "uint8")
      this.serialMessage(this.parseHexToUint8(this.add0x(a)));
    else if (this.__internal__.serial.response.as === "string")
      this.serialMessage(this.parseUint8ArrayToString(this.add0x(a)));
    else {
      const h = this.stringToArrayBuffer(
        this.parseUint8ArrayToString(this.add0x(a))
      );
      this.serialMessage(h);
    }
  } else
    this.serialCorruptMessage(e, t);
  this.__internal__.serial.queue.length !== 0 && this.dispatch("internal:queue", {});
}, E = async function() {
  const e = this.serialFilters, t = await navigator.serial.getPorts({ filters: e });
  return e.length === 0 ? t : t.filter((a) => {
    const h = a.getInfo();
    return e.some((w) => h.usbProductId === w.usbProductId && h.usbVendorId === w.usbVendorId);
  }).filter((a) => !l(this, r, p).call(this, a));
}, T = function(e) {
  if (e) {
    const t = this.__internal__.serial.response.buffer, n = new Uint8Array(t.length + e.byteLength);
    n.set(t, 0), n.set(new Uint8Array(e), t.length), this.__internal__.serial.response.buffer = n;
  }
}, U = async function() {
  this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
    const e = [];
    for (const t in this.__internal__.serial.response.buffer)
      e.push(this.__internal__.serial.response.buffer[t].toString(16));
    this.__internal__.serial.response.buffer && l(this, r, u).call(this, e), this.__internal__.serial.response.buffer = new Uint8Array(0);
  }, 400);
}, k = async function() {
  if (this.__internal__.serial.response.length !== null) {
    if (this.__internal__.serial.response.length === this.__internal__.serial.response.buffer.length) {
      const e = [];
      for (const t in this.__internal__.serial.response.buffer)
        e.push(this.__internal__.serial.response.buffer[t].toString(16));
      l(this, r, u).call(this, e), this.__internal__.serial.response.buffer = new Uint8Array(0);
    } else if (this.__internal__.serial.response.length < this.__internal__.serial.response.buffer.length) {
      let e = new Uint8Array(0);
      for (let n = 0; n < this.__internal__.serial.response.length; n++)
        e[n] = this.__internal__.serial.response.buffer[n];
      if (e.length === this.__internal__.serial.response.length) {
        const n = [];
        for (const a in e)
          n.push(e[a].toString(16));
        l(this, r, u).call(this, n), this.__internal__.serial.response.buffer = new Uint8Array(0);
        return;
      }
      e = new Uint8Array(0);
      const t = this.__internal__.serial.response.length * 2;
      if (this.__internal__.serial.response.buffer.length === t) {
        for (let n = 14; n < t; n++)
          e[n - this.__internal__.serial.response.length] = this.__internal__.serial.response.buffer[n];
        if (e.length === this.__internal__.serial.response.length) {
          const n = [];
          for (const a in e)
            n.push(e[a].toString(16));
          l(this, r, u).call(this, n), this.__internal__.serial.response.buffer = new Uint8Array(0);
        }
      }
    }
  }
}, D = async function() {
  const e = this.__internal__.serial.port;
  if (!e || !e.readable) throw new Error("Port is not readable");
  for (; e.readable && this.__internal__.serial.keep_reading; ) {
    const t = e.readable.getReader();
    this.__internal__.serial.reader = t;
    try {
      let n = !0;
      for (; n; ) {
        const { value: a, done: h } = await t.read();
        if (h) {
          t.releaseLock(), this.__internal__.serial.keep_reading = !1, n = !1;
          break;
        }
        l(this, r, T).call(this, a), this.__internal__.serial.response.length === null ? await l(this, r, U).call(this) : await l(this, r, k).call(this);
      }
    } catch (n) {
      this.serialErrors(n);
    } finally {
      t.releaseLock();
    }
  }
  this.__internal__.serial.keep_reading = !0, this.__internal__.serial.port && await this.__internal__.serial.port.close();
}, L = async function() {
  return typeof window > "u" ? !1 : "serial" in navigator && "forget" in SerialPort.prototype && this.__internal__.serial.port ? (await this.__internal__.serial.port.forget(), !0) : !1;
}, P = function() {
  [
    "serial:connected",
    "serial:connecting",
    "serial:reconnect",
    "serial:timeout",
    "serial:disconnected",
    "serial:sent",
    "serial:soft-reload",
    "serial:message",
    "unknown",
    "serial:need-permission",
    "serial:lost",
    "serial:unsupported",
    "serial:error",
    "debug"
  ].forEach((t) => {
    this.serialRegisterAvailableListener(t);
  });
}, I = function() {
  const e = this;
  this.on("internal:queue", async () => {
    var t;
    await l(t = e, r, $).call(t);
  }), l(this, r, q).call(this);
}, q = function() {
  const e = this;
  navigator.serial.addEventListener("connect", async () => {
    e.isDisconnected && await e.serialConnect().catch(() => {
    });
  });
}, $ = async function() {
  if (!l(this, r, p).call(this, this.__internal__.serial.port)) {
    l(this, r, f).call(this, { error: "Port is closed, not readable or writable." }), await this.serialConnect();
    return;
  }
  if (this.__internal__.timeout.until_response || this.__internal__.serial.queue.length === 0) return;
  const e = this.__internal__.serial.queue[0];
  let t = this.__internal__.time.response_general;
  e.action === "connect" && (t = this.__internal__.time.response_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
    await this.timeout(e.bytes, e.action);
  }, t), this.__internal__.serial.last_action = e.action ?? "unknown", await l(this, r, y).call(this, e.bytes), this.dispatch("serial:sent", {
    action: e.action,
    bytes: e.bytes
  }), this.__internal__.auto_response && l(this, r, u).call(this, this.__internal__.serial.auto_response, null);
  const n = [...this.__internal__.serial.queue];
  this.__internal__.serial.queue = n.splice(1);
}, R = function(e = 1) {
  this.__internal__.device_number = e, this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(e);
}, M = function() {
  this.__internal__.last_error = {
    message: null,
    action: null,
    code: null,
    no_code: 0
  };
};
export {
  G as Core,
  c as Devices,
  A as Dispatcher
};
