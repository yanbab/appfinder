const { ipcMain, shell, dialog, systemPreferences, app, BrowserWindow, nativeImage } = require('electron');
const i18n = require('./i18n');
const Backend = require('./brew');
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
  ipcMain.handle('cask:get-data', async () => Backend.getApps());
  ipcMain.handle('cask:get-categories', async () => Backend.getCategories());
  ipcMain.handle('cask:get-installed', async (event) => Backend.getInstalled((msg) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('status:log', msg);
    }
  }));
  ipcMain.handle('cask:get-updates', async (_, force) => Backend.getUpdates(force));
  ipcMain.handle('cask:get-info', async (_, token) => Backend.getCaskInfo(token));
  ipcMain.handle('cask:open', async (_, token, appName) => Backend.launchApp(appName || token));



  ipcMain.on('cask:run-action', (event, data) => {
    Backend.runAction(data, {
      onLog: (logData) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('task:log', logData);
        }
      },
      onComplete: ({ taskId, code, error, cancelled }) => {
        if (code === 0 && (data?.action === 'install' || data?.action === 'uninstall')) {
          if (app?.dock?.bounce) {
            app.dock.bounce('informational');
          }
        }
        if (data?.action === 'cleanup') {
          broadcast('cleanup:status', 'complete');
        }
        if (!event.sender.isDestroyed()) {
          event.sender.send('task:complete', { taskId, code, error, cancelled });
        }
      }
    });
  });

  ipcMain.on('cask:cancel-action', (event, taskId) => {
    Backend.cancelAction(taskId, (result) => {
      broadcast('cleanup:status', 'complete');
      if (!event.sender.isDestroyed()) {
        event.reply('task:complete', result);
      }
    });
  });

  ipcMain.on('cask:write-pty-input', (_, { taskId, text }) => Backend.writePtyInput(taskId, text));

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
    const result = await Backend.cleanCache();
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
