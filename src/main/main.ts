//
// AppFinder - Alternative app store for macOS
//

import { app } from 'electron';
import { checkCommand, checkCommandDialog } from './check';
import { setupConfig } from './config';
import { setupI18n } from './i18n';
import { setupIpcMain } from './ipc-main';
import { setupApplicationMenu } from './menu-application';
import { setupContextMenu } from './menu-context';
import { createShellWindow, getShellWindow } from './window-shell';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getShellWindow();
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });

  async function init(): Promise<void> {
    if (!checkCommand('brew')) {
      checkCommandDialog('brew');
      return;
    }
    app.on('window-all-closed', () => {
      app.quit();
    });
    setupConfig();
    setupIpcMain();
    setupI18n();
    setupApplicationMenu();
    setupContextMenu();
    createShellWindow();
  }

  app.whenReady().then(init);
}
