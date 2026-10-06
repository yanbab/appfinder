import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getAppName, getIconDataUrl, extractTaskError, formatStatusBarMessage } from './utils';

const ShellContext = createContext(null);

const CHUNK_SIZE = 50;
const FEATURED_TOKENS = new Set([
  'onlyoffice', 'iina', 'visual-studio-code', 'figma', 'rectangle', 'spotify', 'raycast', 'obsidian', 'zed'
]);

function sortCategories(cats, messages) {
  const translate = (key) => (messages && messages[key] !== undefined) ? messages[key] : key;
  return [...cats].sort((a, b) => {
    if (a.name === 'other') return 1;
    if (b.name === 'other') return -1;
    if (a.name === 'font') return 1;
    if (b.name === 'font') return -1;
    return translate(a.displayName || '').localeCompare(translate(b.displayName || ''));
  });
}

function parseUpdatesMap(upds) {
  const casks = upds?.casks || (Array.isArray(upds) ? upds : []);
  const map = {};
  for (const item of casks) {
    const token = item.token || item.name;
    map[token] = {
      installedVersion: item.installed_versions?.[0] || item.installed_version || null,
      currentVersion: item.current_version || item.latest_version
    };
  }
  return map;
}

export function ShellProvider({ children }) {
  // Navigation & View
  const [currentTab, setCurrentTab] = useState('discover');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('popularity');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('appfinder-view-mode') || 'list');
  const [displayedCount, setDisplayedCount] = useState(CHUNK_SIZE);
  const [slideIndex, setSlideIndex] = useState(0);

  // Layout Panels
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth > 560);
  const [showTerminal, setShowTerminal] = useState(false);
  const [alwaysShowStatusBar, setAlwaysShowStatusBar] = useState(false);

  // App Details Drawer
  const [selectedApp, setSelectedApp] = useState(null);
  const [appDetails, setAppDetails] = useState(null);
  const [loadingAppDetails, setLoadingAppDetails] = useState(false);
  const infoCacheRef = useRef(new Map());

  // Catalog Data
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const rawCategoriesRef = useRef([]);
  const [installed, setInstalled] = useState([]);
  const [installedVersions, setInstalledVersions] = useState({});
  const [outdatedMap, setOutdatedMap] = useState({});
  const [lastCheckedTime, setLastCheckedTime] = useState(null);
  const [loading, setLoading] = useState(true);

  // Localization
  const [messages, setMessages] = useState({});

  // Tasks & Execution
  const [runningTasks, setRunningTasks] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [activeTaskToken, setActiveTaskToken] = useState(null);
  const [activeTaskAction, setActiveTaskAction] = useState(null);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const activeTaskRef = useRef({ id: null, token: null, action: null });
  activeTaskRef.current = { id: activeTaskId, token: activeTaskToken, action: activeTaskAction };
  const errorLogRef = useRef('');
  const updateQueueRef = useRef([]);
  const isUpdatingAllRef = useRef(false);

  // Terminal history & subscribers
  const terminalHistoryRef = useRef('');
  const terminalSubscribers = useRef(new Set());

  const registerTerminalSubscriber = useCallback((cb) => {
    terminalSubscribers.current.add(cb);
    if (terminalHistoryRef.current) cb(terminalHistoryRef.current);
    return () => terminalSubscribers.current.delete(cb);
  }, []);

  const clearTerminal = useCallback(() => {
    terminalHistoryRef.current = '';
    terminalSubscribers.current.forEach(cb => cb('', true));
  }, []);

  // Translation helper
  const __ = useCallback((key, ...args) => {
    let text = (messages && messages[key] !== undefined) ? messages[key] : key;
    if (args.length > 0) {
      args.forEach(arg => { text = text.replace(/%s|%d/, String(arg)); });
    }
    return text;
  }, [messages]);

  // Tab & search navigation
  const selectTab = useCallback((tab) => {
    setSelectedApp(null);
    setAppDetails(null);
    setCurrentTab(tab);
    setDisplayedCount(CHUNK_SIZE);
    if (window.innerWidth <= 560) setShowSidebar(false);
  }, []);

  const handleSearchChange = useCallback((text) => {
    setSearch(text);
    setDisplayedCount(CHUNK_SIZE);
    if (text && text.trim() && currentTab === 'discover') {
      setCurrentTab('all-apps');
    }
  }, [currentTab]);

  const loadMore = useCallback(() => {
    setDisplayedCount(prev => prev + CHUNK_SIZE);
  }, []);

  // Refresh helpers
  const refreshInstalledState = useCallback(async () => {
    try {
      const inst = await window.ipc?.getInstalled?.();
      setInstalled(Array.isArray(inst) ? inst : (inst?.tokens || inst?.list || []));
      setInstalledVersions(inst?.versions || {});
    } catch (_) {}
  }, []);

  const refreshUpdatesState = useCallback(async (force = false) => {
    try {
      const upds = await window.ipc?.getUpdates?.(force);
      setOutdatedMap(parseUpdatesMap(upds));
      setLastCheckedTime(new Date());
    } catch (_) {}
  }, []);

  // Task execution
  const executeTask = useCallback((action, token, zap = false, remainingCount = null) => {
    clearTerminal();
    errorLogRef.current = '';
    const taskId = `cask-${action}-${token || Date.now()}`;
    setActiveTaskId(taskId);
    setActiveTaskToken(token);
    setActiveTaskAction(action);
    if (token) setRunningTasks(prev => ({ ...prev, [token]: action }));

    const cask = items.find(c => c.token === token);
    const name = cask ? getAppName(cask) : token;
    let title = action === 'install' ? `Installing ${name}...`
      : action === 'uninstall' ? `Deleting ${name}...`
      : action === 'upgrade' ? `Updating ${name}...`
      : `${action}...`;

    if (remainingCount !== null && remainingCount > 0) {
      title = `${action === 'upgrade' ? 'Updating' : 'Installing'} ${name}... (${remainingCount} remaining)`;
    }

    setDrawerTitle(title);
    window.ipc?.runAction?.(taskId, action, token, zap, name);
  }, [items, clearTerminal]);

  const processNextQueuedUpdate = useCallback(() => {
    if (!isUpdatingAllRef.current || updateQueueRef.current.length === 0) {
      isUpdatingAllRef.current = false;
      updateQueueRef.current = [];
      setDrawerTitle('');
      return;
    }
    const nextToken = updateQueueRef.current.shift();
    executeTask('upgrade', nextToken, false, updateQueueRef.current.length + 1);
  }, [executeTask]);

  const startAction = useCallback(async (action, token, appName) => {
    if (action === 'open') {
      const cask = items.find(c => c.token === token);
      const app = appName || (cask ? (cask.app || cask.name) : null);
      window.ipc?.openApp?.(token, app);
      return;
    }

    if (activeTaskRef.current.id) {
      alert(__('Another operation is currently running. Please wait.'));
      return;
    }

    if (action === 'upgrade-all') {
      const outdatedTokens = Object.keys(outdatedMap);
      if (outdatedTokens.length === 0) return;
      isUpdatingAllRef.current = true;
      updateQueueRef.current = [...outdatedTokens];
      processNextQueuedUpdate();
      return;
    }

    if (action === 'refresh' || action === 'cleanup' || action === 'fetch') {
      clearTerminal();
      const taskId = `cask-${action}-${Date.now()}`;
      setActiveTaskId(taskId);
      setActiveTaskToken(action);
      setActiveTaskAction(action);
      setRunningTasks(prev => ({ ...prev, [action]: action }));
      setDrawerTitle(
        action === 'refresh' ? __('Checking for updates...')
        : action === 'fetch' ? __('Checking for new applications...')
        : __('Cleaning up Homebrew cache...')
      );
      if (action === 'cleanup') setShowTerminal(true);
      window.ipc?.runAction?.(taskId, action, '', false);
      return;
    }

    let zap = false;
    if (action === 'uninstall') {
      const cask = items.find(c => c.token === token);
      const name = cask ? getAppName(cask) : token;
      if (window.ipc?.showMessage) {
        const config = (await window.ipc?.getConfig?.()) || {};
        const title = __('Confirm Delete');
        const rawMsg = __('Are you sure you want to delete %s?') || 'Are you sure you want to delete %s?';
        const message = rawMsg.includes('%s') ? rawMsg.replace('%s', name) : `Are you sure you want to delete ${name}?`;
        const icon = cask?.iconUrl ? await getIconDataUrl(cask.iconUrl) : null;

        const response = await window.ipc.showMessage({
          type: 'question',
          buttons: [__('Delete'), __('Cancel')],
          defaultId: 0,
          cancelId: 1,
          title,
          message,
          icon,
          checkboxLabel: __('Delete settings and data'),
          checkboxChecked: !!config.zap,
        });

        if (response.response !== 0) return;
        zap = !!response.checkboxChecked;
        await window.ipc.updateConfig({ zap });
      } else if (!window.confirm(`Are you sure you want to delete ${name}?`)) {
        return;
      }
    }

    executeTask(action, token, zap);
  }, [items, outdatedMap, clearTerminal, executeTask, processNextQueuedUpdate, __]);

  const cancelAction = useCallback(() => {
    const currentId = activeTaskRef.current.id;
    if (currentId) {
      window.ipc?.writePtyInput?.(currentId, '\x03');
      window.ipc?.cancelAction?.(currentId);
    }
    isUpdatingAllRef.current = false;
    updateQueueRef.current = [];
    setShowPasswordModal(false);
    setDrawerTitle('');
  }, []);

  const submitPassword = useCallback((pass) => {
    setShowPasswordModal(false);
    if (activeTaskRef.current.id) {
      window.ipc?.writePtyInput?.(activeTaskRef.current.id, (pass || '') + '\r');
    }
  }, []);

  const cancelPassword = useCallback(() => {
    cancelAction();
  }, [cancelAction]);

  // App details drawer
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
    } catch (_) {}
    setLoadingAppDetails(false);
  }, []);

  const closeAppInfo = useCallback(() => {
    setSelectedApp(null);
    setAppDetails(null);
  }, []);

  // Hero carousel
  const featuredItems = useMemo(() => items.filter(c => FEATURED_TOKENS.has(c.token)), [items]);

  const nextSlide = useCallback(() => {
    if (featuredItems.length <= 1) return;
    setSlideIndex(prev => (prev + 1) % featuredItems.length);
  }, [featuredItems.length]);

  const prevSlide = useCallback(() => {
    if (featuredItems.length <= 1) return;
    setSlideIndex(prev => (prev - 1 + featuredItems.length) % featuredItems.length);
  }, [featuredItems.length]);

  // Initial load
  useEffect(() => {
    if (!window.ipc) return;

    const fetchMessages = window.ipc.getMessages || window.ipc.getTranslations || window.ipc.getI18nCatalog;
    fetchMessages?.().then(msgs => { if (msgs) setMessages(msgs); });

    window.ipc.getConfig?.().then(cfg => {
      if (cfg?.alwaysShowStatusBar) setAlwaysShowStatusBar(true);
    });

    window.ipc.getCategories?.().then(cats => {
      rawCategoriesRef.current = cats || [];
      setCategories(sortCategories(cats || [], messages));
    });

    window.ipc.getCasks?.().then(casks => {
      setItems(casks || []);
      setLoading(false);
    });

    refreshInstalledState();
    refreshUpdatesState(false);
  }, [refreshInstalledState, refreshUpdatesState]);

  // Sync categories when language messages change
  useEffect(() => {
    if (rawCategoriesRef.current.length > 0) {
      setCategories(sortCategories(rawCategoriesRef.current, messages));
    }
  }, [messages]);

  // Sync sidebar visibility with main process
  useEffect(() => {
    window.ipc?.sidebarChanged?.(showSidebar);
  }, [showSidebar]);

  // Persist viewMode
  useEffect(() => {
    localStorage.setItem('appfinder-view-mode', viewMode);
  }, [viewMode]);

  // Setup IPC listeners
  useEffect(() => {
    if (!window.ipc) return;
    const unsubs = [];

    if (window.ipc.onI18nChanged) {
      unsubs.push(window.ipc.onI18nChanged(() => {
        const fetchMessages = window.ipc.getMessages || window.ipc.getTranslations;
        fetchMessages?.().then(msgs => { if (msgs) setMessages(msgs); });
      }));
    }

    if (window.ipc.onConfigUpdated) {
      unsubs.push(window.ipc.onConfigUpdated(cfg => {
        if (cfg?.alwaysShowStatusBar !== undefined) setAlwaysShowStatusBar(!!cfg.alwaysShowStatusBar);
      }));
    }

    if (window.ipc.onSelectTab) {
      unsubs.push(window.ipc.onSelectTab(selectTab));
    }

    if (window.ipc.onFocusSearch) {
      unsubs.push(window.ipc.onFocusSearch(() => {
        setSelectedApp(null);
        setShowSidebar(true);
        setTimeout(() => document.getElementById('search-input')?.focus(), 50);
      }));
    }

    if (window.ipc.onSetOrder) {
      unsubs.push(window.ipc.onSetOrder(setOrder));
    }

    if (window.ipc.onSetViewMode) {
      unsubs.push(window.ipc.onSetViewMode(setViewMode));
    }

    if (window.ipc.onToggleSidebar) {
      unsubs.push(window.ipc.onToggleSidebar(setShowSidebar));
    }

    if (window.ipc.onUpdatesRefreshed) {
      unsubs.push(window.ipc.onUpdatesRefreshed(data => {
        setOutdatedMap(parseUpdatesMap(data));
        setLastCheckedTime(new Date());
      }));
    }

    if (window.ipc.onDataRefreshed) {
      unsubs.push(window.ipc.onDataRefreshed(() => {
        window.ipc.getCasks?.().then(casks => setItems(casks || []));
        window.ipc.getCategories?.().then(cats => {
          rawCategoriesRef.current = cats || [];
          setCategories(sortCategories(cats || [], messages));
        });
      }));
    }

    if (window.ipc.onTaskLog) {
      unsubs.push(window.ipc.onTaskLog(data => {
        const text = data.text || '';
        terminalHistoryRef.current = text;
        terminalSubscribers.current.forEach(cb => cb(text));
        errorLogRef.current = text;
        if (data.line) {
          const statusMsg = formatStatusBarMessage(data.line);
          if (statusMsg) setDrawerTitle(statusMsg);
        }
      }));
    }

    if (window.ipc.onTaskPrompt) {
      unsubs.push(window.ipc.onTaskPrompt(({ type }) => {
        if (type === 'password') setShowPasswordModal(true);
      }));
    }

    if (window.ipc.onStatusLog) {
      unsubs.push(window.ipc.onStatusLog(text => {
        if (!text) return;
        terminalHistoryRef.current = terminalHistoryRef.current ? `${terminalHistoryRef.current}\n${text}` : text;
        terminalSubscribers.current.forEach(cb => cb(terminalHistoryRef.current));
      }));
    }

    if (window.ipc.onTaskComplete) {
      unsubs.push(window.ipc.onTaskComplete(async data => {
        const finishedToken = activeTaskRef.current.token;
        const finishedAction = activeTaskRef.current.action;
        const errorLog = errorLogRef.current;

        setActiveTaskId(null);
        setActiveTaskToken(null);
        setActiveTaskAction(null);
        setShowPasswordModal(false);

        setRunningTasks(prev => {
          const copy = { ...prev };
          if (finishedToken) delete copy[finishedToken];
          return copy;
        });

        if (data.code === 0) {
          refreshInstalledState();
          refreshUpdatesState(true);
          if (isUpdatingAllRef.current) {
            processNextQueuedUpdate();
            return;
          }
          setDrawerTitle('');
        } else {
          isUpdatingAllRef.current = false;
          updateQueueRef.current = [];
          if (!data.cancelled && data.code !== 130) {
            const rawErr = data.error || (errorLog ? extractTaskError(errorLog, finishedToken) : null);
            const errDetail = rawErr || __('No error details recorded.');
            const alertTitle = __(`%s ${finishedAction === 'install' ? 'installation' : finishedAction === 'uninstall' ? 'removal' : finishedAction === 'upgrade' ? 'update' : 'cleanup'} failed`, finishedToken || 'Task');
            window.ipc?.showErrorDialog?.(alertTitle, errDetail);
          }
          setDrawerTitle('');
        }
      }));
    }

    if (window.ipc.onClearCache) {
      unsubs.push(window.ipc.onClearCache(() => startAction('cleanup')));
    }

    return () => unsubs.forEach(u => u());
  }, [messages, selectTab, startAction, refreshInstalledState, refreshUpdatesState, processNextQueuedUpdate, __]);

  // Categories lookup map
  const categoriesMap = useMemo(() => {
    const map = new Map();
    for (const c of categories) {
      if (c.name) map.set(c.name.toLowerCase(), c);
      if (c.displayName) map.set(c.displayName.toLowerCase(), c);
    }
    return map;
  }, [categories]);

  // Filtered and sorted catalog items
  const filteredItems = useMemo(() => {
    let list = [];
    const tab = currentTab;

    if (tab === 'discover') {
      list = items.filter(c => c.count > 0);
    } else if (tab === 'all-apps') {
      list = items.filter(c => c.category !== 'font');
    } else if (tab === 'installed') {
      list = items.filter(c => installed.includes(c.token));
    } else if (tab === 'updates') {
      list = items.filter(c => outdatedMap[c.token] !== undefined);
    } else {
      const catObj = categoriesMap.get(tab);
      const targetName = tab.toLowerCase();
      const targetDisplay = (catObj?.displayName || '').toLowerCase();

      list = items.filter(item => {
        const itemCats = [item.category, item.secondCategory, item.thirdCategory, item.secondaryCategory, ...(item.categories || [])];
        return itemCats.some(c => {
          if (!c) return false;
          const s = String(c).toLowerCase().trim();
          if (s === targetName || (targetDisplay && s === targetDisplay)) return true;
          const m = categoriesMap.get(s);
          return m && (m.name?.toLowerCase() === targetName || (targetDisplay && m.displayName?.toLowerCase() === targetDisplay));
        });
      });
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.token && c.token.toLowerCase().includes(q)) ||
        (c.app && c.app.toLowerCase().includes(q)) ||
        (c.desc && c.desc.toLowerCase().includes(q))
      );
      list.sort((a, b) => {
        const aName = (a.name || a.token).toLowerCase();
        const bName = (b.name || b.token).toLowerCase();
        const aStarts = aName.startsWith(q) || a.token.toLowerCase().startsWith(q);
        const bStarts = bName.startsWith(q) || b.token.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        if (order === 'popularity') return (b.count || 0) - (a.count || 0);
        if (order === 'date') return (b.added || '').localeCompare(a.added || '');
        return aName.localeCompare(bName);
      });
    } else {
      if (order === 'popularity') {
        list.sort((a, b) => (b.count || 0) - (a.count || 0));
      } else if (order === 'date') {
        list.sort((a, b) => (b.added || '').localeCompare(a.added || ''));
      } else if (order === 'name') {
        list.sort((a, b) => (a.name || a.token).localeCompare(b.name || b.token));
      }
    }

    return list;
  }, [items, currentTab, search, order, installed, outdatedMap, categoriesMap]);

  const displayedItems = useMemo(() => filteredItems.slice(0, displayedCount), [filteredItems, displayedCount]);

  const topInstalledItems = useMemo(() => {
    const sorted = items
      .filter(c => c.count > 0 && (c.icon || c.iconUrl) && c.category !== 'font' && !FEATURED_TOKENS.has(c.token))
      .sort((a, b) => (b.count || 0) - (a.count || 0));

    const top = [];
    const seen = new Set();
    for (const item of sorted) {
      const cat = item.category || 'other';
      if (!seen.has(cat)) {
        seen.add(cat);
        top.push(item);
        if (top.length >= 6) break;
      }
    }
    return top;
  }, [items]);

  const recentItems = useMemo(() => {
    const sorted = items
      .filter(c => c.added && (c.icon || c.iconUrl) && c.category !== 'font' && !FEATURED_TOKENS.has(c.token))
      .sort((a, b) => (b.added || '').localeCompare(a.added || ''));

    const top = [];
    const seen = new Set();
    for (const item of sorted) {
      const cat = item.category || 'other';
      if (!seen.has(cat)) {
        seen.add(cat);
        top.push(item);
        if (top.length >= 6) break;
      }
    }
    return top;
  }, [items]);

  const getPageTitle = useCallback(() => {
    if (currentTab === 'discover') return __('Explore');
    if (currentTab === 'all-apps') return __('All Apps');
    if (currentTab === 'installed') return __('Installed');
    if (currentTab === 'updates') return __('Updates');
    const cat = categories.find(c => c.name === currentTab);
    return cat ? __(cat.displayName) : __('Explore');
  }, [currentTab, categories, __]);

  const value = {
    // Navigation & Layout
    currentTab,
    setCurrentTab,
    selectTab,
    search,
    setSearch: handleSearchChange,
    order,
    setOrder,
    viewMode,
    setViewMode,
    showSidebar,
    setShowSidebar,
    toggleSidebar: () => setShowSidebar(prev => !prev),
    showTerminal,
    setShowTerminal,
    toggleTerminal: () => setShowTerminal(prev => !prev),
    showDrawer: Boolean(activeTaskId),
    alwaysShowStatusBar,

    // App Details
    selectedApp,
    appDetails,
    loadingAppDetails,
    openAppInfo,
    closeAppInfo,

    // Catalog & Collections
    items,
    setItems,
    categories,
    categoriesMap,
    installed,
    installedVersions,
    outdatedMap,
    updatesCount: Object.keys(outdatedMap).length,
    allAppsCount: items.filter(c => c.category !== 'font').length,
    filteredItems,
    displayedItems,
    filteredCount: filteredItems.length,
    loadMore,
    loading,
    lastCheckedTime,

    // Discover Hero
    featuredItems,
    topInstalledItems,
    recentItems,
    slideIndex,
    setSlideIndex,
    nextSlide,
    prevSlide,
    getPageTitle,

    // Tasks & Execution
    runningTasks,
    activeTaskId,
    activeTaskToken,
    activeTaskAction,
    drawerTitle,
    setDrawerTitle,
    startAction,
    cancelAction,
    showPasswordModal,
    submitPassword,
    cancelPassword,
    registerTerminalSubscriber,
    clearTerminal,

    // Localization
    messages,
    catalog: messages,
    __,
  };

  return (
    <ShellContext.Provider value={value}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) throw new Error('useShell must be used within a ShellProvider');
  return context;
}

export const useApps = useShell;
export const useTask = useShell;
export default useShell;
