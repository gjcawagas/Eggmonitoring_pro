# EggWatch Pro - ESP32 Incubator Controller

This is the Arduino/ESP32 code for the smart egg incubator using **AHT10** sensor. It connects to WiFi and provides a REST API that the dashboard can call to get sensor data and control the incubator.

## Hardware Required

- **ESP32** (or ESP32 DevKit)
- **AHT10** Temperature & Humidity Sensor (I2C)
- **L298N** Motor Driver (for egg turning)
- **Relay Module** (for fan control)
- **12V Power Supply** (for motor)
- **Jumper Wires**

## Circuit Diagram

```
ESP32 Connections:
------------------
AHT10 SDA       -> GPIO 21
AHT10 SCL       -> GPIO 22
Motor IN1       -> GPIO 18
Motor IN2       -> GPIO 19
Fan Relay       -> GPIO 21
```

Note: If you use GPIO 21 for the fan, change the AHT10 SDA to a different pin.

## Installation

1. **Install Arduino IDE** from https://www.arduino.cc/

2. **Add ESP32 Board Support:**
   - Open Arduino IDE
   - Go to File > Preferences
   - Add this URL to "Additional Board Manager URLs":
     ```
     https://dl.espressif.com/dl/package_esp32_index.json
     ```
   - Go to Tools > Board > Board Manager
   - Search for "ESP32" and install

3. **Install Required Libraries:**
   - Go to Sketch > Include Library > Manage Libraries
   - Install:
     - "Adafruit AHTX0" by Adafruit
     - "ArduinoJson" by Benoit Blanchon

4. **Configure the Code:**
   - Open `esp32_incubator.ino`
   - Change these lines to your WiFi:
     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";
     const char* password = "YOUR_WIFI_PASSWORD";
     ```

5. **Upload:**
   - Connect your ESP32 to computer
   - Select your board: Tools > Board > ESP32 Dev Module
   - Select the correct port
   - Upload the code

## API Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `/api` | Get all sensor data | - |
| POST | `/api/fan` | Toggle fan | `{"enabled": true}` |
| POST | `/api/turn` | Trigger egg turn | - |
| POST | `/api/settings` | Update settings | `{"turnsPerDay": 6}` |

## API Response Example

```json
{
  "temperature": 38.0,
  "humidity": 55.0,
  "eggTurning": false,
  "turnsToday": 3,
  "fanOn": true,
  "fanLastRan": 123456789,
  "timestamp": 123456789
}
```

## Connecting to Dashboard

After uploading, note your ESP32's IP address (shown in Serial Monitor).

1. Open the dashboard code in `app.js`
2. Find this line:
   ```javascript
   API_ENDPOINT: 'http://192.168.1.100/api',
   ```
3. Replace with your ESP32's IP address

## Troubleshooting

- **Can't connect to WiFi:** Check your SSID and password
- **Sensors not reading:** Check AHT10 wiring (SDA, SCL)
- **Motor not working:** Check motor driver connections and power supply
- **Dashboard not connecting:** Make sure ESP32 and computer are on same network

## Features

- Real-time temperature and humidity monitoring (AHT10)
- Automatic egg turning with configurable schedule
- Manual fan control
- REST API for dashboard integration
- Built-in web status page

## Pin Configuration

You can modify these pins in the code:

```cpp
#define MOTOR_IN1 18      // Change if needed
#define MOTOR_IN2 19      // Change if needed
#define FAN_PIN 21        // Change if needed
#define I2C_SDA 21        // AHT10 SDA
#define I2C_SCL 22        // AHT10 SCL
```
