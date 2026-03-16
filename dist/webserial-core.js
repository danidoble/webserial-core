//#region src/core/SerialEventEmitter.ts
var e = class {
	listeners = {};
	on(e, t) {
		return this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set()), this.listeners[e].add(t), this;
	}
	off(e, t) {
		return this.listeners[e] && this.listeners[e].delete(t), this;
	}
	emit(e, ...t) {
		let n = this.listeners[e];
		if (!n || n.size === 0) return !1;
		for (let e of n) e(...t);
		return !0;
	}
}, t = class {
	static instances = /* @__PURE__ */ new Set();
	static portInstanceMap = /* @__PURE__ */ new WeakMap();
	static getInstances() {
		return Array.from(this.instances);
	}
	static register(e) {
		this.instances.add(e);
	}
	static unregister(e) {
		this.instances.delete(e);
	}
	static isPortInUse(e, t) {
		let n = this.portInstanceMap.get(e);
		return n !== void 0 && n !== t;
	}
	static lockPort(e, t) {
		this.portInstanceMap.set(e, t);
	}
	static unlockPort(e) {
		this.portInstanceMap.delete(e);
	}
}, n = class {
	queue = [];
	isProcessing = !1;
	isPaused = !0;
	timeoutId = null;
	commandTimeout;
	onSend;
	onTimeout;
	constructor(e) {
		this.commandTimeout = e.commandTimeout, this.onSend = e.onSend, this.onTimeout = e.onTimeout;
	}
	get queueSize() {
		return this.queue.length;
	}
	enqueue(e) {
		this.queue.push(e), this.tryProcessNext();
	}
	advance() {
		this.clearCommandTimeout(), this.isProcessing = !1, this.tryProcessNext();
	}
	pause() {
		this.isPaused = !0, this.clearCommandTimeout(), this.isProcessing = !1;
	}
	resume() {
		this.isPaused = !1, this.tryProcessNext();
	}
	clear() {
		this.queue = [], this.clearCommandTimeout(), this.isProcessing = !1;
	}
	snapshot() {
		return [...this.queue];
	}
	restore(e) {
		this.queue = [...e, ...this.queue];
	}
	tryProcessNext() {
		if (this.isPaused || this.isProcessing || this.queue.length === 0) return;
		this.isProcessing = !0;
		let e = this.queue.shift();
		this.commandTimeout > 0 && (this.timeoutId = setTimeout(() => {
			this.timeoutId = null, this.onTimeout(e), this.advance();
		}, this.commandTimeout)), this.onSend(e).catch(() => {
			this.advance();
		});
	}
	clearCommandTimeout() {
		this.timeoutId !== null && (clearTimeout(this.timeoutId), this.timeoutId = null);
	}
}, r = class e extends Error {
	constructor(t) {
		super(t), this.name = "SerialPortConflictError", Object.setPrototypeOf(this, e.prototype);
	}
}, i = class e extends Error {
	constructor(t) {
		super(t), this.name = "SerialPermissionError", Object.setPrototypeOf(this, e.prototype);
	}
}, a = class e extends Error {
	constructor(t) {
		super(t), this.name = "SerialTimeoutError", Object.setPrototypeOf(this, e.prototype);
	}
}, o = class e extends Error {
	constructor(t) {
		super(t), this.name = "SerialReadError", Object.setPrototypeOf(this, e.prototype);
	}
}, s = class e extends Error {
	constructor(t) {
		super(t), this.name = "SerialWriteError", Object.setPrototypeOf(this, e.prototype);
	}
}, c = class r extends e {
	port = null;
	reader = null;
	writer = null;
	queue;
	options;
	isConnecting = !1;
	abortController = null;
	userInitiatedDisconnect = !1;
	reconnectTimerId = null;
	isHandshaking = !1;
	static customProvider = null;
	static polyfillOptions;
	constructor(e) {
		super(), this.options = {
			baudRate: e.baudRate,
			dataBits: e.dataBits ?? 8,
			stopBits: e.stopBits ?? 1,
			parity: e.parity ?? "none",
			bufferSize: e.bufferSize ?? 255,
			flowControl: e.flowControl ?? "none",
			filters: e.filters ?? [],
			commandTimeout: e.commandTimeout ?? 0,
			parser: e.parser,
			autoReconnect: e.autoReconnect ?? !1,
			autoReconnectInterval: e.autoReconnectInterval ?? 1500,
			handshakeTimeout: e.handshakeTimeout ?? 2e3,
			provider: e.provider,
			polyfillOptions: e.polyfillOptions
		}, this.queue = new n({
			commandTimeout: this.options.commandTimeout,
			onSend: async (e) => {
				await this.writeToPort(e), this.emit("serial:sent", e, this);
			},
			onTimeout: (e) => {
				this.emit("serial:timeout", e, this);
			}
		}), this.on("serial:data", () => {
			this.queue.advance();
		}), t.register(this);
	}
	async handshake() {
		return !0;
	}
	async connect() {
		if (!this.isConnecting && !this.port) {
			this.isConnecting = !0, this.emit("serial:connecting", this);
			try {
				let e = this.getSerial();
				if (!e) throw Error("Web Serial API is not supported in this browser. Use AbstractSerialDevice.setProvider() to set a WebUSB polyfill.");
				if (this.port = await this.findAndValidatePort(), !this.port) {
					let t;
					try {
						t = await e.requestPort({ filters: this.options.filters }, this.options.polyfillOptions ?? r.polyfillOptions);
					} catch (e) {
						throw e instanceof DOMException && (e.name === "NotFoundError" || e.name === "SecurityError" || e.name === "AbortError") ? new i(e instanceof Error ? e.message : String(e)) : e instanceof Error ? e : Error(String(e));
					}
					if (!await this.openAndHandshake(t)) throw Error("Handshake failed: the selected device did not respond correctly.");
					this.port = t;
				}
				this.abortController = new AbortController(), this.queue.resume(), this.emit("serial:connected", this);
			} catch (e) {
				if (e instanceof i ? this.emit("serial:need-permission", this) : this.emit("serial:error", e instanceof Error ? e : Error(String(e)), this), this.port) {
					t.unlockPort(this.port);
					try {
						await this.port.close();
					} catch {}
					this.port = null;
				}
				throw e;
			} finally {
				this.isConnecting = !1;
			}
		}
	}
	async disconnect() {
		this.port && (this.userInitiatedDisconnect = !0, this.stopReconnecting(), await this.cleanupPort());
	}
	async cleanupPort() {
		if (this.port) {
			this.queue.pause(), this.abortController?.abort(), this.abortController = null;
			try {
				let e = this.reader, t = this.writer;
				if (this.reader = null, this.writer = null, e) {
					try {
						await e.cancel();
					} catch {}
					try {
						e.releaseLock();
					} catch {}
				}
				if (t) {
					try {
						await t.close();
					} catch {}
					try {
						t.releaseLock();
					} catch {}
				}
				try {
					await this.port.close();
				} catch {}
			} catch (e) {
				this.emit("serial:error", e instanceof Error ? e : Error(String(e)), this);
			} finally {
				this.port && t.unlockPort(this.port), this.port = null, this.options.parser?.reset?.(), this.emit("serial:disconnected", this), !this.userInitiatedDisconnect && this.options.autoReconnect && this.startReconnecting(), this.userInitiatedDisconnect = !1;
			}
		}
	}
	async forget() {
		await this.disconnect(), this.port && typeof this.port.forget == "function" && await this.port.forget(), t.unregister(this);
	}
	async send(e) {
		let t;
		t = typeof e == "string" ? new TextEncoder().encode(e) : e, t.length > 0 && this.queue.enqueue(t);
	}
	clearQueue() {
		this.queue.clear(), this.emit("serial:queue-empty", this);
	}
	async writeToPort(e) {
		if (!this.port || !this.port.writable) throw new s("Port not writable.");
		this.writer = this.port.writable.getWriter();
		try {
			await this.writer.write(e);
		} catch (e) {
			throw new s(e instanceof Error ? e.message : String(e));
		} finally {
			this.writer.releaseLock(), this.writer = null;
		}
	}
	async readLoop() {
		if (!(!this.port || !this.port.readable) && !this.reader) {
			this.reader = this.port.readable.getReader();
			try {
				for (;;) {
					let { value: e, done: t } = await this.reader.read();
					if (t) break;
					e && (this.options.parser ? this.options.parser.parse(e, (e) => {
						this.emit("serial:data", e, this);
					}) : this.emit("serial:data", e, this));
				}
			} catch (e) {
				if (this.port) throw new o(e instanceof Error ? e.message : String(e));
			} finally {
				if (this.reader) {
					try {
						this.reader.releaseLock();
					} catch {}
					this.reader = null;
				}
			}
		}
	}
	async openAndHandshake(e) {
		let n = this;
		if (t.isPortInUse(e, n)) return !1;
		t.lockPort(e, n);
		try {
			await e.open({
				baudRate: this.options.baudRate,
				dataBits: this.options.dataBits,
				stopBits: this.options.stopBits,
				parity: this.options.parity,
				bufferSize: this.options.bufferSize,
				flowControl: this.options.flowControl
			});
		} catch (n) {
			throw t.unlockPort(e), n instanceof Error ? n : Error(String(n));
		}
		this.port = e, this.abortController = new AbortController();
		let r = this.queue.snapshot();
		this.isHandshaking = !0, this.readLoop().catch((e) => {
			!this.isHandshaking && this.port && (this.emit("serial:error", e, this), this.cleanupPort());
		}), this.queue.resume();
		try {
			let t = await this.runHandshakeWithTimeout();
			return this.isHandshaking = !1, t ? (this.queue.pause(), this.queue.clear(), this.queue.restore(r), this.options.parser?.reset?.(), !0) : (await this.teardownHandshake(e, r), !1);
		} catch {
			return this.isHandshaking = !1, await this.teardownHandshake(e, r), !1;
		}
	}
	async teardownHandshake(e, n) {
		this.queue.pause(), this.queue.clear(), this.queue.restore(n), await this.stopReader(), this.port = null, this.abortController = null, this.options.parser?.reset?.();
		try {
			await e.close();
		} catch {}
		t.unlockPort(e);
	}
	async stopReader() {
		let e = this.reader;
		if (this.reader = null, e) {
			try {
				await e.cancel();
			} catch {}
			try {
				e.releaseLock();
			} catch {}
		}
	}
	async runHandshakeWithTimeout() {
		let e = this.options.handshakeTimeout ?? 2e3;
		return Promise.race([this.handshake(), new Promise((t) => setTimeout(() => t(!1), e))]);
	}
	async findAndValidatePort() {
		let e = this.getSerial();
		if (!e) return null;
		let n = await e.getPorts(this.options.polyfillOptions ?? r.polyfillOptions);
		if (n.length === 0) return null;
		let i = this.options.filters ?? [], a = this;
		for (let e of n) if (!t.isPortInUse(e, a)) {
			if (i.length > 0) {
				let t = e.getInfo();
				if (!i.some((e) => {
					let n = e.usbVendorId === void 0 || e.usbVendorId === t.usbVendorId, r = e.usbProductId === void 0 || e.usbProductId === t.usbProductId;
					return n && r;
				})) continue;
			}
			try {
				if (await this.openAndHandshake(e)) return e;
			} catch {}
		}
		return null;
	}
	startReconnecting() {
		this.reconnectTimerId ||= (this.emit("serial:reconnecting", this), setInterval(async () => {
			if (this.port || this.isConnecting) {
				this.stopReconnecting();
				return;
			}
			try {
				let e = await this.findAndValidatePort();
				e && (this.stopReconnecting(), await this.reconnect(e));
			} catch {}
		}, this.options.autoReconnectInterval));
	}
	stopReconnecting() {
		this.reconnectTimerId &&= (clearInterval(this.reconnectTimerId), null);
	}
	async reconnect(e) {
		if (!(this.isConnecting || this.port)) {
			this.isConnecting = !0, this.emit("serial:connecting", this);
			try {
				this.port = e, this.abortController = new AbortController(), this.queue.resume(), this.emit("serial:connected", this);
			} catch (e) {
				this.emit("serial:error", e instanceof Error ? e : Error(String(e)), this), this.port &&= (t.unlockPort(this.port), null), this.options.autoReconnect && this.startReconnecting();
			} finally {
				this.isConnecting = !1;
			}
		}
	}
	static getInstances() {
		return t.getInstances();
	}
	static async connectAll() {
		let e = t.getInstances();
		for (let t of e) try {
			await t.connect();
		} catch {}
	}
	static setProvider(e, t) {
		r.customProvider = e, r.polyfillOptions = t;
	}
	getSerial() {
		return this.options.provider ? this.options.provider : r.customProvider ? r.customProvider : typeof navigator < "u" && navigator.serial ? navigator.serial : null;
	}
};
//#endregion
//#region src/parsers/FixedLengthParser.ts
function l(e) {
	if (e <= 0) throw Error("FixedLengthParser: length must be greater than 0");
	let t = new Uint8Array();
	return {
		parse(n, r) {
			let i = new Uint8Array(t.length + n.length);
			for (i.set(t), i.set(n, t.length), t = i; t.length >= e;) r(t.slice(0, e)), t = t.slice(e);
		},
		reset() {
			t = new Uint8Array();
		}
	};
}
//#endregion
//#region src/parsers/DelimiterParser.ts
function u(e) {
	let t = "", n = new TextDecoder();
	return {
		parse(r, i) {
			t += n.decode(r, { stream: !0 });
			let a;
			for (; (a = t.indexOf(e)) !== -1;) i(t.slice(0, a)), t = t.slice(a + e.length);
		},
		reset() {
			t = "", n = new TextDecoder();
		}
	};
}
//#endregion
//#region src/parsers/RawParser.ts
function d() {
	return {
		parse(e, t) {
			t(e);
		},
		reset() {}
	};
}
//#endregion
//#region src/providers/WebUsbProvider.ts
var f = 32, p = 34, m = 0, h = 30, g = 3, _ = 7, v = 1, y = 0, b = 771, x = 768, S = 255, C = 8, w = "none", T = 1, E = [
	16,
	8,
	7,
	6,
	5
], D = [1, 2], O = [
	"none",
	"even",
	"odd"
], k = [
	"none",
	"odd",
	"even"
], A = [
	1,
	1.5,
	2
], j = {
	usbControlInterfaceClass: 2,
	usbTransferInterfaceClass: 10,
	protocol: void 0
};
function M(e, t) {
	let n = e.configurations[0];
	for (let e of n.interfaces) if (e.alternates[0].interfaceClass === t) return e;
	return null;
}
function N(e, t) {
	let n = e.configurations[0];
	for (let e of n.interfaces) {
		let n = e.alternates[0];
		if (n.interfaceClass !== t) continue;
		let r = n.endpoints.some((e) => e.direction === "in"), i = n.endpoints.some((e) => e.direction === "out");
		if (r && i) return e;
	}
	return null;
}
function P(e, t) {
	let n = e.alternates[0];
	for (let e of n.endpoints) if (e.direction === t) return e;
	throw TypeError(`Interface ${e.interfaceNumber} does not have an ${t} endpoint.`);
}
function F(e, t) {
	return t === 2 ? "cdc_acm" : e.vendorId === 4292 ? "cp210x" : "none";
}
var I = class {
	device_;
	endpoint_;
	onError_;
	constructor(e, t, n) {
		this.device_ = e, this.endpoint_ = t, this.onError_ = n;
	}
	pull(e) {
		(async () => {
			let t = this.endpoint_.packetSize;
			try {
				let n = await this.device_.transferIn(this.endpoint_.endpointNumber, t);
				if (n.status !== "ok") {
					e.error(`USB error: ${n.status}`), this.onError_();
					return;
				}
				if (n.data?.buffer && n.data.byteLength > 0) {
					let t = new Uint8Array(n.data.buffer, n.data.byteOffset, n.data.byteLength);
					t.length > 0 && e.enqueue(t);
				}
			} catch (t) {
				e.error(String(t)), this.onError_();
			}
		})();
	}
}, L = class {
	device_;
	endpoint_;
	onError_;
	constructor(e, t, n) {
		this.device_ = e, this.endpoint_ = t, this.onError_ = n;
	}
	async write(e, t) {
		try {
			let n = await this.device_.transferOut(this.endpoint_.endpointNumber, e.buffer);
			n.status !== "ok" && (t.error(n.status), this.onError_());
		} catch (e) {
			t.error(String(e)), this.onError_();
		}
	}
}, R = class {
	device_;
	protocol_;
	controlInterface_;
	transferInterface_;
	inEndpoint_;
	outEndpoint_;
	serialOptions_;
	readable_ = null;
	writable_ = null;
	cdcOutputSignals_ = {
		dataTerminalReady: !1,
		requestToSend: !1,
		break: !1
	};
	constructor(e, t) {
		this.device_ = e;
		let n = {
			...j,
			...t
		};
		this.protocol_ = n.protocol ?? F(e, n.usbControlInterfaceClass);
		let r = n.usbControlInterfaceClass, i = n.usbTransferInterfaceClass;
		if (r === i) {
			let t = N(e, i);
			if (!t) throw TypeError(`Unable to find interface with class ${i} that has both IN and OUT endpoints.`);
			this.controlInterface_ = t, this.transferInterface_ = t;
		} else {
			let t = M(e, r);
			if (!t) throw TypeError(`Unable to find control interface with class ${r}.`);
			let n = N(e, i) ?? M(e, i);
			if (!n) throw TypeError(`Unable to find transfer interface with class ${i}.`);
			this.controlInterface_ = t, this.transferInterface_ = n;
		}
		this.inEndpoint_ = P(this.transferInterface_, "in"), this.outEndpoint_ = P(this.transferInterface_, "out");
	}
	get readable() {
		return !this.readable_ && this.device_.opened && (this.readable_ = new ReadableStream(new I(this.device_, this.inEndpoint_, () => {
			this.readable_ = null;
		}), { highWaterMark: this.serialOptions_?.bufferSize ?? S })), this.readable_;
	}
	get writable() {
		return !this.writable_ && this.device_.opened && (this.writable_ = new WritableStream(new L(this.device_, this.outEndpoint_, () => {
			this.writable_ = null;
		}), new ByteLengthQueuingStrategy({ highWaterMark: this.serialOptions_?.bufferSize ?? S }))), this.writable_;
	}
	async open(e) {
		this.serialOptions_ = e, this.validateOptions();
		try {
			switch (await this.device_.open(), this.device_.configuration === null && await this.device_.selectConfiguration(1), await this.device_.claimInterface(this.controlInterface_.interfaceNumber), this.controlInterface_ !== this.transferInterface_ && await this.device_.claimInterface(this.transferInterface_.interfaceNumber), this.protocol_) {
				case "cdc_acm":
					await this.cdcInit();
					break;
				case "cp210x":
					await this.cp210xInit();
					break;
				case "none": break;
			}
		} catch (e) {
			throw this.device_.opened && await this.device_.close(), Error("Error setting up device: " + (e instanceof Error ? e.message : String(e)), { cause: e });
		}
	}
	async close() {
		let e = [];
		if (this.readable_ && e.push(this.readable_.cancel()), this.writable_ && e.push(this.writable_.abort()), await Promise.all(e), this.readable_ = null, this.writable_ = null, this.device_.opened) {
			switch (this.protocol_) {
				case "cdc_acm":
					await this.cdcSetSignals({
						dataTerminalReady: !1,
						requestToSend: !1
					});
					break;
				case "cp210x":
					await this.cp210xDeinit();
					break;
			}
			await this.device_.close();
		}
	}
	async forget() {
		return this.device_.forget();
	}
	getInfo() {
		return {
			usbVendorId: this.device_.vendorId,
			usbProductId: this.device_.productId
		};
	}
	async cdcInit() {
		await this.cdcSetLineCoding(), await this.cdcSetSignals({ dataTerminalReady: !0 });
	}
	async cdcSetSignals(e) {
		if (this.cdcOutputSignals_ = {
			...this.cdcOutputSignals_,
			...e
		}, e.dataTerminalReady !== void 0 || e.requestToSend !== void 0) {
			let e = (this.cdcOutputSignals_.dataTerminalReady ? 1 : 0) | (this.cdcOutputSignals_.requestToSend ? 2 : 0);
			await this.device_.controlTransferOut({
				requestType: "class",
				recipient: "interface",
				request: p,
				value: e,
				index: this.controlInterface_.interfaceNumber
			});
		}
	}
	async cdcSetLineCoding() {
		let e = /* @__PURE__ */ new ArrayBuffer(7), t = new DataView(e);
		if (t.setUint32(0, this.serialOptions_.baudRate, !0), t.setUint8(4, A.indexOf(this.serialOptions_.stopBits ?? T)), t.setUint8(5, k.indexOf(this.serialOptions_.parity ?? w)), t.setUint8(6, this.serialOptions_.dataBits ?? C), (await this.device_.controlTransferOut({
			requestType: "class",
			recipient: "interface",
			request: f,
			value: 0,
			index: this.controlInterface_.interfaceNumber
		}, e)).status !== "ok") throw new DOMException("Failed to set line coding.", "NetworkError");
	}
	async cp210xInit() {
		let e = this.controlInterface_.interfaceNumber;
		await this.device_.controlTransferOut({
			requestType: "vendor",
			recipient: "interface",
			request: m,
			value: v,
			index: e
		});
		let t = /* @__PURE__ */ new ArrayBuffer(4);
		new DataView(t).setUint32(0, this.serialOptions_.baudRate, !0), await this.device_.controlTransferOut({
			requestType: "vendor",
			recipient: "interface",
			request: h,
			value: 0,
			index: e
		}, t);
		let n = this.serialOptions_.dataBits ?? C, r = {
			none: 0,
			odd: 16,
			even: 32
		}[this.serialOptions_.parity ?? w] ?? 0, i = ({
			1: 0,
			2: 2
		}[this.serialOptions_.stopBits ?? T] ?? 0) << 8 | r | n;
		await this.device_.controlTransferOut({
			requestType: "vendor",
			recipient: "interface",
			request: g,
			value: i,
			index: e
		}), await this.device_.controlTransferOut({
			requestType: "vendor",
			recipient: "interface",
			request: _,
			value: b,
			index: e
		});
	}
	async cp210xDeinit() {
		let e = this.controlInterface_.interfaceNumber;
		await this.device_.controlTransferOut({
			requestType: "vendor",
			recipient: "interface",
			request: _,
			value: x,
			index: e
		}), await this.device_.controlTransferOut({
			requestType: "vendor",
			recipient: "interface",
			request: m,
			value: y,
			index: e
		});
	}
	validateOptions() {
		if (this.serialOptions_.baudRate % 1 != 0) throw RangeError("invalid Baud Rate " + this.serialOptions_.baudRate);
		if (this.serialOptions_.dataBits !== void 0 && !E.includes(this.serialOptions_.dataBits)) throw RangeError("invalid dataBits " + this.serialOptions_.dataBits);
		if (this.serialOptions_.stopBits !== void 0 && !D.includes(this.serialOptions_.stopBits)) throw RangeError("invalid stopBits " + this.serialOptions_.stopBits);
		if (this.serialOptions_.parity !== void 0 && !O.includes(this.serialOptions_.parity)) throw RangeError("invalid parity " + this.serialOptions_.parity);
	}
}, z = class {
	options_;
	constructor(e) {
		this.options_ = {
			...j,
			...e
		};
	}
	async requestPort(e, t) {
		let n = {
			...this.options_,
			...t
		}, r = [];
		if (e?.filters && e.filters.length > 0) for (let t of e.filters) {
			let e = {};
			t.usbVendorId !== void 0 && (e.vendorId = t.usbVendorId), t.usbProductId !== void 0 && (e.productId = t.usbProductId), n.usbControlInterfaceClass !== void 0 && n.usbControlInterfaceClass !== 255 ? e.classCode = n.usbControlInterfaceClass : e.vendorId === void 0 && e.productId === void 0 && (e.classCode = n.usbControlInterfaceClass ?? 2), r.push(e);
		}
		else r.push({ classCode: n.usbControlInterfaceClass ?? 2 });
		return new R(await navigator.usb.requestDevice({ filters: r }), n);
	}
	async getPorts(e) {
		let t = {
			...this.options_,
			...e
		}, n = await navigator.usb.getDevices(), r = [];
		for (let e of n) try {
			let n = new R(e, t);
			r.push(n);
		} catch {}
		return r;
	}
};
//#endregion
export { c as AbstractSerialDevice, n as CommandQueue, e as SerialEventEmitter, i as SerialPermissionError, r as SerialPortConflictError, o as SerialReadError, t as SerialRegistry, a as SerialTimeoutError, s as SerialWriteError, z as WebUsbProvider, u as delimiter, l as fixedLength, d as raw };
