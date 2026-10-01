//
// AppFinder - Alternative app store for macOS
//

const { app } = require('electron');
const { setupConfig } = require('./config');
const { setupI18n } = require('./i18n');
const { setupIpcMain } = require('./ipc-main');
const { setupApplicationMenu } = require('./menu-application');
const { setupContextMenu } = require('./menu-context');
const { createShellWindow } = require('./window-shell');
const { checkCommand, checkCommandDialog } = require('./check');

async function initDevTools() {
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    try {
      const installer = require('electron-devtools-installer');
      const installExtension = installer.default || installer;
      const { REACT_DEVELOPER_TOOLS } = installer;
      const name = await installExtension(REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: { allowFileAccess: true },
      });
      console.log(`[DevTools] Added Extension: ${name}`);
    } catch (err) {
      console.warn('[DevTools] Failed to install React DevTools:', err);
    }
  }
}

async function init() {
  const reqCmd = process.platform === 'darwin' ? 'brew' : (process.platform === 'linux' ? 'flatpak' : null);
  if (reqCmd && !checkCommand(reqCmd)) {
    checkCommandDialog(reqCmd);
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
  await initDevTools();
  createShellWindow();
}

app.whenReady().then(init);

