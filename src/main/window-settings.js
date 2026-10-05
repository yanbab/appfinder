// Settings window 

const { BrowserWindow } = require('electron');
const path = require('path');
const { __ } = require('./i18n');

const preloadPath = path.join(__dirname, './ipc-renderer.js');
const reactPath = path.join(__dirname, '../../dist/vite/index.html');

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
    height: 200,
    acceptFirstMouse: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#00000000',
    parent: parentWindow || undefined,
    modal: false,
    show: false,
    windowStatePersistence: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=settings`);
  } else {
    settingsWindow.loadFile(reactPath, { query: { view: 'settings' } });
  }

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
