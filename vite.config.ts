import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "WebSerialCore",
      formats: ["es", "cjs", "umd"],
      fileName: "webserial-core",
    },
    rollupOptions: {
      // Ensure we don't bundle external dependencies if we had any
      external: [],
      output: {
        globals: {},
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts"],
    }),
  ],
  server: {
    allowedHosts: [
      "localhost",
      "predict-wellington-places-friendly.trycloudflare.com",
    ],
  },
});
