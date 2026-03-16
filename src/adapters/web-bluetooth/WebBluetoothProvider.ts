/**
 * @file WebBluetoothProvider.ts
 *
 * Web Bluetooth serial adapter for `webserial-core`.
 *
 * Implements the {@link SerialProvider} interface using the Web Bluetooth
 * API with the Nordic UART Service (NUS) — the de-facto BLE serial standard
 * used by devices such as the ESP32 BLE UART, nRF52, and HM-10 modules.
 *
 * **How it works:**
 * 1. `requestPort()` opens the browser's Bluetooth device picker, filtered
 *    to devices advertising the NUS service UUID.
 * 2. The returned object implements `SerialPort` by wrapping a GATT
 *    connection: the NUS RX characteristic (notify) becomes a
 *    `ReadableStream` and the NUS TX characteristic (write without response)
 *    becomes a `WritableStream`.
 * 3. Because Bluetooth has a default MTU of 20 bytes, outgoing writes are
 *    automatically chunked into 20-byte slices with a 10 ms inter-chunk
 *    delay to avoid saturating the BLE stack.
 *
 * @example
 * ```ts
 * import { createBluetoothProvider, AbstractSerialDevice, delimiter } from 'webserial-core';
 *
 * AbstractSerialDevice.setProvider(createBluetoothProvider());
 *
 * class MyBleDevice extends AbstractSerialDevice<string> {
 *   constructor() {
 *     super({ baudRate: 9600, parser: delimiter('\n') });
 *   }
 * }
 *
 * const device = new MyBleDevice();
 * await device.connect(); // opens the Bluetooth picker
 * device.on('serial:data', (line) => console.log('Received:', line));
 * await device.send('PING\n');
 * ```
 */

/// <reference types="web-bluetooth" />

import type { SerialProvider } from "../../types/index.js";

/** UUID for the Nordic UART Service (NUS). */
const NORDIC_UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

/** NUS TX characteristic — the device writes notifications here (we read from it). */
const NUS_TX_CHARACTERISTIC = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

/** NUS RX characteristic — we write to this (the device reads from it). */
const NUS_RX_CHARACTERISTIC = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

/**
 * Maximum number of bytes per BLE write-without-response operation.
 * BLE 4.x default MTU is 23 bytes; 3 bytes are ATT overhead, leaving 20 usable.
 */
const BLE_MTU = 20;

/**
 * Delay in milliseconds between consecutive BLE write chunks when a payload
 * exceeds the MTU. Prevents saturating the BLE stack.
 */
const BLE_INTER_CHUNK_DELAY_MS = 10;

/**
 * Creates a `SerialPort`-compatible object backed by a BLE GATT connection
 * to a Nordic UART Service device.
 *
 * @param device - The `BluetoothDevice` obtained from `navigator.bluetooth.requestDevice()`.
 * @returns A `SerialPort`-compatible object.
 */
function createBleSerialPort(device: BluetoothDevice): SerialPort {
  let readable: ReadableStream<Uint8Array> | null = null;
  let writable: WritableStream<Uint8Array> | null = null;
  let gattServer: BluetoothRemoteGATTServer | null = null;

  return {
    get readable(): ReadableStream<Uint8Array> | null {
      return readable;
    },

    get writable(): WritableStream<Uint8Array> | null {
      return writable;
    },

    getInfo(): SerialPortInfo {
      // Bluetooth devices do not expose USB vendor/product IDs
      return {};
    },

    /**
     * Connects to the GATT server, discovers the NUS service and its
     * characteristics, and initializes the readable / writable streams.
     */
    async open(): Promise<void> {
      if (!device.gatt) {
        throw new Error("GATT not available on this Bluetooth device.");
      }

      gattServer = await device.gatt.connect();
      const service = await gattServer.getPrimaryService(NORDIC_UART_SERVICE);

      // TX characteristic — the peripheral notifies us when data arrives
      const txChar = await service.getCharacteristic(NUS_TX_CHARACTERISTIC);
      // RX characteristic — we write here to send data to the peripheral
      const rxChar = await service.getCharacteristic(NUS_RX_CHARACTERISTIC);

      await txChar.startNotifications();

      // Readable stream: listens for BLE notifications and enqueues each chunk
      readable = new ReadableStream<Uint8Array>({
        start(controller: ReadableStreamDefaultController<Uint8Array>): void {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          txChar.addEventListener("characteristicvaluechanged", (e: any) => {
            const buffer = (e.target as BluetoothRemoteGATTCharacteristic)
              .value!.buffer as ArrayBuffer;
            controller.enqueue(new Uint8Array(buffer));
          });
        },
      });

      // Writable stream: chunks the payload into BLE-MTU-sized slices
      writable = new WritableStream<Uint8Array>({
        async write(chunk: Uint8Array): Promise<void> {
          for (let offset = 0; offset < chunk.length; offset += BLE_MTU) {
            const slice = chunk.slice(offset, offset + BLE_MTU);
            await rxChar.writeValueWithoutResponse(slice as BufferSource);
            // Small inter-chunk delay to avoid overwhelming the peripheral's BLE stack
            if (offset + BLE_MTU < chunk.length) {
              await new Promise<void>((resolve) =>
                setTimeout(resolve, BLE_INTER_CHUNK_DELAY_MS),
              );
            }
          }
        },
      });
    },

    /**
     * Disconnects from the GATT server and tears down the streams.
     */
    async close(): Promise<void> {
      if (gattServer?.connected) {
        gattServer.disconnect();
      }
      readable = null;
      writable = null;
    },
  } as SerialPort;
}

/**
 * Creates a {@link SerialProvider} that uses the Web Bluetooth API
 * to communicate with Nordic UART Service (NUS) devices.
 *
 * Pass the returned provider to `AbstractSerialDevice.setProvider()` before
 * calling `connect()`.
 *
 * @returns A `SerialProvider` backed by the Web Bluetooth API.
 * @throws {Error} If `navigator.bluetooth` is not available in the current environment.
 *
 * @example
 * ```ts
 * import { createBluetoothProvider, AbstractSerialDevice } from 'webserial-core';
 *
 * AbstractSerialDevice.setProvider(createBluetoothProvider());
 * ```
 */
export function createBluetoothProvider(): SerialProvider {
  return {
    /**
     * Opens the browser's Bluetooth device picker, filtered to NUS devices,
     * and returns a `SerialPort`-compatible object for the selected device.
     *
     * @returns A `SerialPort`-compatible BLE serial port.
     * @throws {Error} If the Web Bluetooth API is unsupported or the user
     *   dismisses the picker.
     */
    async requestPort(): Promise<SerialPort> {
      if (!navigator.bluetooth) {
        throw new Error(
          "Web Bluetooth API is not supported in this browser. " +
            "Use Chrome on Android, macOS, or ChromeOS.",
        );
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [NORDIC_UART_SERVICE] }],
      });

      return createBleSerialPort(device);
    },

    /**
     * Returns an empty array — the Web Bluetooth API does not expose a list
     * of previously connected devices without an active GATT connection.
     *
     * @returns An empty array.
     */
    async getPorts(): Promise<SerialPort[]> {
      return [];
    },
  };
}
