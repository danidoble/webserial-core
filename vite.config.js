import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "lib/main.ts"),
      name: "WebSerialCore",
      fileName: "webserial-core",
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {
        },
      },
    },
  },
});
