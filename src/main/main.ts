//
// AppFinder - Alternative app store for macOS
//

import { app } from 'electron';
import { setupConfig } from './config';
import { setupI18n } from './i18n';
import { setupIpcMain } from './ipc-main';
import { setupApplicationMenu } from './menu-application';
import { setupContextMenu } from './menu-context';
import { createShellWindow, getShellWindow } from './window-shell';
import { checkCommand, checkCommandDialog } from './check';

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

  async function initDevTools(): Promise<void> {
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      try {
        const installer = require('electron-devtools-installer');
        const installExtension = installer.default || installer;
        const { REACT_DEVELOPER_TOOLS } = installer;
        const name = await installExtension(REACT_DEVELOPER_TOOLS, {
          loadExtensionOptions: { allowFileAccess: true },
        });
        console.log(`[DevTools] Added Extension: ${name?.name || name}`);
      } catch (err) {
        console.warn('[DevTools] Failed to install React DevTools:', err);
      }
    }
  }

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

    await initDevTools();
  }

  app.whenReady().then(init);
}
