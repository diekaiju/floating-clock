// UI Elements
const btnClock = document.getElementById('btn-clock');
const btnTimer = document.getElementById('btn-timer');
const btnStopwatch = document.getElementById('btn-stopwatch');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnAboutToggle = document.getElementById('btn-about-toggle');

const settingsDrawer = document.getElementById('settings-drawer');
const aboutDrawer = document.getElementById('about-drawer');
const closeSettings = document.getElementById('close-settings');
const closeAbout = document.getElementById('close-about');
const drawerOverlay = document.getElementById('drawer-overlay');

// Settings Inputs
const colorDots = document.querySelectorAll('.color-dot');
const fontSelect = document.getElementById('font-select');
const chk24h = document.getElementById('chk-24h');
const chkSeconds = document.getElementById('chk-seconds');
const rangeOpacity = document.getElementById('range-opacity');
const opacityVal = document.getElementById('opacity-val');
const chkWave = document.getElementById('chk-wave');

// Local settings state
let appSettings = {};

// Initialize
async function init() {
  // Load settings from main process
  appSettings = await window.electronAPI.getSettings();
  applySettingsToUI(appSettings);
  updateThemeColors(appSettings.themeColor);

  // Setup event listeners
  setupEventListeners();
}

// Populate UI inputs with saved settings
function applySettingsToUI(settings) {
  // Theme Color Dot Selection
  colorDots.forEach(dot => {
    if (dot.getAttribute('data-color') === settings.themeColor) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Select Inputs
  fontSelect.value = settings.clockFont;
  chk24h.checked = settings.timeFormat24h;
  chkSeconds.checked = settings.showSeconds;
  
  // Opacity Slider
  rangeOpacity.value = settings.opacity;
  opacityVal.textContent = `${settings.opacity}%`;

  // Wave Toggle
  chkWave.checked = settings.enableWave;
}

// Update local CSS variables for instant feedback
function updateThemeColors(color) {
  document.documentElement.style.setProperty('--theme-color', color);
  // Generate glow color with opacity
  const glowColor = hexToRgba(color, 0.3);
  document.documentElement.style.setProperty('--theme-color-glow', glowColor);
}

// Helper to convert hex to rgba
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Setup all click and input listeners
function setupEventListeners() {
  // Floating Window Spawners
  btnClock.addEventListener('click', () => {
    window.electronAPI.openFloatingWindow('clock');
  });

  btnTimer.addEventListener('click', () => {
    window.electronAPI.openFloatingWindow('timer');
  });

  btnStopwatch.addEventListener('click', () => {
    window.electronAPI.openFloatingWindow('stopwatch');
  });

  // Settings Drawer Toggles
  btnSettingsToggle.addEventListener('click', () => openDrawer(settingsDrawer));
  closeSettings.addEventListener('click', () => closeDrawer(settingsDrawer));

  // About Drawer Toggles
  btnAboutToggle.addEventListener('click', () => openDrawer(aboutDrawer));
  closeAbout.addEventListener('click', () => closeDrawer(aboutDrawer));

  // Backdrop Overlay
  drawerOverlay.addEventListener('click', () => {
    closeDrawer(settingsDrawer);
    closeDrawer(aboutDrawer);
  });

  // Settings Inputs Change Handlers
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const newColor = dot.getAttribute('data-color');
      
      appSettings.themeColor = newColor;
      updateThemeColors(newColor);
      saveSettings();
    });
  });

  fontSelect.addEventListener('change', (e) => {
    appSettings.clockFont = e.target.value;
    saveSettings();
  });

  chk24h.addEventListener('change', (e) => {
    appSettings.timeFormat24h = e.target.checked;
    saveSettings();
  });

  chkSeconds.addEventListener('change', (e) => {
    appSettings.showSeconds = e.target.checked;
    saveSettings();
  });

  rangeOpacity.addEventListener('input', (e) => {
    const val = e.target.value;
    opacityVal.textContent = `${val}%`;
    appSettings.opacity = Number(val);
    saveSettings();
  });

  chkWave.addEventListener('change', (e) => {
    appSettings.enableWave = e.target.checked;
    saveSettings();
  });

  // Listen to remote settings changes (if any other window saves them)
  window.electronAPI.onSettingsChanged((newSettings) => {
    appSettings = newSettings;
    applySettingsToUI(newSettings);
    updateThemeColors(newSettings.themeColor);
  });

  // Listen to widget state changes to update the status green dots
  window.electronAPI.onWidgetStatusChanged((data) => {
    const statusDot = document.getElementById(`status-${data.type}`);
    if (statusDot) {
      if (data.open) {
        statusDot.classList.add('active');
      } else {
        statusDot.classList.remove('active');
      }
    }
  });
}

// Save local settings state back to Main process
function saveSettings() {
  window.electronAPI.saveSettings(appSettings);
}

// Drawer animations helper
function openDrawer(drawer) {
  drawerOverlay.classList.add('visible');
  drawer.classList.add('open');
}

function closeDrawer(drawer) {
  drawer.classList.remove('open');
  // Only remove overlay if no other drawers are open
  const openDrawers = document.querySelectorAll('.drawer.open');
  if (openDrawers.length <= 1) {
    drawerOverlay.classList.remove('visible');
  }
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
