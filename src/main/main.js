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

function init() {
  if (!checkCommand('brew')) { checkCommandDialog('brew'); app.quit(); return; }
  app.on('window-all-closed', app.quit);
  setupConfig();
  setupIpcMain();
  setupI18n();
  setupApplicationMenu();
  setupContextMenu();
  createShellWindow();
}

app.whenReady().then(init);
