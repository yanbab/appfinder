import { BrowserWindow, type BrowserWindowConstructorOptions, shell } from 'electron';
import { PRELOAD_PATH, RENDERER_PATH } from './path';

export interface AppWindowOptions extends BrowserWindowConstructorOptions {
  viewQuery?: string;
}

/**
 * Loads renderer content for a BrowserWindow, handling dev server URL and file bundles.
 */
export function loadWindowContent(win: BrowserWindow, viewQuery?: string): void {
  if (process.env.VITE_DEV_SERVER_URL) {
    const url = viewQuery
      ? `${process.env.VITE_DEV_SERVER_URL}?${viewQuery}`
      : process.env.VITE_DEV_SERVER_URL;
    win.loadURL(url);
  } else {
    if (viewQuery) {
      const params = new URLSearchParams(viewQuery);
      const query: Record<string, string> = {};
      params.forEach((val, key) => { query[key] = val; });
      win.loadFile(RENDERER_PATH, { query });
    } else {
      win.loadFile(RENDERER_PATH);
    }
  }
}

/**
 * Configures strict security policies on a BrowserWindow:
 * - Prevents rogue window creation via setWindowOpenHandler
 * - Locks in-app navigation via will-navigate
 */
export function setupWindowSecurity(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (['https:', 'http:'].includes(parsed.protocol)) {
        shell.openExternal(url);
      }
    } catch (_) { }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, navigationUrl) => {
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
}

/**
 * Factory for creating configured Electron BrowserWindows with shared defaults and security policies.
 * Uses composition to avoid Electron's built-in class subclassing limitations.
 */
export function createWindow(options: AppWindowOptions = {}): BrowserWindow {
  const { viewQuery, ...browserOptions } = options;

  const defaultWebPreferences = {
    preload: PRELOAD_PATH,
    contextIsolation: true,
    nodeIntegration: false,
  };

  const win = new BrowserWindow({
    backgroundColor: '#00000000',
    acceptFirstMouse: true,
    show: false,
    ...browserOptions,
    webPreferences: {
      ...defaultWebPreferences,
      ...browserOptions.webPreferences,
    },
  });

  setupWindowSecurity(win);
  loadWindowContent(win, viewQuery);

  win.once('ready-to-show', () => win.show());
  return win;
}
