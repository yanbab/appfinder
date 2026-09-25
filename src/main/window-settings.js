// Settings window 

const { BrowserWindow } = require('electron');
const path = require('path');
const { __ } = require('./i18n');

const preloadPath = path.join(__dirname, '../renderer/ipc-renderer.js');
const settingsPath = path.join(__dirname, '../renderer/settings/settings.html');

let settingsWindow = null;

function createSettingsWindow(parentWindow) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }
  settingsWindow = new BrowserWindow({
    title: __('Settings', 'Settings'),
    name: 'settings',
    width: 380,
    height: 230,
    acceptFirstMouse: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#25252500',
    parent: parentWindow || undefined,
    modal: false,
    show: false,
    windowStatePersistence: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWindow.loadFile(settingsPath);
  settingsWindow.once('ready-to-show', () => settingsWindow?.show());
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
  return settingsWindow;
}

module.exports = {
  createSettingsWindow,
  openSettingsWindow: createSettingsWindow
};
