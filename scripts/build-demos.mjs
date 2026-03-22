#!/usr/bin/env node
/**
 * @file scripts/build-demos.mjs
 * @description Compiles the full-featured TypeScript demos from demos/ into
 * self-contained pages at docs/public/demos/, replacing the previous UMD stubs.
 *
 * Steps:
 *   1. Run `vite build --config vite.demos.config.ts`
 *   2. Flatten the output structure:
 *        .demos-build/demos/web-serial/index.html  →  docs/public/demos/web-serial.html
 *        .demos-build/demos/web-bluetooth/...      →  docs/public/demos/web-bluetooth.html
 *        .demos-build/demos/web-usb/...            →  docs/public/demos/web-usb.html
 *        .demos-build/demos/websocket/...          →  docs/public/demos/websocket.html
 *        .demos-build/assets/**                    →  docs/public/demos/assets/**
 *   3. Remove the temporary build directory.
 *
 * Run this AFTER the library is built (vite build) or as part of docs:build.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TMP_DIR = resolve(ROOT, "docs/public/.demos-build");
const OUT_DIR = resolve(ROOT, "docs/public/demos");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect available package manager (bun preferred, falls back to npm). */
function detectPM() {
  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch {
    return "npm";
  }
}

const pm = detectPM();
const px = pm === "bun" ? "bun x" : "npx";

function run(cmd, label) {
  if (label) console.log(`\n▶ ${label}`);
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

console.log("▸ Compiling demos …\n");

run(`${px} vite build --config vite.demos.config.ts`, "Vite demos build");

// ---------------------------------------------------------------------------
// Arrange output
// ---------------------------------------------------------------------------
//
// Vite places each HTML relative to the project root inside outDir:
//   TMP_DIR/demos/web-serial/index.html
//   TMP_DIR/demos/web-bluetooth/index.html
//   …
// Asset bundles land in:
//   TMP_DIR/assets/**
//
// We want the final layout to be:
//   OUT_DIR/web-serial.html
//   OUT_DIR/web-bluetooth.html
//   OUT_DIR/web-usb.html
//   OUT_DIR/websocket.html
//   OUT_DIR/assets/**

const htmlMap = [
  ["demos/web-serial/index.html", "web-serial.html"],
  ["demos/web-bluetooth/index.html", "web-bluetooth.html"],
  ["demos/web-usb/index.html", "web-usb.html"],
  ["demos/websocket/index.html", "websocket.html"],
];

mkdirSync(OUT_DIR, { recursive: true });

console.log("\n▶ Moving compiled pages to docs/public/demos/");

for (const [rel, out] of htmlMap) {
  const src = resolve(TMP_DIR, rel);
  const dst = resolve(OUT_DIR, out);
  if (existsSync(src)) {
    renameSync(src, dst);
    console.log(`  ✔ ${out}`);
  } else {
    console.warn(`  ⚠  ${rel} was not found in build output`);
  }
}

// Move compiled JS/CSS assets
const assetsSrc = resolve(TMP_DIR, "assets");
const assetsDst = resolve(OUT_DIR, "assets");
if (existsSync(assetsSrc)) {
  if (existsSync(assetsDst)) rmSync(assetsDst, { recursive: true });
  renameSync(assetsSrc, assetsDst);
  console.log("  ✔ assets/");
}

// Clean up temporary build directory
rmSync(TMP_DIR, { recursive: true, force: true });

console.log("\n✔ Demo pages ready in docs/public/demos/\n");
