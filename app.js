/**
 * EggWatch Pro - Smart Incubator Dashboard
 * JavaScript for real-time monitoring and all dashboard features
 */

// ============================================
// Configuration & Constants
// ============================================
const CONFIG = {
    API_ENDPOINT: 'http://192.168.1.100/api',
    POLL_INTERVAL: 3000,
    LOGS_UPDATE_INTERVAL: 900000,
    DEFAULT_TURNS_PER_DAY: 6,
    DEFAULT_TURN_INTERVAL: 4,
    MAX_HISTORY_RECORDS: 1000,
    RECENT_LOGS_COUNT: 20
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
    thresholds: {
        tempMin: 37.5,
        tempMax: 38.5,
        humidityMin: 50,
        humidityMax: 60
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
    isDarkMode: localStorage.getItem('darkMode') !== 'false',
    accentColor: localStorage.getItem('accentColor') || 'amber',
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
    // Theme & UI
    themeToggle: document.getElementById('themeToggle'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileNav: document.getElementById('mobileNav'),
    overlay: document.getElementById('overlay'),
    
    // Connection
    statusDot: document.getElementById('statusDot'),
    connectionText: document.getElementById('connectionText'),
    lastUpdated: document.getElementById('lastUpdated'),
    
    // Alerts
    alertBell: document.getElementById('alertBell'),
    alertsPanel: document.getElementById('alertsPanel'),
    alertsList: document.getElementById('alertsList'),
    alertBadge: document.getElementById('alertBadge'),
    closeAlerts: document.getElementById('closeAlerts'),
    clearAlerts: document.getElementById('clearAlerts'),
    alertBanner: document.getElementById('alertBanner'),
    alertBannerText: document.getElementById('alertBannerText'),
    closeAlertBanner: document.getElementById('closeAlertBanner'),
    
    // Monitoring
    tempValue: document.getElementById('tempValue'),
    tempBadge: document.getElementById('tempBadge'),
    tempCard: document.getElementById('tempCard'),
    tempMarker: document.getElementById('tempMarker'),
    
    humidityValue: document.getElementById('humidityValue'),
    humidityBadge: document.getElementById('humidityBadge'),
    humidityCard: document.getElementById('humidityCard'),
    humidityMarker: document.getElementById('humidityMarker'),
    
    motorIcon: document.getElementById('motorIcon'),
    motorState: document.getElementById('motorState'),
    motorBadge: document.getElementById('motorBadge'),
    turnsToday: document.getElementById('turnsToday'),
    nextTurnCountdown: document.getElementById('nextTurnCountdown'),
    
    fanToggle: document.getElementById('fanToggle'),
    fanIcon: document.getElementById('fanIcon'),
    fanState: document.getElementById('fanState'),
    
    // Control
    turnsPerDay: document.getElementById('turnsPerDay'),
    turnInterval: document.getElementById('turnInterval'),
    saveSettings: document.getElementById('saveSettings'),
    scheduleTimes: document.getElementById('scheduleTimes'),
    triggerTurn: document.getElementById('triggerTurn'),
    manualStatus: document.getElementById('manualStatus'),
    totalTurns: document.getElementById('totalTurns'),
    lastTurnTime: document.getElementById('lastTurnTime'),
    nextScheduled: document.getElementById('nextScheduled'),
    
    // Charts
    temperatureChart: null,
    humidityChart: null,
    chartTimeRange: document.getElementById('chartTimeRange'),
    
    // Logs
    logsTableBody: document.getElementById('logsTableBody'),
    logsCount: document.getElementById('logsCount'),
    refreshLogs: document.getElementById('refreshLogs'),
    
    // History
    searchDate: document.getElementById('searchDate'),
    filterTempMin: document.getElementById('filterTempMin'),
    filterTempMax: document.getElementById('filterTempMax'),
    filterHumidityMin: document.getElementById('filterHumidityMin'),
    filterHumidityMax: document.getElementById('filterHumidityMax'),
    applyFilters: document.getElementById('applyFilters'),
    clearFilters: document.getElementById('clearFilters'),
    exportCSV: document.getElementById('exportCSV'),
    historyTableBody: document.getElementById('historyTableBody'),
    totalRecords: document.getElementById('totalRecords'),
    filteredRecords: document.getElementById('filteredRecords'),
    historyPagination: document.getElementById('historyPagination'),
    
    // Settings
    showRangeBars: document.getElementById('showRangeBars'),
    tempMinThreshold: document.getElementById('tempMinThreshold'),
    tempMaxThreshold: document.getElementById('tempMaxThreshold'),
    humidityMinThreshold: document.getElementById('humidityMinThreshold'),
    humidityMaxThreshold: document.getElementById('humidityMaxThreshold'),
    saveThresholds: document.getElementById('saveThresholds'),
    testConnection: document.getElementById('testConnection'),
    connectionTestResult: document.getElementById('connectionTestResult'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer'),
    
    // Nav links
    navLinks: document.querySelectorAll('.nav-link'),
    mobileNavLinks: document.querySelectorAll('.mobile-nav-link')
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
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// Mock ESP32 API
// ============================================
class MockESP32API {
    constructor() {
        this.baseTemperature = 38.0;
        this.baseHumidity = 55;
        this.eggTurning = false;
        this.fanOn = false;
        this.turnsToday = 3;
    }

    async fetchSensorData() {
        await this.delay(100);
        
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

    async triggerTurn() {
        await this.delay(100);
        this.turnsToday++;
        return { success: true, turnsToday: this.turnsToday };
    }

    async setTurnSettings(turnsPerDay, interval) {
        await this.delay(50);
        return { success: true };
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
    if (state.logs.length > CONFIG.RECENT_LOGS_COUNT) {
        state.logs = state.logs.slice(0, CONFIG.RECENT_LOGS_COUNT);
    }
    
    state.history.unshift(log);
    if (state.history.length > CONFIG.MAX_HISTORY_RECORDS) {
        state.history = state.history.slice(0, CONFIG.MAX_HISTORY_RECORDS);
    }
    
    saveToLocalStorage();
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('eggwatch_history', JSON.stringify(state.history));
        localStorage.setItem('eggwatch_settings', JSON.stringify(state.settings));
        localStorage.setItem('eggwatch_thresholds', JSON.stringify(state.thresholds));
        localStorage.setItem('eggwatch_turns_today', state.currentData.turnsToday);
        localStorage.setItem('eggwatch_next_turn', state.nextTurnTime);
        localStorage.setItem('eggwatch_darkmode', state.isDarkMode);
        localStorage.setItem('eggwatch_accent', state.accentColor);
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const history = localStorage.getItem('eggwatch_history');
        const settings = localStorage.getItem('eggwatch_settings');
        const thresholds = localStorage.getItem('eggwatch_thresholds');
        const turnsToday = localStorage.getItem('eggwatch_turns_today');
        const nextTurn = localStorage.getItem('eggwatch_next_turn');
        
        if (history) state.history = JSON.parse(history);
        
        if (settings) {
            state.settings = JSON.parse(settings);
            elements.turnsPerDay.value = state.settings.turnsPerDay;
            elements.turnInterval.value = state.settings.turnInterval;
        }
        
        if (thresholds) {
            state.thresholds = JSON.parse(thresholds);
            elements.tempMinThreshold.value = state.thresholds.tempMin;
            elements.tempMaxThreshold.value = state.thresholds.tempMax;
            elements.humidityMinThreshold.value = state.thresholds.humidityMin;
            elements.humidityMaxThreshold.value = state.thresholds.humidityMax;
        }
        
        if (turnsToday) state.currentData.turnsToday = parseInt(turnsToday);
        if (nextTurn) state.nextTurnTime = parseInt(nextTurn);
        
        state.isDarkMode = localStorage.getItem('darkMode') !== 'false';
        state.accentColor = localStorage.getItem('accentColor') || 'amber';
        
    } catch (e) {
        console.warn('Failed to load from localStorage:', e);
    }
}

function generateMockHistory() {
    if (state.history.length > 0) return;
    
    const now = Date.now();
    for (let i = 0; i < 200; i++) {
        const timestamp = new Date(now - (i * 15 * 60 * 1000));
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
    
    state.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ============================================
// UI Updates
// ============================================
function updateTemperatureDisplay(temp) {
    elements.tempValue.textContent = temp.toFixed(1);
    
    let status = 'normal';
    let badge = 'Normal';
    let color = 'normal';
    
    if (temp < state.thresholds.tempMin - 1) {
        status = 'low';
        badge = 'Low';
        color = 'low';
    } else if (temp > state.thresholds.tempMax + 1) {
        status = 'high';
        badge = 'High';
        color = 'high';
    }
    
    elements.tempValue.className = `big-value ${color}`;
    elements.tempBadge.textContent = badge;
    elements.tempBadge.className = `card-badge ${status}`;
    elements.tempCard.className = `card card-temperature`;
    
    // Update marker position (35-42°C range)
    const percentage = ((temp - 35) / (42 - 35)) * 100;
    elements.tempMarker.style.left = `${Math.min(Math.max(percentage, 0), 100)}%`;
}

function updateHumidityDisplay(humidity) {
    elements.humidityValue.textContent = humidity.toFixed(1);
    
    let status = 'normal';
    let badge = 'Normal';
    let color = 'normal';
    
    if (humidity < state.thresholds.humidityMin - 5) {
        status = 'low';
        badge = 'Low';
        color = 'low';
    } else if (humidity > state.thresholds.humidityMax + 5) {
        status = 'high';
        badge = 'High';
        color = 'high';
    }
    
    elements.humidityValue.className = `big-value ${color}`;
    elements.humidityBadge.textContent = badge;
    elements.humidityBadge.className = `card-badge ${status}`;
    elements.humidityCard.className = `card card-humidity`;
    
    // Update marker position (30-80% range)
    const percentage = ((humidity - 30) / (80 - 30)) * 100;
    elements.humidityMarker.style.left = `${Math.min(Math.max(percentage, 0), 100)}%`;
}

function updateMotorDisplay(isTurning, turnsToday) {
    if (isTurning) {
        elements.motorIcon.className = 'motor-icon running';
        elements.motorState.textContent = 'Running';
        elements.motorState.className = 'motor-state running';
        elements.motorBadge.textContent = 'Running';
        elements.motorBadge.className = 'card-badge normal';
    } else {
        elements.motorIcon.className = 'motor-icon';
        elements.motorState.textContent = 'Idle';
        elements.motorState.className = 'motor-state';
        elements.motorBadge.textContent = 'Idle';
        elements.motorBadge.className = 'card-badge';
    }
    
    elements.turnsToday.textContent = turnsToday;
    elements.totalTurns.textContent = turnsToday;
}

function updateFanDisplay(fanOn) {
    elements.fanToggle.checked = fanOn;
    
    if (fanOn) {
        elements.fanIcon.className = 'fan-icon running';
        elements.fanState.textContent = 'ON';
        elements.fanState.className = 'fan-state running';
    } else {
        elements.fanIcon.className = 'fan-icon';
        elements.fanState.textContent = 'OFF';
        elements.fanState.className = 'fan-state';
    }
}

function updateCountdown() {
    if (!state.nextTurnTime) {
        elements.nextTurnCountdown.textContent = '--:--:--';
        return;
    }
    
    const now = Date.now();
    const diff = state.nextTurnTime - now;
    
    if (diff <= 0) {
        state.currentData.turnsToday++;
        updateMotorDisplay(state.currentData.eggTurning, state.currentData.turnsToday);
        
        const interval = (24 / state.settings.turnsPerDay) * 60 * 60 * 1000;
        state.nextTurnTime = Date.now() + interval;
        saveToLocalStorage();
        
        showToast('Egg turn completed!', 'success');
    }
    
    elements.nextTurnCountdown.textContent = formatCountdown(diff);
    elements.nextScheduled.textContent = formatTime(new Date(state.nextTurnTime));
    elements.lastTurnTime.textContent = state.currentData.turnsToday > 0 ? formatTime(new Date(Date.now() - 3600000)) : '--';
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
        let className = 'schedule-time-chip';
        if (isPast) className += ' past';
        
        return `<span class="${className}">${formatTime(time)}</span>`;
    }).join('');
}

// ============================================
// Charts
// ============================================
function initCharts() {
    const isDark = state.isDarkMode;
    const textColor = isDark ? '#8b92a8' : '#555d75';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        scales: {
            x: {
                grid: { color: gridColor },
                ticks: { color: textColor, maxRotation: 45, minRotation: 45 }
            },
            y: {
                grid: { color: gridColor },
                ticks: { color: textColor }
            }
        },
        plugins: {
            legend: {
                labels: { color: isDark ? '#f0f2f8' : '#1a1d27' }
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
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5
            }, {
                label: 'Max Safe',
                data: [],
                borderColor: '#22c55e',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: { ...chartOptions.scales.y, min: 35, max: 42 }
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
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5
            }, {
                label: 'Max Optimal',
                data: [],
                borderColor: '#22c55e',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: { ...chartOptions.scales.y, min: 30, max: 80 }
            }
        }
    });
    
    updateChartData();
}

function updateChartData() {
    const hours = parseInt(elements.chartTimeRange.value);
    const now = Date.now();
    const startTime = now - (hours * 60 * 60 * 1000);
    
    const recentHistory = state.history
        .filter(h => new Date(h.timestamp).getTime() > startTime)
        .slice(0, 48);
    
    const labels = recentHistory.map(h => formatTime(h.timestamp));
    const temps = recentHistory.map(h => h.temperature);
    const humidities = recentHistory.map(h => h.humidity);
    const safeTemp = Array(recentHistory.length).fill(state.thresholds.tempMax);
    const optimalHumidity = Array(recentHistory.length).fill(state.thresholds.humidityMax);
    
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
            <td class="${getTempClass(log.temperature)}">${log.temperature.toFixed(1)}°C</td>
            <td>${log.humidity.toFixed(1)}%</td>
            <td class="${log.eggTurned ? 'turn-yes' : 'turn-no'}">${log.eggTurned ? 'Yes' : 'No'}</td>
        </tr>
    `).join('');
    
    elements.lastUpdated.textContent = `Last: ${formatTime(new Date())}`;
}

function getTempClass(temp) {
    if (temp < state.thresholds.tempMin) return 'temp-low';
    if (temp > state.thresholds.tempMax) return 'temp-high';
    return 'temp-normal';
}

// ============================================
// History Display
// ============================================
function updateHistoryDisplay() {
    let filteredHistory = [...state.history];
    
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
    
    const totalPages = Math.ceil(filteredHistory.length / state.historyPerPage);
    const startIndex = (state.historyPage - 1) * state.historyPerPage;
    const paginatedHistory = filteredHistory.slice(startIndex, startIndex + state.historyPerPage);
    
    elements.totalRecords.textContent = state.history.length;
    elements.filteredRecords.textContent = filteredHistory.length;
    
    elements.historyTableBody.innerHTML = paginatedHistory.map(log => `
        <tr>
            <td>${formatDateTime(log.timestamp)}</td>
            <td class="${getTempClass(log.temperature)}">${log.temperature.toFixed(1)}</td>
            <td>${log.humidity.toFixed(1)}</td>
            <td class="${log.eggTurned ? 'turn-yes' : 'turn-no'}">${log.eggTurned ? 'Yes' : 'No'}</td>
            <td>${log.fanOn ? 'ON' : 'OFF'}</td>
        </tr>
    `).join('');
    
    if (totalPages > 1) {
        let paginationHTML = '';
        
        paginationHTML += `<button class="page-btn" ${state.historyPage === 1 ? 'disabled' : ''} onclick="goToPage(${state.historyPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            paginationHTML += `<button class="page-btn ${i === state.historyPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
        
        paginationHTML += `<button class="page-btn" ${state.historyPage === totalPages ? 'disabled' : ''} onclick="goToPage(${state.historyPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        
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
    const alert = { id: alertId, type, message, time: new Date() };
    state.alerts.push(alert);
    
    const alertEl = document.createElement('div');
    alertEl.className = `alert-item ${type}`;
    alertEl.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)} alert-item-icon"></i>
        <div class="alert-item-body">
            <div class="alert-item-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="alert-item-msg">${message}</div>
            <div class="alert-item-time">${formatDateTime(new Date())}</div>
        </div>
    `;
    
    // Remove "no alerts" message if exists
    const noAlerts = elements.alertsList.querySelector('.no-alerts');
    if (noAlerts) noAlerts.remove();
    
    elements.alertsList.prepend(alertEl);
    
    // Update badge
    elements.alertBadge.textContent = state.alerts.length;
    elements.alertBadge.style.display = state.alerts.length > 0 ? 'flex' : 'none';
    
    // Show banner for critical alerts
    if (type === 'critical') {
        showAlertBanner(message);
    }
}

function getAlertIcon(type) {
    switch (type) {
        case 'critical': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        case 'info': return 'info-circle';
        default: return 'bell';
    }
}

function showAlertBanner(message) {
    elements.alertBannerText.textContent = message;
    elements.alertBanner.style.display = 'flex';
}

function checkAlerts(temperature, humidity) {
    if (temperature < state.thresholds.tempMin - 1) {
        addAlert('critical', `Temperature too low: ${temperature.toFixed(1)}°C`);
    } else if (temperature > state.thresholds.tempMax + 1) {
        addAlert('critical', `Temperature too high: ${temperature.toFixed(1)}°C`);
    }
    
    if (humidity < state.thresholds.humidityMin - 5) {
        addAlert('warning', `Humidity too low: ${humidity.toFixed(1)}%`);
    } else if (humidity > state.thresholds.humidityMax + 5) {
        addAlert('warning', `Humidity too high: ${humidity.toFixed(1)}%`);
    }
}

// ============================================
// Theme & UI
// ============================================
function initTheme() {
    if (state.isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        elements.darkModeToggle.checked = true;
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        elements.darkModeToggle.checked = false;
    }
    
    document.documentElement.setAttribute('data-accent', state.accentColor);
    
    // Update swatches
    document.querySelectorAll('.swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.accent === state.accentColor);
    });
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    initTheme();
    saveToLocalStorage();
    
    // Update charts
    if (elements.temperatureChart) {
        initCharts();
    }
}

function setAccentColor(color) {
    state.accentColor = color;
    document.documentElement.setAttribute('data-accent', color);
    
    document.querySelectorAll('.swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.accent === color);
    });
    
    saveToLocalStorage();
}

// ============================================
// Navigation
// ============================================
function setupNavigation() {
    // Mobile menu
    elements.mobileMenuBtn.addEventListener('click', () => {
        elements.mobileNav.classList.toggle('open');
        elements.overlay.classList.toggle('active');
    });
    
    elements.overlay.addEventListener('click', () => {
        elements.mobileNav.classList.remove('open');
        elements.overlay.classList.remove('active');
    });
    
    // Nav links
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
            
            elements.mobileNav.classList.remove('open');
            elements.overlay.classList.remove('active');
        });
    });
    
    elements.mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            elements.mobileNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    // Alerts panel
    elements.alertBell.addEventListener('click', () => {
        elements.alertsPanel.classList.toggle('open');
    });
    
    elements.closeAlerts.addEventListener('click', () => {
        elements.alertsPanel.classList.remove('open');
    });
    
    elements.clearAlerts.addEventListener('click', () => {
        state.alerts = [];
        elements.alertsList.innerHTML = '<div class="no-alerts">No alerts</div>';
        elements.alertBadge.style.display = 'none';
        showToast('Alerts cleared', 'info');
    });
    
    elements.closeAlertBanner.addEventListener('click', () => {
        elements.alertBanner.style.display = 'none';
    });
}

// ============================================
// Event Handlers
// ============================================
function setupEventListeners() {
    // Theme
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.darkModeToggle.addEventListener('click', toggleTheme);
    
    // Accent colors
    document.querySelectorAll('.swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            setAccentColor(swatch.dataset.accent);
        });
    });
    
    // Fan toggle
    elements.fanToggle.addEventListener('click', async () => {
        const newState = elements.fanToggle.checked;
        const result = await api.setFanStatus(newState);
        if (result.success) {
            state.currentData.fanOn = result.fanOn;
            updateFanDisplay(result.fanOn);
            showToast(`Fan turned ${result.fanOn ? 'ON' : 'OFF'}`, 'success');
        }
    });
    
    // Save settings
    elements.saveSettings.addEventListener('click', async () => {
        const turnsPerDay = parseInt(elements.turnsPerDay.value);
        const turnInterval = parseInt(elements.turnInterval.value);
        
        if (turnsPerDay < 1 || turnsPerDay > 24 || turnInterval < 1 || turnInterval > 12) {
            showToast('Invalid settings', 'error');
            return;
        }
        
        state.settings.turnsPerDay = turnsPerDay;
        state.settings.turnInterval = turnInterval;
        
        await api.setTurnSettings(turnsPerDay, turnInterval);
        
        const interval = (24 / turnsPerDay) * 60 * 60 * 1000;
        state.nextTurnTime = Date.now() + interval;
        
        updateScheduleDisplay();
        saveToLocalStorage();
        
        showToast('Settings saved!', 'success');
    });
    
    // Trigger turn
    elements.triggerTurn.addEventListener('click', async () => {
        elements.manualStatus.textContent = 'Turning...';
        const result = await api.triggerTurn();
        
        if (result.success) {
            state.currentData.turnsToday = result.turnsToday;
            updateMotorDisplay(true, result.turnsToday);
            elements.manualStatus.textContent = 'Turn completed!';
            
            setTimeout(() => {
                state.currentData.eggTurning = false;
                updateMotorDisplay(false, result.turnsToday);
                elements.manualStatus.textContent = '';
            }, 3000);
            
            showToast('Manual turn triggered!', 'success');
        }
    });
    
    // Chart time range
    elements.chartTimeRange.addEventListener('change', updateChartData);
    
    // Refresh logs
    elements.refreshLogs.addEventListener('click', () => {
        updateLogsDisplay();
        showToast('Logs refreshed', 'info');
    });
    
    // History filters
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
        showToast('Filters applied', 'info');
    });
    
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
        
        showToast('History exported to CSV!', 'success');
    });
    
    // Save thresholds
    elements.saveThresholds.addEventListener('click', () => {
        state.thresholds = {
            tempMin: parseFloat(elements.tempMinThreshold.value),
            tempMax: parseFloat(elements.tempMaxThreshold.value),
            humidityMin: parseFloat(elements.humidityMinThreshold.value),
            humidityMax: parseFloat(elements.humidityMaxThreshold.value)
        };
        
        saveToLocalStorage();
        showToast('Thresholds saved!', 'success');
    });
    
    // Test connection
    elements.testConnection.addEventListener('click', async () => {
        elements.connectionTestResult.textContent = 'Testing...';
        elements.connectionTestResult.className = 'connection-test';
        
        try {
            // Simulate connection test
            await api.fetchSensorData();
            elements.connectionTestResult.textContent = 'Connection successful!';
            elements.connectionTestResult.classList.add('success');
        } catch (error) {
            elements.connectionTestResult.textContent = 'Connection failed!';
            elements.connectionTestResult.classList.add('error');
        }
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
// Data Fetching
// ============================================
async function fetchSensorData() {
    try {
        const data = await api.fetchSensorData();
        
        state.currentData = {
            temperature: data.temperature,
            humidity: data.humidity,
            eggTurning: data.eggTurning,
            turnsToday: data.turnsToday,
            fanOn: data.fanOn,
            fanLastRan: data.fanLastRan,
            lastUpdate: data.timestamp
        };
        
        updateTemperatureDisplay(data.temperature);
        updateHumidityDisplay(data.humidity);
        updateMotorDisplay(data.eggTurning, data.turnsToday);
        updateFanDisplay(data.fanOn);
        
        addLog(data);
        updateLogsDisplay();
        updateChartData();
        checkAlerts(data.temperature, data.humidity);
        
        state.isConnected = true;
        elements.statusDot.className = 'status-dot connected';
        elements.connectionText.textContent = 'Connected';
        
    } catch (error) {
        console.error('Failed to fetch sensor data:', error);
        state.isConnected = false;
        elements.statusDot.className = 'status-dot disconnected';
        elements.connectionText.textContent = 'Disconnected';
    }
}

// ============================================
// Initialization
// ============================================
async function init() {
    loadFromLocalStorage();
    generateMockHistory();
    
    initTheme();
    setupNavigation();
    setupEventListeners();
    updateScheduleDisplay();
    
    initCharts();
    
    await fetchSensorData();
    
    setInterval(updateCountdown, 1000);
    setInterval(fetchSensorData, CONFIG.POLL_INTERVAL);
    setInterval(updateLogsDisplay, CONFIG.LOGS_UPDATE_INTERVAL);
}

// Make functions globally available
window.goToPage = goToPage;

// Start the app
document.addEventListener('DOMContentLoaded', init);
