# Demos interactivos

Prueba **webserial-core** directamente en tu navegador — sin instalación, sin
compilación. Los demos usan el bundle UMD para funcionar como páginas HTML estáticas.

> **Requisito:** Los demos usan APIs de navegador exclusivas (Web Serial, WebUSB,
> Web Bluetooth). Necesitas **Chrome 89+** o **Edge 89+** en la mayoría de demos.
> Safari y Firefox no están soportados.

## Demos disponibles

### ⚡ Web Serial

Conecta usando la **Web Serial API nativa** de Chrome/Edge.

- Enviar TXT o HEX
- Eventos de conexión/desconexión en tiempo real
- Auto-reconexión configurable

👉 **[Abrir demo Web Serial](/demos/web-serial.html)**

---

### 🔌 WebUSB

Conecta dispositivos serial USB en Android Chrome o Desktop usando el
**polyfill WebUSB** (sin necesitar la API Web Serial).

- Compatible con CP210x, CH340, Arduino (CDC-ACM)
- Útil para probar el comportamiento de Android desde el escritorio

👉 **[Abrir demo WebUSB](/demos/web-usb.html)**

---

### 📶 Web Bluetooth (BLE UART)

Comunícate con dispositivos BLE UART mediante el
**Nordic UART Service (NUS)** sobre GATT.

- Compatible con ESP32 BLE, nRF52, HC-08, AT-09
- Escrituras auto-fragmentadas al MTU BLE de 20 bytes

👉 **[Abrir demo Web Bluetooth](/demos/web-bluetooth.html)**

---

## Uso en producción

Los demos usan el bundle UMD (`webserial-core.umd.js`) vía tag `<script>`.
Para proyectos reales, importa con ESM para aprovechar el tree-shaking:

```ts
import { AbstractSerialDevice, delimiter } from "webserial-core";
```

## Código fuente de los demos de desarrollo

Los demos de desarrollo completos con TypeScript se encuentran en
[`demos/`](https://github.com/danidoble/webserial-core/tree/main/demos) en el repositorio.
Incluye ejemplos de auto-reconexión, modo HEX y bridge WebSocket.
