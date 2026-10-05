import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getAppName, stripAnsi, detectPrompt, getIconDataUrl, extractTaskError, formatStatusBarMessage } from './utils';

const ShellContext = createContext(null);

const CHUNK_SIZE = 50;
const FEATURED_TOKENS = new Set([
  'onlyoffice', 'iina', 'visual-studio-code', 'figma', 'rectangle', 'spotify', 'raycast', 'obsidian', 'zed'
]);

function sortCategories(cats, currentCatalog) {
  const translate = (key) => (currentCatalog && currentCatalog[key] !== undefined) ? currentCatalog[key] : key;
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
  // Navigation & Search
  const [currentTab, setCurrentTab] = useState('discover');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('popularity');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('appfinder-view-mode') || 'list');
  const [slideIndex, setSlideIndex] = useState(0);

  // UI Panels
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth > 560);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [alwaysShowStatusBar, setAlwaysShowStatusBar] = useState(false);

  // App Details
  const [selectedApp, setSelectedApp] = useState(null);
  const [appDetails, setAppDetails] = useState(null);
  const [loadingAppDetails, setLoadingAppDetails] = useState(false);
  const infoCache = useRef(new Map());

  // Data & Collections
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  itemsRef.current = items;

  const [categories, setCategories] = useState([]);
  const rawCategoriesRef = useRef([]);
  const [installed, setInstalled] = useState([]);
  const [installedVersions, setInstalledVersions] = useState({});
  const [outdatedMap, setOutdatedMap] = useState({});
  const [lastCheckedTime, setLastCheckedTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState({});
  const catalogRef = useRef({});
  catalogRef.current = catalog;

  // Tasks & Execution
  const [runningTasks, setRunningTasks] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [activeTaskToken, setActiveTaskToken] = useState(null);
  const [activeTaskAction, setActiveTaskAction] = useState(null);
  const activeTaskRef = useRef({ id: null, token: null, action: null });
  activeTaskRef.current = { id: activeTaskId, token: activeTaskToken, action: activeTaskAction };

  const [drawerTitle, setDrawerTitle] = useState('');
  const [taskProgressPercent, setTaskProgressPercent] = useState(null);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const activeTaskPasswordRef = useRef(null);
  const lastPasswordSentTimeRef = useRef(0);
  const lastPasswordAttemptFailedRef = useRef(false);
  const activeTaskErrorLogRef = useRef('');
  const updateQueueRef = useRef([]);
  const isUpdatingAllRef = useRef(false);
  const batchActionRef = useRef('upgrade');

  // Pagination
  const [displayedCount, setDisplayedCount] = useState(CHUNK_SIZE);

  // Terminal log listener & history buffer
  const terminalHistoryRef = useRef('');
  const terminalLogSubscribers = useRef(new Set());

  const registerTerminalSubscriber = useCallback((cb) => {
    terminalLogSubscribers.current.add(cb);
    if (terminalHistoryRef.current) {
      cb(terminalHistoryRef.current);
    }
    return () => terminalLogSubscribers.current.delete(cb);
  }, []);

  const clearTerminal = useCallback(() => {
    terminalHistoryRef.current = '';
    terminalLogSubscribers.current.forEach((cb) => cb('', true));
  }, []);

  // i18n
  const __ = useCallback((key, defaultValue) => {
    if (!catalog) return defaultValue || key;
    return catalog[key] !== undefined ? catalog[key] : (defaultValue || key);
  }, [catalog]);
  const translateRef = useRef(__);
  translateRef.current = __;

  const applyTranslations = useCallback((cat) => {
    const newCat = cat || {};
    catalogRef.current = newCat;
    setCatalog(newCat);
    document.documentElement.dir = newCat?._languageDirection === 'rtl' ? 'rtl' : 'ltr';
    if (rawCategoriesRef.current.length > 0) {
      setCategories(sortCategories(rawCategoriesRef.current, newCat));
    }
  }, []);

  // Dynamic Document Title
  const getPageTitle = useCallback(() => {
    if (currentTab === 'discover') return __('Explore');
    if (currentTab === 'all-apps') return __('All Apps');
    if (currentTab === 'installed') return __('Installed');
    if (currentTab === 'updates') return __('Updates');
    const cat = categories.find(c => c.name === currentTab);
    return cat ? __(cat.displayName) : __('Explore');
  }, [currentTab, categories, __]);

  useEffect(() => {
    const categoryName = getPageTitle();
    document.title = categoryName ? `AppFinder - ${categoryName}` : 'AppFinder';
  }, [getPageTitle]);

  // Persist viewMode
  useEffect(() => {
    localStorage.setItem('appfinder-view-mode', viewMode);
  }, [viewMode]);

  // Sync sidebar visibility with main process
  useEffect(() => {
    window.ipc?.sidebarChanged?.(showSidebar);
  }, [showSidebar]);

  // Categories Map
  const categoriesMap = useMemo(() => {
    const map = new Map();
    categories.forEach(c => map.set(c.name, c));
    return map;
  }, [categories]);

  // Counts
  const allAppsCount = useMemo(() => items.filter(c => c.category !== 'font').length, [items]);
  const updatesCount = useMemo(() => Object.keys(outdatedMap).length, [outdatedMap]);

  // Info Drawer controls
  const openAppInfo = useCallback((item) => {
    if (!item) return;
    setSelectedApp(item);
    const token = item.token;
    const cached = infoCache.current.get(token);

    if (cached) {
      setAppDetails(cached);
      setLoadingAppDetails(false);
    } else {
      setAppDetails(null);
      setLoadingAppDetails(true);

      window.ipc?.getCaskInfo?.(token).then(details => {
        if (details) {
          infoCache.current.set(token, details);
          setAppDetails(prev => (item.token === token ? details : prev));
        }
      }).finally(() => {
        setLoadingAppDetails(false);
      });
    }
  }, []);

  const closeAppInfo = useCallback(() => {
    setSelectedApp(null);
    setAppDetails(null);
  }, []);
  const closeAppInfoRef = useRef(closeAppInfo);
  closeAppInfoRef.current = closeAppInfo;

  // Tab switching with search redirect
  const selectTab = useCallback((tab) => {
    setCurrentTab(tab);
    setDisplayedCount(CHUNK_SIZE);
    if (window.innerWidth <= 560) {
      setShowSidebar(false);
    }
  }, []);

  const handleSearchChange = useCallback((val) => {
    setSearch(val);
    setDisplayedCount(CHUNK_SIZE);
    if (val && val.trim() && currentTab === 'discover') {
      setCurrentTab('all-apps');
    }
  }, [currentTab]);

  // Execute task helper
  const executeTask = useCallback((action, token, zap = false, remainingCount = null) => {
    clearTerminal();
    setTaskProgressPercent(null);
    activeTaskErrorLogRef.current = '';
    const taskId = `cask-${action}-${token}-${Date.now()}`;
    setActiveTaskId(taskId);
    setActiveTaskToken(token);
    setActiveTaskAction(action);
    setRunningTasks(prev => ({ ...prev, [token]: action }));

    const cask = itemsRef.current.find(c => c.token === token);
    const name = cask ? getAppName(cask) : token;
    let title = action === 'install' ? `Installing ${name}...`
      : action === 'uninstall' ? `Deleting ${name}...`
        : action === 'upgrade' ? `Updating ${name}...`
          : `${action}...`;

    if (remainingCount !== null && remainingCount > 0) {
      title = `${action === 'upgrade' ? 'Updating' : 'Installing'} ${name}... (${remainingCount} remaining)`;
    }

    setDrawerTitle(title);
    setShowDrawer(true);

    window.ipc?.runAction?.(taskId, action, token, zap, name);
  }, [clearTerminal]);
  const executeTaskRef = useRef(executeTask);
  executeTaskRef.current = executeTask;

  // Process next update in batch queue
  const processNextQueuedUpdate = useCallback(() => {
    if (!isUpdatingAllRef.current || updateQueueRef.current.length === 0) {
      isUpdatingAllRef.current = false;
      updateQueueRef.current = [];
      setShowDrawer(false);
      setDrawerTitle('');
      return;
    }
    const nextToken = updateQueueRef.current.shift();
    const action = batchActionRef.current || 'upgrade';
    executeTaskRef.current(action, nextToken, false, updateQueueRef.current.length + 1);
  }, []);
  const processNextQueuedUpdateRef = useRef(processNextQueuedUpdate);
  processNextQueuedUpdateRef.current = processNextQueuedUpdate;

  // Start Action
  const startAction = useCallback(async (action, token, appName) => {
    if (action === 'open') {
      const cask = itemsRef.current.find(c => c.token === token);
      const app = appName || (cask ? (cask.app || cask.name) : null);
      try {
        await window.ipc?.openApp?.(token, app);
      } catch (e) {
        console.error('Failed to open app:', e);
      }
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
      batchActionRef.current = 'upgrade';
      updateQueueRef.current = [...outdatedTokens];
      processNextQueuedUpdateRef.current();
      return;
    }

    if (action === 'refresh' || action === 'cleanup') {
      clearTerminal();
      const taskId = `cask-${action}-${Date.now()}`;
      setActiveTaskId(taskId);
      setActiveTaskToken(action);
      setActiveTaskAction(action);
      setRunningTasks(prev => ({ ...prev, [action]: action }));
      setDrawerTitle(action === 'refresh' ? __('Checking for updates...') : __('Cleaning up Homebrew cache...'));
      setShowDrawer(true);
      if (action === 'cleanup') setShowTerminal(true);
      window.ipc?.runAction?.(taskId, action, '', false);
      return;
    }

    let zap = false;
    if (action === 'uninstall') {
      const cask = itemsRef.current.find(c => c.token === token);
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
          detail: '',
          icon,
          checkboxLabel: __('Delete settings and data'),
          checkboxChecked: !!config.zap,
        });

        if (response.response !== 0) return;
        zap = !!response.checkboxChecked;
        await window.ipc.updateConfig({ zap });
      } else {
        const confirmed = window.confirm(`Are you sure you want to delete ${name}?`);
        if (!confirmed) return;
      }
    }

    executeTaskRef.current(action, token, zap);
  }, [outdatedMap, clearTerminal, __]);
  const startActionRef = useRef(startAction);
  startActionRef.current = startAction;

  const cancelAction = useCallback(() => {
    const currentId = activeTaskRef.current.id;
    if (currentId) {
      window.ipc?.writePtyInput?.(currentId, '\x03');
      window.ipc?.cancelAction?.(currentId);
    }
    isUpdatingAllRef.current = false;
    updateQueueRef.current = [];
    setShowPasswordModal(false);
    setIsWaitingForInput(false);
    setShowDrawer(false);
    setDrawerTitle('');
  }, []);

  const submitPassword = useCallback((pass) => {
    activeTaskPasswordRef.current = pass || '';
    lastPasswordAttemptFailedRef.current = false;
    lastPasswordSentTimeRef.current = Date.now();
    setIsWaitingForInput(false);
    setShowPasswordModal(false);
    if (activeTaskRef.current.id) {
      window.ipc?.writePtyInput?.(activeTaskRef.current.id, (pass || '') + '\r');
    }
  }, []);

  const cancelPassword = useCallback(() => {
    cancelAction();
  }, [cancelAction]);

  // Refresh helpers
  const refreshInstalledState = useCallback(async () => {
    if (!window.ipc?.getInstalled) return;
    try {
      const inst = await window.ipc.getInstalled();
      setInstalled(Array.isArray(inst) ? inst : (inst?.tokens || inst?.list || []));
      setInstalledVersions(inst?.versions || {});
    } catch (e) {
      console.error('Failed refreshing installed state:', e);
    }
  }, []);

  const refreshUpdatesState = useCallback(async (force = false) => {
    if (!window.ipc?.getUpdates) return;
    try {
      const upds = await window.ipc.getUpdates(force);
      setOutdatedMap(parseUpdatesMap(upds));
      setLastCheckedTime(new Date());
    } catch (e) {
      console.error('Failed refreshing updates state:', e);
    }
  }, []);

  // Filtered and Sorted Items
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

  // Discover View memoized lists
  const featuredItems = useMemo(() => items.filter(c => FEATURED_TOKENS.has(c.token)), [items]);

  const nextSlide = useCallback(() => {
    if (featuredItems.length <= 1) return;
    setSlideIndex(prev => (prev + 1) % featuredItems.length);
  }, [featuredItems.length]);

  const prevSlide = useCallback(() => {
    if (featuredItems.length <= 1) return;
    setSlideIndex(prev => (prev - 1 + featuredItems.length) % featuredItems.length);
  }, [featuredItems.length]);

  const topInstalledItems = useMemo(() => {
    const sorted = items
      .filter(c => c.count > 0 && (c.icon || c.iconUrl) && c.category !== 'font' && !FEATURED_TOKENS.has(c.token))
      .sort((a, b) => (b.count || 0) - (a.count || 0));

    const top = [];
    const seenCategories = new Set();
    for (const item of sorted) {
      const cat = item.category || 'other';
      if (!seenCategories.has(cat)) {
        seenCategories.add(cat);
        top.push(item);
        if (top.length >= 6) break;
      }
    }
    return top;
  }, [items]);

  const loadMore = useCallback(() => {
    setDisplayedCount(prev => prev + CHUNK_SIZE);
  }, []);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, displayedCount);
  }, [filteredItems, displayedCount]);

  // Load initial data on mount
  useEffect(() => {
    if (!window.ipc) return;

    if (window.ipc.getTranslations) {
      window.ipc.getTranslations().then(applyTranslations);
    }

    if (window.ipc.getConfig) {
      window.ipc.getConfig().then(cfg => {
        if (cfg?.alwaysShowStatusBar) setAlwaysShowStatusBar(true);
      });
    }

    if (window.ipc.getCategories) {
      window.ipc.getCategories().then(cats => {
        const list = cats || [];
        rawCategoriesRef.current = list;
        setCategories(sortCategories(list, catalogRef.current));
      });
    }

    if (window.ipc.getCasks) {
      window.ipc.getCasks().then(casks => {
        setItems(casks || []);
        setLoading(false);
      });
    }

    refreshInstalledState();
    refreshUpdatesState(false);
  }, [applyTranslations, refreshInstalledState, refreshUpdatesState]);

  // Setup all IPC event listeners once on mount
  useEffect(() => {
    if (!window.ipc) return;
    const unsubs = [];

    // 1. App configuration & translations
    if (window.ipc.onI18nChanged) {
      unsubs.push(window.ipc.onI18nChanged(() => {
        window.ipc.getTranslations?.().then(applyTranslations);
      }));
    }

    if (window.ipc.onConfigUpdated) {
      unsubs.push(window.ipc.onConfigUpdated(cfg => {
        if (cfg?.alwaysShowStatusBar !== undefined) setAlwaysShowStatusBar(!!cfg.alwaysShowStatusBar);
      }));
    }

    if (window.ipc.onUpdatesRefreshed) {
      unsubs.push(window.ipc.onUpdatesRefreshed(data => {
        setOutdatedMap(parseUpdatesMap(data));
        setLastCheckedTime(new Date());
      }));
    }

    // 2. Navigation & View Menu triggers
    if (window.ipc.onSelectTab) {
      unsubs.push(window.ipc.onSelectTab(tab => {
        closeAppInfoRef.current();
        setCurrentTab(tab);
        setDisplayedCount(CHUNK_SIZE);
      }));
    }

    if (window.ipc.onFocusSearch) {
      unsubs.push(window.ipc.onFocusSearch(() => {
        closeAppInfoRef.current();
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

    if (window.ipc.onCheckUpdates) {
      unsubs.push(window.ipc.onCheckUpdates(() => {
        closeAppInfoRef.current();
        setCurrentTab('updates');
        startActionRef.current('refresh', 'refresh');
      }));
    }

    if (window.ipc.onSetOrder) {
      unsubs.push(window.ipc.onSetOrder(newOrder => {
        setCurrentTab(prev => (prev === 'discover' || prev === 'updates') ? 'all-apps' : prev);
        setOrder(newOrder);
      }));
    }

    if (window.ipc.onSetViewMode) {
      unsubs.push(window.ipc.onSetViewMode(newMode => {
        setViewMode(newMode);
      }));
    }

    if (window.ipc.onToggleSidebar) {
      unsubs.push(window.ipc.onToggleSidebar(show => {
        setShowSidebar(prev => (typeof show === 'boolean' ? show : !prev));
      }));
    }

    if (window.ipc.onImportCasks) {
      unsubs.push(window.ipc.onImportCasks(casksToInstall => {
        if (!Array.isArray(casksToInstall) || casksToInstall.length === 0) return;
        closeAppInfoRef.current();
        isUpdatingAllRef.current = true;
        batchActionRef.current = 'install';
        updateQueueRef.current = [...casksToInstall];
        processNextQueuedUpdateRef.current();
      }));
    }

    // 3. Task runner prompts & logs
    if (window.ipc.onTaskPrompt) {
      unsubs.push(window.ipc.onTaskPrompt(data => {
        if (data.type === 'password') {
          if (data.isRetry) {
            lastPasswordAttemptFailedRef.current = true;
            activeTaskPasswordRef.current = null;
          }
          if (Date.now() - lastPasswordSentTimeRef.current < 1500) return;
          if (activeTaskPasswordRef.current && !lastPasswordAttemptFailedRef.current) {
            lastPasswordSentTimeRef.current = Date.now();
            window.ipc.writePtyInput(data.taskId || activeTaskRef.current.id, activeTaskPasswordRef.current + '\r');
            setIsWaitingForInput(false);
            return;
          }
          setIsWaitingForInput(true);
          setShowPasswordModal(true);
        }
      }));
    }

    if (window.ipc.onTaskLog) {
      unsubs.push(window.ipc.onTaskLog(data => {
        const text = data.text || '';
        terminalHistoryRef.current = text;
        terminalLogSubscribers.current.forEach(cb => cb(text));
        activeTaskErrorLogRef.current = text;

        if (data.line) {
          const statusMsg = formatStatusBarMessage(data.line);
          if (statusMsg) {
            setDrawerTitle(statusMsg);
          }
        }

        const promptInfo = detectPrompt(data.raw || text);
        if (promptInfo.isRetry) {
          lastPasswordAttemptFailedRef.current = true;
          activeTaskPasswordRef.current = null;
        }

        if (promptInfo.isPasswordPrompt) {
          if (Date.now() - lastPasswordSentTimeRef.current < 1500) return;
          if (activeTaskPasswordRef.current && !lastPasswordAttemptFailedRef.current) {
            lastPasswordSentTimeRef.current = Date.now();
            window.ipc.writePtyInput(activeTaskRef.current.id, activeTaskPasswordRef.current + '\r');
            setIsWaitingForInput(false);
            return;
          }
          setIsWaitingForInput(true);
          setShowPasswordModal(true);
        }
      }));
    }

    if (window.ipc.onStatusLog) {
      unsubs.push(window.ipc.onStatusLog(text => {
        if (!text) return;
        terminalHistoryRef.current = terminalHistoryRef.current ? `${terminalHistoryRef.current}\n${text}` : text;
        terminalLogSubscribers.current.forEach(cb => cb(terminalHistoryRef.current));
      }));
    }

    // 4. Task completion
    if (window.ipc.onTaskComplete) {
      unsubs.push(window.ipc.onTaskComplete(async data => {
        const finishedToken = activeTaskRef.current.token;
        const finishedAction = activeTaskRef.current.action;
        const errorLog = activeTaskErrorLogRef.current;

        setActiveTaskId(null);
        setActiveTaskToken(null);
        setActiveTaskAction(null);
        setTaskProgressPercent(null);
        activeTaskPasswordRef.current = null;
        lastPasswordAttemptFailedRef.current = false;
        lastPasswordSentTimeRef.current = 0;
        activeTaskErrorLogRef.current = '';
        setIsWaitingForInput(false);
        setShowDrawer(false);
        setDrawerTitle('');

        setRunningTasks(prev => {
          const next = { ...prev };
          delete next[finishedToken];
          return next;
        });

        const isSuccess = data.code === 0;
        const isCancelled = data.cancelled;

        const exitMsg = isCancelled
          ? '\r\n\x1b[31mProcess cancelled by user.\x1b[0m\r\n'
          : (!isSuccess ? `\r\n\x1b[31mProcess failed with exit code: ${data.code}\x1b[0m\r\n` : '');
        if (exitMsg) {
          terminalHistoryRef.current += exitMsg;
          terminalLogSubscribers.current.forEach(cb => cb(terminalHistoryRef.current));
        }

        if (!isSuccess && !isCancelled) {
          const cask = itemsRef.current.find(c => c.token === finishedToken);
          const name = cask ? getAppName(cask) : finishedToken;
          const err = extractTaskError(errorLog, finishedAction, name, catalogRef.current, translateRef.current);
          if (err.isFullDiskAccess) {
            const res = await window.ipc?.showMessage?.({
              type: 'warning',
              title: err.title,
              message: err.title,
              detail: err.details,
              buttons: [translateRef.current('Open System Settings'), translateRef.current('Cancel')],
              defaultId: 0,
              cancelId: 1,
            });
            if (res && res.response === 0) {
              window.ipc?.openExternal?.('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles');
            }
          } else {
            window.ipc?.showErrorDialog?.(err.title, `${err.details}`);
          }
        }

        if (finishedAction === 'cleanup' && isSuccess) {
          const cleanLogs = stripAnsi(errorLog);
          const lines = cleanLogs.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const freedLine = lines.slice().reverse().find(l => /freed|disk space/i.test(l));
          const lastLine = (freedLine || (lines.length > 0 ? lines[lines.length - 1] : ''))
            .replace(/^==>\s*/, '').trim() || translateRef.current('No files cleaned up.');
          const title = translateRef.current('Cleanup Finished');
          window.ipc?.showMessage?.({ type: 'info', title, message: title, detail: lastLine, buttons: ['OK'] });
        }

        if (isUpdatingAllRef.current) {
          if (isCancelled || !isSuccess) {
            isUpdatingAllRef.current = false;
            updateQueueRef.current = [];
          } else {
            setTimeout(() => {
              processNextQueuedUpdateRef.current();
            }, 800);
          }
        }

        // Refresh installed and outdated state
        try {
          await refreshInstalledState();
          if (finishedAction === 'refresh') {
            await refreshUpdatesState(false);
          } else if (isSuccess && finishedToken && (finishedAction === 'upgrade' || finishedAction === 'uninstall')) {
            setOutdatedMap(prev => {
              const next = { ...prev };
              delete next[finishedToken];
              return next;
            });
          }
        } catch (e) {
          console.error('Failed refreshing installed after task:', e);
        }
      }));
    }

    return () => {
      unsubs.forEach(u => typeof u === 'function' && u());
    };
  }, [applyTranslations, refreshInstalledState, refreshUpdatesState]);

  const value = {
    // Nav & Filters
    currentTab,
    selectTab,
    search,
    setSearch: handleSearchChange,
    order,
    setOrder,
    viewMode,
    setViewMode,

    // Layout
    showSidebar,
    setShowSidebar,
    toggleSidebar: () => setShowSidebar(prev => !prev),
    showTerminal,
    setShowTerminal,
    toggleTerminal: () => setShowTerminal(prev => !prev),
    showDrawer,
    alwaysShowStatusBar,

    // App Details
    selectedApp,
    appDetails,
    loadingAppDetails,
    openAppInfo,
    closeAppInfo,

    // Collections
    items,
    categories,
    categoriesMap,
    installed,
    installedVersions,
    outdatedMap,
    updatesCount,
    allAppsCount,
    filteredItems,
    displayedItems,
    filteredCount: filteredItems.length,
    loadMore,
    loading,

    // Discover data
    featuredItems,
    topInstalledItems,
    slideIndex,
    setSlideIndex,
    nextSlide,
    prevSlide,
    getPageTitle,

    // Tasks
    runningTasks,
    activeTaskId,
    activeTaskToken,
    activeTaskAction,
    drawerTitle,
    taskProgressPercent,
    isWaitingForInput,
    startAction,
    cancelAction,
    showPasswordModal,
    submitPassword,
    cancelPassword,
    registerTerminalSubscriber,
    clearTerminal,

    // Status
    lastCheckedTime,
    isRefreshing: false,
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
  if (!context) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return context;
}
