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
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", (e) => reject(e), { once: true });
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
  return new Promise((resolve) => {
    const handler = (event: MessageEvent): void => {
      const msg = JSON.parse(event.data as string) as {
        type: string;
        payload: T;
      };
      if (msg.type === expectedType) {
        ws.removeEventListener("message", handler);
        resolve(msg.payload);
      }
    };
    ws.addEventListener("message", handler);
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
function createWsSerialPort(ws: WebSocket, portInfo: PortInfo): SerialPort {
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
      ws.send(
        JSON.stringify({
          type: "open",
          path: portInfo.path,
          baudRate: options.baudRate,
          dataBits: options.dataBits,
          stopBits: options.stopBits,
          parity: options.parity,
          // Tell the bridge which parser to apply before forwarding data.
          // Must match the parser configured on the AbstractSerialDevice instance.
          // Options: { type: "delimiter", value: "\n" }
          //           { type: "fixed", length: N }
          //           { type: "raw" }
          parser: { type: "delimiter", value: "\\n" },
        }),
      );

      await waitForMessage(ws, "opened");

      // Internal buffer: accumulates chunks that arrive before ReadableStream
      // has an active reader. Drained in the stream's start() callback.
      const pendingChunks: Uint8Array[] = [];
      let streamController: ReadableStreamDefaultController<Uint8Array> | null =
        null;
      let streamClosed = false;

      function onMessage(event: MessageEvent): void {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          bytes?: number[];
        };

        if (msg.type === "data" && msg.bytes) {
          const chunk = new Uint8Array(msg.bytes);
          if (streamController) {
            // Reader is active — deliver directly
            streamController.enqueue(chunk);
          } else {
            // No reader yet — buffer the chunk
            pendingChunks.push(chunk);
          }
        }

        if (msg.type === "closed") {
          streamClosed = true;
          if (streamController) {
            streamController.close();
          }
        }
      }

      ws.addEventListener("message", onMessage);

      readable = new ReadableStream<Uint8Array>({
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
          ws.removeEventListener("message", onMessage);
          streamController = null;
        },
      });

      writable = new WritableStream<Uint8Array>({
        write(chunk: Uint8Array): void {
          ws.send(
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
      ws.send(JSON.stringify({ type: "close" }));
      readable = null;
      writable = null;
      ws.close();
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

      const ports = await waitForMessage<PortInfo[]>(ws, "port-list");

      const selected = ports[0];
      if (!selected) {
        throw new Error(
          "No ports available on the bridge server. " +
            "Make sure the Node.js server is running and a device is connected.",
        );
      }

      return createWsSerialPort(ws, selected);
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
      const ports = await waitForMessage<PortInfo[]>(ws, "port-list");

      return ports.map((info) => createWsSerialPort(ws, info));
    },
  };
}
