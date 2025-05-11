var M = Object.defineProperty;
var w = (l) => {
  throw TypeError(l);
};
var N = (l, n, e) => n in l ? M(l, n, { enumerable: !0, configurable: !0, writable: !0, value: e }) : l[n] = e;
var d = (l, n, e) => N(l, typeof n != "symbol" ? n + "" : n, e), O = (l, n, e) => n.has(l) || w("Cannot " + e);
var m = (l, n, e) => n.has(l) ? w("Cannot add the same private member more than once") : n instanceof WeakSet ? n.add(l) : n.set(l, e);
var o = (l, n, e) => (O(l, n, "access private method"), e);
class v extends CustomEvent {
  constructor(n, e) {
    super(n, e);
  }
}
class x extends EventTarget {
  constructor() {
    super(...arguments);
    d(this, "__listeners__", {
      debug: !1
    });
    d(this, "__debug__", !1);
  }
  dispatch(e, t = null) {
    const i = new v(e, { detail: t });
    this.dispatchEvent(i), this.__debug__ && this.dispatchEvent(new v("debug", { detail: { type: e, data: t } }));
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
const a = class a extends x {
  constructor() {
    super(), ["change"].forEach((e) => {
      this.serialRegisterAvailableListener(e);
    });
  }
  static $dispatchChange(n = null) {
    n && n.$checkAndDispatchConnection(), a.instance.dispatch("change", { devices: a.devices, dispatcher: n });
  }
  static typeError(n) {
    const e = new Error();
    throw e.message = `Type ${n} is not supported`, e.name = "DeviceTypeError", e;
  }
  static registerType(n) {
    typeof a.devices[n] > "u" && (a.devices[n] = {});
  }
  static add(n) {
    const e = n.typeDevice;
    typeof a.devices[e] > "u" && (a.devices[e] = {});
    const t = n.uuid;
    if (typeof a.devices[e] > "u" && a.typeError(e), a.devices[e][t])
      throw new Error(`Device with id ${t} already exists`);
    return a.devices[e][t] = n, a.$dispatchChange(n), Object.keys(a.devices[e]).indexOf(t);
  }
  static get(n, e) {
    return typeof a.devices[n] > "u" && (a.devices[n] = {}), typeof a.devices[n] > "u" && a.typeError(n), a.devices[n][e];
  }
  static getAll(n = null) {
    return n === null ? a.devices : (typeof a.devices[n] > "u" && a.typeError(n), a.devices[n]);
  }
  static getList() {
    return Object.values(a.devices).map((e) => Object.values(e)).flat();
  }
  static getByNumber(n, e) {
    return typeof a.devices[n] > "u" && a.typeError(n), Object.values(a.devices[n]).find((i) => i.deviceNumber === e) ?? null;
  }
  static getCustom(n, e = 1) {
    return typeof a.devices[n] > "u" && a.typeError(n), Object.values(a.devices[n]).find((i) => i.deviceNumber === e) ?? null;
  }
};
d(a, "instance"), d(a, "devices", {});
let _ = a;
_.instance || (_.instance = new _());
function C(l = 100) {
  return new Promise(
    (n) => setTimeout(() => n(), l)
  );
}
function H() {
  return "serial" in navigator;
}
const g = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 32768,
  flowControl: "none"
};
var s, p, f, b, h, S, A, E, T, k, U, L, P, D, $, q, I;
class B extends x {
  constructor({
    filters: e = null,
    config_port: t = g,
    no_device: i = 1,
    device_listen_on_channel: r = 1
  } = {
    filters: null,
    config_port: g,
    no_device: 1,
    device_listen_on_channel: 1
  }) {
    super();
    m(this, s);
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
          as: "hex",
          replacer: /[\n\r]+/g,
          limiter: null
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
        config_port: g,
        queue: [],
        auto_response: ["DD", "DD"]
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
    e && (this.serialFilters = e), t && (this.serialConfigPort = t), i && o(this, s, q).call(this, i), r && ["number", "string"].includes(typeof r) && (this.listenOnChannel = r), o(this, s, L).call(this), o(this, s, P).call(this);
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
    const e = this.__internal__.serial.connected, t = o(this, s, p).call(this, this.__internal__.serial.port);
    return e && !t && o(this, s, f).call(this, { error: "Port is closed, not readable or writable." }), this.__internal__.serial.connected = t, this.__internal__.serial.connected;
  }
  get isDisconnected() {
    const e = this.__internal__.serial.connected, t = o(this, s, p).call(this, this.__internal__.serial.port);
    return !e && t && (this.dispatch("serial:connected"), _.$dispatchChange(this)), this.__internal__.serial.connected = t, !this.__internal__.serial.connected;
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
    this.__internal__.last_error.message = "Operation response timed out.", this.__internal__.last_error.action = t, this.__internal__.last_error.code = e, this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0), t === "connect" ? (this.__internal__.serial.connected = !1, this.dispatch("serial:reconnect", {}), _.$dispatchChange(this)) : t === "connection:start" && (await this.serialDisconnect(), this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector += 1, _.$dispatchChange(this), await this.serialConnect()), this.dispatch("serial:timeout", {
      ...this.__internal__.last_error,
      bytes: e,
      action: t
    });
  }
  async disconnect(e = null) {
    await this.serialDisconnect(), o(this, s, f).call(this, e);
  }
  async connect() {
    return new Promise((e, t) => {
      H() || t("Web Serial not supported"), setTimeout(async () => {
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
      this.__internal__.serial.reader = null, this.__internal__.serial.input_done = null, this.__internal__.serial.output_stream = null, this.__internal__.serial.output_done = null, this.__internal__.serial.connected = !1, this.__internal__.serial.port = null, _.$dispatchChange(this);
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
        this.dispatch("serial:need-permission", {}), _.$dispatchChange(this);
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
        this.dispatch("serial:lost", {}), _.$dispatchChange(this);
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
      const e = await o(this, s, S).call(this);
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
        console.log(r), i.dispatch("serial:connected", r), _.$dispatchChange(this), i.__internal__.serial.queue.length > 0 && i.dispatch("internal:queue", {});
      }, t.ondisconnect = async () => {
        await i.disconnect();
      }, await C(this.__internal__.serial.delay_first_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
        await i.timeout(i.__internal__.serial.bytes_connection ?? [], "connection:start");
      }, this.__internal__.time.response_connection), this.__internal__.serial.last_action = "connect", await o(this, s, b).call(this, this.__internal__.serial.bytes_connection ?? []), this.dispatch("serial:sent", {
        action: "connect",
        bytes: this.__internal__.serial.bytes_connection
      }), this.__internal__.auto_response && o(this, s, h).call(this, this.__internal__.serial.auto_response, null), await o(this, s, k).call(this);
    } catch (e) {
      this.serialErrors(e);
    }
  }
  async serialForget() {
    return await o(this, s, U).call(this);
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
  async appendToQueue(e, t) {
    const i = this.bytesToHex(e);
    if (["connect", "connection:start"].includes(t)) {
      if (this.__internal__.serial.connected) return;
      await this.serialConnect();
      return;
    }
    this.__internal__.serial.queue.push({ bytes: i, action: t }), this.dispatch("internal:queue", {});
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
    o(this, s, I).call(this), this.dispatch("serial:soft-reload", {});
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
    return e.forEach((i) => {
      const r = i.replace("0x", "");
      t.push(parseInt(r, 16));
    }), new Uint8Array(t);
  }
  parseUint8ArrayToString(e) {
    const t = this.stringArrayToUint8Array(e);
    e = this.parseUint8ToHex(t);
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
s = new WeakSet(), p = function(e) {
  return !!(e && e.readable && e.writable);
}, f = function(e = null) {
  this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector = 0, this.dispatch("serial:disconnected", e), _.$dispatchChange(this);
}, b = async function(e) {
  const t = this.__internal__.serial.port;
  if (!t || t && (!t.readable || !t.writable))
    throw o(this, s, f).call(this, { error: "Port is closed, not readable or writable." }), new Error("The port is closed or is not readable/writable");
  const i = this.stringArrayToUint8Array(e);
  if (t.writable === null) return;
  const r = t.writable.getWriter();
  await r.write(i), r.releaseLock();
}, h = function(e = [], t = null) {
  if (e && e.length > 0) {
    const i = this.__internal__.serial.connected;
    this.__internal__.serial.connected = o(this, s, p).call(this, this.__internal__.serial.port), _.$dispatchChange(this), !i && this.__internal__.serial.connected && this.dispatch("serial:connected"), this.__internal__.interval.reconnection && (clearInterval(this.__internal__.interval.reconnection), this.__internal__.interval.reconnection = 0), this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0);
    const r = [];
    for (const c in e)
      r.push(e[c].toString().padStart(2, "0").toLowerCase());
    if (this.__internal__.serial.response.as === "hex")
      this.serialMessage(r);
    else if (this.__internal__.serial.response.as === "uint8")
      this.serialMessage(this.parseHexToUint8(this.add0x(r)));
    else if (this.__internal__.serial.response.as === "string")
      if (this.__internal__.serial.response.limiter !== null) {
        const u = this.parseUint8ArrayToString(this.add0x(r)).split(this.__internal__.serial.response.limiter);
        for (const y in u)
          u[y] && this.serialMessage(u[y]);
      } else
        this.serialMessage(this.parseUint8ArrayToString(this.add0x(r)));
    else {
      const c = this.stringToArrayBuffer(
        this.parseUint8ArrayToString(this.add0x(r))
      );
      this.serialMessage(c);
    }
  } else
    this.serialCorruptMessage(e, t);
  this.__internal__.serial.queue.length !== 0 && this.dispatch("internal:queue", {});
}, S = async function() {
  const e = this.serialFilters, t = await navigator.serial.getPorts({ filters: e });
  return e.length === 0 ? t : t.filter((r) => {
    const c = r.getInfo();
    return e.some((u) => c.usbProductId === u.usbProductId && c.usbVendorId === u.usbVendorId);
  }).filter((r) => !o(this, s, p).call(this, r));
}, A = function(e) {
  if (e) {
    const t = this.__internal__.serial.response.buffer, i = new Uint8Array(t.length + e.byteLength);
    i.set(t, 0), i.set(new Uint8Array(e), t.length), this.__internal__.serial.response.buffer = i;
  }
}, E = async function() {
  this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
    const e = [];
    for (const t in this.__internal__.serial.response.buffer)
      e.push(this.__internal__.serial.response.buffer[t].toString(16));
    this.__internal__.serial.response.buffer && o(this, s, h).call(this, e), this.__internal__.serial.response.buffer = new Uint8Array(0);
  }, 400);
}, T = async function() {
  if (this.__internal__.serial.response.length !== null) {
    if (this.__internal__.serial.response.length === this.__internal__.serial.response.buffer.length) {
      const e = [];
      for (const t in this.__internal__.serial.response.buffer)
        e.push(this.__internal__.serial.response.buffer[t].toString(16));
      o(this, s, h).call(this, e), this.__internal__.serial.response.buffer = new Uint8Array(0);
    } else if (this.__internal__.serial.response.length < this.__internal__.serial.response.buffer.length) {
      let e = new Uint8Array(0);
      for (let i = 0; i < this.__internal__.serial.response.length; i++)
        e[i] = this.__internal__.serial.response.buffer[i];
      if (e.length === this.__internal__.serial.response.length) {
        const i = [];
        for (const r in e)
          i.push(e[r].toString(16));
        o(this, s, h).call(this, i), this.__internal__.serial.response.buffer = new Uint8Array(0);
        return;
      }
      e = new Uint8Array(0);
      const t = this.__internal__.serial.response.length * 2;
      if (this.__internal__.serial.response.buffer.length === t) {
        for (let i = 14; i < t; i++)
          e[i - this.__internal__.serial.response.length] = this.__internal__.serial.response.buffer[i];
        if (e.length === this.__internal__.serial.response.length) {
          const i = [];
          for (const r in e)
            i.push(e[r].toString(16));
          o(this, s, h).call(this, i), this.__internal__.serial.response.buffer = new Uint8Array(0);
        }
      }
    }
  }
}, k = async function() {
  const e = this.__internal__.serial.port;
  if (!e || !e.readable) throw new Error("Port is not readable");
  for (; e.readable && this.__internal__.serial.keep_reading; ) {
    const t = e.readable.getReader();
    this.__internal__.serial.reader = t;
    try {
      let i = !0;
      for (; i; ) {
        const { value: r, done: c } = await t.read();
        if (c) {
          t.releaseLock(), this.__internal__.serial.keep_reading = !1, i = !1;
          break;
        }
        o(this, s, A).call(this, r), this.__internal__.serial.response.length === null ? await o(this, s, E).call(this) : await o(this, s, T).call(this);
      }
    } catch (i) {
      this.serialErrors(i);
    } finally {
      t.releaseLock();
    }
  }
  this.__internal__.serial.keep_reading = !0, this.__internal__.serial.port && await this.__internal__.serial.port.close();
}, U = async function() {
  return typeof window > "u" ? !1 : "serial" in navigator && "forget" in SerialPort.prototype && this.__internal__.serial.port ? (await this.__internal__.serial.port.forget(), !0) : !1;
}, L = function() {
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
}, P = function() {
  const e = this;
  this.on("internal:queue", async () => {
    var t;
    await o(t = e, s, $).call(t);
  }), o(this, s, D).call(this);
}, D = function() {
  const e = this;
  navigator.serial.addEventListener("connect", async () => {
    e.isDisconnected && await e.serialConnect().catch(() => {
    });
  });
}, $ = async function() {
  if (!o(this, s, p).call(this, this.__internal__.serial.port)) {
    o(this, s, f).call(this, { error: "Port is closed, not readable or writable." }), await this.serialConnect();
    return;
  }
  if (this.__internal__.timeout.until_response || this.__internal__.serial.queue.length === 0) return;
  const e = this.__internal__.serial.queue[0];
  let t = this.__internal__.time.response_general;
  e.action === "connect" && (t = this.__internal__.time.response_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
    await this.timeout(e.bytes, e.action);
  }, t), this.__internal__.serial.last_action = e.action ?? "unknown", await o(this, s, b).call(this, e.bytes), this.dispatch("serial:sent", {
    action: e.action,
    bytes: e.bytes
  }), this.__internal__.auto_response && o(this, s, h).call(this, this.__internal__.serial.auto_response, null);
  const i = [...this.__internal__.serial.queue];
  this.__internal__.serial.queue = i.splice(1);
}, q = function(e = 1) {
  this.__internal__.device_number = e, this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(e);
}, I = function() {
  this.__internal__.last_error = {
    message: null,
    action: null,
    code: null,
    no_code: 0
  };
};
export {
  B as Core,
  _ as Devices,
  x as Dispatcher
};
