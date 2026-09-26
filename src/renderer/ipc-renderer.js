const { contextBridge, ipcRenderer } = require('electron');

const on = (signal, callback) => {
  const listener = (event, ...args) => callback(...args);
  ipcRenderer.on(signal, listener);
  return () => ipcRenderer.removeListener(signal, listener);
}

const invoke = async (channel, ...args) => {
  const start = performance.now();
  try {
    const res = await ipcRenderer.invoke(channel, ...args);
    console.log(`[IPC] ${channel} (${(performance.now() - start).toFixed(0)}ms)`);
    return res;
  } catch (err) {
    console.error(`[IPC] ${channel} failed after ${(performance.now() - start).toFixed(2)}ms:`, err);
    throw err;
  }
};

let cachedConfig = null;
let pendingConfigPromise = null;

let systemVersion = '';
let platform = 'darwin';
try {
  if (typeof process !== 'undefined') {
    if (typeof process.getSystemVersion === 'function') {
      systemVersion = process.getSystemVersion();
    }
    if (process.platform) {
      platform = process.platform;
    }
    if (!systemVersion && platform === 'darwin') {
      const os = require('os');
      const dMajor = parseInt(os.release().split('.')[0], 10);
      if (dMajor >= 20) {
        systemVersion = String(dMajor - 9);
      } else if (dMajor >= 5) {
        systemVersion = '10.' + (dMajor - 4);
      }
    }
  }
} catch {}

ipcRenderer.on('config:updated', (_, newConfig) => {
  cachedConfig = newConfig;
});

contextBridge.exposeInMainWorld('ipc', {
  systemVersion,
  platform,


  getCasks: () => invoke('cask:get-data'),
  getCategories: () => invoke('cask:get-categories'),
  getCaskInfo: (token) => invoke('cask:get-info', token),
  getCaskSizes: (token) => invoke('cask:get-sizes', token),
  getInstalled: () => invoke('cask:get-installed'),
  getUpdates: (force = false) => invoke('cask:get-updates', force),
  getTranslations: () => invoke('i18n:get-catalog'),
  getAvailableLocales: () => invoke('i18n:get-locales'),
  getConfig: async () => {
    if (cachedConfig) return cachedConfig;
    if (!pendingConfigPromise) {
      pendingConfigPromise = invoke('config:get').then((cfg) => {
        cachedConfig = cfg;
        pendingConfigPromise = null;
        return cfg;
      }).catch((err) => {
        pendingConfigPromise = null;
        throw err;
      });
    }
    return pendingConfigPromise;
  },

  updateConfig: async (newConfig) => {
    cachedConfig = await invoke('config:update', newConfig);
    return cachedConfig;
  },
  openApp: (token, appName) => invoke('cask:open', token, appName),
  openExternal: (url) => invoke('external:open', url),
  showErrorDialog: (title, content) => invoke('dialog:error', title, content),
  showMessage: (options) => invoke('dialog:message', options),

  runAction: (taskId, action, token, zap) => ipcRenderer.send('cask:run-action', { taskId, action, token, zap }),
  cancelAction: (taskId) => ipcRenderer.send('cask:cancel-action', taskId),
  writePtyInput: (taskId, text) => ipcRenderer.send('cask:write-pty-input', { taskId, text }),
  clearCaches: () => invoke('settings:clear-caches'),

  getAccentColor: () => invoke('system:get-accent-color'),
  onAccentColorChanged: (cb) => on('system:accent-color-changed', cb),
  setContentSize: (width, height) => ipcRenderer.send('window:set-content-size', width, height),

  showContextMenu: (data) => ipcRenderer.send('context-menu:show', data),
  onContextMenuAction: (cb) => on('context-menu:action', cb),

  onTaskLog: (cb) => on('task:log', cb),
  onTaskComplete: (cb) => on('task:complete', cb),
  onStatusLog: (cb) => on('status:log', cb),
  onUpdatesRefreshed: (cb) => on('cask:updates-refreshed', cb),
  onCleanupStatus: (cb) => on('cleanup:status', cb),
  onConfigUpdated: (cb) => on('config:updated', cb),
  onI18nChanged: (cb) => on('i18n:changed', cb),

  onSelectTab: (cb) => on('shell:select-tab', cb),
  onFocusSearch: (cb) => on('shell:focus-search', cb),
  onCheckUpdates: (cb) => on('shell:check-updates', cb),
  onSetOrder: (cb) => on('shell:set-order', cb),
  onToggleSidebar: (cb) => on('shell:toggle-sidebar', cb),
  sidebarChanged: (visible) => ipcRenderer.send('shell:sidebar-changed', visible),
});
