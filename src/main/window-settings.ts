import { BrowserWindow } from 'electron';
import { PRELOAD_PATH, RENDERER_PATH } from './path';
import { setupWindowSecurity } from './security';
import { __ } from './i18n';

let settingsWindow: BrowserWindow | null = null;

export function createSettingsWindow(parentWindow?: BrowserWindow): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }
  settingsWindow = new BrowserWindow({
    title: __('Settings'),
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
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  setupWindowSecurity(settingsWindow);

  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=settings`);
  } else {
    settingsWindow.loadFile(RENDERER_PATH, { query: { view: 'settings' } });
  }

  settingsWindow.once('ready-to-show', () => settingsWindow?.show());
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
  return settingsWindow;
}

export const openSettingsWindow = createSettingsWindow;


