//
// AppFinder - Alternative app store for macOS
//

const { app } = require('electron');
const { setupConfig } = require('./config');
const { setupI18n } = require('./i18n');
const { setupIpcMain } = require('./ipc-main');
const { setupApplicationMenu } = require('./menu-application');
const { setupContextMenu } = require('./menu-context');
const { createShellWindow, getShellWindow } = require('./window-shell');
const { checkCommand, checkCommandDialog } = require('./check');

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

  async function initDevTools() {
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      try {
        const installer = require('electron-devtools-installer');
        const installExtension = installer.default || installer;
        const { REACT_DEVELOPER_TOOLS } = installer;
        const name = await installExtension(REACT_DEVELOPER_TOOLS, {
          loadExtensionOptions: { allowFileAccess: true },
        });
        console.log(`[DevTools] Added Extension: ${name.name}`);
      } catch (err) {
        console.warn('[DevTools] Failed to install React DevTools:', err);
      }
    }
  }

  async function init() {
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

