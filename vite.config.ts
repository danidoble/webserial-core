import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    // Enable minification for smaller production bundles.
    // Vite 8 uses Rolldown/OXC — set to true to use the built-in minifier.
    minify: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "WebSerialCore",
      // Produce ESM (.mjs), CJS (.cjs), and UMD (.umd.js) builds.
      // ESM  → tree-shakeable, for bundlers and modern browsers.
      // CJS  → for Node.js environments (e.g. server-side bridge code).
      // UMD  → standalone <script> tag for demos, CDN, and docs live preview.
      //        Extension is .umd.js (not .cjs) so servers serve correct MIME type.
      formats: ["es", "cjs", "umd"],
      fileName: (format) => {
        if (format === "es") return "webserial-core.mjs";
        if (format === "cjs") return "webserial-core.cjs";
        return "webserial-core.umd.js";
      },
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
  plugins: [
    dts({
      // Emit a single bundled declaration file at dist/index.d.ts
      insertTypesEntry: true,
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    }),
  ],
  // server: {allowedHosts: ["localhost"]},
});
