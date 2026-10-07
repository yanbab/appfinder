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

  window.ipc.on('cask:data-refreshed', () => appStore.initCatalog());

  window.ipc.on('task:log', (data) => termStore.handleTaskLog(data));
  window.ipc.on('task:prompt', (prompt) => termStore.handleTaskPrompt(prompt));
  window.ipc.on('task:complete', (data) => termStore.handleTaskComplete(data));

  // 3. Consolidated Native Application Menu Handler
  window.ipc.on('menu:click', ({ command, value }) => {
    switch (command) {
      case 'select-tab':
        if (value) shellStore.selectTab(value);
        break;
      case 'focus-search':
        shellStore.closeAppInfo();
        shellStore.setShowSidebar(true);
        setTimeout(() => document.getElementById('search-input')?.focus(), 50);
        break;
      case 'set-order':
        if (value) appStore.setOrder(value);
        break;
      case 'set-view-mode':
        if (value) shellStore.setViewMode(value);
        break;
      case 'toggle-sidebar':
        shellStore.setShowSidebar(value ?? !shellStore.showSidebar);
        break;
      case 'clear-cache':
        termStore.startAction('cleanup');
        break;
      case 'check-updates':
        shellStore.selectTab('updates');
        termStore.startAction('refresh', 'refresh');
        break;
      case 'fetch-apps':
        termStore.startAction('fetch', 'fetch');
        break;
      default:
        console.warn(`[menu:click] Unhandled command: ${command}`);
        break;
    }
  });
}
