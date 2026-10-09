import { app } from 'electron';
import { setupSingleInstance } from './single-instance';
import { initDevTools } from './react-devtools';
import { setupConfig } from './config';
import { setupI18n } from './i18n';
import { setupIpcMain } from './ipc-main';
import { setupApplicationMenu } from './menu-application';
import { setupContextMenu } from './menu-context';
import { createShellWindow } from './window-shell';
import { checkCommand, checkCommandDialog } from './check';

if (setupSingleInstance()) {
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




