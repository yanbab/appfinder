import { BrowserWindow, shell } from 'electron';

/**
 * Enforces strict security policies on an Electron BrowserWindow:
 * 1. Blocks arbitrary in-app window spawning via window.open, delegating safe http/https URLs to shell.openExternal.
 * 2. Prevents rogue in-app navigation (will-navigate), restricting webContents to the dev server or local file bundles.
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
