/**
 * Custom error codes for serial communication errors
 */
export enum SerialErrorCode {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  DISCONNECTION_FAILED = "DISCONNECTION_FAILED",
  WRITE_FAILED = "WRITE_FAILED",
  READ_FAILED = "READ_FAILED",
  TIMEOUT = "TIMEOUT",
  PORT_NOT_FOUND = "PORT_NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DEVICE_NOT_SUPPORTED = "DEVICE_NOT_SUPPORTED",
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  SOCKET_ERROR = "SOCKET_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Custom error class for WebSerial operations
 * Provides structured error information with codes and context
 * @extends Error
 */
export class SerialError extends Error {
  /**
   * Error code identifying the type of error
   */
  public readonly code: SerialErrorCode;

  /**
   * Additional context about the error
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Timestamp when the error occurred
   */
  public readonly timestamp: Date;

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
  constructor(
    message: string,
    code: SerialErrorCode = SerialErrorCode.UNKNOWN_ERROR,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SerialError";
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SerialError);
    }
  }

  /**
   * Returns a JSON representation of the error
   * @returns Serialized error object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Returns a formatted string representation of the error
   * @returns Formatted error string
   */
  toString(): string {
    const contextStr = this.context ? ` | Context: ${JSON.stringify(this.context)}` : "";
    return `${this.name} [${this.code}]: ${this.message}${contextStr}`;
  }
}
