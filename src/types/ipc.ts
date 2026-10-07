import type { CaskItem, CategoryItem, AppConfig, LocaleInfo } from './cask';

export interface TaskLogEvent {
  taskId: string;
  text?: string;
  stream?: string;
  [key: string]: any;
}

export interface TaskPromptEvent {
  id: string;
  type: string;
  message?: string;
  targetApp?: string;
  dependencies?: string[];
  [key: string]: any;
}

export interface TaskCompleteEvent {
  taskId: string;
  code?: number | null;
  error?: string | null;
  cancelled?: boolean;
  [key: string]: any;
}

export type Unsubscribe = () => void;

export interface IpcBridge {
  systemVersion: string;
  platform: string;
  arch: string;

  getCasks: () => Promise<CaskItem[]>;
  getCategories: () => Promise<CategoryItem[]>;
  getCaskInfo: (token: string) => Promise<any>;
  getInstalled: () => Promise<any>;
  getUpdates: (force?: boolean) => Promise<any>;

  getMessages: () => Promise<Record<string, string>>;
  getAvailableLocales: () => Promise<LocaleInfo[]>;
  getSystemLocale: () => Promise<string>;

  getConfig: () => Promise<AppConfig>;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<AppConfig>;

  openApp: (token: string, appName?: string) => Promise<any>;
  openExternal: (url: string) => Promise<any>;
  showErrorDialog: (title: string, content: string) => Promise<any>;
  showMessage: (options: any) => Promise<any>;

  runAction: (taskId: string, action: string, token: string, zap?: boolean, appName?: string) => void;
  cancelAction: (taskId: string) => void;
  writePtyInput: (taskId: string, text: string) => void;
  clearCaches: () => Promise<any>;

  getAccentColor: () => Promise<string>;
  onAccentColorChanged: (cb: (color: string) => void) => Unsubscribe;
  setContentSize: (width: number, height: number) => void;

  showContextMenu: (data: any) => void;
  onContextMenuAction: (cb: (action: string) => void) => Unsubscribe;

  onTaskLog: (cb: (data: TaskLogEvent) => void) => Unsubscribe;
  onTaskPrompt: (cb: (prompt: TaskPromptEvent) => void) => Unsubscribe;
  onTaskComplete: (cb: (res: TaskCompleteEvent) => void) => Unsubscribe;
  onStatusLog: (cb: (data: any) => void) => Unsubscribe;
  onUpdatesRefreshed: (cb: (data: any) => void) => Unsubscribe;
  onDataRefreshed: (cb: (data: any) => void) => Unsubscribe;
  onCleanupStatus: (cb: (status: any) => void) => Unsubscribe;
  onConfigUpdated: (cb: (cfg: AppConfig) => void) => Unsubscribe;
  onI18nChanged: (cb: (data: any) => void) => Unsubscribe;

  onSelectTab: (cb: (tab: string) => void) => Unsubscribe;
  onFocusSearch: (cb: () => void) => Unsubscribe;
  onCheckUpdates: (cb: () => void) => Unsubscribe;
  onFetchApps: (cb: () => void) => Unsubscribe;
  onClearCache: (cb: () => void) => Unsubscribe;
  onSetOrder: (cb: (order: string) => void) => Unsubscribe;
  onSetViewMode: (cb: (mode: string) => void) => Unsubscribe;
  onToggleSidebar: (cb: (show?: boolean) => void) => Unsubscribe;
  sidebarChanged: (visible: boolean) => void;
}
