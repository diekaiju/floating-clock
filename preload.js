const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation / Spawn Window
  openFloatingWindow: (type) => ipcRenderer.send('open-floating-window', type),
  closeWindow: (id) => ipcRenderer.send('close-window', id),
  
  // Settings Storage & Communication
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
  onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', (event, settings) => callback(settings)),
  
  // Window specific events
  onInitWindow: (callback) => ipcRenderer.on('init-window', (event, data) => callback(data)),
  onWidgetStatusChanged: (callback) => ipcRenderer.on('widget-status-changed', (event, data) => callback(data)),
  onMouseHoverStatus: (callback) => ipcRenderer.on('mouse-hover-status', (event, isInside) => callback(isInside)),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', width, height),
  setAlwaysOnTop: (flag) => ipcRenderer.send('set-always-on-top', flag),
  
  // Audio Notification
  playAlarm: () => ipcRenderer.send('play-alarm')
});
