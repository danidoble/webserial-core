import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomInt } from "node:crypto";
import WebSocket from "ws";

test("bridge rejects missing credentials and foreign origins", async () => {
  const port = randomInt(10000, 60000);
  const child = spawn(process.execPath, ["server.js", "--port", String(port)], {
    cwd: import.meta.dirname,
    env: {
      ...process.env,
      BRIDGE_TOKEN: "test-secret",
      BRIDGE_ORIGINS: "http://localhost:5173",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("bridge did not start")),
        5000,
      );
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`bridge exited ${code}`));
      });
      child.stdout.on("data", (chunk) => {
        if (chunk.toString().includes("listening on")) {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    async function connect(token, origin) {
      return new Promise((resolve) => {
        const url = `ws://127.0.0.1:${port}/?token=${token}`;
        const ws = new WebSocket(url, { origin });
        ws.once("open", () => {
          ws.close();
          resolve(true);
        });
        ws.once("error", () => resolve(false));
      });
    }

    assert.equal(await connect("wrong", "http://localhost:5173"), false);
    assert.equal(
      await connect("test-secret", "https://attacker.example"),
      false,
    );
    assert.equal(await connect("test-secret", "http://localhost:5173"), true);

    const authorized = new WebSocket(
      `ws://127.0.0.1:${port}/?token=test-secret`,
      {
        origin: "http://localhost:5173",
      },
    );
    await new Promise((resolve, reject) => {
      authorized.once("open", resolve);
      authorized.once("error", reject);
    });
    authorized.send(
      JSON.stringify({
        type: "open",
        path: "/not-an-enumerated-port",
        baudRate: 9600,
      }),
    );
    const response = await new Promise((resolve, reject) => {
      authorized.once("message", (raw) => resolve(JSON.parse(raw.toString())));
      authorized.once("error", reject);
    });
    assert.equal(response.type, "error");
    authorized.close();
  } finally {
    child.kill();
  }
});
