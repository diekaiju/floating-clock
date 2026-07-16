const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
const floatingWindows = new Map(); // Store floating windows by type/id
let hoverInterval = null; // Interval for tracking cursor hover position

// Path to settings file in userData directory
const settingsPath = path.join(app.getPath('userData'), 'floating-clock-settings.json');

// Default settings
let settings = {
  themeColor: '#3b82f6', // default blue
  clockFont: 'Orbitron',
  timeFormat24h: false,
  showSeconds: true,
  opacity: 90,
  enableWave: true,
  waveSpeed: 3
};

// Load settings
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      settings = { ...settings, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings
function saveSettings(newSettings) {
  try {
    settings = { ...settings, ...newSettings };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    
    // Broadcast to all active windows
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-changed', settings);
    }
    for (const [id, win] of floatingWindows.entries()) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings-changed', settings);
      }
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 700,
    resizable: false,
    maximizable: false,
    title: 'Floating Clock',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    frame: true, // Standard window decoration for main panel
    backgroundColor: '#121212'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'dashboard.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Close all floating windows when dashboard is closed
    for (const [id, win] of floatingWindows.entries()) {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    }
    floatingWindows.clear();
  });
}

// Create a floating window for clock/timer/stopwatch
function createFloatingWindow(type) {
  // If window of this type is already open, focus it
  if (floatingWindows.has(type)) {
    const existingWin = floatingWindows.get(type);
    if (!existingWin.isDestroyed()) {
      existingWin.focus();
      return;
    }
  }

  // Get screen bounds to position the window at the top-right
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Different widgets might start with different sizes
  let width = 280;
  let height = 150;
  if (type === 'clock') {
    width = 280;
    height = 140;
  } else if (type === 'timer') {
    width = 300;
    height = 160;
  } else if (type === 'stopwatch') {
    width = 300;
    height = 160;
  }

  // Position offset based on type to stack them nicely
  let xOffset = 300;
  let yOffset = 50;
  if (type === 'timer') {
    yOffset = 210;
  } else if (type === 'stopwatch') {
    yOffset = 390;
  }

  console.log(`[Main] Creating BrowserWindow for widget type: ${type}`);
  
  let floatingWin;
  try {
    floatingWin = new BrowserWindow({
      width: width,
      height: height,
      x: screenWidth - xOffset,
      y: yOffset,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true, // Allow user resizing
      hasShadow: true,
      type: 'utility', // Crucial for floating over standard windows on Linux
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      show: false
    });
  } catch (err) {
    console.error(`[Main] Failed to instantiate BrowserWindow:`, err);
    return;
  }

  // Ensure it's ALWAYS on top (using try-catch for Linux environment safety)
  try {
    console.log(`[Main] Setting setAlwaysOnTop for ${type}`);
    floatingWin.setAlwaysOnTop(true, 'screen-saver', 1);
  } catch (err) {
    console.warn(`[Main] Warning: Failed screen-saver level always-on-top:`, err.message);
    try {
      floatingWin.setAlwaysOnTop(true);
    } catch (err2) {
      console.error(`[Main] Error: Failed simple always-on-top:`, err2.message);
    }
  }

  // Set workspace persistence
  try {
    console.log(`[Main] Setting setVisibleOnAllWorkspaces for ${type}`);
    floatingWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch (err) {
    console.warn(`[Main] Warning: setVisibleOnAllWorkspaces failed:`, err.message);
  }

  console.log(`[Main] Loading file for ${type}`);
  floatingWin.loadFile(path.join(__dirname, 'renderer', 'floating.html'), {
    query: { type: type }
  }).catch(err => {
    console.error(`[Main] Failed to loadFile for ${type}:`, err);
  });

  floatingWin.once('ready-to-show', () => {
    console.log(`[Main] Widget window ready-to-show for: ${type}`);
    floatingWin.show();
    // Send configuration initialization data
    floatingWin.webContents.send('init-window', {
      type: type,
      settings: settings
    });
  });

  floatingWin.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Main] Widget failed to load: ${errorDescription} (${errorCode})`);
  });

  floatingWin.on('closed', () => {
    console.log(`[Main] Widget window closed: ${type}`);
    floatingWindows.delete(type);
    // Tell main window that a widget closed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget-status-changed', { type, open: false });
    }
  });

  floatingWindows.set(type, floatingWin);

  // Tell main window that a widget opened
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('widget-status-changed', { type, open: true });
  }

  // Start tracking hover states
  startHoverTracking();
}

function startHoverTracking() {
  if (hoverInterval) return;
  
  hoverInterval = setInterval(() => {
    const cursor = screen.getCursorScreenPoint();
    let activeFloatingWindows = 0;

    for (const [type, win] of floatingWindows.entries()) {
      if (win && !win.isDestroyed()) {
        activeFloatingWindows++;
        try {
          const bounds = win.getBounds();
          const isInside = (
            cursor.x >= bounds.x &&
            cursor.x <= bounds.x + bounds.width &&
            cursor.y >= bounds.y &&
            cursor.y <= bounds.y + bounds.height
          );
          win.webContents.send('mouse-hover-status', isInside);
        } catch (err) {
          // Window might be closing or not ready
        }
      }
    }

    if (activeFloatingWindows === 0) {
      clearInterval(hoverInterval);
      hoverInterval = null;
    }
  }, 50);
}

// App lifecycle hooks
app.whenReady().then(() => {
  loadSettings();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC communication handlers
ipcMain.on('open-floating-window', (event, type) => {
  createFloatingWindow(type);
});

ipcMain.on('close-window', (event, type) => {
  const win = floatingWindows.get(type);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

ipcMain.handle('get-settings', () => {
  return settings;
});

ipcMain.on('save-settings', (event, newSettings) => {
  saveSettings(newSettings);
});

ipcMain.on('resize-window', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setSize(width, height);
  }
});

ipcMain.on('set-always-on-top', (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setAlwaysOnTop(flag, flag ? 'screen-saver' : 'normal');
  }
});

ipcMain.on('play-alarm', (event) => {
  // We can hook beep sound or trigger default system sound
  // e.g. console.beep() or play audio element in the renderer
});
