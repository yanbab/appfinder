import { app } from 'electron';
import { Window } from './window';

let mainWindow: ShellWindow | null = null;

export class ShellWindow extends Window {
  constructor() {
    super({
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

    this.loadAppView();

    this.on('close', () => {
      app.quit();
    });
  }
}

export function createShellWindow(): ShellWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadAppView();
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new ShellWindow();
  return mainWindow;
}

export function getShellWindow(): ShellWindow | null {
  return mainWindow;
}



