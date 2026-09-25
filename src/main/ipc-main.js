// Main IPC

const { ipcMain, shell, dialog, systemPreferences, app, BrowserWindow, nativeImage } = require('electron');
const i18n = require('./i18n');
const Brew = require('./brew');
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
    ipcMain.handle('cask:get-data', async () => Brew.getApps());
    ipcMain.handle('cask:get-categories', async () => Brew.getCategories());
    ipcMain.handle('cask:get-installed', async (event) => Brew.getInstalled(event));
    ipcMain.handle('cask:get-updates', async (_, force) => Brew.getUpdates(force));
    ipcMain.handle('cask:get-info', async (_, token) => Brew.getCaskInfo(token));
    ipcMain.handle('cask:open', async (_, token, appName) => Brew.openApp(token, appName));
    ipcMain.handle('cask:reveal', async (_, token, appName) => Brew.revealInFinder(token, appName));
    ipcMain.on('cask:run-action', (event, data) => Brew.runAction(event, data));
    ipcMain.on('cask:cancel-action', (event, taskId) => Brew.cancelAction(event, taskId));
    ipcMain.on('cask:write-pty-input', (_, { taskId, text }) => Brew.writePtyInput(taskId, text));

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
    ipcMain.handle('system:get-accent-color', async () => systemPreferences.getAccentColor());
    ipcMain.on('system:set-progress-bar', (event, progress, options) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win && !win.isDestroyed()) {
            win.setProgressBar(progress, options);
        }
    });
    systemPreferences.subscribeNotification('AppleColorPreferencesChangedNotification', () => {
        broadcast('system:accent-color-changed', systemPreferences.getAccentColor());
    });
    ipcMain.on('settings:open', (event) => createSettingsWindow(event?.sender ? BrowserWindow.fromWebContents(event.sender) : null));
    ipcMain.on('shell:sidebar-changed', (_, visible) => {
        const { updateSidebarChecked } = require('./menu-application');
        updateSidebarChecked(visible);
    });
    ipcMain.handle('settings:clear-caches', async () => {
        broadcast('cleanup:status', 'start');
        const result = await Brew.cleanCache();
        broadcast('cleanup:status', 'complete', result);
        return result;
    });
    // Config & Settings
    ipcMain.handle('config:get', async () => getConfig());
    ipcMain.handle('config:update', async (_, newConfig) => {
        const oldConfig = getConfig();
        const updated = updateConfig(newConfig);
        broadcast('config:updated', updated);
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
