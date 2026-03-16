# Contribuir

¡Gracias por tu interés en contribuir a **webserial-core**!

## Configuración del entorno de desarrollo

```bash
git clone https://github.com/danidoble/webserial-core.git
cd webserial-core
npm install
```

Inicia el servidor de desarrollo Vite para probar los demos de forma interactiva:

```bash
npm run dev
```

Luego abre cualquiera de las páginas de demo en tu navegador:

- `http://localhost:5173/` — Web Serial (nativo)
- `http://localhost:5173/demos/web-usb/` — Polyfill WebUSB
- `http://localhost:5173/demos/web-bluetooth/` — Web Bluetooth
- `http://localhost:5173/demos/websocket/` — Puente WebSocket

## Estilo de código

- **TypeScript en modo estricto** — sin `any`, todas las APIs públicas totalmente tipadas.
- **Importaciones ESM** — usa extensión `.js` en importaciones relativas (ej.
  `import x from "./foo.js"`). Vite las resuelve a los archivos fuente `.ts`.
- **Solo en inglés** — todos los comentarios, JSDoc, nombres de variables y literales
  de cadena deben estar en inglés.
- **JSDoc** — todos los símbolos exportados deben tener JSDoc con `@param`, `@returns`
  y `@throws` donde corresponda.

Ejecuta las comprobaciones de lint y formato antes de hacer push:

```bash
npm run lint
npm run format
```

## Compilar

```bash
npm run build
```

Produce:

```
dist/
  webserial-core.mjs      ← ESM (tree-shakeable, para bundlers)
  webserial-core.cjs      ← CommonJS (Node.js / bundlers legacy)
  webserial-core.umd.js   ← UMD (tag <script> independiente / CDN)
  index.d.ts              ← Declaraciones TypeScript agrupadas
```

## Compilar la documentación

```bash
npm run docs:dev   # Vista previa en vivo
npm run docs:build # Salida estática → docs/.vitepress/dist
```

## Enviar un pull request

1. Haz fork del repositorio y crea una rama: `git checkout -b feat/mi-funcionalidad`
2. Realiza tus cambios y añade JSDoc a cualquier símbolo público nuevo.
3. Ejecuta `npm run lint` y `npm run format`.
4. Verifica la compilación: `npm run build`.
5. Haz push y abre un PR contra `main`.

## Añadir un nuevo adaptador

Coloca el código del adaptador en `src/adapters/<nombre>/`:

```
src/adapters/my-adapter/
  MyAdapter.ts   ← implementa SerialProvider
  index.ts       ← re-exportaciones
```

Luego re-expórtalo desde `src/index.ts`:

```ts
export * from "./adapters/my-adapter/index.js";
```

Añade un demo en `demos/my-adapter/` siguiendo la estructura de demos existente.
