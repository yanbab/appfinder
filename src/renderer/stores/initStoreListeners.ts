import { useAppStore } from './useAppStore';
import { useTermStore } from './useTermStore';
import { useShellStore } from './useShellStore';

let isInitialized = false;

/**
 * Binds Electron IPC listeners to update stores and triggers initial data loads.
 */
export function initStoreListeners(): void {
  if (isInitialized || typeof window === 'undefined' || !window.ipc) return;
  isInitialized = true;

  const appStore = useAppStore.getState();
  const termStore = useTermStore.getState();
  const shellStore = useShellStore.getState();

  // 1. Initial data fetching
  window.ipc.getMessages?.().then((msgs) => {
    if (msgs) shellStore.setMessages(msgs);
  });

  window.ipc.getConfig?.().then((cfg) => {
    if (cfg?.alwaysShowStatusBar) shellStore.setAlwaysShowStatusBar(true);
  });

  appStore.initCatalog();

  // 2. Global IPC event subscriptions via unified `on` bus
  window.ipc.on('config:updated', (cfg) => {
    if (cfg?.alwaysShowStatusBar !== undefined) {
      shellStore.setAlwaysShowStatusBar(!!cfg.alwaysShowStatusBar);
    }
  });

  window.ipc.on('i18n:changed', () => {
    window.ipc.getMessages?.().then((msgs) => {
      if (msgs) shellStore.setMessages(msgs);
    });
  });

  window.ipc.on('shell:select-tab', (tab) => shellStore.selectTab(tab));
  window.ipc.on('shell:focus-search', () => {
    shellStore.closeAppInfo();
    shellStore.setShowSidebar(true);
    setTimeout(() => document.getElementById('search-input')?.focus(), 50);
  });
  window.ipc.on('shell:set-order', (order) => appStore.setOrder(order));
  window.ipc.on('shell:set-view-mode', (mode) => shellStore.setViewMode(mode));
  window.ipc.on('shell:toggle-sidebar', (show) => shellStore.setShowSidebar(show ?? !shellStore.showSidebar));
  window.ipc.on('shell:clear-cache', () => termStore.startAction('cleanup'));
  window.ipc.on('shell:check-updates', () => {
    shellStore.selectTab('updates');
    termStore.startAction('refresh', 'refresh');
  });
  window.ipc.on('shell:fetch-apps', () => {
    termStore.startAction('fetch', 'fetch');
  });

  window.ipc.on('cask:updates-refreshed', () => appStore.refreshUpdates(false));
  window.ipc.on('cask:data-refreshed', () => appStore.initCatalog());

  window.ipc.on('task:log', (data) => termStore.handleTaskLog(data));
  window.ipc.on('status:log', (text) => termStore.handleStatusLog(text));
  window.ipc.on('task:prompt', (prompt) => termStore.handleTaskPrompt(prompt));
  window.ipc.on('task:complete', (data) => termStore.handleTaskComplete(data));
}
