import { BrowserWindow } from 'electron';
import path from 'path';
import { setupWindowSecurity } from './window';
import { PRELOAD_PATH, DATA_DIR } from './path';
import { __ } from './i18n';

let settingsWindow: BrowserWindow | null = null;

export function createSettingsWindow(parentWindow?: BrowserWindow): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  const defaultWebPreferences = {
    preload: PRELOAD_PATH,
    contextIsolation: true,
    nodeIntegration: false,
  };

  settingsWindow = new BrowserWindow({
    title: __('Settings'),
    width: 360,
    height: 145,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    parent: parentWindow || undefined,
    modal: false,
    show: false,
    useContentSize: true,
    webPreferences: defaultWebPreferences,
  });

  setupWindowSecurity(settingsWindow);
  settingsWindow.loadFile(path.join(DATA_DIR, 'settings.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

export const openSettingsWindow = createSettingsWindow;
