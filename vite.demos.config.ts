import { resolve } from "node:path";
import { defineConfig } from "vite";

const DEMOS = resolve(__dirname, "demos");

/**
 * Rewrites dev-server navigation links to doc-site paths.
 *
 * Dev server:
 *   /           → index.html  (Web Serial)
 *   /ble.html   → Web Bluetooth
 *   /usb.html   → WebUSB
 *   /ws.html    → WebSocket
 *
 * Docs site (docs/public/demos/ served as /demos/):
 *   /demos/web-serial.html
 *   /demos/web-bluetooth.html
 *   /demos/web-usb.html
 *   /demos/websocket.html
 */
function rewriteNavLinks(html: string): string {
  return html
    .replace(/href="\/"/g, 'href="/demos/web-serial.html"')
    .replace(/href="\/ble\.html"/g, 'href="/demos/web-bluetooth.html"')
    .replace(/href="\/usb\.html"/g, 'href="/demos/web-usb.html"')
    .replace(/href="\/ws\.html"/g, 'href="/demos/websocket.html"');
}

/**
 * Separate Vite build configuration for the interactive demo pages.
 *
 * Builds all four demos as a multi-page app and outputs them to a temporary
 * directory (docs/public/.demos-build).  The `scripts/build-demos.mjs` script
 * then flattens the output into docs/public/demos/ and cleans up the temp dir.
 *
 * Asset URLs use base "/demos/" so they remain valid after the HTML files are
 * moved one level up (from demos/web-serial/index.html → web-serial.html).
 */
export default defineConfig({
  root: resolve(__dirname),
  base: "/demos/",
  build: {
    outDir: resolve(__dirname, "docs/public/.demos-build"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "web-serial": resolve(DEMOS, "web-serial/index.html"),
        "web-bluetooth": resolve(DEMOS, "web-bluetooth/index.html"),
        "web-usb": resolve(DEMOS, "web-usb/index.html"),
        websocket: resolve(DEMOS, "websocket/index.html"),
      },
    },
  },
  plugins: [
    {
      name: "rewrite-demo-nav-links",
      transformIndexHtml(html: string): string {
        return rewriteNavLinks(html);
      },
    },
  ],
});
