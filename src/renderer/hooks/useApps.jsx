import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';

const AppsContext = createContext(null);

const CHUNK_SIZE = 50;
const FEATURED_TOKENS = new Set([
  'onlyoffice', 'iina', 'visual-studio-code', 'figma', 'rectangle', 'spotify', 'raycast', 'obsidian', 'zed'
]);

function sortCategories(cats, currentMessages) {
  const translate = (key) => (currentMessages && currentMessages[key] !== undefined) ? currentMessages[key] : key;
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

export function AppsProvider({ currentTab = 'discover', messages = {}, children }) {
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

  // Search, Order & Pagination
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('popularity');
  const [displayedCount, setDisplayedCount] = useState(CHUNK_SIZE);

  // Reset pagination on search change
  const handleSearchChange = useCallback((text) => {
    setSearch(text);
    setDisplayedCount(CHUNK_SIZE);
  }, []);

  const loadMore = useCallback(() => {
    setDisplayedCount(prev => prev + CHUNK_SIZE);
  }, []);

  // Update categories when messages change
  useEffect(() => {
    if (rawCategoriesRef.current.length > 0) {
      setCategories(sortCategories(rawCategoriesRef.current, messages));
    }
  }, [messages]);

  // Fast Category lookup map
  const categoriesMap = useMemo(() => {
    const map = new Map();
    for (const c of categories) {
      if (c.name) map.set(c.name.toLowerCase(), c);
      if (c.displayName) map.set(c.displayName.toLowerCase(), c);
    }
    return map;
  }, [categories]);

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

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, displayedCount);
  }, [filteredItems, displayedCount]);

  // Discover View memoized collections
  const featuredItems = useMemo(() => items.filter(c => FEATURED_TOKENS.has(c.token)), [items]);

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

  const recentItems = useMemo(() => {
    const sorted = items
      .filter(c => c.added && (c.icon || c.iconUrl) && c.category !== 'font' && !FEATURED_TOKENS.has(c.token))
      .sort((a, b) => (b.added || '').localeCompare(a.added || ''));

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

  // Load initial catalog data on mount
  useEffect(() => {
    if (!window.ipc) return;

    if (window.ipc.getCategories) {
      window.ipc.getCategories().then(cats => {
        const list = cats || [];
        rawCategoriesRef.current = list;
        setCategories(sortCategories(list, messages));
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
  }, [refreshInstalledState, refreshUpdatesState]);

  // Listen to IPC catalog and updates refresh signals
  useEffect(() => {
    if (!window.ipc) return;
    const unsubs = [];

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

    return () => unsubs.forEach(u => u());
  }, [messages]);

  const value = {
    items,
    setItems,
    itemsRef,
    categories,
    categoriesMap,
    installed,
    installedVersions,
    outdatedMap,
    updatesCount: Object.keys(outdatedMap).length,
    allAppsCount: items.filter(c => c.category !== 'font').length,
    loading,
    lastCheckedTime,

    search,
    setSearch: handleSearchChange,
    order,
    setOrder,
    displayedCount,
    setDisplayedCount,
    loadMore,

    filteredItems,
    displayedItems,
    filteredCount: filteredItems.length,

    featuredItems,
    topInstalledItems,
    recentItems,

    refreshInstalledState,
    refreshUpdatesState,
  };

  return (
    <AppsContext.Provider value={value}>
      {children}
    </AppsContext.Provider>
  );
}

export function useApps() {
  const context = useContext(AppsContext);
  if (!context) {
    throw new Error('useApps must be used within an AppsProvider');
  }
  return context;
}
