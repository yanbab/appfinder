const { ipcMain, shell, dialog, systemPreferences, app, BrowserWindow, nativeImage } = require('electron');
const i18n = require('./i18n');
const brewService = require('./services/brew-service');
const appLauncher = require('./services/app-launcher');
const taskManager = require('./tasks/task-manager');
const { getConfig, updateConfig } = require('./config');
const { createSettingsWindow } = require('./window-settings');

function broadcast(channel, ...args) {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
}

function setupIpcMain() {
  // Cask Queries & Actions
  ipcMain.handle('cask:get-data', async () => brewService.getApps());
  ipcMain.handle('cask:get-categories', async () => brewService.getCategories());
  ipcMain.handle('cask:get-installed', async (event) => brewService.getInstalled((msg) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('status:log', msg);
    }
  }));
  ipcMain.handle('cask:get-updates', async (_, force) => brewService.getUpdates(force));
  ipcMain.handle('cask:get-info', async (_, token) => brewService.getCaskInfo(token));
  ipcMain.handle('cask:open', async (_, token, appName) => appLauncher.launchApp(appName || token));

  ipcMain.on('cask:run-action', (event, data) => {
    console.log('[IPC-MAIN RUN ACTION]:', data);
    const { taskId, action, token, zap } = data || {};
    const args = brewService.getActionArgs(action, token, zap);

    if (!args) {
      if (!event.sender.isDestroyed()) {
        event.sender.send('task:complete', { taskId, code: 1, error: 'Invalid action' });
      }
      return;
    }

    taskManager.runTask(
      {
        taskId,
        command: brewService.getBrewPath(),
        args,
        env: brewService.getEnvWithBrew()
      },
      {
        onLog: (logData) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('task:log', logData);
          }
        },
        onPrompt: async ({ taskId: tId, type, isRetry, prompt, details, respond }) => {
          console.log('[IPC-MAIN PROMPT DETECTED]:', { taskId: tId, type, isRetry, prompt });
          if (type === 'confirm') {
            try {
              const senderWin = BrowserWindow.fromWebContents(event.sender);
              const win = (senderWin && !senderWin.isDestroyed())
                ? senderWin
                : (BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]);

              const result = await dialog.showMessageBox(win, {
                type: 'question',
                buttons: [i18n.__('Proceed'), i18n.__('Cancel')],
                defaultId: 0,
                cancelId: 1,
                title: i18n.__('Confirmation Required'),
                message: prompt || i18n.__('Do you want to proceed?'),
                detail: details || ''
              });

              const answer = (result.response === 0) ? 'y\r' : 'n\r';
              respond(answer);
            } catch (err) {
              console.error('[IPC-MAIN CONFIRM PROMPT ERROR]:', err);
              respond('n\r');
            }
          } else if (type === 'password') {
            if (!event.sender.isDestroyed()) {
              event.sender.send('task:prompt', { taskId: tId, type: 'password', isRetry, prompt });
            }
          }
        },
        onComplete: ({ taskId: tId, code, error, cancelled }) => {
          console.log('[IPC-MAIN TASK COMPLETE]:', { taskId: tId, code, error, cancelled });
          if (code === 0 && (action === 'install' || action === 'uninstall')) {
            if (app?.dock?.bounce) {
              app.dock.bounce('informational');
            }
          }
          if (action === 'cleanup') {
            broadcast('cleanup:status', 'complete');
          }
          if (code === 0 && action === 'refresh') {
            brewService.getUpdates(true).catch(() => {});
          }
          if (!event.sender.isDestroyed()) {
            event.sender.send('task:complete', { taskId: tId, code, error, cancelled });
          }
        }
      }
    );
  });

  ipcMain.on('cask:cancel-action', (event, taskId) => {
    taskManager.cancelTask(taskId, (result) => {
      broadcast('cleanup:status', 'complete');
      if (!event.sender.isDestroyed()) {
        event.reply('task:complete', result);
      }
    });
  });

  ipcMain.on('cask:write-pty-input', (_, { taskId, text }) => taskManager.writeTaskInput(taskId, text));

  // Localization
  ipcMain.handle('i18n:get-catalog', async () => i18n.getCatalog(i18n.getLocale()));
  ipcMain.handle('i18n:get-locales', async () => i18n.getLocales());

  // External & Dialogs
  ipcMain.handle('external:open', async (_, url) => shell.openExternal(url));
  ipcMain.handle('dialog:error', async (_, title, content) => dialog.showErrorBox(title, content));
  ipcMain.handle('dialog:message', async (event, options) => {
    if (options.icon) options.icon = nativeImage.createFromDataURL(options.icon);
    return await dialog.showMessageBox(BrowserWindow.fromWebContents(event.sender), options);
  });

  // System Preferences & Accent Color
  ipcMain.handle('system:get-accent-color', async () => {
    try {
      return typeof systemPreferences.getAccentColor === 'function' ? systemPreferences.getAccentColor() : null;
    } catch (_) {
      return null;
    }
  });

  if (typeof systemPreferences.subscribeNotification === 'function') {
    try {
      systemPreferences.subscribeNotification('AppleColorPreferencesChangedNotification', () => {
        const color = typeof systemPreferences.getAccentColor === 'function' ? systemPreferences.getAccentColor() : null;
        broadcast('system:accent-color-changed', color);
      });
    } catch (_) { }
  }

  ipcMain.on('settings:open', (event) => createSettingsWindow(event?.sender ? BrowserWindow.fromWebContents(event.sender) : null));
  ipcMain.on('window:set-content-size', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed() && typeof width === 'number' && typeof height === 'number') {
      win.setContentSize(width, height, true);
    }
  });

  ipcMain.on('shell:sidebar-changed', (_, visible) => {
    const { updateSidebarChecked } = require('./menu-application');
    updateSidebarChecked(visible);
  });

  ipcMain.handle('settings:clear-caches', async () => {
    broadcast('cleanup:status', 'start');
    const result = await appLauncher.cleanCache();
    broadcast('cleanup:status', 'complete', result);
    return result;
  });

  // Config & Settings
  ipcMain.handle('config:get', async () => getConfig());
  ipcMain.handle('config:update', async (_, newConfig) => {
    const oldConfig = getConfig();
    const updated = updateConfig(newConfig);
    broadcast('config:updated', updated);
    if (typeof newConfig.alwaysShowStatusBar === 'boolean') {
      const { updateStatusbarChecked } = require('./menu-application');
      updateStatusbarChecked(newConfig.alwaysShowStatusBar);
    }
    if (newConfig.language && newConfig.language !== oldConfig.language) {
      let lang = newConfig.language;
      if (lang === 'system') {
        const sysLang = app.getLocale() || 'en';
        const code = sysLang.split('-')[0].toLowerCase();
        const availableCodes = i18n.getLocales().map(l => l.code);
        lang = availableCodes.includes(code) ? code : 'en';
      }
      i18n.setLocale(lang);
      const { setupApplicationMenu } = require('./menu-application');
      setupApplicationMenu();
      broadcast('i18n:changed');
    }
    return updated;
  });
}

module.exports = {
  setupIpcMain
};
