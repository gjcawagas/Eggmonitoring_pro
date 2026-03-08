/**
 * EggWatch Pro - ESP32 Incubator Controller
 * 
 * This code connects to the EggWatch Pro dashboard via WiFi
 * and provides REST API endpoints for sensor data
 * 
 * Hardware:
 * - ESP32 (or ESP32 DevKit)
 * - AHT10 Temperature & Humidity Sensor (I2C)
 * - L298N Motor Driver (for egg turning)
 * - Relay Module (for fan control)
 * 
 * Connections:
 * AHT10 SDA -> GPIO21 (or configurable)
 * AHT10 SCL -> GPIO22 (or configurable)
 * Motor IN1 -> GPIO18
 * Motor IN2 -> GPIO19
 * Fan Relay -> GPIO21
 * 
 * API Endpoints:
 * GET /api - Returns current sensor data as JSON
 * POST /api/fan - Toggle fan { "enabled": true/false }
 * POST /api/turn - Trigger egg turn
 * POST /api/settings - Update settings { "turnsPerDay": X }
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_AHTX0.h>

// ==================== CONFIGURATION ====================

// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Hardware Pins
#define MOTOR_IN1 18      // Motor driver IN1
#define MOTOR_IN2 19      // Motor driver IN2
#define FAN_PIN 21        // Fan relay control

// I2C Pins (for AHT10)
#define I2C_SDA 21
#define I2C_SCL 22

// Sensor Settings
#define TURN_DURATION 5000    // How long to turn (ms)

// ==================== GLOBAL VARIABLES ====================

// Initialize AHT10 sensor
Adafruit_AHTX0 aht10;

// Web server on port 80
WebServer server(80);

// Sensor data
float temperature = 0;
float humidity = 0;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_READ_INTERVAL = 2000;

// Egg turning
bool motorRunning = false;
unsigned long motorStartTime = 0;
int turnsToday = 0;
unsigned long lastTurnTime = 0;
unsigned long nextTurnTime = 0;
int turnsPerDay = 6;

// Fan control
bool fanOn = false;

// Timing
unsigned long bootTime;
unsigned long lastUpdateTime = 0;

// ==================== HTML RESPONSE PAGES ====================

const char indexHTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>EggWatch Pro - ESP32</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial; text-align: center; padding: 20px; background: #1a1d27; color: #fff; }
    .status { margin: 20px 0; }
    .data { font-size: 24px; margin: 10px; }
    .on { color: #22c55e; }
    .off { color: #ef4444; }
  </style>
</head>
<body>
  <h1>EggWatch Pro - ESP32 Controller</h1>
  <div class="status">
    <p>Temperature: <span id="temp">--</span> °C</p>
    <p>Humidity: <span id="hum">--</span> %</p>
    <p>Fan: <span id="fan" class="off">OFF</span></p>
    <p>Motor: <span id="motor" class="off">Idle</span></p>
    <p>Turns Today: <span id="turns">0</span></p>
  </div>
  <script>
    async function updateStatus() {
      try {
        const response = await fetch('/api');
        const data = await response.json();
        document.getElementById('temp').innerText = data.temperature.toFixed(1);
        document.getElementById('hum').innerText = data.humidity.toFixed(1);
        document.getElementById('fan').innerText = data.fanOn ? 'ON' : 'OFF';
        document.getElementById('fan').className = data.fanOn ? 'on' : 'off';
        document.getElementById('motor').innerText = data.eggTurning ? 'Running' : 'Idle';
        document.getElementById('motor').className = data.eggTurning ? 'on' : 'off';
        document.getElementById('turns').innerText = data.turnsToday;
      } catch(e) {
        console.error(e);
      }
    }
    setInterval(updateStatus, 3000);
    updateStatus();
  </script>
</body>
</html>
)rawliteral";

// ==================== API HANDLERS ====================

void handleRoot() {
  server.send(200, "text/html", indexHTML);
}

void handleApi() {
  StaticJsonDocument<512> doc;
  
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["eggTurning"] = motorRunning;
  doc["turnsToday"] = turnsToday;
  doc["fanOn"] = fanOn;
  doc["fanLastRan"] = fanOn ? millis() : lastUpdateTime - 300000;
  doc["timestamp"] = millis();
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
}

void handleFanControl() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"No data received\"}");
    return;
  }
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  
  if (error) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  
  if (doc.containsKey("enabled")) {
    fanOn = doc["enabled"];
    digitalWrite(FAN_PIN, fanOn ? HIGH : LOW);
    
    StaticJsonDocument<256> response;
    response["success"] = true;
    response["fanOn"] = fanOn;
    
    String jsonResponse;
    serializeJson(response, jsonResponse);
    server.send(200, "application/json", jsonResponse);
  } else {
    server.send(400, "application/json", "{\"error\":\"Missing 'enabled' field\"}");
  }
}

void handleTurnTrigger() {
  if (!motorRunning) {
    startMotorTurn();
  }
  
  StaticJsonDocument<256> response;
  response["success"] = true;
  response["turnsToday"] = turnsToday;
  
  String jsonResponse;
  serializeJson(response, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

void handleSettings() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"No data received\"}");
    return;
  }
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  
  if (error) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  
  if (doc.containsKey("turnsPerDay")) {
    turnsPerDay = doc["turnsPerDay"];
    calculateNextTurnTime();
    
    StaticJsonDocument<256> response;
    response["success"] = true;
    response["turnsPerDay"] = turnsPerDay;
    
    String jsonResponse;
    serializeJson(response, jsonResponse);
    server.send(200, "application/json", jsonResponse);
  } else {
    server.send(400, "application/json", "{\"error\":\"Missing 'turnsPerDay' field\"}");
  }
}

void handleNotFound() {
  server.send(404, "application/json", "{\"error\":\"Not Found\"}");
}

// ==================== MOTOR CONTROL ====================

void startMotorTurn() {
  if (!motorRunning) {
    motorRunning = true;
    motorStartTime = millis();
    turnsToday++;
    lastTurnTime = millis();
    
    // Start motor (adjust direction as needed)
    digitalWrite(MOTOR_IN1, HIGH);
    digitalWrite(MOTOR_IN2, LOW);
  }
}

void stopMotor() {
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  motorRunning = false;
  calculateNextTurnTime();
}

void calculateNextTurnTime() {
  unsigned long intervalMs = (24UL * 60UL * 60UL * 1000UL) / turnsPerDay;
  nextTurnTime = lastTurnTime + intervalMs;
}

// ==================== SENSOR READINGS ====================

void readSensors() {
  sensors_event_t humidity, temp;
  
  // Read from AHT10 sensor
  if (aht10.getEvent(&humidity, &temp)) {
    temperature = temp.temperature;
    humidity = humidity.relative_humidity;
  }
  
  lastSensorRead = millis();
}

// ==================== AUTOMATIC TURNING ====================

void checkAutoTurn() {
  if (!motorRunning && millis() >= nextTurnTime && turnsPerDay > 0) {
    startMotorTurn();
  }
}

// ==================== MOTOR TIMEOUT ====================

void checkMotorTimeout() {
  if (motorRunning && (millis() - motorStartTime >= TURN_DURATION)) {
    stopMotor();
  }
}

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);
  
  // Initialize I2C for AHT10
  Wire.begin(I2C_SDA, I2C_SCL);
  
  // Initialize pins
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  
  // Ensure motor and fan are off
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  digitalWrite(FAN_PIN, LOW);
  
  // Initialize AHT10 sensor
  if (!aht10.begin()) {
    Serial.println("Could not find AHT10 sensor!");
    while (1) delay(10);
  }
  Serial.println("AHT10 sensor found!");
  
  // Connect to WiFi
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.print("WiFi connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("");
    Serial.println("WiFi connection failed!");
  }
  
  // Setup web server routes
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api", HTTP_GET, handleApi);
  server.on("/api/fan", HTTP_POST, handleFanControl);
  server.on("/api/turn", HTTP_POST, handleTurnTrigger);
  server.on("/api/settings", HTTP_POST, handleSettings);
  server.onNotFound(handleNotFound);
  
  server.begin();
  Serial.println("HTTP server started");
  
  // Initialize timing
  bootTime = millis();
  calculateNextTurnTime();
  
  // Initial sensor read
  readSensors();
}

// ==================== MAIN LOOP ====================

void loop() {
  // Handle web server requests
  server.handleClient();
  
  // Read sensors every interval
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensors();
  }
  
  // Check automatic turning
  checkAutoTurn();
  
  // Check motor timeout
  checkMotorTimeout();
  
  // Update last time
  lastUpdateTime = millis();
  
  // Small delay to prevent watchdog issues
  delay(10);
}
