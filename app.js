/**
 * EggWatch Pro - Smart Incubator Dashboard
 * JavaScript for real-time monitoring and all dashboard features
 */

// ============================================
// Configuration & Constants
// ============================================
const CONFIG = {
    API_ENDPOINT: 'http://192.168.1.100/api', // ESP32 API endpoint
    POLL_INTERVAL: 3000, // 3 seconds for real-time updates
    LOGS_UPDATE_INTERVAL: 900000, // 15 minutes
    TEMP_MIN_SAFE: 37.5,
    TEMP_MAX_SAFE: 38.5,
    HUMIDITY_MIN: 50,
    HUMIDITY_MAX: 60,
    DEFAULT_TURNS_PER_DAY: 6,
    DEFAULT_TURN_INTERVAL: 4,
    MAX_HISTORY_RECORDS: 1000,
    RECENT_LOGS_COUNT: 20
};

// Safe ranges
const TEMP_RANGES = {
    LOW: { min: 0, max: 37.0, status: 'low', label: 'Low' },
    NORMAL: { min: 37.5, max: 38.5, status: 'normal', label: 'Normal' },
    HIGH: { min: 39.0, max: 100, status: 'high', label: 'High' }
};

const HUMIDITY_RANGES = {
    LOW: { min: 0, max: 45, status: 'low', label: 'Low' },
    NORMAL: { min: 50, max: 60, status: 'normal', label: 'Normal' },
    HIGH: { min: 65, max: 100, status: 'high', label: 'High' }
};

// ============================================
// State Management
// ============================================
const state = {
    currentData: {
        temperature: null,
        humidity: null,
        eggTurning: false,
        turnsToday: 0,
        fanOn: false,
        fanLastRan: null,
        lastUpdate: null
    },
    settings: {
        turnsPerDay: CONFIG.DEFAULT_TURNS_PER_DAY,
        turnInterval: CONFIG.DEFAULT_TURN_INTERVAL
    },
    nextTurnTime: null,
    logs: [],
    history: [],
    historyPage: 1,
    historyPerPage: 50,
    filters: {
        searchDate: null,
        tempMin: null,
        tempMax: null,
        humidityMin: null,
        humidityMax: null
    },
    alerts: [],
    isDarkMode: localStorage.getItem('darkMode') === 'true',
    isConnected: true,
    chartData: {
        temperature: [],
        humidity: []
    }
};

// ============================================
// DOM Elements
// ============================================
const elements = {
    // Theme toggle
    themeToggle: document.getElementById('themeToggle'),
    
    // Connection status
    connectionStatus: document.getElementById('connectionStatus'),
    
    // Real-time monitoring
    temperatureValue: document.getElementById('temperatureValue'),
    temperatureCard: document.getElementById('temperatureCard'),
    temperatureStatus: document.getElementById('temperatureStatus'),
    
    humidityValue: document.getElementById('humidityValue'),
    humidityCard: document.getElementById('humidityCard'),
    humidityStatus: document.getElementById('humidityStatus'),
    
    turningStatus: document.getElementById('turningStatus'),
    turnsToday: document.getElementById('turnsToday'),
    nextTurnCountdown: document.getElementById('nextTurnCountdown'),
    
    fanToggle: document.getElementById('fanToggle'),
    fanStatus: document.getElementById('fanStatus'),
    fanLastRan: document.getElementById('fanLastRan'),
    
    // Alerts
    alertsSection: document.getElementById('alertsSection'),
    
    // Control panel
    turnsPerDay: document.getElementById('turnsPerDay'),
    turnInterval: document.getElementById('turnInterval'),
    saveSettings: document.getElementById('saveSettings'),
    scheduleTimes: document.getElementById('scheduleTimes'),
    
    // Charts
    temperatureChart: null,
    humidityChart: null,
    
    // Logs
    logsTableBody: document.getElementById('logsTableBody'),
    logsLastUpdate: document.getElementById('logsLastUpdate'),
    
    // History
    toggleHistory: document.getElementById('toggleHistory'),
    historyCard: document.getElementById('historyCard'),
    searchDate: document.getElementById('searchDate'),
    filterTempMin: document.getElementById('filterTempMin'),
    filterTempMax: document.getElementById('filterTempMax'),
    filterHumidityMin: document.getElementById('filterHumidityMin'),
    filterHumidityMax: document.getElementById('filterHumidityMax'),
    applyFilters: document.getElementById('applyFilters'),
    clearFilters: document.getElementById('clearFilters'),
    exportCSV: document.getElementById('exportCSV'),
    historyTableBody: document.getElementById('historyTableBody'),
    historyStats: document.getElementById('historyStats'),
    totalRecords: document.getElementById('totalRecords'),
    filteredRecords: document.getElementById('filteredRecords'),
    historyPagination: document.getElementById('historyPagination')
};

// ============================================
// Utility Functions
// ============================================
function formatDateTime(date) {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCountdown(ms) {
    if (ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getTemperatureStatus(temp) {
    if (temp < TEMP_RANGES.NORMAL.min) return TEMP_RANGES.LOW;
    if (temp <= TEMP_RANGES.NORMAL.max) return TEMP_RANGES.NORMAL;
    return TEMP_RANGES.HIGH;
}

function getHumidityStatus(humidity) {
    if (humidity < HUMIDITY_RANGES.NORMAL.min) return HUMIDITY_RANGES.LOW;
    if (humidity <= HUMIDITY_RANGES.NORMAL.max) return HUMIDITY_RANGES.NORMAL;
    return HUMIDITY_RANGES.HIGH;
}

// ============================================
// Mock API (Simulates ESP32 Connection)
// ============================================
class MockESP32API {
    constructor() {
        this.baseTemperature = 38.0;
        this.baseHumidity = 55;
        this.eggTurning = false;
        this.fanOn = false;
        this.turnsToday = 3;
        this.turnInterval = CONFIG.DEFAULT_TURN_INTERVAL;
        this.nextTurnTime = Date.now() + (Math.random() * 3600000);
    }

    async fetchSensorData() {
        // Simulate network delay
        await this.delay(100);
        
        // Add some random variation
        const temperatureVariation = (Math.random() - 0.5) * 1.5;
        const humidityVariation = (Math.random() - 0.5) * 8;
        
        return {
            temperature: parseFloat((this.baseTemperature + temperatureVariation).toFixed(1)),
            humidity: parseFloat((this.baseHumidity + humidityVariation).toFixed(1)),
            eggTurning: this.eggTurning,
            turnsToday: this.turnsToday,
            fanOn: this.fanOn,
            fanLastRan: this.fanOn ? new Date().toISOString() : new Date(Date.now() - 300000).toISOString(),
            timestamp: new Date().toISOString()
        };
    }

    async setFanStatus(enabled) {
        await this.delay(50);
        this.fanOn = enabled;
        return { success: true, fanOn: enabled };
    }

    async setTurnSettings(turnsPerDay, interval) {
        await this.delay(50);
        this.turnInterval = 24 / turnsPerDay;
        return { success: true };
    }

    async triggerEggTurn() {
        await this.delay(100);
        this.turnsToday++;
        return { success: true, turnsToday: this.turnsToday };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const api = new MockESP32API();

// ============================================
// Data Management
// ============================================
function addLog(data) {
    const log = {
        timestamp: data.timestamp,
        temperature: data.temperature,
        humidity: data.humidity,
        eggTurned: data.eggTurning,
        fanOn: data.fanOn
    };
    
    state.logs.unshift(log);
    
    // Keep only recent logs in memory
    if (state.logs.length > CONFIG.RECENT_LOGS_COUNT) {
        state.logs = state.logs.slice(0, CONFIG.RECENT_LOGS_COUNT);
    }
    
    // Add to history
    state.history.unshift(log);
    
    // Limit history size
    if (state.history.length > CONFIG.MAX_HISTORY_RECORDS) {
        state.history = state.history.slice(0, CONFIG.MAX_HISTORY_RECORDS);
    }
    
    // Save to localStorage
    saveToLocalStorage();
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('eggwatch_history', JSON.stringify(state.history));
        localStorage.setItem('eggwatch_settings', JSON.stringify(state.settings));
        localStorage.setItem('eggwatch_turns_today', state.currentData.turnsToday);
        localStorage.setItem('eggwatch_next_turn', state.nextTurnTime);
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const history = localStorage.getItem('eggwatch_history');
        const settings = localStorage.getItem('eggwatch_settings');
        const turnsToday = localStorage.getItem('eggwatch_turns_today');
        const nextTurn = localStorage.getItem('eggwatch_next_turn');
        
        if (history) {
            state.history = JSON.parse(history);
        }
        
        if (settings) {
            state.settings = JSON.parse(settings);
            elements.turnsPerDay.value = state.settings.turnsPerDay;
            elements.turnInterval.value = state.settings.turnInterval;
        }
        
        if (turnsToday) {
            state.currentData.turnsToday = parseInt(turnsToday);
        }
        
        if (nextTurn) {
            state.nextTurnTime = parseInt(nextTurn);
        }
    } catch (e) {
        console.warn('Failed to load from localStorage:', e);
    }
}

function generateMockHistory() {
    if (state.history.length > 0) return;
    
    const now = Date.now();
    for (let i = 0; i < 200; i++) {
        const timestamp = new Date(now - (i * 15 * 60 * 1000)); // Every 15 minutes
        const tempVariation = (Math.random() - 0.5) * 2;
        const humidityVariation = (Math.random() - 0.5) * 15;
        
        state.history.push({
            timestamp: timestamp.toISOString(),
            temperature: parseFloat((38.0 + tempVariation).toFixed(1)),
            humidity: parseFloat((55 + humidityVariation).toFixed(1)),
            eggTurned: Math.random() > 0.8,
            fanOn: Math.random() > 0.5
        });
    }
    
    // Sort by timestamp descending
    state.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ============================================
// UI Updates
// ============================================
function updateTemperatureDisplay(temp) {
    elements.temperatureValue.textContent = temp.toFixed(1);
    
    const status = getTemperatureStatus(temp);
    const card = elements.temperatureCard;
    const statusEl = elements.temperatureStatus;
    
    // Remove all status classes
    card.classList.remove('low', 'normal', 'high');
    card.classList.add(status.status);
    
    statusEl.textContent = status.label;
    statusEl.className = 'card-status ' + status.status;
}

function updateHumidityDisplay(humidity) {
    elements.humidityValue.textContent = humidity.toFixed(1);
    
    const status = getHumidityStatus(humidity);
    const card = elements.humidityCard;
    const statusEl = elements.humidityStatus;
    
    // Remove all status classes
    card.classList.remove('low', 'normal', 'high');
    card.classList.add(status.status);
    
    statusEl.textContent = status.label;
    statusEl.className = 'card-status ' + status.status;
}

function updateTurningDisplay(isTurning, turnsToday) {
    const statusEl = elements.turningStatus;
    
    if (isTurning) {
        statusEl.innerHTML = '<i class="fas fa-circle-notch spinning"></i><span>Running</span>';
        statusEl.className = 'status-indicator running';
    } else {
        statusEl.innerHTML = '<i class="fas fa-pause"></i><span>Idle</span>';
        statusEl.className = 'status-indicator idle';
    }
    
    elements.turnsToday.textContent = turnsToday;
}

function updateFanDisplay(fanOn, lastRan) {
    elements.fanToggle.classList.toggle('active', fanOn);
    elements.fanStatus.textContent = fanOn ? 'ON' : 'OFF';
    elements.fanLastRan.textContent = formatTime(lastRan);
}

function updateCountdown() {
    if (!state.nextTurnTime) {
        elements.nextTurnCountdown.textContent = '--:--';
        return;
    }
    
    const now = Date.now();
    const diff = state.nextTurnTime - now;
    
    if (diff <= 0) {
        // Trigger egg turn
        state.currentData.turnsToday++;
        elements.turnsToday.textContent = state.currentData.turnsToday;
        
        // Set next turn time
        const interval = (24 / state.settings.turnsPerDay) * 60 * 60 * 1000;
        state.nextTurnTime = Date.now() + interval;
        saveToLocalStorage();
    }
    
    elements.nextTurnCountdown.textContent = formatCountdown(diff);
}

function updateScheduleDisplay() {
    const { turnsPerDay } = state.settings;
    const interval = 24 / turnsPerDay;
    const now = new Date();
    const today = now.toDateString();
    
    let times = [];
    for (let i = 0; i < turnsPerDay; i++) {
        const hours = i * interval;
        const time = new Date(today);
        time.setHours(Math.floor(hours), (hours % 1) * 60, 0, 0);
        times.push(time);
    }
    
    elements.scheduleTimes.innerHTML = times.map(time => {
        const isPast = time < now;
        const isNext = !isPast && times.filter(t => t > now).indexOf(time) === 0;
        let className = 'schedule-time';
        if (isPast) className += ' past';
        if (isNext) className += ' active';
        
        return `<span class="${className}">${formatTime(time)}</span>`;
    }).join('');
}

// ============================================
// Charts
// ============================================
function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 500
        },
        scales: {
            x: {
                grid: {
                    color: state.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                },
                ticks: {
                    color: state.isDarkMode ? '#8b949e' : '#5a6c7d',
                    maxRotation: 45,
                    minRotation: 45
                }
            },
            y: {
                grid: {
                    color: state.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                },
                ticks: {
                    color: state.isDarkMode ? '#8b949e' : '#5a6c7d'
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: state.isDarkMode ? '#f0f6fc' : '#2c3e50'
                }
            }
        }
    };
    
    // Temperature Chart
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    elements.temperatureChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6
            }, {
                label: 'Safe Range',
                data: [],
                borderColor: '#27ae60',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    min: 35,
                    max: 42
                }
            }
        }
    });
    
    // Humidity Chart
    const humidityCtx = document.getElementById('humidityChart').getContext('2d');
    elements.humidityChart = new Chart(humidityCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Humidity (%)',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6
            }, {
                label: 'Optimal Range',
                data: [],
                borderColor: '#27ae60',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    min: 30,
                    max: 80
                }
            }
        }
    });
    
    // Initial chart data
    updateChartData();
}

function updateChartData() {
    // Get last 24 hours of data
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentHistory = state.history
        .filter(h => new Date(h.timestamp).getTime() > oneDayAgo)
        .slice(0, 48); // Max 48 points
    
    const labels = recentHistory.map(h => formatTime(h.timestamp));
    const temps = recentHistory.map(h => h.temperature);
    const humidities = recentHistory.map(h => h.humidity);
    
    // Safe range lines
    const safeTemp = Array(recentHistory.length).fill(CONFIG.TEMP_MAX_SAFE);
    const optimalHumidity = Array(recentHistory.length).fill(CONFIG.HUMIDITY_MAX);
    
    elements.temperatureChart.data.labels = labels;
    elements.temperatureChart.data.datasets[0].data = temps;
    elements.temperatureChart.data.datasets[1].data = safeTemp;
    elements.temperatureChart.update('none');
    
    elements.humidityChart.data.labels = labels;
    elements.humidityChart.data.datasets[0].data = humidities;
    elements.humidityChart.data.datasets[1].data = optimalHumidity;
    elements.humidityChart.update('none');
}

// ============================================
// Logs Display
// ============================================
function updateLogsDisplay() {
    const recentLogs = state.logs.slice(0, CONFIG.RECENT_LOGS_COUNT);
    
    elements.logsTableBody.innerHTML = recentLogs.map(log => `
        <tr>
            <td>${formatDateTime(log.timestamp)}</td>
            <td>${log.temperature.toFixed(1)}°C</td>
            <td>${log.humidity.toFixed(1)}%</td>
            <td class="${log.eggTurned ? 'egg-turn-yes' : 'egg-turn-no'}">
                ${log.eggTurned ? 'Yes' : 'No'}
            </td>
        </tr>
    `).join('');
    
    elements.logsLastUpdate.textContent = `Last update: ${formatDateTime(new Date())}`;
}

// ============================================
// History Display
// ============================================
function updateHistoryDisplay() {
    let filteredHistory = [...state.history];
    
    // Apply filters
    if (state.filters.searchDate) {
        const filterDate = new Date(state.filters.searchDate).toDateString();
        filteredHistory = filteredHistory.filter(h => 
            new Date(h.timestamp).toDateString() === filterDate
        );
    }
    
    if (state.filters.tempMin !== null && state.filters.tempMin !== '') {
        filteredHistory = filteredHistory.filter(h => 
            h.temperature >= parseFloat(state.filters.tempMin)
        );
    }
    
    if (state.filters.tempMax !== null && state.filters.tempMax !== '') {
        filteredHistory = filteredHistory.filter(h => 
            h.temperature <= parseFloat(state.filters.tempMax)
        );
    }
    
    if (state.filters.humidityMin !== null && state.filters.humidityMin !== '') {
        filteredHistory = filteredHistory.filter(h => 
            h.humidity >= parseFloat(state.filters.humidityMin)
        );
    }
    
    if (state.filters.humidityMax !== null && state.filters.humidityMax !== '') {
        filteredHistory = filteredHistory.filter(h => 
            h.humidity <= parseFloat(state.filters.humidityMax)
        );
    }
    
    // Pagination
    const totalPages = Math.ceil(filteredHistory.length / state.historyPerPage);
    const startIndex = (state.historyPage - 1) * state.historyPerPage;
    const paginatedHistory = filteredHistory.slice(startIndex, startIndex + state.historyPerPage);
    
    // Update stats
    elements.totalRecords.textContent = state.history.length;
    elements.filteredRecords.textContent = filteredHistory.length;
    
    // Render table
    elements.historyTableBody.innerHTML = paginatedHistory.map(log => `
        <tr>
            <td>${formatDateTime(log.timestamp)}</td>
            <td>${log.temperature.toFixed(1)}</td>
            <td>${log.humidity.toFixed(1)}</td>
            <td class="${log.eggTurned ? 'egg-turn-yes' : 'egg-turn-no'}">
                ${log.eggTurned ? 'Yes' : 'No'}
            </td>
            <td>${log.fanOn ? 'ON' : 'OFF'}</td>
        </tr>
    `).join('');
    
    // Render pagination
    if (totalPages > 1) {
        let paginationHTML = '';
        
        paginationHTML += `<button ${state.historyPage === 1 ? 'disabled' : ''} 
            onclick="goToPage(${state.historyPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            paginationHTML += `<button class="${i === state.historyPage ? 'active' : ''}" 
                onclick="goToPage(${i})">${i}</button>`;
        }
        
        paginationHTML += `<button ${state.historyPage === totalPages ? 'disabled' : ''} 
            onclick="goToPage(${state.historyPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        
        elements.historyPagination.innerHTML = paginationHTML;
    } else {
        elements.historyPagination.innerHTML = '';
    }
}

function goToPage(page) {
    state.historyPage = page;
    updateHistoryDisplay();
}

// ============================================
// Alerts System
// ============================================
function addAlert(type, message) {
    const alertId = Date.now();
    const alert = { id: alertId, type, message };
    state.alerts.push(alert);
    
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type}`;
    alertEl.id = `alert-${alertId}`;
    alertEl.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)}"></i>
        <span>${message}</span>
        <button class="alert-close" onclick="dismissAlert(${alertId})">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.alertsSection.appendChild(alertEl);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => dismissAlert(alertId), 10000);
}

function dismissAlert(id) {
    const alertEl = document.getElementById(`alert-${id}`);
    if (alertEl) {
        alertEl.remove();
    }
    state.alerts = state.alerts.filter(a => a.id !== id);
}

function getAlertIcon(type) {
    switch (type) {
        case 'danger': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        case 'info': return 'info-circle';
        default: return 'bell';
    }
}

function checkAlerts(temperature, humidity, eggTurning) {
    // Temperature alerts
    const tempStatus = getTemperatureStatus(temperature);
    if (tempStatus.status === 'low') {
        addAlert('danger', `Temperature too low: ${temperature.toFixed(1)}°C (Safe: ${CONFIG.TEMP_MIN_SAFE}-${CONFIG.TEMP_MAX_SAFE}°C)`);
    } else if (tempStatus.status === 'high') {
        addAlert('danger', `Temperature too high: ${temperature.toFixed(1)}°C (Safe: ${CONFIG.TEMP_MIN_SAFE}-${CONFIG.TEMP_MAX_SAFE}°C)`);
    }
    
    // Humidity alerts
    const humidityStatus = getHumidityStatus(humidity);
    if (humidityStatus.status === 'low') {
        addAlert('warning', `Humidity too low: ${humidity.toFixed(1)}% (Optimal: ${CONFIG.HUMIDITY_MIN}-${CONFIG.HUMIDITY_MAX}%)`);
    } else if (humidityStatus.status === 'high') {
        addAlert('warning', `Humidity too high: ${humidity.toFixed(1)}% (Optimal: ${CONFIG.HUMIDITY_MIN}-${CONFIG.HUMIDITY_MAX}%)`);
    }
}

// ============================================
// Theme Management
// ============================================
function initTheme() {
    if (state.isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    localStorage.setItem('darkMode', state.isDarkMode);
    initTheme();
    
    // Update chart colors
    if (elements.temperatureChart) {
        elements.temperatureChart.options.scales.x.grid.color = 
            state.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        elements.temperatureChart.options.scales.x.ticks.color = 
            state.isDarkMode ? '#8b949e' : '#5a6c7d';
        elements.temperatureChart.options.scales.y.grid.color = 
            state.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        elements.temperatureChart.options.scales.y.ticks.color = 
            state.isDarkMode ? '#8b949e' : '#5a6c7d';
        elements.temperatureChart.update();
        
        elements.humidityChart.options.scales.x.grid.color = 
            state.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        elements.humidityChart.options.scales.x.ticks.color = 
            state.isDarkMode ? '#8b949e' : '#5a6c7d';
        elements.humidityChart.options.scales.y.grid.color = 
            state.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        elements.humidityChart.options.scales.y.ticks.color = 
            state.isDarkMode ? '#8b949e' : '#5a6c7d';
        elements.humidityChart.update();
    }
}

// ============================================
// Event Handlers
// ============================================
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Fan toggle
    elements.fanToggle.addEventListener('click', async () => {
        const newState = !elements.fanToggle.classList.contains('active');
        const result = await api.setFanStatus(newState);
        if (result.success) {
            state.currentData.fanOn = result.fanOn;
            updateFanDisplay(result.fanOn, new Date().toISOString());
            addAlert('info', `Fan turned ${result.fanOn ? 'ON' : 'OFF'}`);
        }
    });
    
    // Save settings
    elements.saveSettings.addEventListener('click', async () => {
        const turnsPerDay = parseInt(elements.turnsPerDay.value);
        const turnInterval = parseInt(elements.turnInterval.value);
        
        if (turnsPerDay < 1 || turnsPerDay > 24 || turnInterval < 1 || turnInterval > 12) {
            addAlert('warning', 'Please enter valid settings');
            return;
        }
        
        state.settings.turnsPerDay = turnsPerDay;
        state.settings.turnInterval = turnInterval;
        
        await api.setTurnSettings(turnsPerDay, turnInterval);
        
        // Recalculate next turn time
        const interval = (24 / turnsPerDay) * 60 * 60 * 1000;
        state.nextTurnTime = Date.now() + interval;
        
        updateScheduleDisplay();
        saveToLocalStorage();
        
        addAlert('success', 'Settings saved successfully!');
    });
    
    // Toggle history
    elements.toggleHistory.addEventListener('click', () => {
        elements.historyCard.classList.toggle('hidden');
        const icon = elements.toggleHistory.querySelector('i');
        if (elements.historyCard.classList.contains('hidden')) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
            elements.toggleHistory.innerHTML = '<i class="fas fa-chevron-down"></i> Expand';
        } else {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
            elements.toggleHistory.innerHTML = '<i class="fas fa-chevron-up"></i> Collapse';
            updateHistoryDisplay();
        }
    });
    
    // Apply filters
    elements.applyFilters.addEventListener('click', () => {
        state.filters = {
            searchDate: elements.searchDate.value || null,
            tempMin: elements.filterTempMin.value || null,
            tempMax: elements.filterTempMax.value || null,
            humidityMin: elements.filterHumidityMin.value || null,
            humidityMax: elements.filterHumidityMax.value || null
        };
        state.historyPage = 1;
        updateHistoryDisplay();
    });
    
    // Clear filters
    elements.clearFilters.addEventListener('click', () => {
        elements.searchDate.value = '';
        elements.filterTempMin.value = '';
        elements.filterTempMax.value = '';
        elements.filterHumidityMin.value = '';
        elements.filterHumidityMax.value = '';
        
        state.filters = {
            searchDate: null,
            tempMin: null,
            tempMax: null,
            humidityMin: null,
            humidityMax: null
        };
        state.historyPage = 1;
        updateHistoryDisplay();
    });
    
    // Export CSV
    elements.exportCSV.addEventListener('click', () => {
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Timestamp,Temperature (°C),Humidity (%),Egg Turned,Fan Status\n';
        
        const filteredHistory = getFilteredHistory();
        
        filteredHistory.forEach(row => {
            csvContent += `${row.timestamp},${row.temperature},${row.humidity},${row.eggTurned ? 'Yes' : 'No'},${row.fanOn ? 'ON' : 'OFF'}\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `eggwatch_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addAlert('success', 'History exported to CSV!');
    });
}

function getFilteredHistory() {
    let filteredHistory = [...state.history];
    
    if (state.filters.searchDate) {
        const filterDate = new Date(state.filters.searchDate).toDateString();
        filteredHistory = filteredHistory.filter(h => 
            new Date(h.timestamp).toDateString() === filterDate
        );
    }
    
    if (state.filters.tempMin !== null) {
        filteredHistory = filteredHistory.filter(h => 
            h.temperature >= parseFloat(state.filters.tempMin)
        );
    }
    
    if (state.filters.tempMax !== null) {
        filteredHistory = filteredHistory.filter(h => 
            h.temperature <= parseFloat(state.filters.tempMax)
        );
    }
    
    if (state.filters.humidityMin !== null) {
        filteredHistory = filteredHistory.filter(h => 
            h.humidity >= parseFloat(state.filters.humidityMin)
        );
    }
    
    if (state.filters.humidityMax !== null) {
        filteredHistory = filteredHistory.filter(h => 
            h.humidity <= parseFloat(state.filters.humidityMax)
        );
    }
    
    return filteredHistory;
}

// ============================================
// Data Fetching & Updates
// ============================================
async function fetchSensorData() {
    try {
        const data = await api.fetchSensorData();
        
        // Update state
        state.currentData = {
            temperature: data.temperature,
            humidity: data.humidity,
            eggTurning: data.eggTurning,
            turnsToday: data.turnsToday,
            fanOn: data.fanOn,
            fanLastRan: data.fanLastRan,
            lastUpdate: data.timestamp
        };
        
        // Update UI
        updateTemperatureDisplay(data.temperature);
        updateHumidityDisplay(data.humidity);
        updateTurningDisplay(data.eggTurning, data.turnsToday);
        updateFanDisplay(data.fanOn, data.fanLastRan);
        
        // Add log entry
        addLog(data);
        
        // Update logs display
        updateLogsDisplay();
        
        // Update charts
        updateChartData();
        
        // Check for alerts
        checkAlerts(data.temperature, data.humidity, data.eggTurning);
        
        // Update connection status
        state.isConnected = true;
        elements.connectionStatus.classList.remove('disconnected');
        elements.connectionStatus.querySelector('span:last-child').textContent = 'Connected to ESP32';
        
    } catch (error) {
        console.error('Failed to fetch sensor data:', error);
        state.isConnected = false;
        elements.connectionStatus.classList.add('disconnected');
        elements.connectionStatus.querySelector('span:last-child').textContent = 'Disconnected';
    }
}

// ============================================
// Initialization
// ============================================
async function init() {
    // Load data from localStorage
    loadFromLocalStorage();
    
    // Generate mock history if empty
    generateMockHistory();
    
    // Initialize theme
    initTheme();
    
    // Initialize charts
    initCharts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update schedule display
    updateScheduleDisplay();
    
    // Initial data fetch
    await fetchSensorData();
    
    // Update countdown every second
    setInterval(updateCountdown, 1000);
    
    // Fetch sensor data every poll interval
    setInterval(fetchSensorData, CONFIG.POLL_INTERVAL);
    
    // Update logs display every 15 minutes
    setInterval(updateLogsDisplay, CONFIG.LOGS_UPDATE_INTERVAL);
    
    // Update charts every minute
    setInterval(updateChartData, 60000);
}

// Make goToPage available globally for onclick handlers
window.goToPage = goToPage;
window.dismissAlert = dismissAlert;

// Start the app
document.addEventListener('DOMContentLoaded', init);
