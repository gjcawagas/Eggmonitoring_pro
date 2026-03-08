# EggWatch Pro - Smart Egg Incubator Dashboard

A modern, responsive web dashboard for monitoring smart egg incubators. Designed to connect with ESP32-based incubator systems.

![Dashboard Preview](https://via.placeholder.com/800x400?text=EggWatch+Pro+Dashboard)

## Features

### Real-Time Monitoring
- **Temperature Display**: Large display with color indicators (blue=low, green=normal, red=high)
- **Humidity Display**: Percentage display with status indicators
- **Egg Turning Status**: Shows if motor is Running or Idle
- **Turns Counter**: Number of egg turns completed today
- **Countdown Timer**: Shows time until next egg turn

### Control Panel
- Set number of turns per day
- Set interval between turns (hours)
- Automatic schedule calculation and display

### Data Logging
- Latest 20 logs with auto-update every 15 minutes
- Full history with search and filtering
- Export data to CSV

### Visualization
- Line charts for temperature over time
- Line charts for humidity over time
- Visual markers for egg turning events

### Alerts System
- Temperature alerts (above/below safe range)
- Humidity alerts (outside desired range)
- Real-time notifications

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- Internet connection for loading Chart.js and Font Awesome

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/eggwatch-pro.git
cd eggwatch-pro
```

2. Open `index.html` in your web browser

3. The dashboard will start with simulated data. To connect to a real ESP32:

   - Open [`app.js`](app.js)
   - Update the `API_ENDPOINT` in the CONFIG object:
   ```javascript
   const CONFIG = {
       API_ENDPOINT: 'http://YOUR_ESP32_IP_ADDRESS/api',
       // ...
   };
   ```

### ESP32 API Integration

The dashboard expects your ESP32 to provide JSON data at the following endpoint:

**GET** `/api`

Response:
```json
{
    "temperature": 38.0,
    "humidity": 55.0,
    "eggTurning": false,
    "turnsToday": 3,
    "fanOn": true,
    "fanLastRan": "2024-01-15T10:30:00Z",
    "timestamp": "2024-01-15T10:30:00Z"
}
```

**POST** `/api/fan`
```json
{ "enabled": true }
```

**POST** `/api/settings`
```json
{
    "turnsPerDay": 6,
    "turnInterval": 4
}
```

## Project Structure

```
eggwatch-pro/
├── index.html      # Main HTML file
├── styles.css      # CSS styles with dark mode
├── app.js          # JavaScript functionality
├── README.md       # This file
└── .gitignore      # Git ignore file
```

## Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Styling with CSS variables
- **JavaScript (ES6+)** - Functionality
- **Chart.js** - Data visualization
- **Font Awesome** - Icons

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## License

This project is for educational purposes.

## Author

Created for BSCPE Thesis Project
