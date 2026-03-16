import { defineConfig, type DefaultTheme } from "vitepress";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Load .env from project root (two levels up from docs/.vitepress/)
// vitepress build sets Vite root to docs/, so .env at project root is not
// picked up automatically — we parse it manually here.
// ---------------------------------------------------------------------------
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const envFile = resolve(ROOT, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Search — Algolia when env vars are set, local otherwise
// ---------------------------------------------------------------------------
function buildSearch(): DefaultTheme.Config["search"] {
  const { ALGOLIA_APP_ID, ALGOLIA_API_KEY, ALGOLIA_INDEX_NAME } = process.env;
  if (ALGOLIA_APP_ID && ALGOLIA_API_KEY && ALGOLIA_INDEX_NAME) {
    return {
      provider: "algolia",
      options: {
        appId: ALGOLIA_APP_ID,
        apiKey: ALGOLIA_API_KEY,
        indexName: ALGOLIA_INDEX_NAME,
      },
    };
  }
  return { provider: "local" };
}

// ---------------------------------------------------------------------------
// Base URL — injected by CI per deployment target
//   GitHub Pages : DOCS_BASE=/webserial-core/
//   Netlify/Vercel: DOCS_BASE=/ (or unset)
// ---------------------------------------------------------------------------
const base = process.env.DOCS_BASE ?? "/";

// ---------------------------------------------------------------------------
// Shared nav items
// ---------------------------------------------------------------------------
const versionNav: DefaultTheme.NavItem = {
  text: "v2 (latest)",
  items: [
    { text: "v2 (latest)", link: "/guide/getting-started" },
    { text: "v1 (legacy)", link: "/v1/" },
  ],
};

const enNav: DefaultTheme.NavItem[] = [
  { text: "Guide", link: "/guide/getting-started" },
  { text: "API", link: "/api/abstract-serial-device" },
  { text: "Examples", link: "/examples/web-serial" },
  { text: "Demos", link: "/demos" },
  {
    text: "Changelog",
    link: "https://github.com/danidoble/webserial-core/releases",
  },
  versionNav,
];

const esNav: DefaultTheme.NavItem[] = [
  { text: "Guía", link: "/es/guide/getting-started" },
  { text: "API", link: "/es/api/abstract-serial-device" },
  { text: "Ejemplos", link: "/es/examples/web-serial" },
  { text: "Demos", link: "/es/demos" },
  {
    text: "Changelog",
    link: "https://github.com/danidoble/webserial-core/releases",
  },
  versionNav,
];

// ---------------------------------------------------------------------------
// Shared sidebar builders
// ---------------------------------------------------------------------------
const enSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: "Guide",
    items: [
      { text: "Getting Started", link: "/guide/getting-started" },
      { text: "Architecture", link: "/guide/architecture" },
      { text: "Migration v1 → v2", link: "/guide/migration-v1-v2" },
      { text: "Contributing", link: "/guide/contributing" },
    ],
  },
  {
    text: "API Reference",
    items: [
      { text: "AbstractSerialDevice", link: "/api/abstract-serial-device" },
      { text: "WebUsbProvider", link: "/api/web-usb-provider" },
      { text: "WebBluetoothProvider", link: "/api/web-bluetooth-provider" },
      { text: "WebSocketProvider", link: "/api/websocket-provider" },
      { text: "Parsers", link: "/api/parsers" },
      { text: "Types & Interfaces", link: "/api/types" },
      { text: "Events", link: "/api/events" },
    ],
  },
  {
    text: "Examples",
    items: [
      { text: "Web Serial", link: "/examples/web-serial" },
      { text: "WebUSB", link: "/examples/web-usb" },
      { text: "Web Bluetooth", link: "/examples/web-bluetooth" },
      { text: "WebSocket Bridge", link: "/examples/websocket" },
    ],
  },
  { text: "Interactive Demos", link: "/demos" },
];

const esSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: "Guía",
    items: [
      { text: "Primeros pasos", link: "/es/guide/getting-started" },
      { text: "Arquitectura", link: "/es/guide/architecture" },
      { text: "Migración v1 → v2", link: "/es/guide/migration-v1-v2" },
      { text: "Contribuir", link: "/es/guide/contributing" },
    ],
  },
  {
    text: "Referencia API",
    items: [
      { text: "AbstractSerialDevice", link: "/es/api/abstract-serial-device" },
      { text: "WebUsbProvider", link: "/es/api/web-usb-provider" },
      { text: "WebBluetoothProvider", link: "/es/api/web-bluetooth-provider" },
      { text: "WebSocketProvider", link: "/es/api/websocket-provider" },
      { text: "Parsers", link: "/es/api/parsers" },
      { text: "Tipos e Interfaces", link: "/es/api/types" },
      { text: "Eventos", link: "/es/api/events" },
    ],
  },
  {
    text: "Ejemplos",
    items: [
      { text: "Web Serial", link: "/es/examples/web-serial" },
      { text: "WebUSB", link: "/es/examples/web-usb" },
      { text: "Web Bluetooth", link: "/es/examples/web-bluetooth" },
      { text: "Puente WebSocket", link: "/es/examples/websocket" },
    ],
  },
  { text: "Demos interactivos", link: "/es/demos" },
];

const v1Sidebar: DefaultTheme.SidebarItem[] = [
  {
    text: "v1 (Legacy)",
    items: [
      { text: "Overview", link: "/v1/" },
      { text: "Getting Started", link: "/v1/guide/getting-started" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export default defineConfig({
  title: "webserial-core",
  description:
    "A strongly-typed, event-driven TypeScript library for Web Serial, WebUSB, Web Bluetooth, and WebSocket serial communication.",

  base,

  // Ignore localhost links in examples / demos
  ignoreDeadLinks: [/^https?:\/\/localhost/],

  locales: {
    root: {
      label: "English",
      lang: "en-US",
    },
    es: {
      label: "Español",
      lang: "es",
      link: "/es/",
      themeConfig: {
        nav: esNav,
        sidebar: { "/es/": esSidebar },
        editLink: {
          pattern:
            "https://github.com/danidoble/webserial-core/edit/main/docs/:path",
          text: "Editar esta página en GitHub",
        },
        footer: {
          message: "Publicado bajo la licencia MIT.",
          copyright: "Copyright © 2025-present danidoble",
        },
      },
    },
  },

  themeConfig: {
    logo: { src: "/images/logo.svg", alt: "webserial-core logo" },

    nav: enNav,

    sidebar: {
      "/guide/": enSidebar,
      "/api/": enSidebar,
      "/examples/": enSidebar,
      "/demos": enSidebar,
      "/es/": esSidebar,
      "/v1/": v1Sidebar,
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/danidoble/webserial-core",
      },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2025-present danidoble",
    },

    search: buildSearch(),

    editLink: {
      pattern:
        "https://github.com/danidoble/webserial-core/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
  },

  head: [
    ["meta", { name: "theme-color", content: "#a78bfa" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "webserial-core" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Strongly-typed, event-driven TypeScript library for Web Serial, WebUSB, Web Bluetooth, and WebSocket.",
      },
    ],
    ["meta", { property: "og:image", content: "/images/cover.svg" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],
});
