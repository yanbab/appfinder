import { BrowserWindow, type BrowserWindowConstructorOptions, shell } from 'electron';
import { PRELOAD_PATH, RENDERER_PATH } from './path';

/**
 * Base Application Window extending Electron's BrowserWindow.
 * Automatically configures:
 * - Shared WebPreferences (contextIsolation, preload, nodeIntegration)
 * - Window security (will-navigate locking and setWindowOpenHandler URL whitelisting)
 * - Unified content loading across dev server (Vite HMR) and production bundles
 */
export class Window extends BrowserWindow {
  constructor(options: BrowserWindowConstructorOptions = {}) {
    const defaultWebPreferences = {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    };

    super({
      backgroundColor: '#00000000',
      acceptFirstMouse: true,
      show: false,
      ...options,
      webPreferences: {
        ...defaultWebPreferences,
        ...options.webPreferences,
      },
    });

    this.setupSecurity();
    this.once('ready-to-show', () => this.show());
  }

  protected setupSecurity(): void {
    this.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const parsed = new URL(url);
        if (['https:', 'http:'].includes(parsed.protocol)) {
          shell.openExternal(url);
        }
      } catch (_) { }
      return { action: 'deny' };
    });

    this.webContents.on('will-navigate', (event, navigationUrl) => {
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

  loadAppView(viewQuery?: string): void {
    if (process.env.VITE_DEV_SERVER_URL) {
      const url = viewQuery
        ? `${process.env.VITE_DEV_SERVER_URL}?${viewQuery}`
        : process.env.VITE_DEV_SERVER_URL;
      this.loadURL(url);
    } else {
      if (viewQuery) {
        const params = new URLSearchParams(viewQuery);
        const query: Record<string, string> = {};
        params.forEach((val, key) => { query[key] = val; });
        this.loadFile(RENDERER_PATH, { query });
      } else {
        this.loadFile(RENDERER_PATH);
      }
    }
  }
}
