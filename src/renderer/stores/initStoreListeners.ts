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
  const fetchMessages = window.ipc.getMessages || window.ipc.getTranslations || window.ipc.getI18nCatalog;
  fetchMessages?.().then((msgs) => {
    if (msgs) shellStore.setMessages(msgs);
  });

  window.ipc.getConfig?.().then((cfg) => {
    if (cfg?.alwaysShowStatusBar) shellStore.setAlwaysShowStatusBar(true);
  });

  appStore.initCatalog();

  // 2. Global IPC event subscriptions
  if (window.ipc.onConfigUpdated) {
    window.ipc.onConfigUpdated((cfg) => {
      if (cfg?.alwaysShowStatusBar !== undefined) {
        shellStore.setAlwaysShowStatusBar(!!cfg.alwaysShowStatusBar);
      }
    });
  }

  if (window.ipc.onI18nChanged) {
    window.ipc.onI18nChanged(() => {
      fetchMessages?.().then((msgs) => {
        if (msgs) shellStore.setMessages(msgs);
      });
    });
  }

  if (window.ipc.onSelectTab) {
    window.ipc.onSelectTab((tab) => shellStore.selectTab(tab));
  }

  if (window.ipc.onFocusSearch) {
    window.ipc.onFocusSearch(() => {
      shellStore.closeAppInfo();
      shellStore.setShowSidebar(true);
      setTimeout(() => document.getElementById('search-input')?.focus(), 50);
    });
  }

  if (window.ipc.onSetOrder) {
    window.ipc.onSetOrder((order) => appStore.setOrder(order));
  }

  if (window.ipc.onSetViewMode) {
    window.ipc.onSetViewMode((mode) => shellStore.setViewMode(mode));
  }

  if (window.ipc.onToggleSidebar) {
    window.ipc.onToggleSidebar((show) => shellStore.setShowSidebar(show ?? !shellStore.showSidebar));
  }

  if (window.ipc.onUpdatesRefreshed) {
    window.ipc.onUpdatesRefreshed(() => {
      appStore.refreshUpdates(false);
    });
  }

  if (window.ipc.onDataRefreshed) {
    window.ipc.onDataRefreshed(() => {
      appStore.initCatalog();
    });
  }

  if (window.ipc.onTaskLog) {
    window.ipc.onTaskLog((data) => termStore.handleTaskLog(data));
  }

  if (window.ipc.onStatusLog) {
    window.ipc.onStatusLog((text) => termStore.handleStatusLog(text));
  }

  if (window.ipc.onTaskPrompt) {
    window.ipc.onTaskPrompt((prompt) => termStore.handleTaskPrompt(prompt));
  }

  if (window.ipc.onTaskComplete) {
    window.ipc.onTaskComplete((data) => termStore.handleTaskComplete(data));
  }

  if (window.ipc.onClearCache) {
    window.ipc.onClearCache(() => termStore.startAction('cleanup'));
  }

  if (window.ipc.onCheckUpdates) {
    window.ipc.onCheckUpdates(() => {
      shellStore.selectTab('updates');
      termStore.startAction('refresh', 'refresh');
    });
  }

  if (window.ipc.onFetchApps) {
    window.ipc.onFetchApps(() => {
      termStore.startAction('fetch', 'fetch');
    });
  }
}
