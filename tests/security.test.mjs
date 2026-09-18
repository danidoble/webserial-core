import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function compileSource(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2023,
    },
  }).outputText;
  return output;
}

const framedBufferCode = await compileSource(
  "../src/parsers/FramedByteBuffer.ts",
);
const framedBufferUrl = `data:text/javascript;base64,${Buffer.from(framedBufferCode).toString("base64")}`;

async function loadSource(path) {
  const code = (await compileSource(path)).replace(
    "./FramedByteBuffer.js",
    framedBufferUrl,
  );
  return import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
}

const [
  { delimiter },
  { readline },
  { fixedLength },
  { slipDecoder },
  { readyParser },
  { CommandQueue },
  { WebUsbProvider },
] = await Promise.all([
  loadSource("../src/parsers/DelimiterParser.ts"),
  loadSource("../src/parsers/ReadlineParser.ts"),
  loadSource("../src/parsers/FixedLengthParser.ts"),
  loadSource("../src/parsers/SlipParser.ts"),
  loadSource("../src/parsers/ReadyParser.ts"),
  loadSource("../src/queue/CommandQueue.ts"),
  loadSource("../src/adapters/web-usb/WebUsbProvider.ts"),
]);

const bytes = (text) => new TextEncoder().encode(text);

test("delimiter and readline reject empty separators", () => {
  assert.throws(() => delimiter(""), RangeError);
  assert.throws(() => readline({ delimiter: "" }), RangeError);
  assert.throws(() => readyParser({ delimiter: "" }), RangeError);
});

test("delimiter rejects an oversized incomplete frame and still parses valid frames", () => {
  const parser = delimiter("\n", { maxFrameLength: 4 });
  const received = [];
  parser.parse(bytes("ok\n"), (value) => received.push(value));
  assert.deepEqual(received, ["ok"]);
  assert.throws(() => parser.parse(bytes("12345"), () => {}), RangeError);
});

test("multi-byte delimiters survive fragmentation", () => {
  const parser = delimiter("\r\n", { maxFrameLength: 8 });
  const received = [];
  parser.parse(bytes("one\r"), (value) => received.push(value));
  parser.parse(bytes("\ntwo\r\n"), (value) => received.push(value));
  assert.deepEqual(received, ["one", "two"]);
});

test("readline and SLIP cap untrusted streams", () => {
  assert.throws(
    () => readline({ maxFrameLength: 2 }).parse(bytes("abc"), () => {}),
    RangeError,
  );
  assert.throws(
    () => slipDecoder({ maxFrameLength: 2 }).parse(bytes("abc"), () => {}),
    RangeError,
  );
  assert.throws(
    () =>
      readyParser({ delimiter: "OK", maxBufferLength: 2 }).parse(
        bytes("abc"),
        () => {},
      ),
    RangeError,
  );
});

test("fixed length rejects invalid values", () => {
  for (const length of [
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1.5,
    1024 * 1024 + 1,
  ]) {
    assert.throws(() => fixedLength(length), RangeError);
  }
});

test("command queue caps pending commands and reports send failures", async () => {
  const failures = [];
  const queue = new CommandQueue({
    commandTimeout: 0,
    maxQueueSize: 1,
    onSend: async () => {
      throw new Error("write failed");
    },
    onTimeout: () => {},
    onError: (error) => failures.push(error.message),
  });
  queue.enqueue(bytes("a"));
  assert.throws(() => queue.enqueue(bytes("b")), RangeError);
  queue.resume();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(failures, ["write failed"]);
});

test("commands advance after a successful write when response timeout is disabled", async () => {
  const sent = [];
  const queue = new CommandQueue({
    commandTimeout: 0,
    onSend: async (command) => {
      sent.push(new TextDecoder().decode(command));
    },
    onTimeout: () => {},
  });
  queue.enqueue(bytes("first"));
  queue.enqueue(bytes("second"));
  queue.resume();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ["first", "second"]);
});

test("WebUSB writes only bytes in a Uint8Array subview", async () => {
  const sent = [];
  const fakeDevice = {
    vendorId: 1,
    productId: 2,
    opened: false,
    configuration: {},
    configurations: [
      {
        interfaces: [
          {
            interfaceNumber: 0,
            alternates: [
              {
                interfaceClass: 255,
                endpoints: [
                  { direction: "in", endpointNumber: 1 },
                  { direction: "out", endpointNumber: 2 },
                ],
              },
            ],
          },
        ],
      },
    ],
    async open() {
      this.opened = true;
    },
    async claimInterface() {},
    async transferOut(_endpoint, payload) {
      sent.push(Array.from(new Uint8Array(payload)));
      return { status: "ok" };
    },
  };
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      usb: {
        async getDevices() {
          return [fakeDevice];
        },
      },
    },
  });
  try {
    const provider = new WebUsbProvider({
      usbControlInterfaceClass: 255,
      usbTransferInterfaceClass: 255,
      protocol: "none",
    });
    const [port] = await provider.getPorts();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    const backing = new Uint8Array([99, 10, 20, 88]);
    await writer.write(backing.subarray(1, 3));
    writer.releaseLock();
    assert.deepEqual(sent, [[10, 20]]);
  } finally {
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
  }
});
