import { BrowserWindow } from 'electron';
import { __ } from './i18n';
import { PRELOAD_PATH, SETTINGS_RENDERER_PATH } from './path';
import { setupWindowSecurity } from './window';

let settingsWindow: BrowserWindow | null = null;

export function createSettingsWindow(
  parentWindow?: BrowserWindow,
): BrowserWindow {
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

  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/settings.html`);
  } else {
    settingsWindow.loadFile(SETTINGS_RENDERER_PATH);
  }

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

export const openSettingsWindow = createSettingsWindow;
