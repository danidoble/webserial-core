import { describe, it, expect } from "vitest";
import { SerialError, SerialErrorCode } from "../lib/SerialError";

describe("SerialError", () => {
  describe("constructor", () => {
    it("should create error with message and code", () => {
      const error = new SerialError("Connection failed", SerialErrorCode.CONNECTION_FAILED);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SerialError);
      expect(error.message).toBe("Connection failed");
      expect(error.code).toBe(SerialErrorCode.CONNECTION_FAILED);
      expect(error.name).toBe("SerialError");
    });

    it("should create error with context", () => {
      const context = { port: "COM3", baudRate: 9600 };
      const error = new SerialError("Invalid configuration", SerialErrorCode.INVALID_CONFIGURATION, context);

      expect(error.context).toEqual(context);
    });

    it("should use UNKNOWN_ERROR as default code", () => {
      const error = new SerialError("Something went wrong");

      expect(error.code).toBe(SerialErrorCode.UNKNOWN_ERROR);
    });

    it("should have timestamp", () => {
      const before = new Date();
      const error = new SerialError("Test error", SerialErrorCode.TIMEOUT);
      const after = new Date();

      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("toJSON", () => {
    it("should serialize error to JSON", () => {
      const context = { device: "arduino", port: 1 };
      const error = new SerialError("Write failed", SerialErrorCode.WRITE_FAILED, context);

      const json = error.toJSON();

      expect(json).toMatchObject({
        name: "SerialError",
        message: "Write failed",
        code: SerialErrorCode.WRITE_FAILED,
        context: context,
      });
      expect(json.timestamp).toBeDefined();
      expect(typeof json.timestamp).toBe("string");
      expect(json.stack).toBeDefined();
    });

    it("should serialize error without context", () => {
      const error = new SerialError("Timeout", SerialErrorCode.TIMEOUT);
      const json = error.toJSON();

      expect(json.context).toBeUndefined();
    });
  });

  describe("toString", () => {
    it("should format error as string with context", () => {
      const error = new SerialError("Permission denied", SerialErrorCode.PERMISSION_DENIED, {
        path: "/dev/ttyUSB0",
      });

      const str = error.toString();

      expect(str).toContain("SerialError");
      expect(str).toContain("[PERMISSION_DENIED]");
      expect(str).toContain("Permission denied");
      expect(str).toContain('{"path":"/dev/ttyUSB0"}');
    });

    it("should format error as string without context", () => {
      const error = new SerialError("Port not found", SerialErrorCode.PORT_NOT_FOUND);

      const str = error.toString();

      expect(str).toBe("SerialError [PORT_NOT_FOUND]: Port not found");
    });
  });

  describe("error codes", () => {
    it("should have all expected error codes", () => {
      expect(SerialErrorCode.CONNECTION_FAILED).toBe("CONNECTION_FAILED");
      expect(SerialErrorCode.DISCONNECTION_FAILED).toBe("DISCONNECTION_FAILED");
      expect(SerialErrorCode.WRITE_FAILED).toBe("WRITE_FAILED");
      expect(SerialErrorCode.READ_FAILED).toBe("READ_FAILED");
      expect(SerialErrorCode.TIMEOUT).toBe("TIMEOUT");
      expect(SerialErrorCode.PORT_NOT_FOUND).toBe("PORT_NOT_FOUND");
      expect(SerialErrorCode.PERMISSION_DENIED).toBe("PERMISSION_DENIED");
      expect(SerialErrorCode.DEVICE_NOT_SUPPORTED).toBe("DEVICE_NOT_SUPPORTED");
      expect(SerialErrorCode.INVALID_CONFIGURATION).toBe("INVALID_CONFIGURATION");
      expect(SerialErrorCode.SOCKET_ERROR).toBe("SOCKET_ERROR");
      expect(SerialErrorCode.UNKNOWN_ERROR).toBe("UNKNOWN_ERROR");
    });
  });

  describe("stack trace", () => {
    it("should capture stack trace", () => {
      const error = new SerialError("Test error", SerialErrorCode.UNKNOWN_ERROR);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("SerialError");
    });
  });
});
