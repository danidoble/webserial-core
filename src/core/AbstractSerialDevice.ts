/**
 * @file AbstractSerialDevice.ts
 *
 * Core abstract base class for all serial device implementations in
 * `webserial-core`. Provides lifecycle management including port selection,
 * handshake validation, typed event-driven streaming, command queue,
 * auto-reconnection, and port locking via {@link SerialRegistry}.
 *
 * @example
 * ```ts
 * import { AbstractSerialDevice, delimiter } from 'webserial-core';
 *
 * class ArduinoDevice extends AbstractSerialDevice<string> {
 *   constructor() {
 *     super({ baudRate: 9600, parser: delimiter('\n') });
 *   }
 *   protected async handshake(): Promise<boolean> {
 *     await this.send('PING\n');
 *     return new Promise((resolve) => {
 *       const handler = (line: string) => {
 *         this.off('serial:data', handler);
 *         resolve(line.trim() === 'PONG');
 *       };
 *       this.on('serial:data', handler);
 *     });
 *   }
 * }
 * ```
 */

import { SerialEventEmitter } from "./SerialEventEmitter.js";
import { SerialRegistry } from "./SerialRegistry.js";
import { CommandQueue } from "../queue/CommandQueue.js";
import {
  SerialPermissionError,
  SerialReadError,
  SerialWriteError,
} from "../errors/index.js";
import type {
  SerialDeviceOptions,
  SerialPolyfillOptions,
  SerialProvider,
} from "../types/index.js";

/**
 * Abstract base class for all serial devices.
 *
 * @typeParam T - Type of parsed data emitted by `"serial:data"` events.
 *   Use `string` with a delimiter parser, `Uint8Array` for raw/fixed-length,
 *   or any custom type with a custom parser.
 */
export abstract class AbstractSerialDevice<T> extends SerialEventEmitter<T> {
  /** The currently open serial port, or `null` when disconnected. */
  protected port: SerialPort | null = null;

  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  private queue: CommandQueue;
  private options: SerialDeviceOptions<T>;
  private isConnecting: boolean = false;
  private abortController: AbortController | null = null;
  private userInitiatedDisconnect: boolean = false;
  private reconnectTimerId: ReturnType<typeof setInterval> | null = null;
  private isHandshaking: boolean = false;

  /**
   * Custom serial provider (e.g. a WebUSB polyfill).
   * Falls back to `navigator.serial` when not set.
   */
  private static customProvider: SerialProvider | null = null;

  /**
   * Options forwarded to the polyfill provider on every
   * `requestPort()` / `getPorts()` call.
   */
  private static polyfillOptions: SerialPolyfillOptions | undefined;

  constructor(options: SerialDeviceOptions<T>) {
    super();
    this.options = {
      baudRate: options.baudRate,
      dataBits: options.dataBits ?? 8,
      stopBits: options.stopBits ?? 1,
      parity: options.parity ?? "none",
      bufferSize: options.bufferSize ?? 255,
      flowControl: options.flowControl ?? "none",
      filters: options.filters ?? [],
      commandTimeout: options.commandTimeout ?? 0,
      parser: options.parser,
      autoReconnect: options.autoReconnect ?? false,
      autoReconnectInterval: options.autoReconnectInterval ?? 1500,
      handshakeTimeout: options.handshakeTimeout ?? 2000,
      provider: options.provider,
      polyfillOptions: options.polyfillOptions,
    };

    this.queue = new CommandQueue({
      commandTimeout: this.options.commandTimeout!,
      onSend: async (command: Uint8Array) => {
        await this.writeToPort(command);
        this.emit("serial:sent", command, this);
      },
      onTimeout: (command: Uint8Array) => {
        this.emit("serial:timeout", command, this);
      },
    });

    // Auto-advance queue on data assuming full packet
    this.on("serial:data", () => {
      this.queue.advance();
    });

    SerialRegistry.register(this as unknown as AbstractSerialDevice<unknown>);
  }

  // ─── Handshake (override in subclass) ─────────────────────────

  /**
   * Override this method in your subclass to perform a handshake
   * after the port is opened. Return `true` if the handshake
   * succeeds (correct device), or `false` to reject the port.
   *
   * The method receives the opened port and should write/read
   * directly to validate the device identity.
   *
   * If not overridden, all ports are accepted (no handshake).
   */
  protected async handshake(): Promise<boolean> {
    return true;
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  public async connect(): Promise<void> {
    if (this.isConnecting) return;
    if (this.port) return;

    this.isConnecting = true;
    this.emit("serial:connecting", this);

    try {
      const serial = this.getSerial();

      if (!serial) {
        throw new Error(
          "Web Serial API is not supported in this browser. " +
            "Use AbstractSerialDevice.setProvider() to set a WebUSB polyfill.",
        );
      }

      // Try to reuse a previously-authorized port that passes handshake
      this.port = await this.findAndValidatePort();

      // If no pre-authorized port found, ask the user via requestPort()
      if (!this.port) {
        let requestedPort: SerialPort;
        try {
          requestedPort = await serial.requestPort(
            { filters: this.options.filters },
            this.options.polyfillOptions ??
              AbstractSerialDevice.polyfillOptions,
          );
        } catch (err: unknown) {
          // Only treat the user-cancel as a permission error.
          // The native API throws DOMException "NotFoundError" when the
          // user dismisses the dialog; the polyfill may also throw a
          // plain DOMException without a name for the same reason.
          const isDOMCancel =
            err instanceof DOMException &&
            (err.name === "NotFoundError" ||
              err.name === "SecurityError" ||
              err.name === "AbortError");

          if (isDOMCancel) {
            throw new SerialPermissionError(
              err instanceof Error ? err.message : String(err),
            );
          }
          // Any other error (e.g. polyfill TypeError "Unable to find
          // interface with class X") should surface as-is so the real
          // message is visible.
          throw err instanceof Error ? err : new Error(String(err));
        }

        // Open and validate the user-selected port
        // openAndHandshake may throw with the real error from port.open()
        // (e.g. polyfill failing to claim USB interfaces).
        const accepted = await this.openAndHandshake(requestedPort);
        if (!accepted) {
          throw new Error(
            "Handshake failed: the selected device did not respond correctly.",
          );
        }
        this.port = requestedPort;
      }

      this.abortController = new AbortController();

      this.queue.resume();
      this.emit("serial:connected", this);
    } catch (err) {
      if (err instanceof SerialPermissionError) {
        this.emit("serial:need-permission", this);
      } else {
        this.emit(
          "serial:error",
          err instanceof Error ? err : new Error(String(err)),
          this,
        );
      }
      if (this.port) {
        SerialRegistry.unlockPort(this.port);
        try {
          await this.port.close();
        } catch {
          // Already closed
        }
        this.port = null;
      }
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.port) return;

    this.userInitiatedDisconnect = true;
    this.stopReconnecting();
    await this.cleanupPort();
  }

  /**
   * Returns `true` if the device is currently connected and the port, reader,
   * and writer are all valid. Note that a port may be "connected" at the
   * Web Serial API level but still have an invalid reader/writer if the device
   * was unplugged or is in a bad state. This method is useful for checking
   * overall health of the connection before attempting to send data.
   * @returns `true` if the device is connected and ready for communication, `false` otherwise.
   */
  public isConnected(): boolean {
    return !!(
      this.port &&
      this.reader &&
      this.writer &&
      this.port.connected &&
      this.port.readable &&
      this.port.writable
    );
  }

  /**
   * Returns `true` if the device is not connected or in the process of connecting.
   * This is a convenience method equivalent to `!isConnected()`, but may be more
   * semantically clear in certain contexts (e.g. when checking for disconnection
   * in a read loop catch block).
   * @returns `true` if the device is disconnected or not ready, `false` if it is currently connected.
   */
  public isDisconnected(): boolean {
    return !this.isConnected();
  }

  /**
   * Internal cleanup: tears down the port, reader, writer without
   * marking it as user-initiated. This allows auto-reconnect to trigger.
   */
  private async cleanupPort(): Promise<void> {
    if (!this.port) return;

    this.queue.pause();
    this.abortController?.abort();
    this.abortController = null;

    try {
      const currentReader = this.reader;
      const currentWriter = this.writer;
      this.reader = null;
      this.writer = null;

      if (currentReader) {
        try {
          await currentReader.cancel();
        } catch {
          // Reader may already be closed
        }
        try {
          currentReader.releaseLock();
        } catch {
          // Lock may already be released
        }
      }
      if (currentWriter) {
        try {
          await currentWriter.close();
        } catch {
          // Writer may already be closed
        }
        try {
          currentWriter.releaseLock();
        } catch {
          // Lock may already be released
        }
      }
      try {
        await this.port.close();
      } catch {
        // Port may already be closed (device lost)
      }
    } catch (err) {
      this.emit(
        "serial:error",
        err instanceof Error ? err : new Error(String(err)),
        this,
      );
    } finally {
      if (this.port) {
        SerialRegistry.unlockPort(this.port);
      }
      this.port = null;
      this.options.parser?.reset?.();
      this.emit("serial:disconnected", this);

      if (!this.userInitiatedDisconnect && this.options.autoReconnect) {
        this.startReconnecting();
      }
      this.userInitiatedDisconnect = false;
    }
  }

  public async forget(): Promise<void> {
    await this.disconnect();
    if (this.port && typeof this.port.forget === "function") {
      await this.port.forget();
    }
    SerialRegistry.unregister(this as unknown as AbstractSerialDevice<unknown>);
  }

  // ─── Communication ────────────────────────────────────────────

  public async send(data: string | Uint8Array): Promise<void> {
    let payload: Uint8Array;
    if (typeof data === "string") {
      payload = new TextEncoder().encode(data);
    } else {
      payload = data;
    }
    if (payload.length > 0) {
      this.queue.enqueue(payload);
    }
  }

  public clearQueue(): void {
    this.queue.clear();
    this.emit("serial:queue-empty", this);
  }

  private async writeToPort(data: Uint8Array): Promise<void> {
    if (!this.port || !this.port.writable) {
      throw new SerialWriteError("Port not writable.");
    }
    this.writer = this.port.writable.getWriter();
    try {
      await this.writer.write(data);
    } catch (err) {
      throw new SerialWriteError(
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      this.writer.releaseLock();
      this.writer = null;
    }
  }

  // ─── Read Loop ────────────────────────────────────────────────

  private async readLoop(): Promise<void> {
    if (!this.port || !this.port.readable) return;
    if (this.reader) return; // Prevent multiple loops

    this.reader = this.port.readable.getReader();
    try {
      while (true) {
        const { value, done } = await this.reader.read();

        if (done) break;
        if (value) {
          if (this.options.parser) {
            this.options.parser.parse(value, (parsed: T) => {
              this.emit("serial:data", parsed, this);
            });
          } else {
            this.emit("serial:data", value as unknown as T, this);
          }
        }
      }
    } catch (err) {
      if (this.port) {
        throw new SerialReadError(
          err instanceof Error ? err.message : String(err),
        );
      }
    } finally {
      if (this.reader) {
        try {
          this.reader.releaseLock();
        } catch {
          // Already released
        }
        this.reader = null;
      }
    }
  }

  // ─── Port Discovery & Handshake ───────────────────────────────

  /**
   * Opens a port, locks it in the registry, starts reading, and runs the handshake.
   * If handshake fails, tears down reader/queue, closes and unlocks the port.
   */
  private async openAndHandshake(port: SerialPort): Promise<boolean> {
    const self = this as unknown as AbstractSerialDevice<unknown>;

    if (SerialRegistry.isPortInUse(port, self)) {
      return false;
    }

    SerialRegistry.lockPort(port, self);

    try {
      await port.open({
        baudRate: this.options.baudRate,
        dataBits: this.options.dataBits,
        stopBits: this.options.stopBits,
        parity: this.options.parity,
        bufferSize: this.options.bufferSize,
        flowControl: this.options.flowControl,
      });
    } catch (err) {
      SerialRegistry.unlockPort(port);
      // Propagate so the caller can decide: connect() surfaces the real
      // error, findAndValidatePort() catches and skips to the next port.
      throw err instanceof Error ? err : new Error(String(err));
    }

    // Assign port so readLoop / writeToPort / send / events work during handshake
    this.port = port;
    this.abortController = new AbortController();

    // Save existing queue so we can restore if handshake fails
    const savedQueue = this.queue.snapshot();

    this.isHandshaking = true;

    // Start reading from port. This loop will continue running forever
    // as long as the port is open!
    this.readLoop().catch((err) => {
      // If we are no longer handshaking, this is a real read error (e.g. device disconnected)
      if (!this.isHandshaking && this.port) {
        this.emit("serial:error", err, this);
        this.cleanupPort();
      }
    });

    // Resume queue so send() actually writes
    this.queue.resume();

    try {
      const ok = await this.runHandshakeWithTimeout();
      this.isHandshaking = false;
      if (!ok) {
        await this.teardownHandshake(port, savedQueue);
        return false;
      }
      // Success — keep the reader running!
      // Clear only handshake commands, restore original queue
      this.queue.pause();
      this.queue.clear();
      this.queue.restore(savedQueue);
      this.options.parser?.reset?.();
      return true;
    } catch {
      this.isHandshaking = false;
      await this.teardownHandshake(port, savedQueue);
      return false;
    }
  }

  /**
   * Cleans up after a failed handshake attempt and restores the queue.
   */
  private async teardownHandshake(
    port: SerialPort,
    savedQueue: Uint8Array[],
  ): Promise<void> {
    this.queue.pause();
    this.queue.clear();
    this.queue.restore(savedQueue);
    await this.stopReader();
    this.port = null;
    this.abortController = null;
    this.options.parser?.reset?.();
    try {
      await port.close();
    } catch {
      // Already closed
    }
    SerialRegistry.unlockPort(port);
  }

  /**
   * Cancels and releases the current reader.
   */
  private async stopReader(): Promise<void> {
    const currentReader = this.reader;
    this.reader = null;
    if (currentReader) {
      try {
        await currentReader.cancel();
      } catch {
        // Already cancelled
      }
      try {
        currentReader.releaseLock();
      } catch {
        // Already released
      }
    }
  }

  /**
   * Wraps the handshake() in a timeout race.
   */
  private async runHandshakeWithTimeout(): Promise<boolean> {
    const timeout = this.options.handshakeTimeout ?? 2000;
    return Promise.race([
      this.handshake(),
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), timeout),
      ),
    ]);
  }

  /**
   * Iterates ALL previously-authorized ports matching filters.
   * For each match, opens + handshake. Returns the first port that passes.
   * If a port fails handshake, it is closed and the next one is tried.
   */
  private async findAndValidatePort(): Promise<SerialPort | null> {
    const serial = this.getSerial();
    if (!serial) return null;

    const ports = await serial.getPorts(
      this.options.polyfillOptions ?? AbstractSerialDevice.polyfillOptions,
    );
    if (ports.length === 0) return null;

    const filters = this.options.filters ?? [];
    const self = this as unknown as AbstractSerialDevice<unknown>;

    for (const port of ports) {
      if (SerialRegistry.isPortInUse(port, self)) continue;

      // Check filter match
      if (filters.length > 0) {
        const info = port.getInfo();
        const matches = filters.some((filter) => {
          const vendorMatch =
            filter.usbVendorId === undefined ||
            filter.usbVendorId === info.usbVendorId;
          const productMatch =
            filter.usbProductId === undefined ||
            filter.usbProductId === info.usbProductId;
          return vendorMatch && productMatch;
        });
        if (!matches) continue;
      }

      // Open and handshake — catch errors so we can try the next port
      try {
        const accepted = await this.openAndHandshake(port);
        if (accepted) return port;
      } catch {
        // open() or handshake failed for this port, try next one
      }
      // If rejected, loop continues to the next port
    }

    return null;
  }

  // ─── Auto-Reconnect ───────────────────────────────────────────

  private startReconnecting(): void {
    if (this.reconnectTimerId) return;

    this.emit("serial:reconnecting", this);

    this.reconnectTimerId = setInterval(async () => {
      if (this.port || this.isConnecting) {
        this.stopReconnecting();
        return;
      }

      try {
        const port = await this.findAndValidatePort();
        if (port) {
          this.stopReconnecting();
          await this.reconnect(port);
        }
      } catch {
        // Will retry on next interval
      }
    }, this.options.autoReconnectInterval);
  }

  public stopReconnecting(): void {
    if (this.reconnectTimerId) {
      clearInterval(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
  }

  private async reconnect(port: SerialPort): Promise<void> {
    if (this.isConnecting || this.port) return;

    this.isConnecting = true;
    this.emit("serial:connecting", this);

    try {
      // Port is already opened and handshaked by findAndValidatePort
      this.port = port;

      this.abortController = new AbortController();

      this.queue.resume();
      this.emit("serial:connected", this);
    } catch (err) {
      this.emit(
        "serial:error",
        err instanceof Error ? err : new Error(String(err)),
        this,
      );
      if (this.port) {
        SerialRegistry.unlockPort(this.port);
        this.port = null;
      }
      if (this.options.autoReconnect) {
        this.startReconnecting();
      }
    } finally {
      this.isConnecting = false;
    }
  }

  // ─── Static ───────────────────────────────────────────────────

  public static getInstances(): AbstractSerialDevice<unknown>[] {
    return SerialRegistry.getInstances();
  }

  public static async connectAll(): Promise<void> {
    const instances = SerialRegistry.getInstances();
    for (const instance of instances) {
      try {
        await instance.connect();
      } catch {
        // Continue attempting others
      }
    }
  }

  /**
   * Sets a custom serial provider (e.g. a WebUSB polyfill for Android).
   * Call this once before any `connect()` if the native Web Serial API
   * is not available.
   *
   * @param provider  The provider object (`{ requestPort, getPorts }`).
   * @param options   Polyfill options forwarded on every `requestPort` /
   *                  `getPorts` call.  Use `usbControlInterfaceClass` to
   *                  support devices that don't use the standard CDC class
   *                  code (2). E.g. `{ usbControlInterfaceClass: 255 }`.
   *
   * @example
   * ```ts
   * import { serial as polyfill } from 'web-serial-polyfill';
   * AbstractSerialDevice.setProvider(polyfill, {
   *   usbControlInterfaceClass: 255,
   * });
   * ```
   */
  public static setProvider(
    provider: SerialProvider,
    options?: SerialPolyfillOptions,
  ): void {
    AbstractSerialDevice.customProvider = provider;
    AbstractSerialDevice.polyfillOptions = options;
  }

  /**
   * Returns the serial provider: instance provider > custom provider > navigator.serial > null.
   */
  private getSerial(): SerialProvider | null {
    if (this.options.provider) {
      return this.options.provider;
    }
    if (AbstractSerialDevice.customProvider) {
      return AbstractSerialDevice.customProvider;
    }
    if (typeof navigator !== "undefined" && navigator.serial) {
      return navigator.serial;
    }
    return null;
  }
}
