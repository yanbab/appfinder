import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppsProvider, useApps } from './useApps';
import { TaskProvider, useTask } from './useTask';

const ShellContext = createContext(null);

export { useApps } from './useApps';
export { useTask } from './useTask';

function ShellInner({ children, shellState }) {
  const apps = useApps();
  const task = useTask();

  const {
    currentTab,
    setCurrentTab,
    selectTab,
    showSidebar,
    setShowSidebar,
    showTerminal,
    setShowTerminal,
    viewMode,
    setViewMode,
    selectedApp,
    setSelectedApp,
    appDetails,
    setAppDetails,
    loadingAppDetails,
    setLoadingAppDetails,
    alwaysShowStatusBar,
    setAlwaysShowStatusBar,
    slideIndex,
    setSlideIndex,
    messages,
    __,
    infoCacheRef,
  } = shellState;

  // Open App Info drawer & fetch details
  const openAppInfo = useCallback(async (app) => {
    setSelectedApp(app);
    if (!app?.token) return;

    if (infoCacheRef.current.has(app.token)) {
      setAppDetails(infoCacheRef.current.get(app.token));
      setLoadingAppDetails(false);
      return;
    }

    setAppDetails(null);
    setLoadingAppDetails(true);

    try {
      const info = await window.ipc?.getCaskInfo?.(app.token);
      if (info) {
        infoCacheRef.current.set(app.token, info);
        setAppDetails(info);
      }
    } catch (e) {
      console.error(`Failed to fetch info for ${app.token}:`, e);
    } finally {
      setLoadingAppDetails(false);
    }
  }, [setSelectedApp, setAppDetails, setLoadingAppDetails, infoCacheRef]);

  const closeAppInfo = useCallback(() => {
    setSelectedApp(null);
    setAppDetails(null);
  }, [setSelectedApp, setAppDetails]);

  const nextSlide = useCallback(() => {
    if (apps.featuredItems.length <= 1) return;
    setSlideIndex(prev => (prev + 1) % apps.featuredItems.length);
  }, [apps.featuredItems.length, setSlideIndex]);

  const prevSlide = useCallback(() => {
    if (apps.featuredItems.length <= 1) return;
    setSlideIndex(prev => (prev - 1 + apps.featuredItems.length) % apps.featuredItems.length);
  }, [apps.featuredItems.length, setSlideIndex]);

  const getPageTitle = useCallback(() => {
    if (currentTab === 'discover') return __('Explore');
    if (currentTab === 'all-apps') return __('All Apps');
    if (currentTab === 'installed') return __('Installed');
    if (currentTab === 'updates') return __('Updates');
    const cat = apps.categories.find(c => c.name === currentTab);
    return cat ? __(cat.displayName) : __('Explore');
  }, [currentTab, apps.categories, __]);

  // Unified context value (backward-compatible superset of useApps, useTask, and UI)
  const value = useMemo(() => ({
    // Navigation
    currentTab,
    setCurrentTab,
    selectTab,
    search: apps.search,
    setSearch: apps.setSearch,
    order: apps.order,
    setOrder: apps.setOrder,
    viewMode,
    setViewMode,

    // Layout
    showSidebar,
    setShowSidebar,
    toggleSidebar: () => setShowSidebar(prev => !prev),
    showTerminal,
    setShowTerminal,
    toggleTerminal: () => setShowTerminal(prev => !prev),
    showDrawer: task.showDrawer,
    setShowDrawer: task.setShowDrawer,
    alwaysShowStatusBar,

    // App Details
    selectedApp,
    appDetails,
    loadingAppDetails,
    openAppInfo,
    closeAppInfo,

    // Collections from useApps
    items: apps.items,
    setItems: apps.setItems,
    itemsRef: apps.itemsRef,
    categories: apps.categories,
    categoriesMap: apps.categoriesMap,
    installed: apps.installed,
    installedVersions: apps.installedVersions,
    outdatedMap: apps.outdatedMap,
    updatesCount: apps.updatesCount,
    allAppsCount: apps.allAppsCount,
    filteredItems: apps.filteredItems,
    displayedItems: apps.displayedItems,
    filteredCount: apps.filteredCount,
    loadMore: apps.loadMore,
    loading: apps.loading,
    lastCheckedTime: apps.lastCheckedTime,

    // Discover data
    featuredItems: apps.featuredItems,
    topInstalledItems: apps.topInstalledItems,
    recentItems: apps.recentItems,
    slideIndex,
    setSlideIndex,
    nextSlide,
    prevSlide,
    getPageTitle,

    // Tasks from useTask
    runningTasks: task.runningTasks,
    activeTaskId: task.activeTaskId,
    activeTaskToken: task.activeTaskToken,
    activeTaskAction: task.activeTaskAction,
    drawerTitle: task.drawerTitle,
    setDrawerTitle: task.setDrawerTitle,
    taskProgressPercent: task.taskProgressPercent,
    isWaitingForInput: task.isWaitingForInput,
    startAction: task.startAction,
    cancelAction: task.cancelAction,
    showPasswordModal: task.showPasswordModal,
    submitPassword: task.submitPassword,
    cancelPassword: task.cancelPassword,
    registerTerminalSubscriber: task.registerTerminalSubscriber,
    clearTerminal: task.clearTerminal,

    // Localization
    messages,
    catalog: messages, // Alias for backward compatibility
    __,
  }), [
    currentTab,
    setCurrentTab,
    selectTab,
    apps,
    viewMode,
    setViewMode,
    showSidebar,
    setShowSidebar,
    showTerminal,
    setShowTerminal,
    task,
    alwaysShowStatusBar,
    selectedApp,
    appDetails,
    loadingAppDetails,
    openAppInfo,
    closeAppInfo,
    slideIndex,
    setSlideIndex,
    nextSlide,
    prevSlide,
    getPageTitle,
    messages,
    __,
  ]);

  return (
    <ShellContext.Provider value={value}>
      {children}
    </ShellContext.Provider>
  );
}

export function ShellProvider({ children }) {
  // Navigation & View
  const [currentTab, setCurrentTab] = useState('discover');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('appfinder-view-mode') || 'list');
  const [slideIndex, setSlideIndex] = useState(0);

  // Panels
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth > 560);
  const [showTerminal, setShowTerminal] = useState(false);
  const [alwaysShowStatusBar, setAlwaysShowStatusBar] = useState(false);

  // App Details Drawer
  const [selectedApp, setSelectedApp] = useState(null);
  const [appDetails, setAppDetails] = useState(null);
  const [loadingAppDetails, setLoadingAppDetails] = useState(false);
  const infoCacheRef = useRef(new Map());

  // Localization messages
  const [messages, setMessages] = useState({});

  const applyMessages = useCallback((msgs) => {
    if (msgs && typeof msgs === 'object') {
      setMessages(msgs);
    }
  }, []);

  const __ = useCallback((key, ...args) => {
    let text = (messages && messages[key] !== undefined) ? messages[key] : key;
    if (args.length > 0) {
      args.forEach(arg => {
        text = text.replace(/%s|%d/, String(arg));
      });
    }
    return text;
  }, [messages]);

  // Tab switching with auto-collapse on small screens
  const selectTab = useCallback((tab) => {
    setSelectedApp(null);
    setAppDetails(null);
    setCurrentTab(tab);
    if (window.innerWidth <= 560) {
      setShowSidebar(false);
    }
  }, []);

  // Sync sidebar visibility with main process
  useEffect(() => {
    window.ipc?.sidebarChanged?.(showSidebar);
  }, [showSidebar]);

  // Persist viewMode
  useEffect(() => {
    localStorage.setItem('appfinder-view-mode', viewMode);
  }, [viewMode]);

  // Initial localization & config
  useEffect(() => {
    if (!window.ipc) return;

    const fetchMessages = window.ipc.getMessages || window.ipc.getTranslations || window.ipc.getI18nCatalog;
    if (fetchMessages) {
      fetchMessages().then(applyMessages);
    }

    if (window.ipc.getConfig) {
      window.ipc.getConfig().then(cfg => {
        if (cfg?.alwaysShowStatusBar) setAlwaysShowStatusBar(true);
      });
    }
  }, [applyMessages]);

  // IPC Menu listeners for navigation and messages
  useEffect(() => {
    if (!window.ipc) return;
    const unsubs = [];

    if (window.ipc.onI18nChanged) {
      unsubs.push(window.ipc.onI18nChanged(() => {
        const fetchMessages = window.ipc.getMessages || window.ipc.getTranslations || window.ipc.getI18nCatalog;
        fetchMessages?.().then(applyMessages);
      }));
    }

    if (window.ipc.onConfigUpdated) {
      unsubs.push(window.ipc.onConfigUpdated(cfg => {
        if (cfg?.alwaysShowStatusBar !== undefined) setAlwaysShowStatusBar(!!cfg.alwaysShowStatusBar);
      }));
    }

    if (window.ipc.onSelectTab) {
      unsubs.push(window.ipc.onSelectTab(tab => {
        selectTab(tab);
      }));
    }

    if (window.ipc.onFocusSearch) {
      unsubs.push(window.ipc.onFocusSearch(() => {
        setSelectedApp(null);
        setShowSidebar(true);
        setTimeout(() => {
          const input = document.getElementById('search-input');
          if (input) {
            input.focus();
            input.select?.();
          }
        }, 50);
      }));
    }

    if (window.ipc.onSetOrder) {
      unsubs.push(window.ipc.onSetOrder(order => {
        // Will be picked up by useApps
      }));
    }

    if (window.ipc.onSetViewMode) {
      unsubs.push(window.ipc.onSetViewMode(mode => {
        setViewMode(mode);
      }));
    }

    if (window.ipc.onToggleSidebar) {
      unsubs.push(window.ipc.onToggleSidebar(visible => {
        setShowSidebar(visible);
      }));
    }

    return () => unsubs.forEach(u => u());
  }, [applyMessages, selectTab]);

  const shellState = {
    currentTab,
    setCurrentTab,
    selectTab,
    showSidebar,
    setShowSidebar,
    showTerminal,
    setShowTerminal,
    viewMode,
    setViewMode,
    selectedApp,
    setSelectedApp,
    appDetails,
    setAppDetails,
    loadingAppDetails,
    setLoadingAppDetails,
    alwaysShowStatusBar,
    setAlwaysShowStatusBar,
    slideIndex,
    setSlideIndex,
    messages,
    __,
    infoCacheRef,
  };

  return (
    <AppsProvider currentTab={currentTab} messages={messages}>
      <AppsTaskConnector shellState={shellState}>
        {children}
      </AppsTaskConnector>
    </AppsProvider>
  );
}

function AppsTaskConnector({ shellState, children }) {
  const apps = useApps();
  return (
    <TaskProvider
      items={apps.items}
      outdatedMap={apps.outdatedMap}
      refreshInstalledState={apps.refreshInstalledState}
      refreshUpdatesState={apps.refreshUpdatesState}
      __={shellState.__}
    >
      <ShellInner shellState={shellState}>
        {children}
      </ShellInner>
    </TaskProvider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return context;
}

export default useShell;
