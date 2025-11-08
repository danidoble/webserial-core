import { describe, it, expect, vi } from "vitest";
import { Dispatcher } from "../lib/Dispatcher";

describe("Dispatcher", () => {
  describe("event registration and dispatching", () => {
    it("should register available listeners", () => {
      const dispatcher = new Dispatcher();
      dispatcher.serialRegisterAvailableListener("test-event");

      const listeners = dispatcher.availableListeners;
      const testListener = listeners.find((l) => l.type === "test-event");

      expect(testListener).toBeDefined();
      expect(testListener?.listening).toBe(false);
    });

    it("should dispatch events", () => {
      const dispatcher = new Dispatcher();
      const callback = vi.fn();

      dispatcher.on("test-event", callback);
      dispatcher.dispatch("test-event", { message: "hello" });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "test-event",
          detail: { message: "hello" },
        }),
      );
    });

    it("should mark listener as listening when callback is attached", () => {
      const dispatcher = new Dispatcher();
      dispatcher.serialRegisterAvailableListener("test-event");

      const callback = vi.fn();
      dispatcher.on("test-event", callback);

      const listeners = dispatcher.availableListeners;
      const testListener = listeners.find((l) => l.type === "test-event");

      expect(testListener?.listening).toBe(true);
    });

    it("should remove event listeners", () => {
      const dispatcher = new Dispatcher();
      const callback = vi.fn();

      dispatcher.on("test-event", callback);
      dispatcher.off("test-event", callback);
      dispatcher.dispatch("test-event");

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle multiple callbacks for the same event", () => {
      const dispatcher = new Dispatcher();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      dispatcher.on("test-event", callback1);
      dispatcher.on("test-event", callback2);
      dispatcher.dispatch("test-event", { data: "test" });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe("async dispatch", () => {
    it("should dispatch events asynchronously", async () => {
      const dispatcher = new Dispatcher();
      const callback = vi.fn();

      dispatcher.on("test-event", callback);
      dispatcher.dispatchAsync("test-event", null, 50);

      expect(callback).not.toHaveBeenCalled();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("debug mode", () => {
    it("should dispatch debug events when debug is enabled", () => {
      const dispatcher = new Dispatcher();
      dispatcher.__debug__ = true;

      const debugCallback = vi.fn();
      dispatcher.on("debug", debugCallback);
      dispatcher.dispatch("test-event", { data: "test" });

      expect(debugCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "debug",
          detail: {
            type: "test-event",
            data: { data: "test" },
          },
        }),
      );
    });

    it("should not dispatch debug events when debug is disabled", () => {
      const dispatcher = new Dispatcher();
      dispatcher.__debug__ = false;

      const debugCallback = vi.fn();
      dispatcher.on("debug", debugCallback);
      dispatcher.dispatch("test-event", { data: "test" });

      expect(debugCallback).not.toHaveBeenCalled();
    });
  });

  describe("removeAllListeners", () => {
    it("should remove all listeners except internal ones", () => {
      const dispatcher = new Dispatcher();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const internalCallback = vi.fn();

      dispatcher.on("test-event-1", callback1);
      dispatcher.on("test-event-2", callback2);
      dispatcher.on("internal:queue", internalCallback);

      dispatcher.removeAllListeners();

      dispatcher.dispatch("test-event-1");
      dispatcher.dispatch("test-event-2");
      dispatcher.dispatch("internal:queue");

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(internalCallback).toHaveBeenCalled();
    });

    it("should reset listener states", () => {
      const dispatcher = new Dispatcher();
      dispatcher.serialRegisterAvailableListener("test-event");

      const callback = vi.fn();
      dispatcher.on("test-event", callback);

      let listeners = dispatcher.availableListeners;
      let testListener = listeners.find((l) => l.type === "test-event");
      expect(testListener?.listening).toBe(true);

      dispatcher.removeAllListeners();

      listeners = dispatcher.availableListeners;
      testListener = listeners.find((l) => l.type === "test-event");
      expect(testListener?.listening).toBe(false);
    });
  });

  describe("availableListeners", () => {
    it("should return sorted list of available listeners", () => {
      const dispatcher = new Dispatcher();
      dispatcher.serialRegisterAvailableListener("z-event");
      dispatcher.serialRegisterAvailableListener("a-event");
      dispatcher.serialRegisterAvailableListener("m-event");

      const listeners = dispatcher.availableListeners;
      const types = listeners.map((l) => l.type);

      expect(types).toEqual(expect.arrayContaining(["a-event", "debug", "m-event", "z-event"]));
      // Verificar que está ordenado
      const sortedTypes = [...types].sort();
      expect(types).toEqual(sortedTypes);
    });
  });
});
