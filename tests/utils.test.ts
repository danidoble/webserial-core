import { describe, it, expect } from "vitest";
import { wait } from "../lib/utils";

describe("utils", () => {
  describe("wait", () => {
    it("should wait for the specified time", async () => {
      const start = Date.now();
      await wait(100);
      const end = Date.now();
      const elapsed = end - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });

    it("should wait for default time (100ms) when no argument provided", async () => {
      const start = Date.now();
      await wait();
      const end = Date.now();
      const elapsed = end - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });

    it("should return a promise", () => {
      const result = wait(10);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
