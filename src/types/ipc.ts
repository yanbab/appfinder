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

export interface IpcEventMap {
  'task:log': TaskLogEvent;
  'task:prompt': TaskPromptEvent;
  'task:complete': TaskCompleteEvent;
  'status:log': any;
  'cask:updates-refreshed': any;
  'cask:data-refreshed': void;
  'cleanup:status': any;
  'config:updated': AppConfig;
  'i18n:changed': void;
  'shell:select-tab': string;
  'shell:focus-search': void;
  'shell:check-updates': void;
  'shell:fetch-apps': void;
  'shell:clear-cache': void;
  'shell:set-order': string;
  'shell:set-view-mode': string;
  'shell:toggle-sidebar': boolean | undefined;
  'system:accent-color-changed': string;
  'context-menu:action': { action: string; token?: string } | string;
}

export type IpcEventName = keyof IpcEventMap;

export interface IpcBridge {
  systemVersion: string;
  platform: string;
  arch: string;

  // Queries (Request-Response)
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
  getAccentColor: () => Promise<string>;
  clearCaches: () => Promise<any>;

  // Actions (Send to Main)
  runAction: (taskId: string, action: string, token: string, zap?: boolean, appName?: string) => void;
  cancelAction: (taskId: string) => void;
  writePtyInput: (taskId: string, text: string) => void;
  setContentSize: (width: number, height: number) => void;
  showContextMenu: (data: any) => void;
  sidebarChanged: (visible: boolean) => void;

  // Unified Event Bus (Main -> Renderer)
  on<K extends keyof IpcEventMap>(channel: K, callback: (data: IpcEventMap[K]) => void): Unsubscribe;
  on(channel: string, callback: (...args: any[]) => void): Unsubscribe;
}
