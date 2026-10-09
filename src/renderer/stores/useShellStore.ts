import { create } from './createStore';
import { useAppStore, selectFeaturedItems } from './useAppStore';

const infoCache = new Map<string, any>();

export interface ShellStoreState {
  currentTab: string;
  viewMode: string;
  showSidebar: boolean;
  showTerminal: boolean;
  alwaysShowStatusBar: boolean;
  selectedApp: any | null;
  appDetails: any | null;
  loadingAppDetails: boolean;
  slideIndex: number;
  messages: Record<string, string>;

  selectTab: (tab: string) => void;
  setViewMode: (viewMode: string) => void;
  setShowSidebar: (showSidebar: boolean) => void;
  toggleSidebar: () => void;
  setShowTerminal: (showTerminal: boolean) => void;
  toggleTerminal: () => void;
  setAlwaysShowStatusBar: (alwaysShowStatusBar: boolean) => void;
  openAppInfo: (appOrToken: any) => Promise<void>;
  closeAppInfo: () => void;
  setSlideIndex: (slideIndex: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  setMessages: (messages: Record<string, string>) => void;
  __: (key: string, ...args: any[]) => string;
  getPageTitle: () => string;
}

export const useShellStore = create<ShellStoreState>((set, get) => ({
  // State
  currentTab: 'discover',
  viewMode: typeof localStorage !== 'undefined' ? localStorage.getItem('appfinder-view-mode') || 'list' : 'list',
  showSidebar: typeof window !== 'undefined' ? window.innerWidth > 560 : true,
  showTerminal: false,
  alwaysShowStatusBar: false,
  selectedApp: null,
  appDetails: null,
  loadingAppDetails: false,
  slideIndex: 0,
  messages: {},

  // Navigation & View Actions
  selectTab: (tab: string) => {
    set({
      currentTab: tab,
      selectedApp: null,
      appDetails: null
    });
    useAppStore.getState().setDisplayedCount(50);
    if (typeof window !== 'undefined' && window.innerWidth <= 560) {
      set({ showSidebar: false });
    }
  },

  setViewMode: (viewMode: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('appfinder-view-mode', viewMode);
    }
    set({ viewMode });
  },

  setShowSidebar: (showSidebar: boolean) => {
    set({ showSidebar });
    window.ipc?.sidebarChanged?.(showSidebar);
  },

  toggleSidebar: () => {
    const next = !get().showSidebar;
    set({ showSidebar: next });
    window.ipc?.sidebarChanged?.(next);
  },

  setShowTerminal: (showTerminal: boolean) => set({ showTerminal }),
  toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),
  setAlwaysShowStatusBar: (alwaysShowStatusBar: boolean) => set({ alwaysShowStatusBar }),

  // App Inspector Drawer Actions
  openAppInfo: async (appOrToken: any) => {
    const token = typeof appOrToken === 'string' ? appOrToken : appOrToken?.token;
    const items = useAppStore.getState().items;
    const catalogItem = items.find((c) => c.token === token);
    const resolvedApp = typeof appOrToken === 'object' && appOrToken !== null
      ? { ...(catalogItem || {}), ...appOrToken }
      : (catalogItem || { token });

    set({ selectedApp: resolvedApp });
    if (!token) return;

    if (infoCache.has(token)) {
      set({ appDetails: infoCache.get(token), loadingAppDetails: false });
      return;
    }

    set({ appDetails: null, loadingAppDetails: true });
    try {
      const info = await window.ipc?.getCaskInfo?.(token);
      if (info) {
        infoCache.set(token, info);
        set({ appDetails: info });
      }
    } catch (_) { }
    set({ loadingAppDetails: false });
  },

  closeAppInfo: () => {
    set({ selectedApp: null, appDetails: null, loadingAppDetails: false });
  },

  // Carousel
  setSlideIndex: (slideIndex: number) => set({ slideIndex }),
  nextSlide: () => {
    const featured = selectFeaturedItems(useAppStore.getState().items);
    if (featured.length <= 1) return;
    set((state) => ({ slideIndex: (state.slideIndex + 1) % featured.length }));
  },
  prevSlide: () => {
    const featured = selectFeaturedItems(useAppStore.getState().items);
    if (featured.length <= 1) return;
    set((state) => ({ slideIndex: (state.slideIndex - 1 + featured.length) % featured.length }));
  },

  // Localization
  setMessages: (messages: Record<string, string>) => {
    set({ messages });
    useAppStore.getState().syncCategoriesWithMessages(messages);
  },

  __: (key: string, ...args: any[]): string => {
    const messages = get().messages;
    let text = messages && messages[key] !== undefined ? messages[key] : key;
    if (args.length > 0) {
      args.forEach((arg) => {
        text = text.replace(/%s|%d/, String(arg));
      });
    }
    return text;
  },

  getPageTitle: (): string => {
    const { currentTab, __ } = get();
    const categories = useAppStore.getState().categories;
    if (currentTab === 'discover') return __('Explore');
    if (currentTab === 'all-apps') return __('All Apps');
    if (currentTab === 'installed') return __('Installed');
    if (currentTab === 'updates') return __('Updates');
    const cat = categories.find((c) => c.name === currentTab);
    return cat ? __(cat.displayName) : __('Explore');
  }
}));
