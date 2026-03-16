import { defineConfig } from "vitepress";

export default defineConfig({
  title: "webserial-core",
  description:
    "A strongly-typed, event-driven TypeScript library for Web Serial, WebUSB, Web Bluetooth, and WebSocket serial communication.",

  base: "/webserial-core/",

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/abstract-serial-device" },
      { text: "Examples", link: "/examples/web-serial" },
      {
        text: "Changelog",
        link: "https://github.com/danidoble/webserial-core/releases",
      },
    ],

    sidebar: [
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
          {
            text: "AbstractSerialDevice",
            link: "/api/abstract-serial-device",
          },
          { text: "WebUsbProvider", link: "/api/web-usb-provider" },
          {
            text: "WebBluetoothProvider",
            link: "/api/web-bluetooth-provider",
          },
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
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/danidoble/webserial-core",
      },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © danidoble",
    },

    search: {
      provider: "local",
    },

    editLink: {
      pattern:
        "https://github.com/danidoble/webserial-core/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
  },

  head: [["meta", { name: "theme-color", content: "#a78bfa" }]],
});
