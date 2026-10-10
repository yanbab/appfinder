import { contextBridge, ipcRenderer } from 'electron';
import type { IpcBridge, Unsubscribe } from '../types/ipc';
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

ipcRenderer.on('config:updated', (_: any, newConfig: AppConfig) => {
  cachedConfig = newConfig;
});

const ipcApi: IpcBridge = {
  getCasks: () => invoke('cask:get-data'),
  getCategories: () => invoke('cask:get-categories'),
  getCaskInfo: (token: string) => invoke('cask:get-info', token),
  getInstalled: () => invoke('cask:get-installed'),
  getServicesStatus: () => invoke('services:get-status'),

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
  revealApp: (token: string, appName?: string) => invoke('cask:reveal', token, appName),
  openExternal: (url: string) => invoke('external:open', url),
  showErrorDialog: (title: string, content: string) => invoke('dialog:error', title, content),
  showMessage: (options: any) => invoke('dialog:message', options),

  runAction: (taskId: string, action: string, token: string, zap?: boolean, appName?: string) =>
    ipcRenderer.send('cask:run-action', { taskId, action, token, zap, appName }),
  cancelAction: (taskId: string) => ipcRenderer.send('cask:cancel-action', taskId),
  writePtyInput: (taskId: string, text: string) => ipcRenderer.send('cask:write-pty-input', { taskId, text }),

  getAccentColor: () => invoke('system:get-accent-color'),
  setContentSize: (width: number, height: number) => ipcRenderer.send('window:set-content-size', width, height),
  showContextMenu: (data: any) => ipcRenderer.send('context-menu:show', data),
  sidebarChanged: (visible: boolean) => ipcRenderer.send('shell:sidebar-changed', visible),
  terminalChanged: (visible: boolean) => ipcRenderer.send('shell:terminal-changed', visible),
  updateMenu: (id: string, status: { checked?: boolean; enabled?: boolean }) =>
    ipcRenderer.send('menu:update', id, status),
  updateMenuItem: (id: string, status: { checked?: boolean; enabled?: boolean }) =>
    ipcRenderer.send('menu:update', id, status),

  // Unified Event Bus
  on: (signal: any, callback: any) => on(signal, callback),
};

contextBridge.exposeInMainWorld('ipc', ipcApi);
