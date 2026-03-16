/**
 * @file errors/index.ts
 *
 * Custom error classes for `webserial-core`. All errors extend the native
 * `Error` class and set a stable `name` property for `instanceof` checks
 * across environments that may not preserve class names.
 */

/**
 * Thrown when a port is requested while another device instance already
 * holds an exclusive lock on it.
 */
export class SerialPortConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialPortConflictError";
    Object.setPrototypeOf(this, SerialPortConflictError.prototype);
  }
}

/**
 * Thrown when the user cancels the port-picker dialog or when the browser
 * denies permission to access a serial port.
 */
export class SerialPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialPermissionError";
    Object.setPrototypeOf(this, SerialPermissionError.prototype);
  }
}

/**
 * Thrown when a command in the queue does not receive a response before the
 * configured `commandTimeout` elapses.
 */
export class SerialTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialTimeoutError";
    Object.setPrototypeOf(this, SerialTimeoutError.prototype);
  }
}

/**
 * Thrown when reading from an open serial port fails.
 */
export class SerialReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialReadError";
    Object.setPrototypeOf(this, SerialReadError.prototype);
  }
}

/**
 * Thrown when writing to an open serial port fails.
 */
export class SerialWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialWriteError";
    Object.setPrototypeOf(this, SerialWriteError.prototype);
  }
}
