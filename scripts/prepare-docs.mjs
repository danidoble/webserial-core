#!/usr/bin/env node
/**
 * @file prepare-docs.mjs
 * @description Copies the compiled UMD bundle and shared demo stylesheet
 * into docs/public/ so that VitePress serves them as static assets.
 * The standalone demo HTML pages at docs/public/demos/ reference these files.
 *
 * Run this AFTER `vite build` and BEFORE `vitepress build docs`.
 * The `docs:build` script in package.json chains all three steps automatically.
 */

import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/** @type {[string, string][]} Files to copy: [src, dst] relative to ROOT */
const copies = [
  // UMD bundle — used by standalone demo HTML pages via <script src="/dist/...">
  ["dist/webserial-core.umd.js", "docs/public/dist/webserial-core.umd.js"],
  // Shared demo stylesheet — used by all standalone demo pages
  ["demos/style.css", "docs/public/demo-style.css"],
];

let ok = true;

for (const [src, dst] of copies) {
  const srcAbs = resolve(ROOT, src);
  const dstAbs = resolve(ROOT, dst);

  mkdirSync(dirname(dstAbs), { recursive: true });

  if (existsSync(srcAbs)) {
    copyFileSync(srcAbs, dstAbs);
    console.log(`  ✔ ${src} → ${dst}`);
  } else {
    console.warn(`  ⚠  ${src} not found — run bun run build first.`);
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

console.log("\n✔ Docs assets ready.\n");
