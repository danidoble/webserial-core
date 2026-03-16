import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "docs/.vitepress/cache/**",
      "docs/.vitepress/dist/**",
      // Generated assets copied by prepare-docs.mjs — not source files
      "docs/public/dist/**",
      "docs/public/demo-style.css",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  {
    // Node.js scripts (e.g. scripts/*.mjs, vite.config.ts, etc.)
    files: ["scripts/**/*.{js,mjs,cjs}", "vite.config.ts", "eslint.config.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.recommended,
]);
