/**
 * @file WebSocketProvider.ts
 *
 * WebSocket serial adapter for `webserial-core`.
 *
 * Implements the {@link SerialProvider} interface by relaying serial data
 * over a WebSocket connection to a Node.js bridge server that owns the
 * physical serial port.
 *
 * **Architecture:**
 * ```
 * Browser (webserial-core)
 *   └── WebSocketProvider
 *         └── WebSocket ←─── JSON protocol ───→ Node.js bridge server
 *                                                   └── serialport (npm)
 *                                                         └── Physical device
 * ```
 *
 * **Wire protocol (JSON messages):**
 *
 * Client → Server:
 * - `{ type: "list-ports", filters: SerialPortFilter[] }` — request available ports
 * - `{ type: "open", path, baudRate, dataBits, stopBits, parity, parser }` — open a port
 * - `{ type: "write", bytes: number[] }` — send bytes to the device
 * - `{ type: "close" }` — close the port and disconnect
 *
 * Server → Client:
 * - `{ type: "port-list", payload: PortInfo[] }` — list of available serial ports
 * - `{ type: "opened" }` — port successfully opened
 * - `{ type: "data", bytes: number[] }` — received bytes from the device
 * - `{ type: "closed" }` — port was closed (by server or device disconnect)
 *
 * @example
 * ```ts
 * import { createWebSocketProvider, AbstractSerialDevice, delimiter } from 'webserial-core';
 *
 * AbstractSerialDevice.setProvider(createWebSocketProvider('ws://localhost:8080'));
 *
 * class MyDevice extends AbstractSerialDevice<string> {
 *   constructor() {
 *     super({ baudRate: 9600, parser: delimiter('\n') });
 *   }
 * }
 *
 * const device = new MyDevice();
 * await device.connect();
 * device.on('serial:data', (line) => console.log('Received:', line));
 * await device.send('PING\n');
 * ```
 */

import type { SerialProvider, SerialPortFilter } from "../../types/index.js";

// ─── Wire protocol types ─────────────────────────────────────────────────────

/** Information about a serial port available on the bridge server. */
interface PortInfo {
  /** Platform path, e.g. `/dev/ttyUSB0` or `COM3`. */
  path: string;
  /** USB vendor ID (if applicable). */
  vendorId?: number;
  /** USB product ID (if applicable). */
  productId?: number;
}

// ─── WebSocket helpers ───────────────────────────────────────────────────────

/**
 * Resolves when the WebSocket connection is open, or rejects on error.
 *
 * @param ws - The WebSocket to wait on.
 * @returns A promise that resolves when the socket is open.
 */
function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => fail(new Error("WebSocket connection timed out")),
      5000,
    );
    const cleanup = (): void => {
      clearTimeout(timer);
      ws.removeEventListener("open", opened);
      ws.removeEventListener("error", failed);
      ws.removeEventListener("close", closed);
    };
    const fail = (error: Error): void => {
      cleanup();
      ws.close();
      reject(error);
    };
    const opened = (): void => {
      cleanup();
      resolve();
    };
    const failed = (): void => fail(new Error("WebSocket connection failed"));
    const closed = (): void =>
      fail(new Error("WebSocket closed before opening"));
    ws.addEventListener("open", opened);
    ws.addEventListener("error", failed);
    ws.addEventListener("close", closed);
  });
}

/**
 * Resolves with the first server message whose `type` field matches.
 *
 * @param ws - The WebSocket to listen on.
 * @param expectedType - The message `type` to wait for.
 * @returns A promise that resolves with the message `payload`.
 */
function waitForMessage<T>(ws: WebSocket, expectedType: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => fail(new Error(`Timed out waiting for ${expectedType}`)),
      5000,
    );
    const cleanup = (): void => {
      clearTimeout(timer);
      ws.removeEventListener("message", handler);
      ws.removeEventListener("close", closed);
      ws.removeEventListener("error", errored);
    };
    const fail = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const closed = (): void => fail(new Error("WebSocket closed"));
    const errored = (): void => fail(new Error("WebSocket failed"));
    const handler = (event: MessageEvent): void => {
      let msg: { type?: string; payload?: T & { message?: string } };
      try {
        if (typeof event.data !== "string" || event.data.length > 512 * 1024)
          throw new Error("Invalid bridge message");
        msg = JSON.parse(event.data);
        if (!msg || typeof msg !== "object")
          throw new Error("Invalid bridge message");
      } catch {
        fail(new Error("Invalid bridge message"));
        return;
      }
      if (msg.type === "error") {
        fail(new Error(msg.payload?.message ?? "Bridge error"));
        return;
      }
      if (msg.type === expectedType) {
        cleanup();
        resolve(msg.payload as T);
      }
    };
    ws.addEventListener("message", handler);
    ws.addEventListener("close", closed);
    ws.addEventListener("error", errored);
  });
}

// ─── SerialPort adapter ──────────────────────────────────────────────────────

/**
 * Creates a `SerialPort`-compatible object backed by the given WebSocket
 * connection and port information from the bridge server.
 *
 * @param ws - An already-open WebSocket connected to the bridge server.
 * @param portInfo - Information about which serial port on the server to open.
 * @returns A `SerialPort`-compatible object.
 */
function createWsSerialPort(
  initialSocket: WebSocket | null,
  portInfo: PortInfo,
  serverUrl: string,
): SerialPort {
  let ws = initialSocket;
  let readable: ReadableStream<Uint8Array> | null = null;
  let writable: WritableStream<Uint8Array> | null = null;

  return {
    get readable(): ReadableStream<Uint8Array> | null {
      return readable;
    },

    get writable(): WritableStream<Uint8Array> | null {
      return writable;
    },

    getInfo(): SerialPortInfo {
      return {
        usbVendorId: portInfo.vendorId,
        usbProductId: portInfo.productId,
      };
    },

    /**
     * Sends an `open` request to the bridge server and awaits the
     * `opened` acknowledgment. Initializes the readable and writable streams.
     *
     * @param options - Serial port options forwarded to the bridge server.
     */
    async open(options: SerialOptions): Promise<void> {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        ws = new WebSocket(serverUrl);
        await waitForOpen(ws);
      }
      ws.send(
        JSON.stringify({
          type: "open",
          path: portInfo.path,
          baudRate: options.baudRate,
          dataBits: options.dataBits,
          stopBits: options.stopBits,
          parity: options.parity,
          // Framing belongs to the parser selected by AbstractSerialDevice.
          parser: { type: "raw" },
        }),
      );

      try {
        await waitForMessage(ws, "opened");
      } catch (error) {
        ws.close();
        throw error;
      }
      const activeSocket = ws;

      // Internal buffer: accumulates chunks that arrive before ReadableStream
      // has an active reader. Drained in the stream's start() callback.
      const pendingChunks: Uint8Array[] = [];
      let streamController: ReadableStreamDefaultController<Uint8Array> | null =
        null;
      let streamClosed = false;

      function onMessage(event: MessageEvent): void {
        let msg: {
          type: string;
          bytes?: number[];
          payload?: { message?: string };
        };
        try {
          if (typeof event.data !== "string" || event.data.length > 512 * 1024)
            throw new Error("Invalid bridge message");
          msg = JSON.parse(event.data);
          if (!msg || typeof msg.type !== "string")
            throw new Error("Invalid bridge message");
          if (
            msg.type === "data" &&
            (!Array.isArray(msg.bytes) ||
              msg.bytes.length > 65536 ||
              !msg.bytes.every(
                (byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255,
              ))
          )
            throw new Error("Invalid bridge bytes");
        } catch {
          streamClosed = true;
          streamController?.error(new Error("Invalid bridge message"));
          activeSocket.close();
          return;
        }

        if (msg.type === "data" && msg.bytes) {
          const chunk = new Uint8Array(msg.bytes);
          if (streamController) {
            if ((streamController.desiredSize ?? 0) <= 0) {
              streamController.error(new Error("Bridge receive buffer full"));
              streamClosed = true;
              activeSocket.close();
              return;
            }
            streamController.enqueue(chunk);
          } else {
            if (
              pendingChunks.reduce(
                (size, pending) => size + pending.length,
                0,
              ) +
                chunk.length >
              1024 * 1024
            ) {
              activeSocket.close();
              return;
            }
            pendingChunks.push(chunk);
          }
        }

        if (msg.type === "error") {
          streamClosed = true;
          streamController?.error(
            new Error(msg.payload?.message ?? "Bridge error"),
          );
          activeSocket.close();
        }

        if (msg.type === "closed" || msg.type === "disconnected") {
          streamClosed = true;
          if (streamController) {
            streamController.close();
          }
        }
      }

      activeSocket.addEventListener("message", onMessage);
      activeSocket.addEventListener(
        "close",
        () => {
          if (!streamClosed && streamController) {
            streamClosed = true;
            streamController.close();
          }
        },
        { once: true },
      );

      readable = new ReadableStream<Uint8Array>(
        {
          start(controller: ReadableStreamDefaultController<Uint8Array>): void {
            streamController = controller;
            // Drain any buffered chunks that arrived before the reader was ready
            for (const chunk of pendingChunks) {
              controller.enqueue(chunk);
            }
            pendingChunks.length = 0;
            // Handle the edge case where the port closed while we were buffering
            if (streamClosed) {
              controller.close();
            }
          },
          cancel(): void {
            // Remove the WS listener when the abstract device cancels the reader
            // (disconnect, reconnect, or teardown).
            activeSocket.removeEventListener("message", onMessage);
            streamController = null;
          },
        },
        { highWaterMark: 16 },
      );

      writable = new WritableStream<Uint8Array>({
        write(chunk: Uint8Array): void {
          if (
            activeSocket.readyState !== WebSocket.OPEN ||
            chunk.length > 65536
          )
            throw new Error("WebSocket unavailable or write too large");
          activeSocket.send(
            JSON.stringify({
              type: "write",
              bytes: Array.from(chunk),
            }),
          );
        },
      });
    },

    /**
     * Sends a `close` request to the bridge server and tears down the streams.
     */
    async close(): Promise<void> {
      if (ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "close" }));
      readable = null;
      writable = null;
      ws?.close();
      ws = null;
    },
  } as SerialPort;
}

// ─── WebSocketProvider ───────────────────────────────────────────────────────

/**
 * Creates a {@link SerialProvider} that communicates with a Node.js serial
 * bridge server over WebSockets.
 *
 * The bridge server must implement the JSON wire protocol described in this
 * file's module documentation. A reference implementation is provided in
 * `demos/websocket/server.js`.
 *
 * @param serverUrl - The WebSocket URL of the bridge server (e.g. `"ws://localhost:8080"`).
 * @returns A `SerialProvider` that relays serial I/O over WebSocket.
 *
 * @example
 * ```ts
 * import { createWebSocketProvider, AbstractSerialDevice } from 'webserial-core';
 *
 * AbstractSerialDevice.setProvider(createWebSocketProvider('ws://localhost:8080'));
 * ```
 */
export function createWebSocketProvider(serverUrl: string): SerialProvider {
  return {
    /**
     * Connects to the bridge server, requests the list of available ports,
     * and returns a `SerialPort`-compatible object for the first matching port.
     *
     * In production you would display a picker UI when multiple ports are
     * returned. This implementation auto-selects the first available port.
     *
     * @param options - Optional filter list to restrict which ports are returned.
     * @returns A `SerialPort`-compatible object for the selected port.
     * @throws {Error} If no ports are available on the server.
     */
    async requestPort(options?: {
      filters?: SerialPortFilter[];
    }): Promise<SerialPort> {
      const ws = new WebSocket(serverUrl);
      await waitForOpen(ws);

      ws.send(
        JSON.stringify({
          type: "list-ports",
          filters: options?.filters ?? [],
        }),
      );

      let ports: PortInfo[];
      try {
        ports = await waitForMessage<PortInfo[]>(ws, "port-list");
      } catch (error) {
        ws.close();
        throw error;
      }
      if (
        !Array.isArray(ports) ||
        ports.length > 256 ||
        ports.some((port) => !port || typeof port.path !== "string")
      ) {
        ws.close();
        throw new Error("Invalid port list from bridge");
      }

      const selected = ports[0];
      if (!selected) {
        ws.close();
        throw new Error(
          "No ports available on the bridge server. " +
            "Make sure the Node.js server is running and a device is connected.",
        );
      }

      return createWsSerialPort(ws, selected, serverUrl);
    },

    /**
     * Connects to the bridge server and returns all available serial ports
     * as `SerialPort`-compatible objects.
     *
     * @returns An array of `SerialPort`-compatible objects (may be empty).
     */
    async getPorts(): Promise<SerialPort[]> {
      const ws = new WebSocket(serverUrl);
      await waitForOpen(ws);

      ws.send(JSON.stringify({ type: "list-ports", filters: [] }));
      let ports: PortInfo[];
      try {
        ports = await waitForMessage<PortInfo[]>(ws, "port-list");
      } catch (error) {
        ws.close();
        throw error;
      }
      ws.close();
      if (
        !Array.isArray(ports) ||
        ports.length > 256 ||
        ports.some((port) => !port || typeof port.path !== "string")
      )
        throw new Error("Invalid port list from bridge");
      return ports.map((info) => createWsSerialPort(null, info, serverUrl));
    },
  };
}
