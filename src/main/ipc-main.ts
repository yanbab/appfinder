import { ipcMain, shell, dialog, systemPreferences, app, BrowserWindow, nativeImage } from 'electron';
import i18n from './i18n';
import * as Backend from './backend/brew';
import { getConfig, updateConfig } from './config';
import { createSettingsWindow } from './window-settings';
import { updateSidebarChecked, updateStatusbarChecked, setupApplicationMenu } from './menu-application';

function broadcast(channel: string, ...args: any[]): void {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
}

export function setupIpcMain(): void {
  // Cask Queries & Actions
  ipcMain.handle('cask:get-data', async () => Backend.getApps());
  ipcMain.handle('cask:get-categories', async () => Backend.getCategories());
  ipcMain.handle('cask:get-installed', async () => Backend.getInstalled());
  ipcMain.handle('cask:get-updates', async (_, force) => Backend.getUpdates(force));
  ipcMain.handle('cask:get-info', async (_, token) => Backend.getInfo(token));
  ipcMain.handle('cask:open', async (_, token, appName) => Backend.launch(appName || token));

  ipcMain.on('cask:run-action', (event, data) => {
    console.log('[IPC-MAIN RUN ACTION]:', data.taskId);
    Backend.runAction(data, {
      onLog: (logData: any) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('task:log', logData);
        }
      },
      onPrompt: async ({ taskId, type, isRetry, isDependency, targetApp, dependencies, prompt, details, respond }: any) => {
        console.log('[IPC-MAIN PROMPT DETECTED]:', { taskId, type, isRetry, isDependency, targetApp, dependencies, prompt });
        if (type === 'confirm') {
          try {
            const senderWin = BrowserWindow.fromWebContents(event.sender);
            const win = (senderWin && !senderWin.isDestroyed())
              ? senderWin
              : (BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]);

            const allApps = Backend.getApps();
            const findAppName = (tokenOrName: string) => {
              if (!tokenOrName) return '';
              const found = Array.isArray(allApps) ? allApps.find((c: any) => c.token === tokenOrName || c.name === tokenOrName) : null;
              return found?.name || tokenOrName;
            };

            const appName = data?.appName || findAppName(targetApp || data?.token) || targetApp || data?.token || i18n.__('This application');
            const message = isDependency
              ? i18n.__('%s requires installing:', appName)
              : (prompt ? prompt.replace(/^==>\s*/, '').replace(/\s*\[y\/n\]|\(y\/n\)/i, '').trim() : i18n.__('Do you want to proceed?'));
            const detail = (isDependency && dependencies) ? dependencies : (details || '');

            const result = await dialog.showMessageBox(win, {
              type: 'question',
              buttons: [i18n.__('Install'), i18n.__('Cancel')],
              defaultId: 0,
              cancelId: 1,
              title: i18n.__('Confirmation Required'),
              message,
              detail
            });

            const answer = (result.response === 0) ? 'y\r' : 'n\r';
            const userCancelled = (result.response !== 0);
            respond(answer, userCancelled);
          } catch (err) {
            console.error('[IPC-MAIN CONFIRM PROMPT ERROR]:', err);
            respond('n\r', true);
          }
        } else if (type === 'password') {
          if (!event.sender.isDestroyed()) {
            event.sender.send('task:prompt', { taskId, type: 'password', isRetry, prompt });
          }
        }
      },
      onComplete: ({ taskId, code, error, cancelled }: any) => {
        console.log('[IPC-MAIN TASK COMPLETE]:', taskId, code, error, cancelled);
        if (code === 0 && (data?.action === 'install' || data?.action === 'uninstall')) {
          if (app?.dock?.bounce) {
            app.dock.bounce('informational');
          }
        }
        if (data?.action === 'cleanup') {
          broadcast('cleanup:status', 'complete');
        }
        if (code === 0 && data?.action === 'fetch') {
          broadcast('cask:data-refreshed');
        }
        if (!event.sender.isDestroyed()) {
          event.sender.send('task:complete', { taskId, code, error, cancelled });
        }
      }
    });
  });

  ipcMain.on('cask:cancel-action', (event, taskId) => {
    Backend.cancelAction(taskId, (result: any) => {
      broadcast('cleanup:status', 'complete');
      if (!event.sender.isDestroyed()) {
        event.reply('task:complete', result);
      }
    });
  });

  ipcMain.on('cask:write-pty-input', (_, { taskId, text }) => Backend.writePtyInput(taskId, text));

  // Localization
  ipcMain.handle('i18n:get-messages', async () => i18n.getMessages(i18n.getLocale()));
  ipcMain.handle('i18n:get-catalog', async () => i18n.getMessages(i18n.getLocale()));
  ipcMain.handle('i18n:get-locales', async () => i18n.getLocales());
  ipcMain.handle('i18n:get-system-locale', async () => {
    const sys = app?.getLocale?.() || 'en';
    return sys.split('-')[0].toLowerCase();
  });

  // External & Dialogs
  ipcMain.handle('external:open', async (_, url) => {
    if (typeof url !== 'string') return;
    try {
      const parsed = new URL(url);
      if (['https:', 'http:'].includes(parsed.protocol)) {
        return await shell.openExternal(url);
      }
    } catch (_) { }
  });
  ipcMain.handle('dialog:error', async (_, title, content) => dialog.showErrorBox(title, content));
  ipcMain.handle('dialog:message', async (event, options) => {
    if (options.icon) options.icon = nativeImage.createFromDataURL(options.icon);
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
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

  ipcMain.on('settings:open', (event) => {
    const win = event?.sender ? BrowserWindow.fromWebContents(event.sender) : null;
    createSettingsWindow(win ?? undefined);
  });
  ipcMain.on('window:set-content-size', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed() && typeof width === 'number' && typeof height === 'number') {
      win.setContentSize(width, height, true);
    }
  });

  ipcMain.on('shell:sidebar-changed', (_, visible) => {
    updateSidebarChecked(visible);
  });

  ipcMain.handle('settings:clear-caches', async () => {
    broadcast('cleanup:status', 'start');
    return new Promise((resolve) => {
      Backend.runAction(
        { taskId: `cleanup-${Date.now()}`, action: 'cleanup' },
        {
          onComplete: (res: any) => {
            broadcast('cleanup:status', 'complete', res);
            resolve({ success: res.code === 0, ...res });
          }
        }
      );
    });
  });

  // Config & Settings
  ipcMain.handle('config:get', async () => getConfig());
  ipcMain.handle('config:update', async (_, newConfig) => {
    const oldConfig = getConfig();
    const updated = updateConfig(newConfig);
    broadcast('config:updated', updated);
    if (typeof newConfig.alwaysShowStatusBar === 'boolean') {
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
      setupApplicationMenu();
      broadcast('i18n:changed');
    }
    return updated;
  });
}


