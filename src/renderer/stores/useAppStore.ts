import { create } from './createStore';
import type { CaskItem, CategoryItem } from '../../types/cask';

export const CHUNK_SIZE = 50;
export const FEATURED_TOKENS = new Set([
  'onlyoffice', 'iina', 'visual-studio-code', 'figma', 'rectangle', 'spotify', 'raycast', 'obsidian', 'zed'
]);

export function sortCategories(cats: CategoryItem[], messages?: Record<string, string>): CategoryItem[] {
  const translate = (key: string) => (messages && messages[key] !== undefined) ? messages[key] : key;
  return [...cats].sort((a, b) => {
    if (a.name === 'other') return 1;
    if (b.name === 'other') return -1;
    if (a.name === 'font') return 1;
    if (b.name === 'font') return -1;
    return translate(a.displayName || '').localeCompare(translate(b.displayName || ''));
  });
}

export interface UpdateInfo {
  installedVersion: string | null;
  currentVersion: string;
}

export function parseUpdatesMap(upds: any): Record<string, UpdateInfo> {
  const casks = upds?.casks || (Array.isArray(upds) ? upds : []);
  const map: Record<string, UpdateInfo> = {};
  for (const item of casks) {
    const token = item.token || item.name;
    map[token] = {
      installedVersion: item.installed_versions?.[0] || item.installed_version || null,
      currentVersion: item.current_version || item.latest_version
    };
  }
  return map;
}

export interface AppStoreState {
  items: CaskItem[];
  categories: CategoryItem[];
  rawCategories: CategoryItem[];
  installed: string[];
  installedVersions: Record<string, string>;
  outdatedMap: Record<string, UpdateInfo>;
  lastCheckedTime: Date | null;
  isCheckingUpdates: boolean;
  loading: boolean;
  search: string;
  order: string;
  displayedCount: number;

  setSearch: (search: string) => void;
  setOrder: (order: string) => void;
  setDisplayedCount: (displayedCount: number) => void;
  loadMore: () => void;
  setItems: (items: CaskItem[]) => void;
  setCategories: (categories: CategoryItem[]) => void;
  initCatalog: () => Promise<void>;
  syncCategoriesWithMessages: (messages: Record<string, string>) => void;
  refreshInstalled: () => Promise<void>;
  refreshUpdates: (force?: boolean) => Promise<void>;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  // State
  items: [],
  categories: [],
  rawCategories: [],
  installed: [],
  installedVersions: {},
  outdatedMap: {},
  lastCheckedTime: null,
  isCheckingUpdates: false,
  loading: true,
  search: '',
  order: 'popularity',
  displayedCount: CHUNK_SIZE,

  // Actions
  setSearch: (search: string) => set({ search, displayedCount: CHUNK_SIZE }),
  setOrder: (order: string) => set({ order }),
  setDisplayedCount: (displayedCount: number) => set({ displayedCount }),
  loadMore: () => set((state) => ({ displayedCount: state.displayedCount + CHUNK_SIZE })),
  setItems: (items: CaskItem[]) => set({ items }),
  setCategories: (categories: CategoryItem[]) => set({ categories }),

  initCatalog: async () => {
    if (!window.ipc) return;
    try {
      const [cats, casks] = await Promise.all([
        window.ipc.getCategories?.(),
        window.ipc.getCasks?.()
      ]);
      set({
        rawCategories: cats || [],
        categories: cats || [],
        items: casks || [],
        loading: false
      });
      get().refreshInstalled();
      get().refreshUpdates(false);
    } catch (e) {
      console.error('[useAppStore] initCatalog failed:', e);
      set({ loading: false });
    }
  },

  syncCategoriesWithMessages: (messages: Record<string, string>) => {
    const { rawCategories } = get();
    if (rawCategories.length > 0) {
      set({ categories: sortCategories(rawCategories, messages) });
    }
  },

  refreshInstalled: async () => {
    if (!window.ipc?.getInstalled) return;
    try {
      const inst = await window.ipc.getInstalled();
      set({
        installed: Array.isArray(inst) ? inst : (inst?.tokens || inst?.list || []),
        installedVersions: inst?.versions || {}
      });
    } catch (_) {}
  },

  refreshUpdates: async (force: boolean = false) => {
    if (!window.ipc?.getUpdates) return;
    set({ isCheckingUpdates: true });
    try {
      const upds = await window.ipc.getUpdates(force);
      set({
        outdatedMap: parseUpdatesMap(upds),
        lastCheckedTime: new Date(),
        isCheckingUpdates: false
      });
    } catch (_) {
      set({ isCheckingUpdates: false });
    }
  }
}));

export type FilterableAppState = Pick<
  AppStoreState,
  'items' | 'search' | 'order' | 'installed' | 'outdatedMap' | 'categories'
>;

// Memoized/Pure selector helpers
export function selectFilteredItems(state: FilterableAppState, currentTab: string): CaskItem[] {
  const { items, search, order, installed, outdatedMap, categories } = state;
  let list: CaskItem[] = [];

  if (currentTab === 'discover') {
    list = items.filter(c => (c.count || 0) > 0);
  } else if (currentTab === 'all-apps') {
    list = items.filter(c => c.category !== 'font');
  } else if (currentTab === 'installed') {
    list = items.filter(c => installed.includes(c.token));
  } else if (currentTab === 'updates') {
    list = items.filter(c => outdatedMap[c.token] !== undefined);
  } else {
    const catObj = categories.find(c => c.name === currentTab || (c.displayName && c.displayName.toLowerCase() === currentTab.toLowerCase()));
    const targetName = currentTab.toLowerCase();
    const targetDisplay = (catObj?.displayName || '').toLowerCase();

    list = items.filter(item => {
      const itemCats = [item.category, item.secondCategory, item.thirdCategory, item.secondaryCategory, ...(item.categories || [])];
      return itemCats.some(c => {
        if (!c) return false;
        const s = String(c).toLowerCase().trim();
        if (s === targetName || (targetDisplay && s === targetDisplay)) return true;
        const m = categories.find(cat => cat.name?.toLowerCase() === s || cat.displayName?.toLowerCase() === s);
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
}

export function selectFeaturedItems(items: CaskItem[]): CaskItem[] {
  return items.filter(c => FEATURED_TOKENS.has(c.token));
}

export function selectTopInstalledItems(items: CaskItem[]): CaskItem[] {
  const sorted = items
    .filter(c => (c.count || 0) > 0 && c.iconUrl && c.category !== 'font' && !FEATURED_TOKENS.has(c.token))
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  const top: CaskItem[] = [];
  const seen = new Set<string>();
  for (const item of sorted) {
    const cat = item.category || 'other';
    if (!seen.has(cat)) {
      seen.add(cat);
      top.push(item);
      if (top.length >= 6) break;
    }
  }
  return top;
}

export function selectRecentItems(items: CaskItem[]): CaskItem[] {
  const sorted = items
    .filter(c => c.added && c.iconUrl && c.category !== 'font' && !FEATURED_TOKENS.has(c.token))
    .sort((a, b) => (b.added || '').localeCompare(a.added || ''));

  const top: CaskItem[] = [];
  const seen = new Set<string>();
  for (const item of sorted) {
    const cat = item.category || 'other';
    if (!seen.has(cat)) {
      seen.add(cat);
      top.push(item);
      if (top.length >= 6) break;
    }
  }
  return top;
}
