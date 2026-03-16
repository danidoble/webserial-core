/**
 * ESP32 BLE UART (Nordic UART Service)
 * ======================================
 * Compatible con el Web Bluetooth Provider que usa los UUIDs:
 *   Service : 6e400001-b5a3-f393-e0a9-e50e24dcca9e
 *   TX char : 6e400002-b5a3-f393-e0a9-e50e24dcca9e  (browser writes here)
 *   RX char : 6e400003-b5a3-f393-e0a9-e50e24dcca9e  (ESP32 notify to browser)
 *
 * Library required: "ESP32 BLE Arduino" (Already included in the board
 * package esp32 de Espressif)
 */

#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

// ── Nordic UART Service UUIDs ──────────────────────────────────────────────
#define SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX                                                 \
  "6e400002-b5a3-f393-e0a9-e50e24dcca9e" // Browser → ESP32
#define CHARACTERISTIC_UUID_RX                                                 \
  "6e400003-b5a3-f393-e0a9-e50e24dcca9e" // ESP32  → Browser

#define DEVICE_NAME "ESP32-UART"

// ── Forward declarations ───────────────────────────────────────────────────
void handleCommand(const String &cmd);
void sendToBrowser(const String &message);

// ── Globals ────────────────────────────────────────────────────────────────
BLEServer *pServer = nullptr;
BLECharacteristic *pTxCharacteristic = nullptr;
BLECharacteristic *pRxCharacteristic = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;
String rxBuffer = "";

// ── Callbacks of connection ──────────────────────────────────────────────────
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) override {
    deviceConnected = true;
    Serial.println("[BLE] Client connected");
  }

  void onDisconnect(BLEServer *pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] Client disconnected");
  }
};

// ── Callbacks of writing (browser → ESP32) ───────────────────────────────
class TxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
    String value = pCharacteristic->getValue();
    if (value.length() > 0) {
      rxBuffer = value;
      Serial.print("[BLE] Received: ");

      // remove \r\n from rxBuffer
      String cleanCmd = rxBuffer;
      cleanCmd.trim();

      Serial.println(cleanCmd);
      handleCommand(cleanCmd);
    }
  }
};

// ── Logic of commands ─────────────────────────────────────────────────────
void handleCommand(const String &cmd) {
  Serial.print("[CMD] ");
  Serial.println(cmd);

  if (cmd == "PING") {
    sendToBrowser("PONG\n");
  } else if (cmd == "CONNECT") {
    sendToBrowser("connected\n");
  } else if (cmd == "CREDITS") {
    sendToBrowser("created by danidoble\n");
  } else if (cmd == "HI") {
    sendToBrowser("hello there\n");
  } else if (cmd == "GET_STATUS") {
    String json = "{\"uptime\":" + String(millis()) +
                  ",\"heap\":" + String(ESP.getFreeHeap()) + "}";
    sendToBrowser(json + "\n");
  } else {
    sendToBrowser("ara ara, what are you doing?\n");
  }
}

// ── Send to browser (with chunking by MTU limit) ────────────────────
void sendToBrowser(const String &message) {
  if (!deviceConnected)
    return;

  const size_t chunkSize = 20;
  size_t len = message.length();
  size_t offset = 0;

  while (offset < len) {
    size_t end = min(offset + chunkSize, len);
    String chunk = message.substring(offset, end);
    pRxCharacteristic->setValue(chunk.c_str());
    pRxCharacteristic->notify();
    offset = end;
    delay(10);
  }

  Serial.print("[BLE] Sent: ");
  Serial.println(message);
}

// ── Setup ──────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("[BLE] Starting...");

  BLEDevice::init(DEVICE_NAME);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID_TX,
      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  pTxCharacteristic->setCallbacks(new TxCallbacks());

  pRxCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID_RX, BLECharacteristic::PROPERTY_NOTIFY);
  pRxCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Ready. Waiting for connection...");
}

// ── Loop ───────────────────────────────────────────────────────────────────
void loop() {
  // Restart advertising after disconnection
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Restarting advertising...");
    oldDeviceConnected = deviceConnected;
  }

  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}