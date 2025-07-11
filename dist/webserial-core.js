class J extends CustomEvent {
  constructor(e, t) {
    super(e, t);
  }
}
class te extends EventTarget {
  __listeners__ = {
    debug: !1
  };
  __debug__ = !1;
  __listenersCallbacks__ = [];
  dispatch(e, t = null) {
    const s = new J(e, { detail: t });
    this.dispatchEvent(s), this.__debug__ && this.dispatchEvent(new J("debug", { detail: { type: e, data: t } }));
  }
  dispatchAsync(e, t = null, s = 100) {
    const n = this;
    setTimeout(() => {
      n.dispatch(e, t);
    }, s);
  }
  on(e, t) {
    typeof this.__listeners__[e] < "u" && !this.__listeners__[e] && (this.__listeners__[e] = !0), this.__listenersCallbacks__.push({ key: e, callback: t }), this.addEventListener(e, t);
  }
  off(e, t) {
    this.__listenersCallbacks__ = this.__listenersCallbacks__.filter((s) => !(s.key === e && s.callback === t)), this.removeEventListener(e, t);
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
class a extends te {
  static instance;
  static devices = {};
  constructor() {
    super(), ["change"].forEach((t) => {
      this.serialRegisterAvailableListener(t);
    });
  }
  static $dispatchChange(e = null) {
    e && e.$checkAndDispatchConnection(), a.instance.dispatch("change", { devices: a.devices, dispatcher: e });
  }
  static typeError(e) {
    const t = new Error();
    throw t.message = `Type ${e} is not supported`, t.name = "DeviceTypeError", t;
  }
  static registerType(e) {
    typeof a.devices[e] > "u" && (a.devices = { ...a.devices, [e]: {} });
  }
  static add(e) {
    const t = e.typeDevice;
    typeof a.devices[t] > "u" && a.registerType(t);
    const s = e.uuid;
    if (typeof a.devices[t] > "u" && a.typeError(t), a.devices[t][s])
      throw new Error(`Device with id ${s} already exists`);
    return a.devices[t][s] = e, a.$dispatchChange(e), Object.keys(a.devices[t]).indexOf(s);
  }
  static get(e, t) {
    return typeof a.devices[e] > "u" && a.registerType(e), typeof a.devices[e] > "u" && a.typeError(e), a.devices[e][t];
  }
  static getAll(e = null) {
    return e === null ? a.devices : (typeof a.devices[e] > "u" && a.typeError(e), a.devices[e]);
  }
  static getList() {
    return Object.values(a.devices).map((t) => Object.values(t)).flat();
  }
  static getByNumber(e, t) {
    return typeof a.devices[e] > "u" && a.typeError(e), Object.values(a.devices[e]).find((n) => n.deviceNumber === t) ?? null;
  }
  static getCustom(e, t = 1) {
    return typeof a.devices[e] > "u" && a.typeError(e), Object.values(a.devices[e]).find((n) => n.deviceNumber === t) ?? null;
  }
  static async connectToAll() {
    const e = a.getList();
    for (const t of e)
      t.isConnected || await t.connect().catch(console.warn);
    return Promise.resolve(a.areAllConnected());
  }
  static async disconnectAll() {
    const e = a.getList();
    for (const t of e)
      t.isDisconnected || await t.disconnect().catch(console.warn);
    return Promise.resolve(a.areAllDisconnected());
  }
  static async areAllConnected() {
    const e = a.getList();
    for (const t of e)
      if (!t.isConnected) return Promise.resolve(!1);
    return Promise.resolve(!0);
  }
  static async areAllDisconnected() {
    const e = a.getList();
    for (const t of e)
      if (!t.isDisconnected) return Promise.resolve(!1);
    return Promise.resolve(!0);
  }
  static async getAllConnected() {
    const e = a.getList();
    return Promise.resolve(e.filter((t) => t.isConnected));
  }
  static async getAllDisconnected() {
    const e = a.getList();
    return Promise.resolve(e.filter((t) => t.isDisconnected));
  }
}
a.instance || (a.instance = new a());
function Q(i = 100) {
  return new Promise(
    (e) => setTimeout(() => e(), i)
  );
}
const m = /* @__PURE__ */ Object.create(null);
m.open = "0";
m.close = "1";
m.ping = "2";
m.pong = "3";
m.message = "4";
m.upgrade = "5";
m.noop = "6";
const S = /* @__PURE__ */ Object.create(null);
Object.keys(m).forEach((i) => {
  S[m[i]] = i;
});
const U = { type: "error", data: "parser error" }, se = typeof Blob == "function" || typeof Blob < "u" && Object.prototype.toString.call(Blob) === "[object BlobConstructor]", ie = typeof ArrayBuffer == "function", ne = (i) => typeof ArrayBuffer.isView == "function" ? ArrayBuffer.isView(i) : i && i.buffer instanceof ArrayBuffer, H = ({ type: i, data: e }, t, s) => se && e instanceof Blob ? t ? s(e) : X(e, s) : ie && (e instanceof ArrayBuffer || ne(e)) ? t ? s(e) : X(new Blob([e]), s) : s(m[i] + (e || "")), X = (i, e) => {
  const t = new FileReader();
  return t.onload = function() {
    const s = t.result.split(",")[1];
    e("b" + (s || ""));
  }, t.readAsDataURL(i);
};
function j(i) {
  return i instanceof Uint8Array ? i : i instanceof ArrayBuffer ? new Uint8Array(i) : new Uint8Array(i.buffer, i.byteOffset, i.byteLength);
}
let P;
function de(i, e) {
  if (se && i.data instanceof Blob)
    return i.data.arrayBuffer().then(j).then(e);
  if (ie && (i.data instanceof ArrayBuffer || ne(i.data)))
    return e(j(i.data));
  H(i, !1, (t) => {
    P || (P = new TextEncoder()), e(P.encode(t));
  });
}
const G = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", k = typeof Uint8Array > "u" ? [] : new Uint8Array(256);
for (let i = 0; i < G.length; i++)
  k[G.charCodeAt(i)] = i;
const ye = (i) => {
  let e = i.length * 0.75, t = i.length, s, n = 0, r, o, c, h;
  i[i.length - 1] === "=" && (e--, i[i.length - 2] === "=" && e--);
  const u = new ArrayBuffer(e), _ = new Uint8Array(u);
  for (s = 0; s < t; s += 4)
    r = k[i.charCodeAt(s)], o = k[i.charCodeAt(s + 1)], c = k[i.charCodeAt(s + 2)], h = k[i.charCodeAt(s + 3)], _[n++] = r << 2 | o >> 4, _[n++] = (o & 15) << 4 | c >> 2, _[n++] = (c & 3) << 6 | h & 63;
  return u;
}, ge = typeof ArrayBuffer == "function", W = (i, e) => {
  if (typeof i != "string")
    return {
      type: "message",
      data: re(i, e)
    };
  const t = i.charAt(0);
  return t === "b" ? {
    type: "message",
    data: me(i.substring(1), e)
  } : S[t] ? i.length > 1 ? {
    type: S[t],
    data: i.substring(1)
  } : {
    type: S[t]
  } : U;
}, me = (i, e) => {
  if (ge) {
    const t = ye(i);
    return re(t, e);
  } else
    return { base64: !0, data: i };
}, re = (i, e) => {
  switch (e) {
    case "blob":
      return i instanceof Blob ? i : new Blob([i]);
    case "arraybuffer":
    default:
      return i instanceof ArrayBuffer ? i : i.buffer;
  }
}, oe = "", be = (i, e) => {
  const t = i.length, s = new Array(t);
  let n = 0;
  i.forEach((r, o) => {
    H(r, !1, (c) => {
      s[o] = c, ++n === t && e(s.join(oe));
    });
  });
}, we = (i, e) => {
  const t = i.split(oe), s = [];
  for (let n = 0; n < t.length; n++) {
    const r = W(t[n], e);
    if (s.push(r), r.type === "error")
      break;
  }
  return s;
};
function ve() {
  return new TransformStream({
    transform(i, e) {
      de(i, (t) => {
        const s = t.length;
        let n;
        if (s < 126)
          n = new Uint8Array(1), new DataView(n.buffer).setUint8(0, s);
        else if (s < 65536) {
          n = new Uint8Array(3);
          const r = new DataView(n.buffer);
          r.setUint8(0, 126), r.setUint16(1, s);
        } else {
          n = new Uint8Array(9);
          const r = new DataView(n.buffer);
          r.setUint8(0, 127), r.setBigUint64(1, BigInt(s));
        }
        i.data && typeof i.data != "string" && (n[0] |= 128), e.enqueue(n), e.enqueue(t);
      });
    }
  });
}
let N;
function C(i) {
  return i.reduce((e, t) => e + t.length, 0);
}
function T(i, e) {
  if (i[0].length === e)
    return i.shift();
  const t = new Uint8Array(e);
  let s = 0;
  for (let n = 0; n < e; n++)
    t[n] = i[0][s++], s === i[0].length && (i.shift(), s = 0);
  return i.length && s < i[0].length && (i[0] = i[0].slice(s)), t;
}
function Ee(i, e) {
  N || (N = new TextDecoder());
  const t = [];
  let s = 0, n = -1, r = !1;
  return new TransformStream({
    transform(o, c) {
      for (t.push(o); ; ) {
        if (s === 0) {
          if (C(t) < 1)
            break;
          const h = T(t, 1);
          r = (h[0] & 128) === 128, n = h[0] & 127, n < 126 ? s = 3 : n === 126 ? s = 1 : s = 2;
        } else if (s === 1) {
          if (C(t) < 2)
            break;
          const h = T(t, 2);
          n = new DataView(h.buffer, h.byteOffset, h.length).getUint16(0), s = 3;
        } else if (s === 2) {
          if (C(t) < 8)
            break;
          const h = T(t, 8), u = new DataView(h.buffer, h.byteOffset, h.length), _ = u.getUint32(0);
          if (_ > Math.pow(2, 21) - 1) {
            c.enqueue(U);
            break;
          }
          n = _ * Math.pow(2, 32) + u.getUint32(4), s = 3;
        } else {
          if (C(t) < n)
            break;
          const h = T(t, n);
          c.enqueue(W(r ? h : N.decode(h), e)), s = 0;
        }
        if (n === 0 || n > i) {
          c.enqueue(U);
          break;
        }
      }
    }
  });
}
const ae = 4;
function f(i) {
  if (i) return ke(i);
}
function ke(i) {
  for (var e in f.prototype)
    i[e] = f.prototype[e];
  return i;
}
f.prototype.on = f.prototype.addEventListener = function(i, e) {
  return this._callbacks = this._callbacks || {}, (this._callbacks["$" + i] = this._callbacks["$" + i] || []).push(e), this;
};
f.prototype.once = function(i, e) {
  function t() {
    this.off(i, t), e.apply(this, arguments);
  }
  return t.fn = e, this.on(i, t), this;
};
f.prototype.off = f.prototype.removeListener = f.prototype.removeAllListeners = f.prototype.removeEventListener = function(i, e) {
  if (this._callbacks = this._callbacks || {}, arguments.length == 0)
    return this._callbacks = {}, this;
  var t = this._callbacks["$" + i];
  if (!t) return this;
  if (arguments.length == 1)
    return delete this._callbacks["$" + i], this;
  for (var s, n = 0; n < t.length; n++)
    if (s = t[n], s === e || s.fn === e) {
      t.splice(n, 1);
      break;
    }
  return t.length === 0 && delete this._callbacks["$" + i], this;
};
f.prototype.emit = function(i) {
  this._callbacks = this._callbacks || {};
  for (var e = new Array(arguments.length - 1), t = this._callbacks["$" + i], s = 1; s < arguments.length; s++)
    e[s - 1] = arguments[s];
  if (t) {
    t = t.slice(0);
    for (var s = 0, n = t.length; s < n; ++s)
      t[s].apply(this, e);
  }
  return this;
};
f.prototype.emitReserved = f.prototype.emit;
f.prototype.listeners = function(i) {
  return this._callbacks = this._callbacks || {}, this._callbacks["$" + i] || [];
};
f.prototype.hasListeners = function(i) {
  return !!this.listeners(i).length;
};
const O = typeof Promise == "function" && typeof Promise.resolve == "function" ? (e) => Promise.resolve().then(e) : (e, t) => t(e, 0), d = typeof self < "u" ? self : typeof window < "u" ? window : Function("return this")(), Ce = "arraybuffer";
function ce(i, ...e) {
  return e.reduce((t, s) => (i.hasOwnProperty(s) && (t[s] = i[s]), t), {});
}
const Te = d.setTimeout, Ae = d.clearTimeout;
function L(i, e) {
  e.useNativeTimers ? (i.setTimeoutFn = Te.bind(d), i.clearTimeoutFn = Ae.bind(d)) : (i.setTimeoutFn = d.setTimeout.bind(d), i.clearTimeoutFn = d.clearTimeout.bind(d));
}
const Se = 1.33;
function xe(i) {
  return typeof i == "string" ? Re(i) : Math.ceil((i.byteLength || i.size) * Se);
}
function Re(i) {
  let e = 0, t = 0;
  for (let s = 0, n = i.length; s < n; s++)
    e = i.charCodeAt(s), e < 128 ? t += 1 : e < 2048 ? t += 2 : e < 55296 || e >= 57344 ? t += 3 : (s++, t += 4);
  return t;
}
function le() {
  return Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5);
}
function Be(i) {
  let e = "";
  for (let t in i)
    i.hasOwnProperty(t) && (e.length && (e += "&"), e += encodeURIComponent(t) + "=" + encodeURIComponent(i[t]));
  return e;
}
function Oe(i) {
  let e = {}, t = i.split("&");
  for (let s = 0, n = t.length; s < n; s++) {
    let r = t[s].split("=");
    e[decodeURIComponent(r[0])] = decodeURIComponent(r[1]);
  }
  return e;
}
class Le extends Error {
  constructor(e, t, s) {
    super(e), this.description = t, this.context = s, this.type = "TransportError";
  }
}
class K extends f {
  /**
   * Transport abstract constructor.
   *
   * @param {Object} opts - options
   * @protected
   */
  constructor(e) {
    super(), this.writable = !1, L(this, e), this.opts = e, this.query = e.query, this.socket = e.socket, this.supportsBinary = !e.forceBase64;
  }
  /**
   * Emits an error.
   *
   * @param {String} reason
   * @param description
   * @param context - the error context
   * @return {Transport} for chaining
   * @protected
   */
  onError(e, t, s) {
    return super.emitReserved("error", new Le(e, t, s)), this;
  }
  /**
   * Opens the transport.
   */
  open() {
    return this.readyState = "opening", this.doOpen(), this;
  }
  /**
   * Closes the transport.
   */
  close() {
    return (this.readyState === "opening" || this.readyState === "open") && (this.doClose(), this.onClose()), this;
  }
  /**
   * Sends multiple packets.
   *
   * @param {Array} packets
   */
  send(e) {
    this.readyState === "open" && this.write(e);
  }
  /**
   * Called upon open
   *
   * @protected
   */
  onOpen() {
    this.readyState = "open", this.writable = !0, super.emitReserved("open");
  }
  /**
   * Called with data.
   *
   * @param {String} data
   * @protected
   */
  onData(e) {
    const t = W(e, this.socket.binaryType);
    this.onPacket(t);
  }
  /**
   * Called with a decoded packet.
   *
   * @protected
   */
  onPacket(e) {
    super.emitReserved("packet", e);
  }
  /**
   * Called upon close.
   *
   * @protected
   */
  onClose(e) {
    this.readyState = "closed", super.emitReserved("close", e);
  }
  /**
   * Pauses the transport, in order not to lose packets during an upgrade.
   *
   * @param onPause
   */
  pause(e) {
  }
  createUri(e, t = {}) {
    return e + "://" + this._hostname() + this._port() + this.opts.path + this._query(t);
  }
  _hostname() {
    const e = this.opts.hostname;
    return e.indexOf(":") === -1 ? e : "[" + e + "]";
  }
  _port() {
    return this.opts.port && (this.opts.secure && +(this.opts.port !== 443) || !this.opts.secure && Number(this.opts.port) !== 80) ? ":" + this.opts.port : "";
  }
  _query(e) {
    const t = Be(e);
    return t.length ? "?" + t : "";
  }
}
class Pe extends K {
  constructor() {
    super(...arguments), this._polling = !1;
  }
  get name() {
    return "polling";
  }
  /**
   * Opens the socket (triggers polling). We write a PING message to determine
   * when the transport is open.
   *
   * @protected
   */
  doOpen() {
    this._poll();
  }
  /**
   * Pauses polling.
   *
   * @param {Function} onPause - callback upon buffers are flushed and transport is paused
   * @package
   */
  pause(e) {
    this.readyState = "pausing";
    const t = () => {
      this.readyState = "paused", e();
    };
    if (this._polling || !this.writable) {
      let s = 0;
      this._polling && (s++, this.once("pollComplete", function() {
        --s || t();
      })), this.writable || (s++, this.once("drain", function() {
        --s || t();
      }));
    } else
      t();
  }
  /**
   * Starts polling cycle.
   *
   * @private
   */
  _poll() {
    this._polling = !0, this.doPoll(), this.emitReserved("poll");
  }
  /**
   * Overloads onData to detect payloads.
   *
   * @protected
   */
  onData(e) {
    const t = (s) => {
      if (this.readyState === "opening" && s.type === "open" && this.onOpen(), s.type === "close")
        return this.onClose({ description: "transport closed by the server" }), !1;
      this.onPacket(s);
    };
    we(e, this.socket.binaryType).forEach(t), this.readyState !== "closed" && (this._polling = !1, this.emitReserved("pollComplete"), this.readyState === "open" && this._poll());
  }
  /**
   * For polling, send a close packet.
   *
   * @protected
   */
  doClose() {
    const e = () => {
      this.write([{ type: "close" }]);
    };
    this.readyState === "open" ? e() : this.once("open", e);
  }
  /**
   * Writes a packets payload.
   *
   * @param {Array} packets - data packets
   * @protected
   */
  write(e) {
    this.writable = !1, be(e, (t) => {
      this.doWrite(t, () => {
        this.writable = !0, this.emitReserved("drain");
      });
    });
  }
  /**
   * Generates uri for connection.
   *
   * @private
   */
  uri() {
    const e = this.opts.secure ? "https" : "http", t = this.query || {};
    return this.opts.timestampRequests !== !1 && (t[this.opts.timestampParam] = le()), !this.supportsBinary && !t.sid && (t.b64 = 1), this.createUri(e, t);
  }
}
let he = !1;
try {
  he = typeof XMLHttpRequest < "u" && "withCredentials" in new XMLHttpRequest();
} catch {
}
const Ne = he;
function Ie() {
}
class qe extends Pe {
  /**
   * XHR Polling constructor.
   *
   * @param {Object} opts
   * @package
   */
  constructor(e) {
    if (super(e), typeof location < "u") {
      const t = location.protocol === "https:";
      let s = location.port;
      s || (s = t ? "443" : "80"), this.xd = typeof location < "u" && e.hostname !== location.hostname || s !== e.port;
    }
  }
  /**
   * Sends data.
   *
   * @param {String} data to send.
   * @param {Function} called upon flush.
   * @private
   */
  doWrite(e, t) {
    const s = this.request({
      method: "POST",
      data: e
    });
    s.on("success", t), s.on("error", (n, r) => {
      this.onError("xhr post error", n, r);
    });
  }
  /**
   * Starts a poll cycle.
   *
   * @private
   */
  doPoll() {
    const e = this.request();
    e.on("data", this.onData.bind(this)), e.on("error", (t, s) => {
      this.onError("xhr poll error", t, s);
    }), this.pollXhr = e;
  }
}
class g extends f {
  /**
   * Request constructor
   *
   * @param {Object} options
   * @package
   */
  constructor(e, t, s) {
    super(), this.createRequest = e, L(this, s), this._opts = s, this._method = s.method || "GET", this._uri = t, this._data = s.data !== void 0 ? s.data : null, this._create();
  }
  /**
   * Creates the XHR object and sends the request.
   *
   * @private
   */
  _create() {
    var e;
    const t = ce(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
    t.xdomain = !!this._opts.xd;
    const s = this._xhr = this.createRequest(t);
    try {
      s.open(this._method, this._uri, !0);
      try {
        if (this._opts.extraHeaders) {
          s.setDisableHeaderCheck && s.setDisableHeaderCheck(!0);
          for (let n in this._opts.extraHeaders)
            this._opts.extraHeaders.hasOwnProperty(n) && s.setRequestHeader(n, this._opts.extraHeaders[n]);
        }
      } catch {
      }
      if (this._method === "POST")
        try {
          s.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
        } catch {
        }
      try {
        s.setRequestHeader("Accept", "*/*");
      } catch {
      }
      (e = this._opts.cookieJar) === null || e === void 0 || e.addCookies(s), "withCredentials" in s && (s.withCredentials = this._opts.withCredentials), this._opts.requestTimeout && (s.timeout = this._opts.requestTimeout), s.onreadystatechange = () => {
        var n;
        s.readyState === 3 && ((n = this._opts.cookieJar) === null || n === void 0 || n.parseCookies(
          // @ts-ignore
          s.getResponseHeader("set-cookie")
        )), s.readyState === 4 && (s.status === 200 || s.status === 1223 ? this._onLoad() : this.setTimeoutFn(() => {
          this._onError(typeof s.status == "number" ? s.status : 0);
        }, 0));
      }, s.send(this._data);
    } catch (n) {
      this.setTimeoutFn(() => {
        this._onError(n);
      }, 0);
      return;
    }
    typeof document < "u" && (this._index = g.requestsCount++, g.requests[this._index] = this);
  }
  /**
   * Called upon error.
   *
   * @private
   */
  _onError(e) {
    this.emitReserved("error", e, this._xhr), this._cleanup(!0);
  }
  /**
   * Cleans up house.
   *
   * @private
   */
  _cleanup(e) {
    if (!(typeof this._xhr > "u" || this._xhr === null)) {
      if (this._xhr.onreadystatechange = Ie, e)
        try {
          this._xhr.abort();
        } catch {
        }
      typeof document < "u" && delete g.requests[this._index], this._xhr = null;
    }
  }
  /**
   * Called upon load.
   *
   * @private
   */
  _onLoad() {
    const e = this._xhr.responseText;
    e !== null && (this.emitReserved("data", e), this.emitReserved("success"), this._cleanup());
  }
  /**
   * Aborts the request.
   *
   * @package
   */
  abort() {
    this._cleanup();
  }
}
g.requestsCount = 0;
g.requests = {};
if (typeof document < "u") {
  if (typeof attachEvent == "function")
    attachEvent("onunload", Z);
  else if (typeof addEventListener == "function") {
    const i = "onpagehide" in d ? "pagehide" : "unload";
    addEventListener(i, Z, !1);
  }
}
function Z() {
  for (let i in g.requests)
    g.requests.hasOwnProperty(i) && g.requests[i].abort();
}
const Ue = function() {
  const i = ue({
    xdomain: !1
  });
  return i && i.responseType !== null;
}();
class De extends qe {
  constructor(e) {
    super(e);
    const t = e && e.forceBase64;
    this.supportsBinary = Ue && !t;
  }
  request(e = {}) {
    return Object.assign(e, { xd: this.xd }, this.opts), new g(ue, this.uri(), e);
  }
}
function ue(i) {
  const e = i.xdomain;
  try {
    if (typeof XMLHttpRequest < "u" && (!e || Ne))
      return new XMLHttpRequest();
  } catch {
  }
  if (!e)
    try {
      return new d[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
    } catch {
    }
}
const _e = typeof navigator < "u" && typeof navigator.product == "string" && navigator.product.toLowerCase() === "reactnative";
class Fe extends K {
  get name() {
    return "websocket";
  }
  doOpen() {
    const e = this.uri(), t = this.opts.protocols, s = _e ? {} : ce(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
    this.opts.extraHeaders && (s.headers = this.opts.extraHeaders);
    try {
      this.ws = this.createSocket(e, t, s);
    } catch (n) {
      return this.emitReserved("error", n);
    }
    this.ws.binaryType = this.socket.binaryType, this.addEventListeners();
  }
  /**
   * Adds event listeners to the socket
   *
   * @private
   */
  addEventListeners() {
    this.ws.onopen = () => {
      this.opts.autoUnref && this.ws._socket.unref(), this.onOpen();
    }, this.ws.onclose = (e) => this.onClose({
      description: "websocket connection closed",
      context: e
    }), this.ws.onmessage = (e) => this.onData(e.data), this.ws.onerror = (e) => this.onError("websocket error", e);
  }
  write(e) {
    this.writable = !1;
    for (let t = 0; t < e.length; t++) {
      const s = e[t], n = t === e.length - 1;
      H(s, this.supportsBinary, (r) => {
        try {
          this.doWrite(s, r);
        } catch {
        }
        n && O(() => {
          this.writable = !0, this.emitReserved("drain");
        }, this.setTimeoutFn);
      });
    }
  }
  doClose() {
    typeof this.ws < "u" && (this.ws.onerror = () => {
    }, this.ws.close(), this.ws = null);
  }
  /**
   * Generates uri for connection.
   *
   * @private
   */
  uri() {
    const e = this.opts.secure ? "wss" : "ws", t = this.query || {};
    return this.opts.timestampRequests && (t[this.opts.timestampParam] = le()), this.supportsBinary || (t.b64 = 1), this.createUri(e, t);
  }
}
const I = d.WebSocket || d.MozWebSocket;
class Me extends Fe {
  createSocket(e, t, s) {
    return _e ? new I(e, t, s) : t ? new I(e, t) : new I(e);
  }
  doWrite(e, t) {
    this.ws.send(t);
  }
}
class $e extends K {
  get name() {
    return "webtransport";
  }
  doOpen() {
    try {
      this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
    } catch (e) {
      return this.emitReserved("error", e);
    }
    this._transport.closed.then(() => {
      this.onClose();
    }).catch((e) => {
      this.onError("webtransport error", e);
    }), this._transport.ready.then(() => {
      this._transport.createBidirectionalStream().then((e) => {
        const t = Ee(Number.MAX_SAFE_INTEGER, this.socket.binaryType), s = e.readable.pipeThrough(t).getReader(), n = ve();
        n.readable.pipeTo(e.writable), this._writer = n.writable.getWriter();
        const r = () => {
          s.read().then(({ done: c, value: h }) => {
            c || (this.onPacket(h), r());
          }).catch((c) => {
          });
        };
        r();
        const o = { type: "open" };
        this.query.sid && (o.data = `{"sid":"${this.query.sid}"}`), this._writer.write(o).then(() => this.onOpen());
      });
    });
  }
  write(e) {
    this.writable = !1;
    for (let t = 0; t < e.length; t++) {
      const s = e[t], n = t === e.length - 1;
      this._writer.write(s).then(() => {
        n && O(() => {
          this.writable = !0, this.emitReserved("drain");
        }, this.setTimeoutFn);
      });
    }
  }
  doClose() {
    var e;
    (e = this._transport) === null || e === void 0 || e.close();
  }
}
const Ve = {
  websocket: Me,
  webtransport: $e,
  polling: De
}, He = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/, We = [
  "source",
  "protocol",
  "authority",
  "userInfo",
  "user",
  "password",
  "host",
  "port",
  "relative",
  "path",
  "directory",
  "file",
  "query",
  "anchor"
];
function D(i) {
  if (i.length > 8e3)
    throw "URI too long";
  const e = i, t = i.indexOf("["), s = i.indexOf("]");
  t != -1 && s != -1 && (i = i.substring(0, t) + i.substring(t, s).replace(/:/g, ";") + i.substring(s, i.length));
  let n = He.exec(i || ""), r = {}, o = 14;
  for (; o--; )
    r[We[o]] = n[o] || "";
  return t != -1 && s != -1 && (r.source = e, r.host = r.host.substring(1, r.host.length - 1).replace(/;/g, ":"), r.authority = r.authority.replace("[", "").replace("]", "").replace(/;/g, ":"), r.ipv6uri = !0), r.pathNames = Ke(r, r.path), r.queryKey = ze(r, r.query), r;
}
function Ke(i, e) {
  const t = /\/{2,9}/g, s = e.replace(t, "/").split("/");
  return (e.slice(0, 1) == "/" || e.length === 0) && s.splice(0, 1), e.slice(-1) == "/" && s.splice(s.length - 1, 1), s;
}
function ze(i, e) {
  const t = {};
  return e.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function(s, n, r) {
    n && (t[n] = r);
  }), t;
}
const F = typeof addEventListener == "function" && typeof removeEventListener == "function", x = [];
F && addEventListener("offline", () => {
  x.forEach((i) => i());
}, !1);
class w extends f {
  /**
   * Socket constructor.
   *
   * @param {String|Object} uri - uri or options
   * @param {Object} opts - options
   */
  constructor(e, t) {
    if (super(), this.binaryType = Ce, this.writeBuffer = [], this._prevBufferLen = 0, this._pingInterval = -1, this._pingTimeout = -1, this._maxPayload = -1, this._pingTimeoutTime = 1 / 0, e && typeof e == "object" && (t = e, e = null), e) {
      const s = D(e);
      t.hostname = s.host, t.secure = s.protocol === "https" || s.protocol === "wss", t.port = s.port, s.query && (t.query = s.query);
    } else t.host && (t.hostname = D(t.host).host);
    L(this, t), this.secure = t.secure != null ? t.secure : typeof location < "u" && location.protocol === "https:", t.hostname && !t.port && (t.port = this.secure ? "443" : "80"), this.hostname = t.hostname || (typeof location < "u" ? location.hostname : "localhost"), this.port = t.port || (typeof location < "u" && location.port ? location.port : this.secure ? "443" : "80"), this.transports = [], this._transportsByName = {}, t.transports.forEach((s) => {
      const n = s.prototype.name;
      this.transports.push(n), this._transportsByName[n] = s;
    }), this.opts = Object.assign({
      path: "/engine.io",
      agent: !1,
      withCredentials: !1,
      upgrade: !0,
      timestampParam: "t",
      rememberUpgrade: !1,
      addTrailingSlash: !0,
      rejectUnauthorized: !0,
      perMessageDeflate: {
        threshold: 1024
      },
      transportOptions: {},
      closeOnBeforeunload: !1
    }, t), this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : ""), typeof this.opts.query == "string" && (this.opts.query = Oe(this.opts.query)), F && (this.opts.closeOnBeforeunload && (this._beforeunloadEventListener = () => {
      this.transport && (this.transport.removeAllListeners(), this.transport.close());
    }, addEventListener("beforeunload", this._beforeunloadEventListener, !1)), this.hostname !== "localhost" && (this._offlineEventListener = () => {
      this._onClose("transport close", {
        description: "network connection lost"
      });
    }, x.push(this._offlineEventListener))), this.opts.withCredentials && (this._cookieJar = void 0), this._open();
  }
  /**
   * Creates transport of the given type.
   *
   * @param {String} name - transport name
   * @return {Transport}
   * @private
   */
  createTransport(e) {
    const t = Object.assign({}, this.opts.query);
    t.EIO = ae, t.transport = e, this.id && (t.sid = this.id);
    const s = Object.assign({}, this.opts, {
      query: t,
      socket: this,
      hostname: this.hostname,
      secure: this.secure,
      port: this.port
    }, this.opts.transportOptions[e]);
    return new this._transportsByName[e](s);
  }
  /**
   * Initializes transport to use and starts probe.
   *
   * @private
   */
  _open() {
    if (this.transports.length === 0) {
      this.setTimeoutFn(() => {
        this.emitReserved("error", "No transports available");
      }, 0);
      return;
    }
    const e = this.opts.rememberUpgrade && w.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1 ? "websocket" : this.transports[0];
    this.readyState = "opening";
    const t = this.createTransport(e);
    t.open(), this.setTransport(t);
  }
  /**
   * Sets the current transport. Disables the existing one (if any).
   *
   * @private
   */
  setTransport(e) {
    this.transport && this.transport.removeAllListeners(), this.transport = e, e.on("drain", this._onDrain.bind(this)).on("packet", this._onPacket.bind(this)).on("error", this._onError.bind(this)).on("close", (t) => this._onClose("transport close", t));
  }
  /**
   * Called when connection is deemed open.
   *
   * @private
   */
  onOpen() {
    this.readyState = "open", w.priorWebsocketSuccess = this.transport.name === "websocket", this.emitReserved("open"), this.flush();
  }
  /**
   * Handles a packet.
   *
   * @private
   */
  _onPacket(e) {
    if (this.readyState === "opening" || this.readyState === "open" || this.readyState === "closing")
      switch (this.emitReserved("packet", e), this.emitReserved("heartbeat"), e.type) {
        case "open":
          this.onHandshake(JSON.parse(e.data));
          break;
        case "ping":
          this._sendPacket("pong"), this.emitReserved("ping"), this.emitReserved("pong"), this._resetPingTimeout();
          break;
        case "error":
          const t = new Error("server error");
          t.code = e.data, this._onError(t);
          break;
        case "message":
          this.emitReserved("data", e.data), this.emitReserved("message", e.data);
          break;
      }
  }
  /**
   * Called upon handshake completion.
   *
   * @param {Object} data - handshake obj
   * @private
   */
  onHandshake(e) {
    this.emitReserved("handshake", e), this.id = e.sid, this.transport.query.sid = e.sid, this._pingInterval = e.pingInterval, this._pingTimeout = e.pingTimeout, this._maxPayload = e.maxPayload, this.onOpen(), this.readyState !== "closed" && this._resetPingTimeout();
  }
  /**
   * Sets and resets ping timeout timer based on server pings.
   *
   * @private
   */
  _resetPingTimeout() {
    this.clearTimeoutFn(this._pingTimeoutTimer);
    const e = this._pingInterval + this._pingTimeout;
    this._pingTimeoutTime = Date.now() + e, this._pingTimeoutTimer = this.setTimeoutFn(() => {
      this._onClose("ping timeout");
    }, e), this.opts.autoUnref && this._pingTimeoutTimer.unref();
  }
  /**
   * Called on `drain` event
   *
   * @private
   */
  _onDrain() {
    this.writeBuffer.splice(0, this._prevBufferLen), this._prevBufferLen = 0, this.writeBuffer.length === 0 ? this.emitReserved("drain") : this.flush();
  }
  /**
   * Flush write buffers.
   *
   * @private
   */
  flush() {
    if (this.readyState !== "closed" && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
      const e = this._getWritablePackets();
      this.transport.send(e), this._prevBufferLen = e.length, this.emitReserved("flush");
    }
  }
  /**
   * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
   * long-polling)
   *
   * @private
   */
  _getWritablePackets() {
    if (!(this._maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1))
      return this.writeBuffer;
    let t = 1;
    for (let s = 0; s < this.writeBuffer.length; s++) {
      const n = this.writeBuffer[s].data;
      if (n && (t += xe(n)), s > 0 && t > this._maxPayload)
        return this.writeBuffer.slice(0, s);
      t += 2;
    }
    return this.writeBuffer;
  }
  /**
   * Checks whether the heartbeat timer has expired but the socket has not yet been notified.
   *
   * Note: this method is private for now because it does not really fit the WebSocket API, but if we put it in the
   * `write()` method then the message would not be buffered by the Socket.IO client.
   *
   * @return {boolean}
   * @private
   */
  /* private */
  _hasPingExpired() {
    if (!this._pingTimeoutTime)
      return !0;
    const e = Date.now() > this._pingTimeoutTime;
    return e && (this._pingTimeoutTime = 0, O(() => {
      this._onClose("ping timeout");
    }, this.setTimeoutFn)), e;
  }
  /**
   * Sends a message.
   *
   * @param {String} msg - message.
   * @param {Object} options.
   * @param {Function} fn - callback function.
   * @return {Socket} for chaining.
   */
  write(e, t, s) {
    return this._sendPacket("message", e, t, s), this;
  }
  /**
   * Sends a message. Alias of {@link Socket#write}.
   *
   * @param {String} msg - message.
   * @param {Object} options.
   * @param {Function} fn - callback function.
   * @return {Socket} for chaining.
   */
  send(e, t, s) {
    return this._sendPacket("message", e, t, s), this;
  }
  /**
   * Sends a packet.
   *
   * @param {String} type: packet type.
   * @param {String} data.
   * @param {Object} options.
   * @param {Function} fn - callback function.
   * @private
   */
  _sendPacket(e, t, s, n) {
    if (typeof t == "function" && (n = t, t = void 0), typeof s == "function" && (n = s, s = null), this.readyState === "closing" || this.readyState === "closed")
      return;
    s = s || {}, s.compress = s.compress !== !1;
    const r = {
      type: e,
      data: t,
      options: s
    };
    this.emitReserved("packetCreate", r), this.writeBuffer.push(r), n && this.once("flush", n), this.flush();
  }
  /**
   * Closes the connection.
   */
  close() {
    const e = () => {
      this._onClose("forced close"), this.transport.close();
    }, t = () => {
      this.off("upgrade", t), this.off("upgradeError", t), e();
    }, s = () => {
      this.once("upgrade", t), this.once("upgradeError", t);
    };
    return (this.readyState === "opening" || this.readyState === "open") && (this.readyState = "closing", this.writeBuffer.length ? this.once("drain", () => {
      this.upgrading ? s() : e();
    }) : this.upgrading ? s() : e()), this;
  }
  /**
   * Called upon transport error
   *
   * @private
   */
  _onError(e) {
    if (w.priorWebsocketSuccess = !1, this.opts.tryAllTransports && this.transports.length > 1 && this.readyState === "opening")
      return this.transports.shift(), this._open();
    this.emitReserved("error", e), this._onClose("transport error", e);
  }
  /**
   * Called upon transport close.
   *
   * @private
   */
  _onClose(e, t) {
    if (this.readyState === "opening" || this.readyState === "open" || this.readyState === "closing") {
      if (this.clearTimeoutFn(this._pingTimeoutTimer), this.transport.removeAllListeners("close"), this.transport.close(), this.transport.removeAllListeners(), F && (this._beforeunloadEventListener && removeEventListener("beforeunload", this._beforeunloadEventListener, !1), this._offlineEventListener)) {
        const s = x.indexOf(this._offlineEventListener);
        s !== -1 && x.splice(s, 1);
      }
      this.readyState = "closed", this.id = null, this.emitReserved("close", e, t), this.writeBuffer = [], this._prevBufferLen = 0;
    }
  }
}
w.protocol = ae;
class Ye extends w {
  constructor() {
    super(...arguments), this._upgrades = [];
  }
  onOpen() {
    if (super.onOpen(), this.readyState === "open" && this.opts.upgrade)
      for (let e = 0; e < this._upgrades.length; e++)
        this._probe(this._upgrades[e]);
  }
  /**
   * Probes a transport.
   *
   * @param {String} name - transport name
   * @private
   */
  _probe(e) {
    let t = this.createTransport(e), s = !1;
    w.priorWebsocketSuccess = !1;
    const n = () => {
      s || (t.send([{ type: "ping", data: "probe" }]), t.once("packet", (p) => {
        if (!s)
          if (p.type === "pong" && p.data === "probe") {
            if (this.upgrading = !0, this.emitReserved("upgrading", t), !t)
              return;
            w.priorWebsocketSuccess = t.name === "websocket", this.transport.pause(() => {
              s || this.readyState !== "closed" && (_(), this.setTransport(t), t.send([{ type: "upgrade" }]), this.emitReserved("upgrade", t), t = null, this.upgrading = !1, this.flush());
            });
          } else {
            const b = new Error("probe error");
            b.transport = t.name, this.emitReserved("upgradeError", b);
          }
      }));
    };
    function r() {
      s || (s = !0, _(), t.close(), t = null);
    }
    const o = (p) => {
      const b = new Error("probe error: " + p);
      b.transport = t.name, r(), this.emitReserved("upgradeError", b);
    };
    function c() {
      o("transport closed");
    }
    function h() {
      o("socket closed");
    }
    function u(p) {
      t && p.name !== t.name && r();
    }
    const _ = () => {
      t.removeListener("open", n), t.removeListener("error", o), t.removeListener("close", c), this.off("close", h), this.off("upgrading", u);
    };
    t.once("open", n), t.once("error", o), t.once("close", c), this.once("close", h), this.once("upgrading", u), this._upgrades.indexOf("webtransport") !== -1 && e !== "webtransport" ? this.setTimeoutFn(() => {
      s || t.open();
    }, 200) : t.open();
  }
  onHandshake(e) {
    this._upgrades = this._filterUpgrades(e.upgrades), super.onHandshake(e);
  }
  /**
   * Filters upgrades, returning only those matching client transports.
   *
   * @param {Array} upgrades - server upgrades
   * @private
   */
  _filterUpgrades(e) {
    const t = [];
    for (let s = 0; s < e.length; s++)
      ~this.transports.indexOf(e[s]) && t.push(e[s]);
    return t;
  }
}
let Je = class extends Ye {
  constructor(e, t = {}) {
    const s = typeof e == "object" ? e : t;
    (!s.transports || s.transports && typeof s.transports[0] == "string") && (s.transports = (s.transports || ["polling", "websocket", "webtransport"]).map((n) => Ve[n]).filter((n) => !!n)), super(e, s);
  }
};
function Qe(i, e = "", t) {
  let s = i;
  t = t || typeof location < "u" && location, i == null && (i = t.protocol + "//" + t.host), typeof i == "string" && (i.charAt(0) === "/" && (i.charAt(1) === "/" ? i = t.protocol + i : i = t.host + i), /^(https?|wss?):\/\//.test(i) || (typeof t < "u" ? i = t.protocol + "//" + i : i = "https://" + i), s = D(i)), s.port || (/^(http|ws)$/.test(s.protocol) ? s.port = "80" : /^(http|ws)s$/.test(s.protocol) && (s.port = "443")), s.path = s.path || "/";
  const r = s.host.indexOf(":") !== -1 ? "[" + s.host + "]" : s.host;
  return s.id = s.protocol + "://" + r + ":" + s.port + e, s.href = s.protocol + "://" + r + (t && t.port === s.port ? "" : ":" + s.port), s;
}
const Xe = typeof ArrayBuffer == "function", je = (i) => typeof ArrayBuffer.isView == "function" ? ArrayBuffer.isView(i) : i.buffer instanceof ArrayBuffer, fe = Object.prototype.toString, Ge = typeof Blob == "function" || typeof Blob < "u" && fe.call(Blob) === "[object BlobConstructor]", Ze = typeof File == "function" || typeof File < "u" && fe.call(File) === "[object FileConstructor]";
function z(i) {
  return Xe && (i instanceof ArrayBuffer || je(i)) || Ge && i instanceof Blob || Ze && i instanceof File;
}
function R(i, e) {
  if (!i || typeof i != "object")
    return !1;
  if (Array.isArray(i)) {
    for (let t = 0, s = i.length; t < s; t++)
      if (R(i[t]))
        return !0;
    return !1;
  }
  if (z(i))
    return !0;
  if (i.toJSON && typeof i.toJSON == "function" && arguments.length === 1)
    return R(i.toJSON(), !0);
  for (const t in i)
    if (Object.prototype.hasOwnProperty.call(i, t) && R(i[t]))
      return !0;
  return !1;
}
function et(i) {
  const e = [], t = i.data, s = i;
  return s.data = M(t, e), s.attachments = e.length, { packet: s, buffers: e };
}
function M(i, e) {
  if (!i)
    return i;
  if (z(i)) {
    const t = { _placeholder: !0, num: e.length };
    return e.push(i), t;
  } else if (Array.isArray(i)) {
    const t = new Array(i.length);
    for (let s = 0; s < i.length; s++)
      t[s] = M(i[s], e);
    return t;
  } else if (typeof i == "object" && !(i instanceof Date)) {
    const t = {};
    for (const s in i)
      Object.prototype.hasOwnProperty.call(i, s) && (t[s] = M(i[s], e));
    return t;
  }
  return i;
}
function tt(i, e) {
  return i.data = $(i.data, e), delete i.attachments, i;
}
function $(i, e) {
  if (!i)
    return i;
  if (i && i._placeholder === !0) {
    if (typeof i.num == "number" && i.num >= 0 && i.num < e.length)
      return e[i.num];
    throw new Error("illegal attachments");
  } else if (Array.isArray(i))
    for (let t = 0; t < i.length; t++)
      i[t] = $(i[t], e);
  else if (typeof i == "object")
    for (const t in i)
      Object.prototype.hasOwnProperty.call(i, t) && (i[t] = $(i[t], e));
  return i;
}
const st = [
  "connect",
  "connect_error",
  "disconnect",
  "disconnecting",
  "newListener",
  "removeListener"
  // used by the Node.js EventEmitter
], it = 5;
var l;
(function(i) {
  i[i.CONNECT = 0] = "CONNECT", i[i.DISCONNECT = 1] = "DISCONNECT", i[i.EVENT = 2] = "EVENT", i[i.ACK = 3] = "ACK", i[i.CONNECT_ERROR = 4] = "CONNECT_ERROR", i[i.BINARY_EVENT = 5] = "BINARY_EVENT", i[i.BINARY_ACK = 6] = "BINARY_ACK";
})(l || (l = {}));
class nt {
  /**
   * Encoder constructor
   *
   * @param {function} replacer - custom replacer to pass down to JSON.parse
   */
  constructor(e) {
    this.replacer = e;
  }
  /**
   * Encode a packet as a single string if non-binary, or as a
   * buffer sequence, depending on packet type.
   *
   * @param {Object} obj - packet object
   */
  encode(e) {
    return (e.type === l.EVENT || e.type === l.ACK) && R(e) ? this.encodeAsBinary({
      type: e.type === l.EVENT ? l.BINARY_EVENT : l.BINARY_ACK,
      nsp: e.nsp,
      data: e.data,
      id: e.id
    }) : [this.encodeAsString(e)];
  }
  /**
   * Encode packet as string.
   */
  encodeAsString(e) {
    let t = "" + e.type;
    return (e.type === l.BINARY_EVENT || e.type === l.BINARY_ACK) && (t += e.attachments + "-"), e.nsp && e.nsp !== "/" && (t += e.nsp + ","), e.id != null && (t += e.id), e.data != null && (t += JSON.stringify(e.data, this.replacer)), t;
  }
  /**
   * Encode packet as 'buffer sequence' by removing blobs, and
   * deconstructing packet into object with placeholders and
   * a list of buffers.
   */
  encodeAsBinary(e) {
    const t = et(e), s = this.encodeAsString(t.packet), n = t.buffers;
    return n.unshift(s), n;
  }
}
function ee(i) {
  return Object.prototype.toString.call(i) === "[object Object]";
}
class Y extends f {
  /**
   * Decoder constructor
   *
   * @param {function} reviver - custom reviver to pass down to JSON.stringify
   */
  constructor(e) {
    super(), this.reviver = e;
  }
  /**
   * Decodes an encoded packet string into packet JSON.
   *
   * @param {String} obj - encoded packet
   */
  add(e) {
    let t;
    if (typeof e == "string") {
      if (this.reconstructor)
        throw new Error("got plaintext data when reconstructing a packet");
      t = this.decodeString(e);
      const s = t.type === l.BINARY_EVENT;
      s || t.type === l.BINARY_ACK ? (t.type = s ? l.EVENT : l.ACK, this.reconstructor = new rt(t), t.attachments === 0 && super.emitReserved("decoded", t)) : super.emitReserved("decoded", t);
    } else if (z(e) || e.base64)
      if (this.reconstructor)
        t = this.reconstructor.takeBinaryData(e), t && (this.reconstructor = null, super.emitReserved("decoded", t));
      else
        throw new Error("got binary data when not reconstructing a packet");
    else
      throw new Error("Unknown type: " + e);
  }
  /**
   * Decode a packet String (JSON data)
   *
   * @param {String} str
   * @return {Object} packet
   */
  decodeString(e) {
    let t = 0;
    const s = {
      type: Number(e.charAt(0))
    };
    if (l[s.type] === void 0)
      throw new Error("unknown packet type " + s.type);
    if (s.type === l.BINARY_EVENT || s.type === l.BINARY_ACK) {
      const r = t + 1;
      for (; e.charAt(++t) !== "-" && t != e.length; )
        ;
      const o = e.substring(r, t);
      if (o != Number(o) || e.charAt(t) !== "-")
        throw new Error("Illegal attachments");
      s.attachments = Number(o);
    }
    if (e.charAt(t + 1) === "/") {
      const r = t + 1;
      for (; ++t && !(e.charAt(t) === "," || t === e.length); )
        ;
      s.nsp = e.substring(r, t);
    } else
      s.nsp = "/";
    const n = e.charAt(t + 1);
    if (n !== "" && Number(n) == n) {
      const r = t + 1;
      for (; ++t; ) {
        const o = e.charAt(t);
        if (o == null || Number(o) != o) {
          --t;
          break;
        }
        if (t === e.length)
          break;
      }
      s.id = Number(e.substring(r, t + 1));
    }
    if (e.charAt(++t)) {
      const r = this.tryParse(e.substr(t));
      if (Y.isPayloadValid(s.type, r))
        s.data = r;
      else
        throw new Error("invalid payload");
    }
    return s;
  }
  tryParse(e) {
    try {
      return JSON.parse(e, this.reviver);
    } catch {
      return !1;
    }
  }
  static isPayloadValid(e, t) {
    switch (e) {
      case l.CONNECT:
        return ee(t);
      case l.DISCONNECT:
        return t === void 0;
      case l.CONNECT_ERROR:
        return typeof t == "string" || ee(t);
      case l.EVENT:
      case l.BINARY_EVENT:
        return Array.isArray(t) && (typeof t[0] == "number" || typeof t[0] == "string" && st.indexOf(t[0]) === -1);
      case l.ACK:
      case l.BINARY_ACK:
        return Array.isArray(t);
    }
  }
  /**
   * Deallocates a parser's resources
   */
  destroy() {
    this.reconstructor && (this.reconstructor.finishedReconstruction(), this.reconstructor = null);
  }
}
class rt {
  constructor(e) {
    this.packet = e, this.buffers = [], this.reconPack = e;
  }
  /**
   * Method to be called when binary data received from connection
   * after a BINARY_EVENT packet.
   *
   * @param {Buffer | ArrayBuffer} binData - the raw binary data received
   * @return {null | Object} returns null if more binary data is expected or
   *   a reconstructed packet object if all buffers have been received.
   */
  takeBinaryData(e) {
    if (this.buffers.push(e), this.buffers.length === this.reconPack.attachments) {
      const t = tt(this.reconPack, this.buffers);
      return this.finishedReconstruction(), t;
    }
    return null;
  }
  /**
   * Cleans up binary packet reconstruction variables.
   */
  finishedReconstruction() {
    this.reconPack = null, this.buffers = [];
  }
}
const ot = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Decoder: Y,
  Encoder: nt,
  get PacketType() {
    return l;
  },
  protocol: it
}, Symbol.toStringTag, { value: "Module" }));
function y(i, e, t) {
  return i.on(e, t), function() {
    i.off(e, t);
  };
}
const at = Object.freeze({
  connect: 1,
  connect_error: 1,
  disconnect: 1,
  disconnecting: 1,
  // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
  newListener: 1,
  removeListener: 1
});
let pe = class extends f {
  /**
   * `Socket` constructor.
   */
  constructor(e, t, s) {
    super(), this.connected = !1, this.recovered = !1, this.receiveBuffer = [], this.sendBuffer = [], this._queue = [], this._queueSeq = 0, this.ids = 0, this.acks = {}, this.flags = {}, this.io = e, this.nsp = t, s && s.auth && (this.auth = s.auth), this._opts = Object.assign({}, s), this.io._autoConnect && this.open();
  }
  /**
   * Whether the socket is currently disconnected
   *
   * @example
   * const socket = io();
   *
   * socket.on("connect", () => {
   *   console.log(socket.disconnected); // false
   * });
   *
   * socket.on("disconnect", () => {
   *   console.log(socket.disconnected); // true
   * });
   */
  get disconnected() {
    return !this.connected;
  }
  /**
   * Subscribe to open, close and packet events
   *
   * @private
   */
  subEvents() {
    if (this.subs)
      return;
    const e = this.io;
    this.subs = [
      y(e, "open", this.onopen.bind(this)),
      y(e, "packet", this.onpacket.bind(this)),
      y(e, "error", this.onerror.bind(this)),
      y(e, "close", this.onclose.bind(this))
    ];
  }
  /**
   * Whether the Socket will try to reconnect when its Manager connects or reconnects.
   *
   * @example
   * const socket = io();
   *
   * console.log(socket.active); // true
   *
   * socket.on("disconnect", (reason) => {
   *   if (reason === "io server disconnect") {
   *     // the disconnection was initiated by the server, you need to manually reconnect
   *     console.log(socket.active); // false
   *   }
   *   // else the socket will automatically try to reconnect
   *   console.log(socket.active); // true
   * });
   */
  get active() {
    return !!this.subs;
  }
  /**
   * "Opens" the socket.
   *
   * @example
   * const socket = io({
   *   autoConnect: false
   * });
   *
   * socket.connect();
   */
  connect() {
    return this.connected ? this : (this.subEvents(), this.io._reconnecting || this.io.open(), this.io._readyState === "open" && this.onopen(), this);
  }
  /**
   * Alias for {@link connect()}.
   */
  open() {
    return this.connect();
  }
  /**
   * Sends a `message` event.
   *
   * This method mimics the WebSocket.send() method.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
   *
   * @example
   * socket.send("hello");
   *
   * // this is equivalent to
   * socket.emit("message", "hello");
   *
   * @return self
   */
  send(...e) {
    return e.unshift("message"), this.emit.apply(this, e), this;
  }
  /**
   * Override `emit`.
   * If the event is in `events`, it's emitted normally.
   *
   * @example
   * socket.emit("hello", "world");
   *
   * // all serializable datastructures are supported (no need to call JSON.stringify)
   * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
   *
   * // with an acknowledgement from the server
   * socket.emit("hello", "world", (val) => {
   *   // ...
   * });
   *
   * @return self
   */
  emit(e, ...t) {
    var s, n, r;
    if (at.hasOwnProperty(e))
      throw new Error('"' + e.toString() + '" is a reserved event name');
    if (t.unshift(e), this._opts.retries && !this.flags.fromQueue && !this.flags.volatile)
      return this._addToQueue(t), this;
    const o = {
      type: l.EVENT,
      data: t
    };
    if (o.options = {}, o.options.compress = this.flags.compress !== !1, typeof t[t.length - 1] == "function") {
      const _ = this.ids++, p = t.pop();
      this._registerAckCallback(_, p), o.id = _;
    }
    const c = (n = (s = this.io.engine) === null || s === void 0 ? void 0 : s.transport) === null || n === void 0 ? void 0 : n.writable, h = this.connected && !(!((r = this.io.engine) === null || r === void 0) && r._hasPingExpired());
    return this.flags.volatile && !c || (h ? (this.notifyOutgoingListeners(o), this.packet(o)) : this.sendBuffer.push(o)), this.flags = {}, this;
  }
  /**
   * @private
   */
  _registerAckCallback(e, t) {
    var s;
    const n = (s = this.flags.timeout) !== null && s !== void 0 ? s : this._opts.ackTimeout;
    if (n === void 0) {
      this.acks[e] = t;
      return;
    }
    const r = this.io.setTimeoutFn(() => {
      delete this.acks[e];
      for (let c = 0; c < this.sendBuffer.length; c++)
        this.sendBuffer[c].id === e && this.sendBuffer.splice(c, 1);
      t.call(this, new Error("operation has timed out"));
    }, n), o = (...c) => {
      this.io.clearTimeoutFn(r), t.apply(this, c);
    };
    o.withError = !0, this.acks[e] = o;
  }
  /**
   * Emits an event and waits for an acknowledgement
   *
   * @example
   * // without timeout
   * const response = await socket.emitWithAck("hello", "world");
   *
   * // with a specific timeout
   * try {
   *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
   * } catch (err) {
   *   // the server did not acknowledge the event in the given delay
   * }
   *
   * @return a Promise that will be fulfilled when the server acknowledges the event
   */
  emitWithAck(e, ...t) {
    return new Promise((s, n) => {
      const r = (o, c) => o ? n(o) : s(c);
      r.withError = !0, t.push(r), this.emit(e, ...t);
    });
  }
  /**
   * Add the packet to the queue.
   * @param args
   * @private
   */
  _addToQueue(e) {
    let t;
    typeof e[e.length - 1] == "function" && (t = e.pop());
    const s = {
      id: this._queueSeq++,
      tryCount: 0,
      pending: !1,
      args: e,
      flags: Object.assign({ fromQueue: !0 }, this.flags)
    };
    e.push((n, ...r) => s !== this._queue[0] ? void 0 : (n !== null ? s.tryCount > this._opts.retries && (this._queue.shift(), t && t(n)) : (this._queue.shift(), t && t(null, ...r)), s.pending = !1, this._drainQueue())), this._queue.push(s), this._drainQueue();
  }
  /**
   * Send the first packet of the queue, and wait for an acknowledgement from the server.
   * @param force - whether to resend a packet that has not been acknowledged yet
   *
   * @private
   */
  _drainQueue(e = !1) {
    if (!this.connected || this._queue.length === 0)
      return;
    const t = this._queue[0];
    t.pending && !e || (t.pending = !0, t.tryCount++, this.flags = t.flags, this.emit.apply(this, t.args));
  }
  /**
   * Sends a packet.
   *
   * @param packet
   * @private
   */
  packet(e) {
    e.nsp = this.nsp, this.io._packet(e);
  }
  /**
   * Called upon engine `open`.
   *
   * @private
   */
  onopen() {
    typeof this.auth == "function" ? this.auth((e) => {
      this._sendConnectPacket(e);
    }) : this._sendConnectPacket(this.auth);
  }
  /**
   * Sends a CONNECT packet to initiate the Socket.IO session.
   *
   * @param data
   * @private
   */
  _sendConnectPacket(e) {
    this.packet({
      type: l.CONNECT,
      data: this._pid ? Object.assign({ pid: this._pid, offset: this._lastOffset }, e) : e
    });
  }
  /**
   * Called upon engine or manager `error`.
   *
   * @param err
   * @private
   */
  onerror(e) {
    this.connected || this.emitReserved("connect_error", e);
  }
  /**
   * Called upon engine `close`.
   *
   * @param reason
   * @param description
   * @private
   */
  onclose(e, t) {
    this.connected = !1, delete this.id, this.emitReserved("disconnect", e, t), this._clearAcks();
  }
  /**
   * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
   * the server.
   *
   * @private
   */
  _clearAcks() {
    Object.keys(this.acks).forEach((e) => {
      if (!this.sendBuffer.some((s) => String(s.id) === e)) {
        const s = this.acks[e];
        delete this.acks[e], s.withError && s.call(this, new Error("socket has been disconnected"));
      }
    });
  }
  /**
   * Called with socket packet.
   *
   * @param packet
   * @private
   */
  onpacket(e) {
    if (e.nsp === this.nsp)
      switch (e.type) {
        case l.CONNECT:
          e.data && e.data.sid ? this.onconnect(e.data.sid, e.data.pid) : this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
          break;
        case l.EVENT:
        case l.BINARY_EVENT:
          this.onevent(e);
          break;
        case l.ACK:
        case l.BINARY_ACK:
          this.onack(e);
          break;
        case l.DISCONNECT:
          this.ondisconnect();
          break;
        case l.CONNECT_ERROR:
          this.destroy();
          const s = new Error(e.data.message);
          s.data = e.data.data, this.emitReserved("connect_error", s);
          break;
      }
  }
  /**
   * Called upon a server event.
   *
   * @param packet
   * @private
   */
  onevent(e) {
    const t = e.data || [];
    e.id != null && t.push(this.ack(e.id)), this.connected ? this.emitEvent(t) : this.receiveBuffer.push(Object.freeze(t));
  }
  emitEvent(e) {
    if (this._anyListeners && this._anyListeners.length) {
      const t = this._anyListeners.slice();
      for (const s of t)
        s.apply(this, e);
    }
    super.emit.apply(this, e), this._pid && e.length && typeof e[e.length - 1] == "string" && (this._lastOffset = e[e.length - 1]);
  }
  /**
   * Produces an ack callback to emit with an event.
   *
   * @private
   */
  ack(e) {
    const t = this;
    let s = !1;
    return function(...n) {
      s || (s = !0, t.packet({
        type: l.ACK,
        id: e,
        data: n
      }));
    };
  }
  /**
   * Called upon a server acknowledgement.
   *
   * @param packet
   * @private
   */
  onack(e) {
    const t = this.acks[e.id];
    typeof t == "function" && (delete this.acks[e.id], t.withError && e.data.unshift(null), t.apply(this, e.data));
  }
  /**
   * Called upon server connect.
   *
   * @private
   */
  onconnect(e, t) {
    this.id = e, this.recovered = t && this._pid === t, this._pid = t, this.connected = !0, this.emitBuffered(), this.emitReserved("connect"), this._drainQueue(!0);
  }
  /**
   * Emit buffered events (received and emitted).
   *
   * @private
   */
  emitBuffered() {
    this.receiveBuffer.forEach((e) => this.emitEvent(e)), this.receiveBuffer = [], this.sendBuffer.forEach((e) => {
      this.notifyOutgoingListeners(e), this.packet(e);
    }), this.sendBuffer = [];
  }
  /**
   * Called upon server disconnect.
   *
   * @private
   */
  ondisconnect() {
    this.destroy(), this.onclose("io server disconnect");
  }
  /**
   * Called upon forced client/server side disconnections,
   * this method ensures the manager stops tracking us and
   * that reconnections don't get triggered for this.
   *
   * @private
   */
  destroy() {
    this.subs && (this.subs.forEach((e) => e()), this.subs = void 0), this.io._destroy(this);
  }
  /**
   * Disconnects the socket manually. In that case, the socket will not try to reconnect.
   *
   * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
   *
   * @example
   * const socket = io();
   *
   * socket.on("disconnect", (reason) => {
   *   // console.log(reason); prints "io client disconnect"
   * });
   *
   * socket.disconnect();
   *
   * @return self
   */
  disconnect() {
    return this.connected && this.packet({ type: l.DISCONNECT }), this.destroy(), this.connected && this.onclose("io client disconnect"), this;
  }
  /**
   * Alias for {@link disconnect()}.
   *
   * @return self
   */
  close() {
    return this.disconnect();
  }
  /**
   * Sets the compress flag.
   *
   * @example
   * socket.compress(false).emit("hello");
   *
   * @param compress - if `true`, compresses the sending data
   * @return self
   */
  compress(e) {
    return this.flags.compress = e, this;
  }
  /**
   * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
   * ready to send messages.
   *
   * @example
   * socket.volatile.emit("hello"); // the server may or may not receive it
   *
   * @returns self
   */
  get volatile() {
    return this.flags.volatile = !0, this;
  }
  /**
   * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
   * given number of milliseconds have elapsed without an acknowledgement from the server:
   *
   * @example
   * socket.timeout(5000).emit("my-event", (err) => {
   *   if (err) {
   *     // the server did not acknowledge the event in the given delay
   *   }
   * });
   *
   * @returns self
   */
  timeout(e) {
    return this.flags.timeout = e, this;
  }
  /**
   * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
   * callback.
   *
   * @example
   * socket.onAny((event, ...args) => {
   *   console.log(`got ${event}`);
   * });
   *
   * @param listener
   */
  onAny(e) {
    return this._anyListeners = this._anyListeners || [], this._anyListeners.push(e), this;
  }
  /**
   * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
   * callback. The listener is added to the beginning of the listeners array.
   *
   * @example
   * socket.prependAny((event, ...args) => {
   *   console.log(`got event ${event}`);
   * });
   *
   * @param listener
   */
  prependAny(e) {
    return this._anyListeners = this._anyListeners || [], this._anyListeners.unshift(e), this;
  }
  /**
   * Removes the listener that will be fired when any event is emitted.
   *
   * @example
   * const catchAllListener = (event, ...args) => {
   *   console.log(`got event ${event}`);
   * }
   *
   * socket.onAny(catchAllListener);
   *
   * // remove a specific listener
   * socket.offAny(catchAllListener);
   *
   * // or remove all listeners
   * socket.offAny();
   *
   * @param listener
   */
  offAny(e) {
    if (!this._anyListeners)
      return this;
    if (e) {
      const t = this._anyListeners;
      for (let s = 0; s < t.length; s++)
        if (e === t[s])
          return t.splice(s, 1), this;
    } else
      this._anyListeners = [];
    return this;
  }
  /**
   * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
   * e.g. to remove listeners.
   */
  listenersAny() {
    return this._anyListeners || [];
  }
  /**
   * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
   * callback.
   *
   * Note: acknowledgements sent to the server are not included.
   *
   * @example
   * socket.onAnyOutgoing((event, ...args) => {
   *   console.log(`sent event ${event}`);
   * });
   *
   * @param listener
   */
  onAnyOutgoing(e) {
    return this._anyOutgoingListeners = this._anyOutgoingListeners || [], this._anyOutgoingListeners.push(e), this;
  }
  /**
   * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
   * callback. The listener is added to the beginning of the listeners array.
   *
   * Note: acknowledgements sent to the server are not included.
   *
   * @example
   * socket.prependAnyOutgoing((event, ...args) => {
   *   console.log(`sent event ${event}`);
   * });
   *
   * @param listener
   */
  prependAnyOutgoing(e) {
    return this._anyOutgoingListeners = this._anyOutgoingListeners || [], this._anyOutgoingListeners.unshift(e), this;
  }
  /**
   * Removes the listener that will be fired when any event is emitted.
   *
   * @example
   * const catchAllListener = (event, ...args) => {
   *   console.log(`sent event ${event}`);
   * }
   *
   * socket.onAnyOutgoing(catchAllListener);
   *
   * // remove a specific listener
   * socket.offAnyOutgoing(catchAllListener);
   *
   * // or remove all listeners
   * socket.offAnyOutgoing();
   *
   * @param [listener] - the catch-all listener (optional)
   */
  offAnyOutgoing(e) {
    if (!this._anyOutgoingListeners)
      return this;
    if (e) {
      const t = this._anyOutgoingListeners;
      for (let s = 0; s < t.length; s++)
        if (e === t[s])
          return t.splice(s, 1), this;
    } else
      this._anyOutgoingListeners = [];
    return this;
  }
  /**
   * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
   * e.g. to remove listeners.
   */
  listenersAnyOutgoing() {
    return this._anyOutgoingListeners || [];
  }
  /**
   * Notify the listeners for each packet sent
   *
   * @param packet
   *
   * @private
   */
  notifyOutgoingListeners(e) {
    if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
      const t = this._anyOutgoingListeners.slice();
      for (const s of t)
        s.apply(this, e.data);
    }
  }
};
function v(i) {
  i = i || {}, this.ms = i.min || 100, this.max = i.max || 1e4, this.factor = i.factor || 2, this.jitter = i.jitter > 0 && i.jitter <= 1 ? i.jitter : 0, this.attempts = 0;
}
v.prototype.duration = function() {
  var i = this.ms * Math.pow(this.factor, this.attempts++);
  if (this.jitter) {
    var e = Math.random(), t = Math.floor(e * this.jitter * i);
    i = (Math.floor(e * 10) & 1) == 0 ? i - t : i + t;
  }
  return Math.min(i, this.max) | 0;
};
v.prototype.reset = function() {
  this.attempts = 0;
};
v.prototype.setMin = function(i) {
  this.ms = i;
};
v.prototype.setMax = function(i) {
  this.max = i;
};
v.prototype.setJitter = function(i) {
  this.jitter = i;
};
class V extends f {
  constructor(e, t) {
    var s;
    super(), this.nsps = {}, this.subs = [], e && typeof e == "object" && (t = e, e = void 0), t = t || {}, t.path = t.path || "/socket.io", this.opts = t, L(this, t), this.reconnection(t.reconnection !== !1), this.reconnectionAttempts(t.reconnectionAttempts || 1 / 0), this.reconnectionDelay(t.reconnectionDelay || 1e3), this.reconnectionDelayMax(t.reconnectionDelayMax || 5e3), this.randomizationFactor((s = t.randomizationFactor) !== null && s !== void 0 ? s : 0.5), this.backoff = new v({
      min: this.reconnectionDelay(),
      max: this.reconnectionDelayMax(),
      jitter: this.randomizationFactor()
    }), this.timeout(t.timeout == null ? 2e4 : t.timeout), this._readyState = "closed", this.uri = e;
    const n = t.parser || ot;
    this.encoder = new n.Encoder(), this.decoder = new n.Decoder(), this._autoConnect = t.autoConnect !== !1, this._autoConnect && this.open();
  }
  reconnection(e) {
    return arguments.length ? (this._reconnection = !!e, e || (this.skipReconnect = !0), this) : this._reconnection;
  }
  reconnectionAttempts(e) {
    return e === void 0 ? this._reconnectionAttempts : (this._reconnectionAttempts = e, this);
  }
  reconnectionDelay(e) {
    var t;
    return e === void 0 ? this._reconnectionDelay : (this._reconnectionDelay = e, (t = this.backoff) === null || t === void 0 || t.setMin(e), this);
  }
  randomizationFactor(e) {
    var t;
    return e === void 0 ? this._randomizationFactor : (this._randomizationFactor = e, (t = this.backoff) === null || t === void 0 || t.setJitter(e), this);
  }
  reconnectionDelayMax(e) {
    var t;
    return e === void 0 ? this._reconnectionDelayMax : (this._reconnectionDelayMax = e, (t = this.backoff) === null || t === void 0 || t.setMax(e), this);
  }
  timeout(e) {
    return arguments.length ? (this._timeout = e, this) : this._timeout;
  }
  /**
   * Starts trying to reconnect if reconnection is enabled and we have not
   * started reconnecting yet
   *
   * @private
   */
  maybeReconnectOnOpen() {
    !this._reconnecting && this._reconnection && this.backoff.attempts === 0 && this.reconnect();
  }
  /**
   * Sets the current transport `socket`.
   *
   * @param {Function} fn - optional, callback
   * @return self
   * @public
   */
  open(e) {
    if (~this._readyState.indexOf("open"))
      return this;
    this.engine = new Je(this.uri, this.opts);
    const t = this.engine, s = this;
    this._readyState = "opening", this.skipReconnect = !1;
    const n = y(t, "open", function() {
      s.onopen(), e && e();
    }), r = (c) => {
      this.cleanup(), this._readyState = "closed", this.emitReserved("error", c), e ? e(c) : this.maybeReconnectOnOpen();
    }, o = y(t, "error", r);
    if (this._timeout !== !1) {
      const c = this._timeout, h = this.setTimeoutFn(() => {
        n(), r(new Error("timeout")), t.close();
      }, c);
      this.opts.autoUnref && h.unref(), this.subs.push(() => {
        this.clearTimeoutFn(h);
      });
    }
    return this.subs.push(n), this.subs.push(o), this;
  }
  /**
   * Alias for open()
   *
   * @return self
   * @public
   */
  connect(e) {
    return this.open(e);
  }
  /**
   * Called upon transport open.
   *
   * @private
   */
  onopen() {
    this.cleanup(), this._readyState = "open", this.emitReserved("open");
    const e = this.engine;
    this.subs.push(
      y(e, "ping", this.onping.bind(this)),
      y(e, "data", this.ondata.bind(this)),
      y(e, "error", this.onerror.bind(this)),
      y(e, "close", this.onclose.bind(this)),
      // @ts-ignore
      y(this.decoder, "decoded", this.ondecoded.bind(this))
    );
  }
  /**
   * Called upon a ping.
   *
   * @private
   */
  onping() {
    this.emitReserved("ping");
  }
  /**
   * Called with data.
   *
   * @private
   */
  ondata(e) {
    try {
      this.decoder.add(e);
    } catch (t) {
      this.onclose("parse error", t);
    }
  }
  /**
   * Called when parser fully decodes a packet.
   *
   * @private
   */
  ondecoded(e) {
    O(() => {
      this.emitReserved("packet", e);
    }, this.setTimeoutFn);
  }
  /**
   * Called upon socket error.
   *
   * @private
   */
  onerror(e) {
    this.emitReserved("error", e);
  }
  /**
   * Creates a new socket for the given `nsp`.
   *
   * @return {Socket}
   * @public
   */
  socket(e, t) {
    let s = this.nsps[e];
    return s ? this._autoConnect && !s.active && s.connect() : (s = new pe(this, e, t), this.nsps[e] = s), s;
  }
  /**
   * Called upon a socket close.
   *
   * @param socket
   * @private
   */
  _destroy(e) {
    const t = Object.keys(this.nsps);
    for (const s of t)
      if (this.nsps[s].active)
        return;
    this._close();
  }
  /**
   * Writes a packet.
   *
   * @param packet
   * @private
   */
  _packet(e) {
    const t = this.encoder.encode(e);
    for (let s = 0; s < t.length; s++)
      this.engine.write(t[s], e.options);
  }
  /**
   * Clean up transport subscriptions and packet buffer.
   *
   * @private
   */
  cleanup() {
    this.subs.forEach((e) => e()), this.subs.length = 0, this.decoder.destroy();
  }
  /**
   * Close the current socket.
   *
   * @private
   */
  _close() {
    this.skipReconnect = !0, this._reconnecting = !1, this.onclose("forced close");
  }
  /**
   * Alias for close()
   *
   * @private
   */
  disconnect() {
    return this._close();
  }
  /**
   * Called when:
   *
   * - the low-level engine is closed
   * - the parser encountered a badly formatted packet
   * - all sockets are disconnected
   *
   * @private
   */
  onclose(e, t) {
    var s;
    this.cleanup(), (s = this.engine) === null || s === void 0 || s.close(), this.backoff.reset(), this._readyState = "closed", this.emitReserved("close", e, t), this._reconnection && !this.skipReconnect && this.reconnect();
  }
  /**
   * Attempt a reconnection.
   *
   * @private
   */
  reconnect() {
    if (this._reconnecting || this.skipReconnect)
      return this;
    const e = this;
    if (this.backoff.attempts >= this._reconnectionAttempts)
      this.backoff.reset(), this.emitReserved("reconnect_failed"), this._reconnecting = !1;
    else {
      const t = this.backoff.duration();
      this._reconnecting = !0;
      const s = this.setTimeoutFn(() => {
        e.skipReconnect || (this.emitReserved("reconnect_attempt", e.backoff.attempts), !e.skipReconnect && e.open((n) => {
          n ? (e._reconnecting = !1, e.reconnect(), this.emitReserved("reconnect_error", n)) : e.onreconnect();
        }));
      }, t);
      this.opts.autoUnref && s.unref(), this.subs.push(() => {
        this.clearTimeoutFn(s);
      });
    }
  }
  /**
   * Called upon successful reconnect.
   *
   * @private
   */
  onreconnect() {
    const e = this.backoff.attempts;
    this._reconnecting = !1, this.backoff.reset(), this.emitReserved("reconnect", e);
  }
}
const E = {};
function B(i, e) {
  typeof i == "object" && (e = i, i = void 0), e = e || {};
  const t = Qe(i, e.path || "/socket.io"), s = t.source, n = t.id, r = t.path, o = E[n] && r in E[n].nsps, c = e.forceNew || e["force new connection"] || e.multiplex === !1 || o;
  let h;
  return c ? h = new V(s, e) : (E[n] || (E[n] = new V(s, e)), h = E[n]), t.query && !e.query && (e.query = t.queryKey), h.socket(t.path, e);
}
Object.assign(B, {
  Manager: V,
  Socket: pe,
  io: B,
  connect: B
});
class ct {
  #t = "http://localhost:3000";
  #s = {
    transports: ["websocket"]
  };
  #e;
  #r = !1;
  #o = {};
  set uri(e) {
    const t = new URL(e);
    if (!["http:", "https:", "ws:", "wss:"].includes(t.protocol))
      throw new Error("URI must start with http://, https://, ws://, or wss://");
    this.#t = e;
  }
  get uri() {
    return this.#t;
  }
  set options(e) {
    if (typeof e != "object")
      throw new Error("Options must be an object");
    this.#s = e;
  }
  get options() {
    return this.#s;
  }
  constructor() {
    this.#o.onResponse = this.onResponse.bind(this);
  }
  disconnect() {
    this.#e && (this.#e.off("response", this.#o.onResponse), this.#e.disconnect(), this.#e = null), this.#r = !1;
  }
  prepare() {
    this.#r || (this.#e = B(this.#t, this.#s), this.#r = !0, this.#e.on("response", this.#o.onResponse));
  }
  connectDevice(e) {
    this.#e.emit("connectDevice", { config: e });
  }
  disconnectDevice(e) {
    this.#e.emit("disconnectDevice", { config: e });
  }
  disconnectAllDevices() {
    this.#e.emit("disconnectAll");
  }
  write(e) {
    this.#e.emit("cmd", e);
  }
  onResponse(e) {
    let t = a.get(e.name, e.uuid);
    t || (t = a.getByNumber(e.name, e.deviceNumber)), t && t.socketResponse(e);
  }
}
const A = new ct(), q = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 32768,
  flowControl: "none"
};
class ut extends te {
  __internal__ = {
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
      socket: !1,
      portInfo: {
        path: null,
        vendorId: null,
        productId: null,
        parser: {
          name: "inter-byte-timeout",
          interval: 50
        }
      },
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
      config_port: q,
      queue: [],
      auto_response: null,
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
      response_engines: 2e3,
      response_general: 2e3
    },
    timeout: {
      until_response: 0
    },
    interval: {
      reconnection: 0
    }
  };
  #t = null;
  constructor({
    filters: e = null,
    config_port: t = q,
    no_device: s = 1,
    device_listen_on_channel: n = 1,
    bypassSerialBytesConnection: r = !1,
    socket: o = !1
  } = {
    filters: null,
    config_port: q,
    no_device: 1,
    device_listen_on_channel: 1,
    bypassSerialBytesConnection: !1,
    socket: !1
  }) {
    if (super(), !("serial" in navigator))
      throw new Error("Web Serial not supported");
    e && (this.serialFilters = e), t && (this.serialConfigPort = t), r && (this.__internal__.bypassSerialBytesConnection = r), s && this.#w(s), n && ["number", "string"].includes(typeof n) && (this.listenOnChannel = n), this.__internal__.serial.socket = o, this.#y(), this.#g();
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
    const e = this.__internal__.serial.connected, t = this.#s(this.__internal__.serial.port);
    return e && !t && this.#e({ error: "Port is closed, not readable or writable." }), this.__internal__.serial.connected = t, this.__internal__.serial.connected;
  }
  get isConnecting() {
    return this.__internal__.serial.connecting;
  }
  get isDisconnected() {
    const e = this.__internal__.serial.connected, t = this.#s(this.__internal__.serial.port);
    return !e && t && (this.dispatch("serial:connected"), this.#n(!1), a.$dispatchChange(this)), this.__internal__.serial.connected = t, !this.__internal__.serial.connected;
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
  get useSocket() {
    return this.__internal__.serial.socket;
  }
  get connectionBytes() {
    const e = this.__internal__.serial.bytes_connection;
    return e instanceof Uint8Array ? e : typeof e == "string" ? this.stringArrayToUint8Array(this.parseStringToBytes(e, "")) : Array.isArray(e) && typeof e[0] == "string" ? this.stringArrayToUint8Array(e) : Array.isArray(e) && typeof e[0] == "number" ? new Uint8Array(e) : new Uint8Array([]);
  }
  set portPath(e) {
    if (this.isConnected) throw new Error("Cannot change port path while connected");
    if (typeof e != "string" && e !== null)
      throw new TypeError("vendorId must be string or null");
    this.__internal__.serial.portInfo.path = e;
  }
  get portPath() {
    return this.__internal__.serial.portInfo.path;
  }
  set portVendorId(e) {
    if (this.isConnected) throw new Error("Cannot change port vendorId while connected");
    if (typeof e == "number" && typeof e != "string" && e !== null)
      throw new TypeError("vendorId must be a number, string or null");
    this.__internal__.serial.portInfo.vendorId = e;
  }
  get portVendorId() {
    return this.__internal__.serial.portInfo.vendorId;
  }
  set portProductId(e) {
    if (this.isConnected) throw new Error("Cannot change port productId while connected");
    if (typeof e == "number" && typeof e != "string" && e !== null)
      throw new TypeError("productId must be a number, string or null");
    this.__internal__.serial.portInfo.productId = e;
  }
  get portProductId() {
    return this.__internal__.serial.portInfo.productId;
  }
  set socketPortParser(e) {
    if (["byte-length", "inter-byte-timeout"].includes(e))
      throw new TypeError("socketPortParser must be a string, either 'byte-length' or 'inter-byte-timeout'");
    this.__internal__.serial.portInfo.parser.name = e;
  }
  get socketPortParser() {
    return this.__internal__.serial.portInfo.parser.name;
  }
  set socketPortParserInterval(e) {
    if (typeof e != "number" || e < 1)
      throw new TypeError("Interval must be a positive number");
    this.__internal__.serial.portInfo.parser.interval = e;
  }
  get socketPortParserInterval() {
    return this.__internal__.serial.portInfo.parser.interval || 50;
  }
  set socketPortParserLength(e) {
    if (typeof e != "number" || e < 1)
      throw new TypeError("Length must be a positive number or null");
    this.__internal__.serial.portInfo.parser.length = e;
  }
  get socketPortParserLength() {
    return this.__internal__.serial.portInfo.parser.length || 14;
  }
  get parserForSocket() {
    return this.socketPortParser === "byte-length" ? {
      name: this.socketPortParser,
      length: this.socketPortParserLength
    } : {
      name: this.socketPortParser,
      interval: this.socketPortParserInterval
    };
  }
  get configDeviceSocket() {
    return {
      uuid: this.uuid,
      name: this.typeDevice,
      deviceNumber: this.deviceNumber,
      connectionBytes: Array.from(this.connectionBytes),
      config: {
        baudRate: this.__internal__.serial.config_port.baudRate,
        dataBits: this.__internal__.serial.config_port.dataBits,
        stopBits: this.__internal__.serial.config_port.stopBits,
        parity: this.__internal__.serial.config_port.parity,
        bufferSize: this.__internal__.serial.config_port.bufferSize,
        flowControl: this.__internal__.serial.config_port.flowControl
      },
      info: {
        vendorId: this.portVendorId,
        // vendor ID or null for auto-detect
        productId: this.portProductId,
        // product ID or null for auto-detect
        portName: this.portPath
        // COM3, /dev/ttyUSB0, etc. null for auto-detect
      },
      response: {
        automatic: this.__internal__.auto_response,
        // true to auto-respond to commands this only for devices that doesn't respond nothing
        autoResponse: this.__internal__.serial.auto_response,
        // null or data to respond automatically, ie. [0x02, 0x06, 0xdd, 0xdd, 0xf0, 0xcf, 0x03] for relay
        parser: this.parserForSocket,
        timeout: {
          general: this.__internal__.time.response_general,
          engines: this.__internal__.time.response_engines,
          connection: this.__internal__.time.response_connection
        }
      }
    };
  }
  #s(e) {
    return this.useSocket ? this.__internal__.serial.connected : !!(e && e.readable && e.writable);
  }
  async timeout(e, t) {
    this.__internal__.last_error.message = "Operation response timed out.", this.__internal__.last_error.action = t, this.__internal__.last_error.code = e, this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0), t === "connect" ? (this.__internal__.serial.connected = !1, this.dispatch("serial:reconnect", {}), a.$dispatchChange(this)) : t === "connection:start" && (await this.serialDisconnect(), this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector += 1, a.$dispatchChange(this), await this.serialConnect()), this.dispatch("serial:timeout", {
      ...this.__internal__.last_error,
      bytes: e,
      action: t
    });
  }
  async disconnect(e = null) {
    await this.serialDisconnect(), this.#e(e);
  }
  #e(e = null) {
    this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector = 0, this.dispatch("serial:disconnected", e), a.$dispatchChange(this);
  }
  #r(e) {
    this.__internal__.serial.aux_connecting = e.detail.active ? "connecting" : "finished";
  }
  socketResponse(e) {
    const t = this.__internal__.serial.connected;
    if (e.type === "disconnect" || e.type === "error" && e.data === "DISCONNECTED" ? this.__internal__.serial.connected = !1 : e.type === "success" && (this.__internal__.serial.connected = !0), a.$dispatchChange(this), !t && this.__internal__.serial.connected && (this.dispatch("serial:connected"), this.#n(!1)), e.type === "success")
      this.#i(new Uint8Array(e.data));
    else if (e.type === "error") {
      const s = new Error("The port is closed or is not readable/writable");
      this.serialErrors(s);
    } else e.type === "timeout" && this.timeout(e.data.bytes ?? [], this.lastAction || "unknown");
    this.__internal__.serial.last_action = null;
  }
  async connect() {
    return this.isConnected ? !0 : (this.__internal__.serial.aux_connecting = "idle", new Promise((e, t) => {
      this.#t || (this.#t = this.#r.bind(this)), this.on("internal:connecting", this.#t);
      const s = setInterval(() => {
        this.__internal__.serial.aux_connecting === "finished" ? (clearInterval(s), this.__internal__.serial.aux_connecting = "idle", this.#t !== null && this.off("internal:connecting", this.#t), this.isConnected ? e(!0) : t(`${this.typeDevice} device ${this.deviceNumber} not connected`)) : this.__internal__.serial.aux_connecting === "connecting" && (this.__internal__.serial.aux_connecting = "idle", this.dispatch("internal:connecting", { active: !0 }), this.dispatch("serial:connecting", { active: !0 }));
      }, 100);
      this.serialConnect();
    }));
  }
  async serialDisconnect() {
    try {
      if (this.useSocket)
        A.disconnectDevice(this.configDeviceSocket);
      else {
        const e = this.__internal__.serial.reader, t = this.__internal__.serial.output_stream;
        e && (await e.cancel().catch((n) => this.serialErrors(n)), await this.__internal__.serial.input_done), t && (await t.getWriter().close(), await this.__internal__.serial.output_done), this.__internal__.serial.connected && this.__internal__.serial && this.__internal__.serial.port && await this.__internal__.serial.port.close();
      }
    } catch (e) {
      this.serialErrors(e);
    } finally {
      this.__internal__.serial.reader = null, this.__internal__.serial.input_done = null, this.__internal__.serial.output_stream = null, this.__internal__.serial.output_done = null, this.__internal__.serial.connected = !1, this.__internal__.serial.port = null, a.$dispatchChange(this);
    }
  }
  async #o(e) {
    if (this.isDisconnected)
      throw this.#e({ error: "Port is closed, not readable or writable." }), new Error("The port is closed or is not readable/writable");
    const t = this.validateBytes(e);
    A.write({ config: this.configDeviceSocket, bytes: Array.from(t) });
  }
  async #a(e) {
    if (this.useSocket) {
      await this.#o(e);
      return;
    }
    const t = this.__internal__.serial.port;
    if (!t || t && (!t.readable || !t.writable))
      throw this.#e({ error: "Port is closed, not readable or writable." }), new Error("The port is closed or is not readable/writable");
    const s = this.validateBytes(e);
    if (this.useRTSCTS && await this.#c(t, 5e3), t.writable === null) return;
    const n = t.writable.getWriter();
    await n.write(s), n.releaseLock();
  }
  async #c(e, t = 5e3) {
    const s = Date.now();
    for (; ; ) {
      if (Date.now() - s > t)
        throw new Error("Timeout waiting for clearToSend signal");
      const { clearToSend: n } = await e.getSignals();
      if (n) return;
      await Q(100);
    }
  }
  #i(e = new Uint8Array([]), t = !1) {
    if (e && e.length > 0) {
      const s = this.__internal__.serial.connected;
      if (this.__internal__.serial.connected = this.#s(this.__internal__.serial.port), a.$dispatchChange(this), !s && this.__internal__.serial.connected && (this.dispatch("serial:connected"), this.#n(!1)), this.__internal__.interval.reconnection && (clearInterval(this.__internal__.interval.reconnection), this.__internal__.interval.reconnection = 0), this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0), this.__internal__.serial.response.as === "hex")
        t ? this.serialCorruptMessage(this.parseUint8ToHex(e)) : this.serialMessage(this.parseUint8ToHex(e));
      else if (this.__internal__.serial.response.as === "uint8")
        t ? this.serialCorruptMessage(e) : this.serialMessage(e);
      else if (this.__internal__.serial.response.as === "string") {
        const n = this.parseUint8ArrayToString(e);
        if (this.__internal__.serial.response.limiter !== null) {
          const r = n.split(this.__internal__.serial.response.limiter);
          for (const o in r)
            r[o] && (t ? this.serialCorruptMessage(r[o]) : this.serialMessage(r[o]));
        } else
          t ? this.serialCorruptMessage(n) : this.serialMessage(n);
      } else {
        const n = this.stringToArrayBuffer(this.parseUint8ArrayToString(e));
        t ? this.serialCorruptMessage(n) : this.serialMessage(n);
      }
    }
    this.__internal__.serial.queue.length !== 0 && this.dispatch("internal:queue", {});
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
  async #l() {
    const e = this.serialFilters, t = await navigator.serial.getPorts({ filters: e });
    return e.length === 0 ? t : t.filter((n) => {
      const r = n.getInfo();
      return e.some((o) => r.usbProductId === o.usbProductId && r.usbVendorId === o.usbVendorId);
    }).filter((n) => !this.#s(n));
  }
  async serialPortsSaved(e) {
    const t = this.serialFilters;
    if (this.__internal__.aux_port_connector < e.length) {
      const s = this.__internal__.aux_port_connector;
      this.__internal__.serial.port = e[s];
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
        this.dispatch("serial:need-permission", {}), a.$dispatchChange(this);
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
        this.dispatch("serial:lost", {}), a.$dispatchChange(this);
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
  #h(e) {
    if (e) {
      const t = this.__internal__.serial.response.buffer, s = new Uint8Array(t.length + e.byteLength);
      s.set(t, 0), s.set(new Uint8Array(e), t.length), this.__internal__.serial.response.buffer = s;
    }
  }
  async #u() {
    this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
      this.__internal__.serial.response.buffer && this.#i(this.__internal__.serial.response.buffer), this.__internal__.serial.response.buffer = new Uint8Array(0);
    }, this.__internal__.serial.free_timeout_ms || 50);
  }
  async #_() {
    const e = this.__internal__.serial.response.length;
    let t = this.__internal__.serial.response.buffer;
    if (this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), !(e === null || !t || t.length === 0)) {
      for (; t.length >= e; ) {
        const s = t.slice(0, e);
        this.#i(s), t = t.slice(e);
      }
      this.__internal__.serial.response.buffer = t, t.length > 0 && (this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
        this.#i(this.__internal__.serial.response.buffer, !0);
      }, this.__internal__.serial.free_timeout_ms || 50));
    }
  }
  async #f() {
    const {
      limiter: e,
      prefixLimiter: t = !1,
      sufixLimiter: s = !0
    } = this.__internal__.serial.response;
    if (!e)
      throw new Error("No limiter defined for delimited serial response");
    const n = this.__internal__.serial.response.buffer;
    if (!e || !n || n.length === 0) return;
    this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0);
    let o = new TextDecoder().decode(n);
    const c = [];
    if (typeof e == "string") {
      let u;
      if (t && s)
        u = new RegExp(`${e}([^${e}]+)${e}`, "g");
      else if (t)
        u = new RegExp(`${e}([^${e}]*)`, "g");
      else if (s)
        u = new RegExp(`([^${e}]+)${e}`, "g");
      else
        return;
      let _, p = 0;
      for (; (_ = u.exec(o)) !== null; )
        c.push(new TextEncoder().encode(_[1])), p = u.lastIndex;
      o = o.slice(p);
    } else if (e instanceof RegExp) {
      let u, _ = 0;
      if (t && s) {
        const p = new RegExp(`${e.source}(.*?)${e.source}`, "g");
        for (; (u = p.exec(o)) !== null; )
          c.push(new TextEncoder().encode(u[1])), _ = p.lastIndex;
      } else if (s)
        for (; (u = e.exec(o)) !== null; ) {
          const p = u.index, b = o.slice(_, p);
          c.push(new TextEncoder().encode(b)), _ = e.lastIndex;
        }
      else if (t) {
        const p = o.split(e);
        p.shift();
        for (const b of p)
          c.push(new TextEncoder().encode(b));
        o = "";
      }
      o = o.slice(_);
    }
    for (const u of c)
      this.#i(u);
    const h = new TextEncoder().encode(o);
    this.__internal__.serial.response.buffer = h, h.length > 0 && (this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
      this.#i(this.__internal__.serial.response.buffer, !0), this.__internal__.serial.response.buffer = new Uint8Array(0);
    }, this.__internal__.serial.free_timeout_ms ?? 50));
  }
  async #p() {
    const e = this.__internal__.serial.port;
    if (!e || !e.readable) throw new Error("Port is not readable");
    const t = e.readable.getReader();
    this.__internal__.serial.reader = t;
    try {
      for (; this.__internal__.serial.keep_reading; ) {
        const { value: s, done: n } = await t.read();
        if (n) break;
        this.#h(s), this.__internal__.serial.response.delimited ? await this.#f() : this.__internal__.serial.response.length === null ? await this.#u() : await this.#_();
      }
    } catch (s) {
      this.serialErrors(s);
    } finally {
      t.releaseLock(), this.__internal__.serial.keep_reading = !0, this.__internal__.serial.port && await this.__internal__.serial.port.close();
    }
  }
  #n(e) {
    e !== this.__internal__.serial.connecting && (this.__internal__.serial.connecting = e, this.dispatch("serial:connecting", { active: e }), this.dispatch("internal:connecting", { active: e }));
  }
  async serialConnect() {
    try {
      if (this.#n(!0), this.useSocket)
        A.prepare(), this.__internal__.serial.last_action = "connect", this.__internal__.timeout.until_response = setTimeout(async () => {
          await this.timeout(this.__internal__.serial.bytes_connection ?? [], "connection:start");
        }, this.__internal__.time.response_connection), A.connectDevice(this.configDeviceSocket), this.dispatch("serial:sent", {
          action: "connect",
          bytes: this.__internal__.serial.bytes_connection
        });
      else {
        const e = await this.#l();
        if (e.length > 0)
          await this.serialPortsSaved(e);
        else {
          const n = this.serialFilters;
          this.__internal__.serial.port = await navigator.serial.requestPort({
            filters: n
          });
        }
        const t = this.__internal__.serial.port;
        if (!t)
          throw new Error("No port selected by the user");
        await t.open(this.serialConfigPort);
        const s = this;
        t.onconnect = (n) => {
          s.dispatch("serial:connected", n), s.#n(!1), a.$dispatchChange(this), s.__internal__.serial.queue.length > 0 && s.dispatch("internal:queue", {});
        }, t.ondisconnect = async () => {
          await s.disconnect();
        }, await Q(this.__internal__.serial.delay_first_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
          await s.timeout(s.__internal__.serial.bytes_connection ?? [], "connection:start");
        }, this.__internal__.time.response_connection), this.__internal__.serial.last_action = "connect", await this.#a(this.__internal__.serial.bytes_connection ?? []), this.dispatch("serial:sent", {
          action: "connect",
          bytes: this.__internal__.serial.bytes_connection
        }), this.__internal__.auto_response && this.#i(this.__internal__.serial.auto_response), await this.#p();
      }
    } catch (e) {
      this.#n(!1), this.serialErrors(e);
    }
  }
  async #d() {
    return typeof window > "u" ? !1 : "serial" in navigator && "forget" in SerialPort.prototype && this.__internal__.serial.port ? (await this.__internal__.serial.port.forget(), !0) : !1;
  }
  async serialForget() {
    return await this.#d();
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
    return e.forEach((s, n) => {
      t[n] = "0x" + s;
    }), t;
  }
  bytesToHex(e) {
    return this.add0x(Array.from(e, (t) => this.hexMaker(t)));
  }
  #y() {
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
  }
  #g() {
    const e = this;
    this.on("internal:queue", async () => {
      await e.#b();
    }), this.#m();
  }
  #m() {
    const e = this;
    navigator.serial.addEventListener("connect", async () => {
      e.isDisconnected && await e.serialConnect().catch(() => {
      });
    });
  }
  async #b() {
    if (!this.#s(this.__internal__.serial.port)) {
      this.#e({ error: "Port is closed, not readable or writable." }), await this.serialConnect();
      return;
    }
    if (this.__internal__.timeout.until_response || this.__internal__.serial.queue.length === 0) return;
    const e = this.__internal__.serial.queue[0];
    let t = this.__internal__.time.response_general;
    if (e.action === "connect" && (t = this.__internal__.time.response_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
      await this.timeout(e.bytes, e.action);
    }, t), this.__internal__.serial.last_action = e.action ?? "unknown", await this.#a(e.bytes), this.dispatch("serial:sent", {
      action: e.action,
      bytes: e.bytes
    }), this.__internal__.auto_response) {
      let n = new Uint8Array(0);
      try {
        n = this.validateBytes(this.__internal__.serial.auto_response);
      } catch (r) {
        this.serialErrors(r);
      }
      this.#i(n);
    }
    const s = [...this.__internal__.serial.queue];
    this.__internal__.serial.queue = s.splice(1);
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
    const s = this.validateBytes(e);
    if (["connect", "connection:start"].includes(t)) {
      if (this.__internal__.serial.connected) return;
      await this.serialConnect();
      return;
    }
    this.__internal__.serial.queue.push({ bytes: s, action: t }), this.dispatch("internal:queue", {});
  }
  #w(e = 1) {
    this.__internal__.device_number = e, !this.__internal__.bypassSerialBytesConnection && (this.__internal__.serial.bytes_connection = this.serialSetConnectionConstant(e));
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
  #v() {
    this.__internal__.last_error = {
      message: null,
      action: null,
      code: null,
      no_code: 0
    };
  }
  clearSerialQueue() {
    this.__internal__.serial.queue = [];
  }
  sumHex(e) {
    let t = 0;
    return e.forEach((s) => {
      t += parseInt(s, 16);
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
    this.#v(), this.dispatch("serial:soft-reload", {});
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
    const s = new TextEncoder();
    return e += t, s.encode(e);
  }
  parseStringToBytes(e = "", t = `
`) {
    const s = this.parseStringToTextEncoder(e, t);
    return Array.from(s).map((n) => n.toString(16));
  }
  parseUint8ToHex(e) {
    return Array.from(e).map((t) => t.toString(16).padStart(2, "0").toLowerCase());
  }
  parseHexToUint8(e) {
    return new Uint8Array(e.map((t) => parseInt(t, 16)));
  }
  stringArrayToUint8Array(e) {
    const t = [];
    return typeof e == "string" ? this.parseStringToTextEncoder(e).buffer : (e.forEach((s) => {
      const n = s.replace("0x", "");
      t.push(parseInt(n, 16));
    }), new Uint8Array(t));
  }
  parseUint8ArrayToString(e) {
    let t = new Uint8Array(0);
    e instanceof Uint8Array ? t = e : t = this.stringArrayToUint8Array(e), e = this.parseUint8ToHex(t);
    const s = e.map((n) => parseInt(n, 16));
    return this.__internal__.serial.response.replacer ? String.fromCharCode(...s).replace(this.__internal__.serial.response.replacer, "") : String.fromCharCode(...s);
  }
  hexToAscii(e) {
    const t = e.toString();
    let s = "";
    for (let n = 0; n < t.length; n += 2)
      s += String.fromCharCode(parseInt(t.substring(n, 2), 16));
    return s;
  }
  asciiToHex(e) {
    const t = [];
    for (let s = 0, n = e.length; s < n; s++) {
      const r = Number(e.charCodeAt(s)).toString(16);
      t.push(r);
    }
    return t.join("");
  }
  $checkAndDispatchConnection() {
    return this.isConnected;
  }
}
export {
  ut as Core,
  a as Devices,
  te as Dispatcher,
  A as Socket
};
