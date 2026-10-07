import { BrowserWindow, app } from 'electron';
import { PRELOAD_PATH, RENDERER_PATH } from './path';
import { setupWindowSecurity } from './security';

let mainWindow: BrowserWindow | null = null;

function loadContent(win: BrowserWindow): void {
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(RENDERER_PATH);
  }
}

export function createShellWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    loadContent(mainWindow);
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    title: 'AppFinder',
    width: 800,
    height: 750,
    minWidth: 360,
    minHeight: 260,
    acceptFirstMouse: true,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 18, y: 19 },
    vibrancy: 'sidebar',
    show: false,
    frame: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  setupWindowSecurity(mainWindow);
  loadContent(mainWindow);

  mainWindow.on('close', () => {
    app.quit();
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  return mainWindow;
}

export function getShellWindow(): BrowserWindow | null {
  return mainWindow;
}


