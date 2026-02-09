import { io as b } from "socket.io-client";
class g extends CustomEvent {
  constructor(e, t) {
    super(e, t);
  }
}
class y extends EventTarget {
  __listeners__ = {
    debug: !1
  };
  __debug__ = !1;
  __listenersCallbacks__ = [];
  /**
   * Dispatches an event with the specified type and data
   * @param type - The event type to dispatch
   * @param data - Optional data to attach to the event
   * @example
   * ```typescript
   * dispatcher.dispatch('connected', { port: 'COM3' });
   * ```
   */
  dispatch(e, t = null) {
    const n = new g(e, { detail: t });
    this.dispatchEvent(n), this.__debug__ && this.dispatchEvent(new g("debug", { detail: { type: e, data: t } }));
  }
  /**
   * Dispatches an event asynchronously after a specified delay
   * @param type - The event type to dispatch
   * @param data - Optional data to attach to the event
   * @param ms - Delay in milliseconds (default: 100)
   * @example
   * ```typescript
   * dispatcher.dispatchAsync('timeout', { reason: 'no response' }, 500);
   * ```
   */
  dispatchAsync(e, t = null, n = 100) {
    const i = this;
    setTimeout(() => {
      i.dispatch(e, t);
    }, n);
  }
  /**
   * Registers an event listener for the specified event type
   * @param type - The event type to listen to
   * @param callback - The callback function to execute when the event is triggered
   * @example
   * ```typescript
   * dispatcher.on('connected', (event) => {
   *   console.log('Device connected', event.detail);
   * });
   * ```
   */
  on(e, t) {
    typeof this.__listeners__[e] < "u" && !this.__listeners__[e] && (this.__listeners__[e] = !0), this.__listenersCallbacks__.push({ key: e, callback: t }), this.addEventListener(e, t);
  }
  /**
   * Removes an event listener for the specified event type
   * @param type - The event type to stop listening to
   * @param callback - The callback function to remove
   * @example
   * ```typescript
   * const handler = (event) => console.log(event.detail);
   * dispatcher.on('data', handler);
   * dispatcher.off('data', handler);
   * ```
   */
  off(e, t) {
    this.__listenersCallbacks__ = this.__listenersCallbacks__.filter((n) => !(n.key === e && n.callback === t)), this.removeEventListener(e, t);
  }
  /**
   * Registers an available listener type for tracking
   * @param type - The event type to register
   * @internal
   */
  serialRegisterAvailableListener(e) {
    this.__listeners__[e] || (this.__listeners__[e] = !1);
  }
  /**
   * Gets the list of all available listeners and their state
   * @returns Array of listener objects with type and listening status
   * @example
   * ```typescript
   * const listeners = dispatcher.availableListeners;
   * console.log(listeners); // [{ type: 'connected', listening: true }, ...]
   * ```
   */
  get availableListeners() {
    return Object.keys(this.__listeners__).sort().map((t) => ({
      type: t,
      listening: this.__listeners__[t]
    }));
  }
  /**
   * Removes all event listeners except internal ones (like queue listeners)
   * Resets all listener states to false
   * @example
   * ```typescript
   * dispatcher.removeAllListeners();
   * ```
   */
  removeAllListeners() {
    for (const e of this.__listenersCallbacks__)
      ["internal:queue"].includes(e.key) || (this.__listenersCallbacks__ = this.__listenersCallbacks__.filter((t) => !(t.key === e.key && t.callback === e.callback)), this.removeEventListener(e.key, e.callback));
    for (const e of Object.keys(this.__listeners__))
      this.__listeners__[e] = !1;
  }
}
class s extends y {
  static instance;
  static devices = {};
  constructor() {
    super(), ["change"].forEach((t) => {
      this.serialRegisterAvailableListener(t);
    });
  }
  static $dispatchChange(e = null) {
    e && e.$checkAndDispatchConnection(), s.instance.dispatch("change", { devices: s.devices, dispatcher: e });
  }
  static typeError(e) {
    const t = new Error();
    throw t.message = `Type ${e} is not supported`, t.name = "DeviceTypeError", t;
  }
  /**
   * Registers a new device type in the registry
   * @param type - The type name of the device (e.g., 'arduino', 'esp32')
   * @internal
   */
  static registerType(e) {
    typeof s.devices[e] > "u" && (s.devices = { ...s.devices, [e]: {} });
  }
  /**
   * Adds a device to the registry
   * @param device - The Core device instance to add
   * @returns The index of the device in its type registry
   * @throws {Error} If device with the same ID already exists
   * @example
   * ```typescript
   * const arduino = new Arduino();
   * Devices.add(arduino);
   * ```
   */
  static add(e) {
    const t = e.typeDevice;
    typeof s.devices[t] > "u" && s.registerType(t);
    const n = e.uuid;
    if (typeof s.devices[t] > "u" && s.typeError(t), s.devices[t][n])
      throw new Error(`Device with id ${n} already exists`);
    return s.devices[t][n] = e, s.$dispatchChange(e), Object.keys(s.devices[t]).indexOf(n);
  }
  /**
   * Gets a specific device by type and UUID
   * @param type - The device type
   * @param id - The device UUID
   * @returns The device instance
   * @throws {Error} If the device type is not supported
   * @example
   * ```typescript
   * const device = Devices.get('arduino', 'uuid-123');
   * ```
   */
  static get(e, t) {
    return typeof s.devices[e] > "u" && s.registerType(e), typeof s.devices[e] > "u" && s.typeError(e), s.devices[e][t];
  }
  static getAll(e = null) {
    return e === null ? s.devices : (typeof s.devices[e] > "u" && s.typeError(e), s.devices[e]);
  }
  static getList() {
    return Object.values(s.devices).map((t) => Object.values(t)).flat();
  }
  static getByNumber(e, t) {
    return typeof s.devices[e] > "u" && s.typeError(e), Object.values(s.devices[e]).find((i) => i.deviceNumber === t) ?? null;
  }
  static getCustom(e, t = 1) {
    return typeof s.devices[e] > "u" && s.typeError(e), Object.values(s.devices[e]).find((i) => i.deviceNumber === t) ?? null;
  }
  static async connectToAll() {
    const e = s.getList();
    for (const t of e)
      t.isConnected || await t.connect().catch(console.warn);
    return Promise.resolve(s.areAllConnected());
  }
  static async disconnectAll() {
    const e = s.getList();
    for (const t of e)
      t.isDisconnected || await t.disconnect().catch(console.warn);
    return Promise.resolve(s.areAllDisconnected());
  }
  static async areAllConnected() {
    const e = s.getList();
    for (const t of e)
      if (!t.isConnected) return Promise.resolve(!1);
    return Promise.resolve(!0);
  }
  static async areAllDisconnected() {
    const e = s.getList();
    for (const t of e)
      if (!t.isDisconnected) return Promise.resolve(!1);
    return Promise.resolve(!0);
  }
  static async getAllConnected() {
    const e = s.getList();
    return Promise.resolve(e.filter((t) => t.isConnected));
  }
  static async getAllDisconnected() {
    const e = s.getList();
    return Promise.resolve(e.filter((t) => t.isDisconnected));
  }
}
s.instance || (s.instance = new s());
function m(a = 100) {
  return new Promise(
    (e) => setTimeout(() => e(), a)
  );
}
class C {
  #i = "http://localhost:3001";
  #t = {
    transports: ["websocket"]
  };
  #e = null;
  #s = !1;
  #a = !1;
  #n;
  constructor(e, t) {
    e && (this.#i = e), t && (this.#t = { ...this.#t, ...t }), this.#n = {
      onResponse: this.onResponse.bind(this),
      onDisconnect: () => {
        this.#s = !1, window.dispatchEvent(new Event("serial:socket:disconnected"));
      },
      onConnect: () => {
        this.#s = !0, window.dispatchEvent(new Event("serial:socket:connected"));
      },
      onConnectError: (n) => {
        console.debug("Socket connection error", n), this.#s = !1, window.dispatchEvent(new Event("serial:socket:disconnected"));
      }
    };
  }
  set uri(e) {
    const t = new URL(e);
    if (!["http:", "https:", "ws:", "wss:"].includes(t.protocol))
      throw new Error("URI must start with http://, https://, ws://, or wss://");
    this.#i = e;
  }
  get uri() {
    return this.#i;
  }
  set options(e) {
    if (typeof e != "object")
      throw new Error("Options must be an object");
    this.#t = e;
  }
  get options() {
    return this.#t;
  }
  get socketId() {
    return this.#e && this.#e.id ? this.#e.id : null;
  }
  configure(e, t) {
    if (this.#a)
      throw new Error("Cannot configure socket after it has been initialized. Call configure() before prepare().");
    e && (this.uri = e), t && (this.#t = { ...this.#t, ...t });
  }
  disconnect() {
    this.#e && (this.#e.off("response", this.#n.onResponse), this.#e.off("disconnect", this.#n.onDisconnect), this.#e.off("connect", this.#n.onConnect), this.#e.off("connect_error", this.#n.onConnectError), this.#e.disconnect(), this.#e = null, this.#a = !1), this.#s = !1;
  }
  prepare() {
    this.#s || this.#a || (this.#e = b(this.#i, this.#t), this.#a = !0, this.#e.on("disconnect", this.#n.onDisconnect), this.#e.on("response", this.#n.onResponse), this.#e.on("connect", this.#n.onConnect), this.#e.on("connect_error", this.#n.onConnectError));
  }
  connectDevice(e) {
    if (!this.#e)
      throw new Error("Socket not connected. Call prepare() first.");
    this.#e.emit("connectDevice", { config: e });
  }
  disconnectDevice(e) {
    if (!this.#e)
      throw new Error("Socket not connected. Call prepare() first.");
    this.#e.emit("disconnectDevice", { config: e });
  }
  disconnectAllDevices() {
    if (!this.#e)
      throw new Error("Socket not connected. Call prepare() first.");
    this.#e.emit("disconnectAll");
  }
  write(e) {
    if (!this.#e)
      throw new Error("Socket not connected. Call prepare() first.");
    this.#e.emit("cmd", e);
  }
  onResponse(e) {
    let t = s.get(e.name, e.uuid);
    t || (t = s.getByNumber(e.name, e.deviceNumber)), t && t.socketResponse(e);
  }
  isConnected() {
    return this.#s;
  }
  isDisconnected() {
    return !this.#s;
  }
}
const c = new C(), f = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 32768,
  flowControl: "none"
};
class T extends y {
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
      transformStream: !1,
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
      config_port: f,
      queue: [],
      running_queue: !1,
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
  #i = null;
  constructor({
    filters: e = null,
    config_port: t = f,
    no_device: n = 1,
    device_listen_on_channel: i = 1,
    bypassSerialBytesConnection: o = !1,
    socket: r = !1,
    transformStream: h = !1
  } = {
    filters: null,
    config_port: f,
    no_device: 1,
    device_listen_on_channel: 1,
    bypassSerialBytesConnection: !1,
    socket: !1,
    transformStream: !1
  }) {
    if (super(), !("serial" in navigator))
      throw new Error("Web Serial not supported");
    e && (this.serialFilters = e), t && (this.serialConfigPort = t), o && (this.__internal__.bypassSerialBytesConnection = o), n && this.#C(n), i && ["number", "string"].includes(typeof i) && (this.listenOnChannel = i), this.__internal__.serial.socket = r, this.__internal__.serial.transformStream = h, this.#m(), this.#y();
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
    const e = this.__internal__.serial.connected, t = this.#t(this.__internal__.serial.port);
    return e && !t && this.#e({ error: "Port is closed, not readable or writable." }), this.__internal__.serial.connected = t, this.__internal__.serial.connected;
  }
  get isConnecting() {
    return this.__internal__.serial.connecting;
  }
  get isDisconnected() {
    const e = this.__internal__.serial.connected, t = this.#t(this.__internal__.serial.port);
    return !e && t && (this.dispatch("serial:connected"), this.#o(!1), s.$dispatchChange(this)), this.__internal__.serial.connected = t, !this.__internal__.serial.connected;
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
  #t(e) {
    return this.useSocket ? this.__internal__.serial.connected && c.isConnected() : !!(e && e.readable && e.writable);
  }
  async timeout(e, t) {
    this.__internal__.last_error.message = "Operation response timed out.", this.__internal__.last_error.action = t, this.__internal__.last_error.code = e, this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0), t === "connect" ? (this.__internal__.serial.connected = !1, this.dispatch("serial:reconnect", {}), s.$dispatchChange(this)) : t === "connection:start" && (await this.serialDisconnect(), this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector += 1, s.$dispatchChange(this), await this.serialConnect()), this.__internal__.serial.queue.length > 0 && this.dispatch("internal:queue", {}), this.dispatch("serial:timeout", {
      ...this.__internal__.last_error,
      bytes: e,
      action: t
    });
  }
  async disconnect(e = null) {
    await this.serialDisconnect(), this.#e(e);
  }
  #e(e = null) {
    this.__internal__.serial.connected = !1, this.__internal__.aux_port_connector = 0, this.dispatch("serial:disconnected", e), s.$dispatchChange(this);
  }
  #s(e) {
    this.__internal__.serial.aux_connecting = e.detail.active ? "connecting" : "finished";
  }
  socketResponse(e) {
    const t = this.__internal__.serial.connected;
    if (e.type === "disconnect" || e.type === "error" && e.data === "DISCONNECTED" ? this.__internal__.serial.connected = !1 : e.type === "success" && (this.__internal__.serial.connected = !0), s.$dispatchChange(this), !t && this.__internal__.serial.connected && (this.dispatch("serial:connected"), this.#o(!1)), e.type === "success")
      this.#r(new Uint8Array(e.data));
    else if (e.type === "error") {
      const n = new Error("The port is closed or is not readable/writable");
      this.serialErrors(n);
    } else e.type === "timeout" && this.timeout(e.data.bytes ?? [], this.lastAction || "unknown");
    this.__internal__.serial.last_action = null;
  }
  async connect() {
    return this.isConnected ? !0 : (this.__internal__.serial.aux_connecting = "idle", new Promise((e, t) => {
      this.#i || (this.#i = this.#s.bind(this)), this.on("internal:connecting", this.#i);
      const n = setInterval(() => {
        this.__internal__.serial.aux_connecting === "finished" ? (clearInterval(n), this.__internal__.serial.aux_connecting = "idle", this.#i !== null && this.off("internal:connecting", this.#i), this.isConnected ? e(!0) : t(`${this.typeDevice} device ${this.deviceNumber} not connected`)) : this.__internal__.serial.aux_connecting === "connecting" && (this.__internal__.serial.aux_connecting = "idle", this.dispatch("internal:connecting", { active: !0 }), this.dispatch("serial:connecting", { active: !0 }));
      }, 100);
      this.serialConnect();
    }));
  }
  async serialDisconnect() {
    try {
      if (this.useSocket)
        c.isConnected() && c.disconnectDevice(this.configDeviceSocket);
      else {
        const e = this.__internal__.serial.reader, t = this.__internal__.serial.output_stream;
        e && (await e.cancel().catch((i) => this.serialErrors(i)), await this.__internal__.serial.input_done), t && (await t.getWriter().close(), await this.__internal__.serial.output_done), this.__internal__.serial.connected && this.__internal__.serial && this.__internal__.serial.port && await this.__internal__.serial.port.close();
      }
    } catch (e) {
      this.serialErrors(e);
    } finally {
      this.__internal__.serial.reader = null, this.__internal__.serial.input_done = null, this.__internal__.serial.output_stream = null, this.__internal__.serial.output_done = null, this.__internal__.serial.connected = !1, this.__internal__.serial.port = null, s.$dispatchChange(this);
    }
  }
  async #a(e) {
    if (c.isDisconnected())
      throw this.#e({ error: "Socket is disconnected." }), new Error("The socket is disconnected");
    if (this.isDisconnected)
      throw this.#e({ error: "Port is closed, not readable or writable." }), new Error("The port is closed or is not readable/writable");
    const t = this.validateBytes(e);
    c.write({ config: this.configDeviceSocket, bytes: Array.from(t) });
  }
  async #n(e) {
    if (this.useSocket) {
      await this.#a(e);
      return;
    }
    const t = this.__internal__.serial.port;
    if (!t || t && (!t.readable || !t.writable))
      throw this.#e({ error: "Port is closed, not readable or writable." }), new Error("The port is closed or is not readable/writable");
    const n = this.validateBytes(e);
    if (this.useRTSCTS && await this.#l(t, 5e3), t.writable === null) return;
    const i = t.writable.getWriter();
    await i.write(n), i.releaseLock();
  }
  async #l(e, t = 5e3) {
    const n = Date.now();
    for (; ; ) {
      if (Date.now() - n > t)
        throw new Error("Timeout waiting for clearToSend signal");
      const { clearToSend: i } = await e.getSignals();
      if (i) return;
      await m(100);
    }
  }
  #r(e = new Uint8Array([]), t = !1) {
    if (e && e.length > 0) {
      const n = this.__internal__.serial.connected;
      if (this.__internal__.serial.connected = this.#t(this.__internal__.serial.port), s.$dispatchChange(this), !n && this.__internal__.serial.connected && (this.dispatch("serial:connected"), this.#o(!1)), this.__internal__.interval.reconnection && (clearInterval(this.__internal__.interval.reconnection), this.__internal__.interval.reconnection = 0), this.__internal__.timeout.until_response && (clearTimeout(this.__internal__.timeout.until_response), this.__internal__.timeout.until_response = 0), this.__internal__.serial.response.as === "hex")
        t ? this.serialCorruptMessage(this.parseUint8ToHex(e)) : this.serialMessage(this.parseUint8ToHex(e));
      else if (this.__internal__.serial.response.as === "uint8")
        t ? this.serialCorruptMessage(e) : this.serialMessage(e);
      else if (this.__internal__.serial.response.as === "string") {
        const i = this.parseUint8ArrayToString(e);
        if (this.__internal__.serial.response.limiter !== null) {
          const o = i.split(this.__internal__.serial.response.limiter);
          for (const r in o)
            o[r] && (t ? this.serialCorruptMessage(o[r]) : this.serialMessage(o[r]));
        } else
          t ? this.serialCorruptMessage(i) : this.serialMessage(i);
      } else {
        const i = this.stringToArrayBuffer(this.parseUint8ArrayToString(e));
        t ? this.serialCorruptMessage(i) : this.serialMessage(i);
      }
    }
    if (this.__internal__.serial.queue.length === 0) {
      this.__internal__.serial.running_queue = !1;
      return;
    }
    this.dispatch("internal:queue", {});
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
  async #_() {
    const e = this.serialFilters, t = await navigator.serial.getPorts({ filters: e });
    return e.length === 0 ? t : t.filter((i) => {
      const o = i.getInfo();
      return e.some((r) => o.usbProductId === r.usbProductId && o.usbVendorId === r.usbVendorId);
    }).filter((i) => !this.#t(i));
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
        this.dispatch("serial:need-permission", {}), s.$dispatchChange(this);
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
        this.dispatch("serial:lost", {}), s.$dispatchChange(this);
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
  #c(e) {
    if (e) {
      const t = this.__internal__.serial.response.buffer, n = new Uint8Array(t.length + e.byteLength);
      n.set(t, 0), n.set(new Uint8Array(e), t.length), this.__internal__.serial.response.buffer = n;
    }
  }
  async #h() {
    this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), this.__internal__.serial.response.buffer && this.#r(this.__internal__.serial.response.buffer), this.__internal__.serial.response.buffer = new Uint8Array(0);
  }
  async #u() {
    this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
      this.__internal__.serial.response.buffer && this.#r(this.__internal__.serial.response.buffer), this.__internal__.serial.response.buffer = new Uint8Array(0);
    }, this.__internal__.serial.free_timeout_ms || 50);
  }
  async #d() {
    const e = this.__internal__.serial.response.length;
    let t = this.__internal__.serial.response.buffer;
    if (this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0), !(e === null || !t || t.length === 0)) {
      for (; t.length >= e; ) {
        const n = t.slice(0, e);
        this.#r(n), t = t.slice(e);
      }
      this.__internal__.serial.response.buffer = t, t.length > 0 && (this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
        this.#r(this.__internal__.serial.response.buffer, !0);
      }, this.__internal__.serial.free_timeout_ms || 50));
    }
  }
  async #f() {
    const {
      limiter: e,
      prefixLimiter: t = !1,
      sufixLimiter: n = !0
    } = this.__internal__.serial.response;
    if (!e)
      throw new Error("No limiter defined for delimited serial response");
    const i = this.__internal__.serial.response.buffer;
    if (!e || !i || i.length === 0) return;
    this.__internal__.serial.time_until_send_bytes && (clearTimeout(this.__internal__.serial.time_until_send_bytes), this.__internal__.serial.time_until_send_bytes = 0);
    let r = new TextDecoder().decode(i);
    const h = [];
    if (typeof e == "string") {
      let l;
      if (t && n)
        l = new RegExp(`${e}([^${e}]+)${e}`, "g");
      else if (t)
        l = new RegExp(`${e}([^${e}]*)`, "g");
      else if (n)
        l = new RegExp(`([^${e}]+)${e}`, "g");
      else
        return;
      let u, _ = 0;
      for (; (u = l.exec(r)) !== null; )
        h.push(new TextEncoder().encode(u[1])), _ = l.lastIndex;
      r = r.slice(_);
    } else if (e instanceof RegExp) {
      let l, u = 0;
      if (t && n) {
        const _ = new RegExp(`${e.source}(.*?)${e.source}`, "g");
        for (; (l = _.exec(r)) !== null; )
          h.push(new TextEncoder().encode(l[1])), u = _.lastIndex;
      } else if (n)
        for (; (l = e.exec(r)) !== null; ) {
          const _ = l.index, d = r.slice(u, _);
          h.push(new TextEncoder().encode(d)), u = e.lastIndex;
        }
      else if (t) {
        const _ = r.split(e);
        _.shift();
        for (const d of _)
          h.push(new TextEncoder().encode(d));
        r = "";
      }
      r = r.slice(u);
    }
    for (const l of h)
      this.#r(l);
    const p = new TextEncoder().encode(r);
    this.__internal__.serial.response.buffer = p, p.length > 0 && (this.__internal__.serial.time_until_send_bytes = setTimeout(() => {
      this.#r(this.__internal__.serial.response.buffer, !0), this.__internal__.serial.response.buffer = new Uint8Array(0);
    }, this.__internal__.serial.free_timeout_ms ?? 50));
  }
  async #p() {
    const e = this.__internal__.serial.port;
    if (!e || !e.readable) throw new Error("Port is not readable");
    const t = this.__internal__.serial.transformStream ? this.__internal__.serial.transformStream : null, n = t ? e.readable.pipeThrough(t).getReader() : e.readable.getReader();
    this.__internal__.serial.reader = n;
    try {
      for (; this.__internal__.serial.keep_reading; ) {
        const { value: i, done: o } = await n.read();
        if (o) break;
        this.#c(i), this.__internal__.serial.transformStream ? await this.#h() : this.__internal__.serial.response.delimited ? await this.#f() : this.__internal__.serial.response.length === null ? await this.#u() : await this.#d();
      }
    } catch (i) {
      this.serialErrors(i);
    } finally {
      n.releaseLock(), this.__internal__.serial.keep_reading = !0, this.__internal__.serial.port && await this.__internal__.serial.port.close();
    }
  }
  #o(e) {
    e !== this.__internal__.serial.connecting && (this.__internal__.serial.connecting = e, this.dispatch("serial:connecting", { active: e }), this.dispatch("internal:connecting", { active: e }));
  }
  async serialConnect() {
    try {
      if (this.#o(!0), this.useSocket) {
        if (c.prepare(), this.__internal__.serial.last_action = "connect", this.__internal__.timeout.until_response = setTimeout(async () => {
          await this.timeout(this.__internal__.serial.bytes_connection ?? [], "connection:start");
        }, this.__internal__.time.response_connection), c.isDisconnected())
          return;
        c.connectDevice(this.configDeviceSocket), this.dispatch("serial:sent", {
          action: "connect",
          bytes: this.__internal__.serial.bytes_connection
        });
      } else {
        const e = await this.#_();
        if (e.length > 0)
          await this.serialPortsSaved(e);
        else {
          const i = this.serialFilters;
          this.__internal__.serial.port = await navigator.serial.requestPort({
            filters: i
          });
        }
        const t = this.__internal__.serial.port;
        if (!t)
          throw new Error("No port selected by the user");
        await t.open(this.serialConfigPort);
        const n = this;
        t.onconnect = (i) => {
          n.dispatch("serial:connected", i), n.#o(!1), s.$dispatchChange(this), n.__internal__.serial.queue.length > 0 ? n.dispatch("internal:queue", {}) : n.__internal__.serial.running_queue = !1;
        }, t.ondisconnect = async () => {
          await n.disconnect();
        }, await m(this.__internal__.serial.delay_first_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
          await n.timeout(n.__internal__.serial.bytes_connection ?? [], "connection:start");
        }, this.__internal__.time.response_connection), this.__internal__.serial.last_action = "connect", await this.#n(this.__internal__.serial.bytes_connection ?? []), this.dispatch("serial:sent", {
          action: "connect",
          bytes: this.__internal__.serial.bytes_connection
        }), this.__internal__.auto_response && this.#r(this.__internal__.serial.auto_response), await this.#p();
      }
    } catch (e) {
      this.#o(!1), this.serialErrors(e);
    }
  }
  async #g() {
    return typeof window > "u" ? !1 : "serial" in navigator && "forget" in SerialPort.prototype && this.__internal__.serial.port ? (await this.__internal__.serial.port.forget(), !0) : !1;
  }
  async serialForget() {
    return await this.#g();
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
    return e.forEach((n, i) => {
      t[i] = "0x" + n;
    }), t;
  }
  bytesToHex(e) {
    return this.add0x(Array.from(e, (t) => this.hexMaker(t)));
  }
  #m() {
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
  #y() {
    const e = this;
    this.on("internal:queue", async () => {
      await e.#b();
    });
    const t = () => {
      e.isConnected && e.#e({ error: "Socket disconnected." });
    }, n = () => {
      e.isDisconnected && !e.isConnecting && e.serialConnect().catch(() => {
      });
    };
    this.useSocket && (window.addEventListener("serial:socket:disconnected", t), window.addEventListener("serial:socket:connected", n)), this.#w();
  }
  #w() {
    const e = this;
    navigator.serial.addEventListener("connect", async () => {
      e.isDisconnected && await e.serialConnect().catch(() => {
      });
    });
  }
  async #b() {
    if (this.useSocket && c.isDisconnected())
      return;
    if (!this.#t(this.__internal__.serial.port)) {
      this.#e({ error: "Port is closed, not readable or writable." }), await this.serialConnect();
      return;
    }
    if (this.__internal__.timeout.until_response) return;
    if (this.__internal__.serial.queue.length === 0) {
      this.__internal__.serial.running_queue = !1;
      return;
    }
    this.__internal__.serial.running_queue = !0;
    const e = this.__internal__.serial.queue[0];
    let t = this.__internal__.time.response_general;
    if (e.action === "connect" && (t = this.__internal__.time.response_connection), this.__internal__.timeout.until_response = setTimeout(async () => {
      await this.timeout(e.bytes, e.action);
    }, t), this.__internal__.serial.last_action = e.action ?? "unknown", await this.#n(e.bytes), this.dispatch("serial:sent", {
      action: e.action,
      bytes: e.bytes
    }), this.__internal__.auto_response) {
      let i = new Uint8Array(0);
      try {
        i = this.validateBytes(this.__internal__.serial.auto_response);
      } catch (o) {
        this.serialErrors(o);
      }
      this.#r(i);
    }
    const n = [...this.__internal__.serial.queue];
    this.__internal__.serial.queue = n.splice(1), this.__internal__.serial.queue.length > 0 && (this.__internal__.serial.running_queue = !0);
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
  #C(e = 1) {
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
  #E() {
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
    this.#E(), this.dispatch("serial:soft-reload", {});
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
    return Array.from(n).map((i) => i.toString(16));
  }
  parseUint8ToHex(e) {
    return Array.from(e).map((t) => t.toString(16).padStart(2, "0").toLowerCase());
  }
  parseHexToUint8(e) {
    return new Uint8Array(e.map((t) => parseInt(t, 16)));
  }
  stringArrayToUint8Array(e) {
    const t = [];
    return typeof e == "string" ? this.parseStringToTextEncoder(e).buffer : (e.forEach((n) => {
      const i = n.replace("0x", "");
      t.push(parseInt(i, 16));
    }), new Uint8Array(t));
  }
  parseUint8ArrayToString(e) {
    let t = new Uint8Array(0);
    e instanceof Uint8Array ? t = e : t = this.stringArrayToUint8Array(e), e = this.parseUint8ToHex(t);
    const n = e.map((i) => parseInt(i, 16));
    return this.__internal__.serial.response.replacer ? String.fromCharCode(...n).replace(this.__internal__.serial.response.replacer, "") : String.fromCharCode(...n);
  }
  hexToAscii(e) {
    const t = e.toString();
    let n = "";
    for (let i = 0; i < t.length; i += 2)
      n += String.fromCharCode(parseInt(t.substring(i, 2), 16));
    return n;
  }
  asciiToHex(e) {
    const t = [];
    for (let n = 0, i = e.length; n < i; n++) {
      const o = Number(e.charCodeAt(n)).toString(16);
      t.push(o);
    }
    return t.join("");
  }
  $checkAndDispatchConnection() {
    return this.isConnected;
  }
}
var E = /* @__PURE__ */ ((a) => (a.CONNECTION_FAILED = "CONNECTION_FAILED", a.DISCONNECTION_FAILED = "DISCONNECTION_FAILED", a.WRITE_FAILED = "WRITE_FAILED", a.READ_FAILED = "READ_FAILED", a.TIMEOUT = "TIMEOUT", a.PORT_NOT_FOUND = "PORT_NOT_FOUND", a.PERMISSION_DENIED = "PERMISSION_DENIED", a.DEVICE_NOT_SUPPORTED = "DEVICE_NOT_SUPPORTED", a.INVALID_CONFIGURATION = "INVALID_CONFIGURATION", a.SOCKET_ERROR = "SOCKET_ERROR", a.UNKNOWN_ERROR = "UNKNOWN_ERROR", a))(E || {});
class w extends Error {
  /**
   * Error code identifying the type of error
   */
  code;
  /**
   * Additional context about the error
   */
  context;
  /**
   * Timestamp when the error occurred
   */
  timestamp;
  /**
   * Creates a new SerialError
   * @param message - Human-readable error message
   * @param code - Error code from SerialErrorCode enum
   * @param context - Additional context information
   * @example
   * ```typescript
   * throw new SerialError(
   *   'Failed to connect to device',
   *   SerialErrorCode.CONNECTION_FAILED,
   *   { port: 'COM3', baudRate: 9600 }
   * );
   * ```
   */
  constructor(e, t = "UNKNOWN_ERROR", n) {
    super(e), this.name = "SerialError", this.code = t, this.context = n, this.timestamp = /* @__PURE__ */ new Date(), Error.captureStackTrace && Error.captureStackTrace(this, w);
  }
  /**
   * Returns a JSON representation of the error
   * @returns Serialized error object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
  /**
   * Returns a formatted string representation of the error
   * @returns Formatted error string
   */
  toString() {
    const e = this.context ? ` | Context: ${JSON.stringify(this.context)}` : "";
    return `${this.name} [${this.code}]: ${this.message}${e}`;
  }
}
export {
  T as Core,
  s as Devices,
  y as Dispatcher,
  w as SerialError,
  E as SerialErrorCode,
  c as Socket
};
//# sourceMappingURL=webserial-core.js.map
