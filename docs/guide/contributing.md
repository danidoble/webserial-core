# Contributing

Thank you for your interest in contributing to **webserial-core**!

## Development setup

```bash
git clone https://github.com/danidoble/webserial-core.git
cd webserial-core
npm install
```

Start the Vite dev server to test the demos interactively:

```bash
npm run dev
```

Then open any of the demo pages:

- [http://localhost:5173/demos/web-serial/](http://localhost:5173/demos/web-serial/)
- [http://localhost:5173/demos/web-usb/](http://localhost:5173/demos/web-usb/)
- [http://localhost:5173/demos/web-bluetooth/](http://localhost:5173/demos/web-bluetooth/)
- [http://localhost:5173/demos/websocket/](http://localhost:5173/demos/websocket/)

## Code style

- **TypeScript strict mode** — no `any`, all public APIs fully typed.
- **ESM imports** — use `.js` extension on relative imports (e.g.
  `import x from "./foo.js"`). Vite resolves these to the `.ts` source files.
- **English only** — all comments, JSDoc, variable names, and string literals
  must be in English.
- **JSDoc** — all exported symbols must have JSDoc with `@param`, `@returns`,
  and `@throws` where applicable.

Run lint and format checks before pushing:

```bash
npm run lint
npm run format
```

## Building

```bash
npm run build
```

Produces:

```
dist/
  webserial-core.mjs      ← ESM (tree-shakeable, for bundlers)
  webserial-core.cjs      ← CommonJS (Node.js / legacy bundlers)
  webserial-core.umd.cjs  ← UMD (standalone <script> tag / CDN)
  index.d.ts              ← Bundled TypeScript declarations
```

## Building the docs

```bash
npm run docs:dev   # Live preview
npm run docs:build # Static output → docs/.vitepress/dist
```

## Submitting a pull request

1. Fork the repository and create a branch: `git checkout -b feat/my-feature`
2. Make your changes and add JSDoc to any new public symbols.
3. Run `npm run lint` and `npm run format`.
4. Verify the build: `npm run build`.
5. Push and open a PR against `main`.

## Adding a new adapter

Place adapter code under `src/adapters/<name>/`:

```
src/adapters/my-adapter/
  MyAdapter.ts   ← implements SerialProvider
  index.ts       ← re-exports
```

Then re-export from `src/index.ts`:

```ts
export * from "./adapters/my-adapter/index.js";
```

Add a demo under `demos/my-adapter/` following the existing demo structure.
