// Parse query parameters to find widget type
const urlParams = new URLSearchParams(window.location.search);
const widgetType = urlParams.get('type') || 'clock';

// UI Elements
const widgetCard = document.getElementById('widget-card');
const windowTitle = document.getElementById('window-title');
const closeBtn = document.getElementById('close-btn');
const lockBtn = document.getElementById('lock-btn');
const lockIcon = document.getElementById('lock-icon');
const waveContainer = document.getElementById('wave-container');
const wavePathBg = document.getElementById('wave-path-bg');
const wavePathFg = document.getElementById('wave-path-fg');

// View panels
const clockView = document.getElementById('clock-view');
const timerView = document.getElementById('timer-view');
const stopwatchView = document.getElementById('stopwatch-view');

// Alarm sound
const alarmSound = document.getElementById('alarm-sound');

// State variables
let settings = {};
let isLocked = false;

// Initialize Widget
window.electronAPI.onInitWindow((data) => {
  settings = data.settings;
  setupWidgetType();
  applySettings(settings);
});

// Sync Settings changes in real-time
window.electronAPI.onSettingsChanged((newSettings) => {
  settings = newSettings;
  applySettings(newSettings);
});

// Sync OS-level cursor hover status
window.electronAPI.onMouseHoverStatus((isInside) => {
  if (isInside) {
    document.body.classList.add('hovered');
  } else {
    document.body.classList.remove('hovered');
  }
});

// Configure close action
closeBtn.addEventListener('click', () => {
  window.electronAPI.closeWindow(widgetType);
});

// Lock/Unlock window dragging
lockBtn.addEventListener('click', () => {
  isLocked = !isLocked;
  if (isLocked) {
    widgetCard.classList.add('locked');
    lockIcon.innerHTML = `
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" fill="none"/>
    `;
    lockBtn.setAttribute('title', 'Unlock Dragging');
  } else {
    widgetCard.classList.remove('locked');
    lockIcon.innerHTML = `
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="currentColor" stroke-width="2" fill="none"/>
    `;
    lockBtn.setAttribute('title', 'Lock Dragging');
  }
});

// Setup Widget layout and start respective loop
function setupWidgetType() {
  // Hide all panels
  clockView.classList.add('hidden');
  timerView.classList.add('hidden');
  stopwatchView.classList.add('hidden');

  if (widgetType === 'clock') {
    windowTitle.textContent = 'Simple Clock';
    clockView.classList.remove('hidden');
    startClock();
  } else if (widgetType === 'timer') {
    windowTitle.textContent = 'Countdown Timer';
    timerView.classList.remove('hidden');
    setupTimer();
  } else if (widgetType === 'stopwatch') {
    windowTitle.textContent = 'Stopwatch';
    stopwatchView.classList.remove('hidden');
    setupStopwatch();
  }
}

// Apply settings to CSS/Layout
function applySettings(opts) {
  // Fonts
  document.documentElement.style.setProperty('--clock-font', opts.clockFont);
  
  // Theme Color Accents
  document.documentElement.style.setProperty('--theme-color', opts.themeColor);
  const glowColor = hexToRgba(opts.themeColor, 0.25);
  document.documentElement.style.setProperty('--theme-color-glow', glowColor);

  // Widget Opacity
  widgetCard.style.opacity = opts.opacity / 100;

  // Wave visibility & settings
  if (opts.enableWave) {
    waveContainer.style.display = 'block';
  } else {
    waveContainer.style.display = 'none';
  }

  // Update clock/timer displays immediately
  if (widgetType === 'clock') {
    updateClockDisplay();
  }
}

// Helper to convert hex to rgba
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


/* ==========================================
   SIMPLE CLOCK WIDGET LOGIC
   ========================================== */
let clockInterval = null;

function startClock() {
  // Set default wave level for clock (constant 20% water filled)
  waveContainer.style.transform = 'translateY(80%)';
  
  updateClockDisplay();
  clockInterval = setInterval(updateClockDisplay, 250);
}

function updateClockDisplay() {
  const now = new Date();
  
  // Time formatting
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  let ampm = '';
  if (!settings.timeFormat24h) {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
  }
  
  const hourStr = String(hours).padStart(2, '0');
  
  let timeStr = `${hourStr}:${minutes}`;
  if (settings.showSeconds) {
    timeStr += `:${seconds}`;
  }
  timeStr += ampm;
  
  document.getElementById('clock-display').textContent = timeStr;

  // Date formatting
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', options);
}


/* ==========================================
   COUNTDOWN TIMER WIDGET LOGIC
   ========================================== */
let timerInterval = null;
let totalDurationSeconds = 0;
let remainingSeconds = 0;
let isTimerPaused = false;
let isAlarmPlaying = false;

// UI setup fields
const timerSetup = document.getElementById('timer-setup');
const timerRun = document.getElementById('timer-run');
const timerDisplay = document.getElementById('timer-display');
const inputHr = document.getElementById('timer-hr');
const inputMin = document.getElementById('timer-min');
const inputSec = document.getElementById('timer-sec');

const timerStartBtn = document.getElementById('timer-start-btn');
const timerPauseBtn = document.getElementById('timer-pause-btn');
const timerAddBtn = document.getElementById('timer-add-btn');
const timerResetBtn = document.getElementById('timer-reset-btn');

function setupTimer() {
  // Initial wave is 70% filled in setup mode
  waveContainer.style.transform = 'translateY(70%)';

  // Prevent invalid input typing
  [inputHr, inputMin, inputSec].forEach(input => {
    input.addEventListener('change', () => {
      let val = parseInt(input.value) || 0;
      if (val < 0) val = 0;
      if (input !== inputHr && val > 59) val = 59;
      input.value = val;
    });
  });

  timerStartBtn.addEventListener('click', startCountdown);
  timerPauseBtn.addEventListener('click', toggleTimerPause);
  timerAddBtn.addEventListener('click', addOneMinuteToTimer);
  timerResetBtn.addEventListener('click', resetTimer);
}

function startCountdown() {
  const hrs = parseInt(inputHr.value) || 0;
  const mins = parseInt(inputMin.value) || 0;
  const secs = parseInt(inputSec.value) || 0;

  totalDurationSeconds = (hrs * 3600) + (mins * 60) + secs;
  if (totalDurationSeconds <= 0) return;

  remainingSeconds = totalDurationSeconds;
  isTimerPaused = false;
  isAlarmPlaying = false;

  // Swap views
  timerSetup.classList.add('hidden');
  timerRun.classList.remove('hidden');

  updateTimerDisplay();
  updateTimerWave();

  timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
  if (isTimerPaused) return;

  remainingSeconds--;

  updateTimerDisplay();
  updateTimerWave();

  if (remainingSeconds <= 0) {
    triggerAlarm();
  }
}

function updateTimerDisplay() {
  const hrs = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;

  const hrStr = String(hrs).padStart(2, '0');
  const minStr = String(mins).padStart(2, '0');
  const secStr = String(secs).padStart(2, '0');

  let timeStr = '';
  if (hrs > 0) {
    timeStr = `${hrStr}:${minStr}:${secStr}`;
  } else {
    timeStr = `${minStr}:${secStr}`;
  }
  timerDisplay.textContent = timeStr;
}

// Wave fills up proportionally to remaining time!
function updateTimerWave() {
  if (totalDurationSeconds <= 0) return;
  const ratio = remainingSeconds / totalDurationSeconds;
  // translateY goes from 100% (empty water) to 30% (high water). 
  // Let's cap the height so it doesn't completely cover the text.
  // 100% to 35%
  const translateY = 100 - (ratio * 65);
  waveContainer.style.transform = `translateY(${translateY}%)`;
}

function toggleTimerPause() {
  isTimerPaused = !isTimerPaused;
  if (isTimerPaused) {
    timerPauseBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
    timerPauseBtn.setAttribute('title', 'Resume');
  } else {
    timerPauseBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    `;
    timerPauseBtn.setAttribute('title', 'Pause');
  }
}

function addOneMinuteToTimer() {
  remainingSeconds += 60;
  totalDurationSeconds += 60; // Expand total to scale wave
  updateTimerDisplay();
  updateTimerWave();

  // If alarm was active, reset alarm state
  if (isAlarmPlaying) {
    stopAlarm();
    timerInterval = setInterval(tickTimer, 1000);
  }
}

function triggerAlarm() {
  clearInterval(timerInterval);
  isAlarmPlaying = true;
  widgetCard.classList.add('alarm-active');
  
  // Play alarm sound and loop it
  alarmSound.currentTime = 0;
  alarmSound.loop = true;
  alarmSound.play().catch(err => console.error("Audio play failed:", err));

  // Visual alert: fill water 100% red/color
  waveContainer.style.transform = 'translateY(35%)';
}

function stopAlarm() {
  isAlarmPlaying = false;
  widgetCard.classList.remove('alarm-active');
  alarmSound.pause();
  alarmSound.loop = false;
}

function resetTimer() {
  clearInterval(timerInterval);
  stopAlarm();
  
  timerSetup.classList.remove('hidden');
  timerRun.classList.add('hidden');
  
  // Wave level back to setup state
  waveContainer.style.transform = 'translateY(70%)';
}


/* ==========================================
   STOPWATCH WIDGET LOGIC
   ========================================== */
let stopwatchInterval = null;
let swStartTime = 0;
let swElapsedTime = 0;
let isSwRunning = false;
let laps = [];

const swMainDisplay = document.getElementById('sw-main');
const swMsDisplay = document.getElementById('sw-ms');
const swStartBtn = document.getElementById('sw-start-btn');
const swLapBtn = document.getElementById('sw-lap-btn');
const swResetBtn = document.getElementById('sw-reset-btn');
const swLapsBox = document.getElementById('sw-laps-box');
const swLapsList = document.getElementById('sw-laps-list');

function setupStopwatch() {
  // Wave at 15% (lower than clock) for stopwatch
  waveContainer.style.transform = 'translateY(85%)';

  swStartBtn.addEventListener('click', toggleStopwatch);
  swLapBtn.addEventListener('click', recordStopwatchLap);
  swResetBtn.addEventListener('click', resetStopwatch);
}

function toggleStopwatch() {
  isSwRunning = !isSwRunning;
  
  if (isSwRunning) {
    // Start loop
    swStartTime = Date.now() - swElapsedTime;
    stopwatchInterval = setInterval(updateStopwatch, 10); // Update every 10ms for ms accuracy
    
    // Change icon to Pause
    swStartBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    `;
    swStartBtn.setAttribute('title', 'Pause');
    
    // Speed up wave animation when running
    wavePathBg.style.animationDuration = '4s';
    wavePathFg.style.animationDuration = '2.5s';
  } else {
    // Pause loop
    clearInterval(stopwatchInterval);
    swElapsedTime = Date.now() - swStartTime;
    
    // Change icon to Play
    swStartBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
    swStartBtn.setAttribute('title', 'Start');
    
    // Slow down wave animation
    wavePathBg.style.animationDuration = '10s';
    wavePathFg.style.animationDuration = '6s';
  }
}

function updateStopwatch() {
  swElapsedTime = Date.now() - swStartTime;
  formatStopwatchTime(swElapsedTime);
}

function formatStopwatchTime(timeMs) {
  const totalSecs = Math.floor(timeMs / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const ms = Math.floor((timeMs % 1000) / 10); // 2 digit centiseconds

  const hrStr = String(hrs).padStart(2, '0');
  const minStr = String(mins).padStart(2, '0');
  const secStr = String(secs).padStart(2, '0');
  const msStr = String(ms).padStart(2, '0');

  let mainStr = '';
  if (hrs > 0) {
    mainStr = `${hrStr}:${minStr}:${secStr}`;
  } else {
    mainStr = `${minStr}:${secStr}`;
  }

  swMainDisplay.textContent = mainStr;
  swMsDisplay.textContent = `.${msStr}`;
}

function recordStopwatchLap() {
  if (!isSwRunning && swElapsedTime === 0) return;

  const currentLapTime = swElapsedTime;
  laps.unshift(currentLapTime); // Add new lap to top

  // Show laps drawer
  if (swLapsBox.classList.contains('hidden')) {
    swLapsBox.classList.remove('hidden');
    // Resize the Electron window vertically to fit the laps
    window.electronAPI.resizeWindow(300, 240);
  }

  // Render laps
  renderLaps();
}

function renderLaps() {
  swLapsList.innerHTML = '';
  laps.forEach((lapMs, idx) => {
    const lapNumber = laps.length - idx;
    
    // Format lap time
    const totalSecs = Math.floor(lapMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const ms = Math.floor((lapMs % 1000) / 10);

    const hrStr = String(hrs).padStart(2, '0');
    const minStr = String(mins).padStart(2, '0');
    const secStr = String(secs).padStart(2, '0');
    const msStr = String(ms).padStart(2, '0');

    let formattedStr = '';
    if (hrs > 0) {
      formattedStr = `${hrStr}:${minStr}:${secStr}.${msStr}`;
    } else {
      formattedStr = `${minStr}:${secStr}.${msStr}`;
    }

    const lapItem = document.createElement('div');
    lapItem.className = 'lap-item';
    lapItem.innerHTML = `
      <span>Lap ${lapNumber}</span>
      <span>${formattedStr}</span>
    `;
    swLapsList.appendChild(lapItem);
  });
}

function resetStopwatch() {
  clearInterval(stopwatchInterval);
  isSwRunning = false;
  swElapsedTime = 0;
  laps = [];
  
  // Format displays back to zero
  swMainDisplay.textContent = '00:00';
  swMsDisplay.textContent = '.00';

  // Restore start button icon
  swStartBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  `;
  swStartBtn.setAttribute('title', 'Start');

  // Hide laps & shrink window
  swLapsBox.classList.add('hidden');
  window.electronAPI.resizeWindow(300, 160);
  swLapsList.innerHTML = '';

  // Reset wave speed
  wavePathBg.style.animationDuration = '10s';
  wavePathFg.style.animationDuration = '6s';
}
