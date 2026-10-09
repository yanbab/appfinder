import type { CaskItem, CategoryItem, AppConfig, LocaleInfo } from './cask';

export interface TaskLogEvent {
  taskId: string;
  text?: string;
  stream?: string;
  line?: string;
  [key: string]: any;
}

export interface TaskPromptEvent {
  id?: string;
  taskId?: string;
  type: string;
  prompt?: string;
  message?: string;
  targetApp?: string;
  dependencies?: string;
  isRetry?: boolean;
  [key: string]: any;
}

export interface TaskCompleteEvent {
  taskId: string;
  code?: number | null;
  error?: string | null;
  cancelled?: boolean;
  [key: string]: any;
}

export interface MenuClickEvent {
  command: string;
  value?: any;
}

export type Unsubscribe = () => void;

export interface IpcEventMap {
  'task:log': TaskLogEvent;
  'task:prompt': TaskPromptEvent;
  'task:complete': TaskCompleteEvent;
  'cask:data-refreshed': void;
  'config:updated': AppConfig;
  'i18n:changed': void;
  'system:accent-color-changed': string | null;
  'context-menu:action': { action: string; token?: string } | string;
  'menu:click': MenuClickEvent;
}

export type IpcEventName = keyof IpcEventMap;

export interface IpcBridge {
  // Queries (Request-Response)
  getCasks: () => Promise<CaskItem[]>;
  getCategories: () => Promise<CategoryItem[]>;
  getCaskInfo: (token: string) => Promise<any>;
  getInstalled: () => Promise<any>;
  getUpdates: (force?: boolean) => Promise<any>;
  getServicesStatus: () => Promise<Record<string, { status: string; pid?: number; user?: string }>>;

  getMessages: () => Promise<Record<string, string>>;
  getAvailableLocales: () => Promise<LocaleInfo[]>;
  getSystemLocale: () => Promise<string>;

  getConfig: () => Promise<AppConfig>;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<AppConfig>;

  openApp: (token: string, appName?: string) => Promise<any>;
  revealApp: (token: string, appName?: string) => Promise<any>;
  openExternal: (url: string) => Promise<any>;
  showErrorDialog: (title: string, content: string) => Promise<any>;
  showMessage: (options: any) => Promise<any>;
  getAccentColor: () => Promise<string | null>;

  // Actions (Send to Main)
  runAction: (taskId: string, action: string, token: string, zap?: boolean, appName?: string) => void;
  cancelAction: (taskId: string) => void;
  writePtyInput: (taskId: string, text: string) => void;
  setContentSize: (width: number, height: number) => void;
  showContextMenu: (data: any) => void;
  sidebarChanged: (visible: boolean) => void;
  terminalChanged: (visible: boolean) => void;

  // Unified Event Bus (Main -> Renderer)
  on<K extends keyof IpcEventMap>(channel: K, callback: (data: IpcEventMap[K]) => void): Unsubscribe;
  on(channel: string, callback: (...args: any[]) => void): Unsubscribe;
}

