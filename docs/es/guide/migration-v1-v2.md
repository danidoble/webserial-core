# Migración desde v1

> **v2 es una reescritura completa de webserial-core y no es compatible con v1.**

La versión 2 introduce una nueva arquitectura, un nuevo sistema de adaptadores, nueva
estructura de carpetas, nuevo formato de salida de compilación y cambios en toda la API
pública. No existe una ruta de actualización incremental.

---

## Enfoque recomendado

La forma más limpia de migrar es **empezar desde cero** con v2:

1. Desinstala v1 e instala v2:

   ```bash
   npm remove webserial-core
   npm install webserial-core@latest
   ```

2. Elimina cualquier extensión existente de la antigua clase `SerialDevice`.

3. Crea una nueva clase que extienda `AbstractSerialDevice<T>` siguiendo la
   guía de [Primeros pasos](./getting-started.md).

---

## ¿Por qué una reescritura completa?

La versión 1 fue un prototipo que demostró el concepto. La versión 2 fue diseñada desde
cero con los siguientes objetivos que requirieron cambios incompatibles en cada capa:

- **TypeScript estricto** — sin `any`, JSDoc completo, interfaces con nombre para cada opción
- **Sistema de adaptadores modular** — WebUSB, Web Bluetooth y WebSocket son transportes de primera clase
- **Salida dual ESM + CJS** — compilación correcta con `.mjs` / `.cjs` / `.umd.js` vía Vite
- **Responsabilidades aisladas** — parsers, cola, eventos, registro y adaptadores son módulos
  separados que pueden testearse independientemente
- **Código fuente solo en inglés** — todo el código fuente, JSDoc y mensajes de error están en inglés

---

## Referencia

:::tip Empieza aquí
Lee la guía de [Primeros pasos](./getting-started.md) para la API completa de v2.
:::

- [API — AbstractSerialDevice](../api/abstract-serial-device.md)
- [API — Eventos](../api/events.md)
- [API — Parsers](../api/parsers.md)
- [Ejemplos](../examples/web-serial.md)
