export class SerialPortConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialPortConflictError";
    Object.setPrototypeOf(this, SerialPortConflictError.prototype);
  }
}

export class SerialPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialPermissionError";
    Object.setPrototypeOf(this, SerialPermissionError.prototype);
  }
}

export class SerialTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialTimeoutError";
    Object.setPrototypeOf(this, SerialTimeoutError.prototype);
  }
}

export class SerialReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialReadError";
    Object.setPrototypeOf(this, SerialReadError.prototype);
  }
}

export class SerialWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerialWriteError";
    Object.setPrototypeOf(this, SerialWriteError.prototype);
  }
}
