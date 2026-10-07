import { BrowserWindow, shell } from 'electron';
import { PRELOAD_PATH, RENDERER_PATH } from './path';
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

  // Security: Prevent window creation and rogue navigation
  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (['https:', 'http:'].includes(parsed.protocol)) {
        shell.openExternal(url);
      }
    } catch (_) { }
    return { action: 'deny' };
  });

  settingsWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const devServer = process.env.VITE_DEV_SERVER_URL;
    if (devServer && navigationUrl.startsWith(devServer)) {
      return;
    }
    if (navigationUrl.startsWith('file://')) {
      return;
    }
    event.preventDefault();
    try {
      const parsed = new URL(navigationUrl);
      if (['https:', 'http:'].includes(parsed.protocol)) {
        shell.openExternal(navigationUrl);
      }
    } catch (_) { }
  });

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


