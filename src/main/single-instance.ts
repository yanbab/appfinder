import { app } from 'electron';
import { getShellWindow } from './window-shell';

export function setupSingleInstance(): boolean {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return false;
  }

  app.on('second-instance', () => {
    const win = getShellWindow();
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });

  return true;
}
