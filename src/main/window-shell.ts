import { app, type BrowserWindow } from 'electron';
import { createWindow, loadWindowContent } from './window';

let mainWindow: BrowserWindow | null = null;

export function createShellWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    loadWindowContent(mainWindow);
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = createWindow({
    title: 'AppFinder',
    width: 800,
    height: 750,
    minWidth: 360,
    minHeight: 260,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 18, y: 19 },
    vibrancy: 'sidebar',
    frame: false,
  });

  mainWindow.on('close', () => {
    app.quit();
  });

  return mainWindow;
}

export function getShellWindow(): BrowserWindow | null {
  return mainWindow;
}
