# WebSerial Core

And easy way to connect to a serial port from a web page.

## Installation

```bash
npm install webserial-core
```

## Usage

You need to create a new class to configure your device functions. In this example, we are going to create a class to
connect to an Arduino device.

The first step is having the Arduino code ready. In this case, we are going to use the following code.

```cpp
// serial.ino

void setup() {
  Serial.begin(9600);
}

void loop() {
  if (Serial.available() > 0) { // Check if data to read is available
    String comando = Serial.readStringUntil('\n'); // read the data until a new line is found

    if(comando.startsWith("CONNECT")){
      Serial.println("connected");
    } else if (comando.startsWith("CREDITS")) {
      Serial.println("created by danidoble");
    } else if (comando.startsWith("HI")) {
      Serial.println("hello there");
    } else {
      Serial.println("ara ara, what are you doing?");
    }
  }
}
```

Create a new class to connect to the device.

```javascript
// arduino.js
import { Core } from 'webserial-core';

export class Arduino extends Core {
  constructor(
    {
      filters = null,
      config_port = {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        bufferSize: 32768,
        flowControl: "none",
      },
      no_device = 1,
    } = {
      filters: null,
      config_port: {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        bufferSize: 32768,
        flowControl: "none",
      },
      no_device: 1,
    }
  ) {
    super({ filters, config_port, no_device });
    this.__internal__.device.type = "arduino";
    Devices.registerType(this.__internal__.device.type);
    if (Devices.getByNumber(this.typeDevice, no_device)) {
      throw new Error(`Device ${this.typeDevice} ${no_device} already exists`);
    }
    this.__internal__.time.response_connection = 2e3;
    this.__internal__.time.response_general = 2e3;
    this.__internal__.serial.delay_first_connection = 1_000;
    this.#registerAvailableListenersLocker();
    this.#touch();
    this.getResponseAsString();
  }

  #touch() {
    Devices.add(this);
  }

  #registerAvailableListenersLocker(): void {
    /*const _ = [
    'my_own_event_dispatched',
    'my_other_own_event_dispatched',
    ];
    for (const event of _) {
        this.serialRegisterAvailableListener(event)
    }
    */
  }

  serialMessage(codex) {
    const message = {
      code: [],
      name: "",
      description: "",
      request: "",
      no_code: 0,
    };

    message.code = codex;

    switch (codex) {
      case "connected":
        message.name = "connected";
        message.description = "Connection established";
        message.request = "connect";
        message.no_code = 100;
        break;
      case "created by danidoble":
        message.name = "thanks";
        message.description = "thanks for using this software";
        message.request = "credits";
        message.no_code = 101;
        break;
      case "hello there":
        message.name = "hello there";
        message.description = "hi human";
        message.request = "hi";
        message.no_code = 102;
        break;
      case "ara ara":
        message.name = "ara ara";
        message.description = "troll";
        message.request = "ara ara";
        message.no_code = 404;
        break;
      default:
        message.name = "unknown";
        message.description = "Unknown command";
        message.request = "unknown";
        message.no_code = 400;
        break;
    }

    this.dispatch("serial:message", message);
  }

  serialSetConnectionConstant() {
    return this.add0x(this.parseStringToBytes("CONNECT"));
  }

  async sayCredits() {
    const arr = this.parseStringToBytes("CREDITS");
    await this.appendToQueue(arr, "credits");
  }

  async sayHi() {
    const arr = this.parseStringToBytes("HI");
    await this.appendToQueue(arr, "hi");
  }

  async sayAra() {
    const arr = this.parseStringToBytes("OTHER");
    await this.appendToQueue(arr, "ara");
  }

  async sendCustomCode({ code = "" } = { code: "" }) {
    if (typeof code !== "string") throw new Error("Invalid string");
    const arr = this.parseStringToBytes(code);
    await this.appendToQueue(arr, "custom");
  }
}
```

Then you can use the class to connect to your device.

```javascript 
// serialConnection.js

import { Arduino } from './arduino.js';

const arduino = new Arduino();

arduino.on('serial:message', (message) => {
  console.log(message);
});

arduino.on('serial:timeout', (data) => {
  console.log('serial:timeout', data.detail);
});

// if you need to debug the data sent
// arduino.on('serial:sent', data => {
//     console.log('serial:sent',data.detail);
// });

arduino.on('serial:error', (event) => {
  document.getElementById('log').innerText += event.detail.message + '\n\n';
});

// eslint-disable-next-line no-unused-vars
arduino.on('serial:disconnected', (event) => {
  document.getElementById('log').innerText += 'Disconnected\n\n';

  document.getElementById('disconnected').classList.remove('hidden');
  document.getElementById('connect').classList.remove('hidden');
});

// eslint-disable-next-line no-unused-vars
arduino.on('serial:connecting', (event) => {
  document.getElementById('log').innerText += 'Connecting\n\n';
});

// eslint-disable-next-line no-unused-vars
arduino.on('serial:connected', (event) => {
  document.getElementById('log').innerText += 'Connected\n\n';

  document.getElementById('disconnected').classList.add('hidden');
  document.getElementById('need-permission').classList.add('hidden');
  document.getElementById('connect').classList.add('hidden');
});

// eslint-disable-next-line no-unused-vars
arduino.on('serial:need-permission', (event) => {
  document.getElementById('disconnected').classList.remove('hidden');
  document.getElementById('need-permission').classList.remove('hidden');
  document.getElementById('connect').classList.remove('hidden');
});

// eslint-disable-next-line no-unused-vars
arduino.on('serial:soft-reload', (event) => {
  // reset your variables
});

// eslint-disable-next-line no-unused-vars
arduino.on('serial:unsupported', (event) => {
  document.getElementById('unsupported').classList.remove('hidden');
});

function tryConnect() {
  arduino
    .connect()
    .then(() => {})
    .catch(console.error);
}

document.addEventListener('DOMContentLoaded', () => {
  tryConnect();
  document.getElementById('connect').addEventListener('click', tryConnect);
});

```

But wait still need to create the HTML file.

```html
<!doctype html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Webserial</title>
    <script src="./serialConnection.js" type="module"></script>
</head>

<body class="bg-neutral-950 text-white p-4 w-full">

    <div class="webserial w-full max-w-xl mx-auto grid grid-cols-1 gap-y-4">
        <div class="my-6"></div>
        <button id="connect" class="hidden px-4 py-3 bg-gray-800 rounded-lg">Connect to serial</button>

        <div id="need-permission" class="hidden p-4 bg-rose-900 rounded-lg">
            Woooah! It seems that you need to give permission to access the serial port.
            Please, click the button 'Connect to serial' to try again.
        </div>

        <div id="disconnected" class="hidden p-4 bg-neutral-900 w-full">
            The arduino is disconnected. Please, check the connection.
        </div>

        <div id="unsupported" class="hidden p-4 bg-orange-700 w-full absolute bottom-0 left-0">
            This browser does not support the WebSerial API. Please, use a compatible browser.
        </div>

        <div id="log" class="bg-neutral-800 p-4 rounded-lg">
            Log: <br>
        </div>
    </div>

    <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,container-queries"></script>
</body>

</html>
```