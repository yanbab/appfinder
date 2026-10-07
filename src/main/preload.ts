import { contextBridge, ipcRenderer } from 'electron';
import type { IpcBridge, TaskLogEvent, TaskPromptEvent, TaskCompleteEvent, Unsubscribe } from '../types/ipc';
import type { AppConfig } from '../types/cask';

const on = (signal: string, callback: (...args: any[]) => void): Unsubscribe => {
  const listener = (_event: any, ...args: any[]) => callback(...args);
  ipcRenderer.on(signal, listener);
  return () => ipcRenderer.removeListener(signal, listener);
};

const getTimestamp = (): string => {
  const d = new Date();
  const time = d.toTimeString().split(' ')[0];
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${time}.${ms}`;
};

const invoke = async (channel: string, ...args: any[]): Promise<any> => {
  const start = performance.now();
  try {
    const res = await ipcRenderer.invoke(channel, ...args);
    if (cachedConfig && cachedConfig.debug) {
      console.log(`[${getTimestamp()}] [IPC] ${channel} (${(performance.now() - start).toFixed(0)}ms)`);
    }
    return res;
  } catch (err) {
    if (!cachedConfig || cachedConfig.debug) {
      console.error(`[${getTimestamp()}] [IPC] ${channel} failed after ${(performance.now() - start).toFixed(2)}ms:`, err);
    }
    throw err;
  }
};

let cachedConfig: AppConfig | null = null;
let pendingConfigPromise: Promise<AppConfig> | null = null;

let systemVersion: string = '';
let platform: string = 'darwin';
let arch: string = 'arm64';

try {
  if (typeof process !== 'undefined') {
    if (typeof (process as any).getSystemVersion === 'function') {
      systemVersion = (process as any).getSystemVersion();
    }
    if (process.platform) {
      platform = process.platform;
    }
    if (process.arch) {
      arch = process.arch;
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
} catch { }

ipcRenderer.on('config:updated', (_: any, newConfig: AppConfig) => {
  cachedConfig = newConfig;
});

const ipcApi: IpcBridge = {
  systemVersion,
  platform,
  arch,

  getCasks: () => invoke('cask:get-data'),
  getCategories: () => invoke('cask:get-categories'),
  getCaskInfo: (token: string) => invoke('cask:get-info', token),
  getInstalled: () => invoke('cask:get-installed'),

  getUpdates: (force: boolean = false) => invoke('cask:get-updates', force),
  getMessages: () => invoke('i18n:get-messages'),
  getAvailableLocales: () => invoke('i18n:get-locales'),
  getSystemLocale: () => invoke('i18n:get-system-locale'),
  getConfig: async () => {
    if (cachedConfig) return cachedConfig;
    if (!pendingConfigPromise) {
      pendingConfigPromise = invoke('config:get').then((cfg: AppConfig) => {
        cachedConfig = cfg;
        pendingConfigPromise = null;
        return cfg;
      }).catch((err: any) => {
        pendingConfigPromise = null;
        throw err;
      });
    }
    return pendingConfigPromise;
  },

  updateConfig: async (newConfig: Partial<AppConfig>) => {
    cachedConfig = await invoke('config:update', newConfig);
    return cachedConfig!;
  },
  openApp: (token: string, appName?: string) => invoke('cask:open', token, appName),
  openExternal: (url: string) => invoke('external:open', url),
  showErrorDialog: (title: string, content: string) => invoke('dialog:error', title, content),
  showMessage: (options: any) => invoke('dialog:message', options),

  runAction: (taskId: string, action: string, token: string, zap?: boolean, appName?: string) =>
    ipcRenderer.send('cask:run-action', { taskId, action, token, zap, appName }),
  cancelAction: (taskId: string) => ipcRenderer.send('cask:cancel-action', taskId),
  writePtyInput: (taskId: string, text: string) => ipcRenderer.send('cask:write-pty-input', { taskId, text }),
  clearCaches: () => invoke('settings:clear-caches'),

  getAccentColor: () => invoke('system:get-accent-color'),
  onAccentColorChanged: (cb: (color: string) => void) => on('system:accent-color-changed', cb),
  setContentSize: (width: number, height: number) => ipcRenderer.send('window:set-content-size', width, height),

  showContextMenu: (data: any) => ipcRenderer.send('context-menu:show', data),
  onContextMenuAction: (cb: (action: string) => void) => on('context-menu:action', cb),

  onTaskLog: (cb: (data: TaskLogEvent) => void) => on('task:log', cb),
  onTaskPrompt: (cb: (prompt: TaskPromptEvent) => void) => on('task:prompt', cb),
  onTaskComplete: (cb: (res: TaskCompleteEvent) => void) => on('task:complete', cb),
  onStatusLog: (cb: (data: any) => void) => on('status:log', cb),
  onUpdatesRefreshed: (cb: (data: any) => void) => on('cask:updates-refreshed', cb),
  onDataRefreshed: (cb: (data: any) => void) => on('cask:data-refreshed', cb),
  onCleanupStatus: (cb: (status: any) => void) => on('cleanup:status', cb),
  onConfigUpdated: (cb: (cfg: AppConfig) => void) => on('config:updated', cb),
  onI18nChanged: (cb: (data: any) => void) => on('i18n:changed', cb),

  onSelectTab: (cb: (tab: string) => void) => on('shell:select-tab', cb),
  onFocusSearch: (cb: () => void) => on('shell:focus-search', cb),
  onCheckUpdates: (cb: () => void) => on('shell:check-updates', cb),
  onFetchApps: (cb: () => void) => on('shell:fetch-apps', cb),
  onClearCache: (cb: () => void) => on('shell:clear-cache', cb),
  onSetOrder: (cb: (order: string) => void) => on('shell:set-order', cb),
  onSetViewMode: (cb: (mode: string) => void) => on('shell:set-view-mode', cb),
  onToggleSidebar: (cb: () => void) => on('shell:toggle-sidebar', cb),
  sidebarChanged: (visible: boolean) => ipcRenderer.send('shell:sidebar-changed', visible),
};

contextBridge.exposeInMainWorld('ipc', ipcApi);
