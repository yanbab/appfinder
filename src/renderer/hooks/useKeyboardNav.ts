import { useEffect } from 'react';
import { useShellStore, useAppStore, useTermStore } from '@/stores';

export function useKeyboardNav() {
  const currentTab = useShellStore((s) => s.currentTab);
  const selectTab = useShellStore((s) => s.selectTab);
  const showSidebar = useShellStore((s) => s.showSidebar);
  const setShowSidebar = useShellStore((s) => s.setShowSidebar);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const closeAppInfo = useShellStore((s) => s.closeAppInfo);
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const nextSlide = useShellStore((s) => s.nextSlide);
  const prevSlide = useShellStore((s) => s.prevSlide);
  const setViewMode = useShellStore((s) => s.setViewMode);

  const categories = useAppStore((s) => s.categories);
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const loadMore = useAppStore((s) => s.loadMore);

  const showPasswordModal = useTermStore((s) => s.showPasswordModal);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPasswordModal) return;

      const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        Boolean(activeEl?.isContentEditable);
      const isSearch = activeEl === searchInput;

      // Cmd+9 -> By list, Cmd+0 -> By grid
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        if (e.key === '9') {
          e.preventDefault();
          setViewMode?.('list');
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          setViewMode?.('grid');
          return;
        }
      }

      // 1. Cmd+F or Ctrl+F -> Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSidebar?.(true);
        setTimeout(() => {
          if (searchInput) {
            searchInput.focus();
            searchInput.select?.();
          }
        }, 50);
        return;
      }

      // 2. Escape key
      if (e.key === 'Escape') {
        if (selectedApp) {
          e.preventDefault();
          closeAppInfo?.();
          return;
        }
        if (isSearch && search) {
          e.preventDefault();
          setSearch('');
          return;
        }
        if (isInput && activeEl) {
          activeEl.blur();
          return;
        }
        if (showSidebar && window.innerWidth <= 560) {
          e.preventDefault();
          setShowSidebar(false);
          return;
        }
        return;
      }

      // 3. Discover tab slide navigation
      if (currentTab === 'discover' && !isInput) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          if (selectedApp) closeAppInfo?.();
          e.preventDefault();
          if (e.key === 'ArrowLeft') prevSlide?.();
          else nextSlide?.();
          return;
        }
      }

      // 4. From Search input: ArrowDown jumps into first app card
      if (isSearch && e.key === 'ArrowDown' && !e.metaKey && !e.altKey && !e.ctrlKey) {
        const firstCard = document.querySelector('.app-card') as HTMLElement | null;
        if (firstCard) {
          e.preventDefault();
          firstCard.focus();
          firstCard.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          return;
        }
      }

      // 4. App cards/rows keyboard navigation
      const activeCard = activeEl ? activeEl.closest('.app-card') as HTMLElement | null : null;
      if (activeCard && currentTab !== 'discover') {
        const cards = Array.from(document.querySelectorAll('.app-card')) as HTMLElement[];
        const currentIndex = cards.indexOf(activeCard);
        if (currentIndex === -1) return;

        // ArrowDown -> Next item
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (e.metaKey) {
            // Meta+ArrowDown -> Jump to last
            loadMore?.();
            setTimeout(() => {
              const updated = Array.from(document.querySelectorAll('.app-card')) as HTMLElement[];
              const last = updated[updated.length - 1];
              last?.focus();
              last?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }, 50);
          } else if (currentIndex < cards.length - 1) {
            cards[currentIndex + 1].focus();
            cards[currentIndex + 1].scrollIntoView({ block: 'nearest', behavior: 'auto' });
          } else {
            loadMore?.();
            setTimeout(() => {
              const updated = Array.from(document.querySelectorAll('.app-card')) as HTMLElement[];
              updated[currentIndex + 1]?.focus();
              updated[currentIndex + 1]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }, 50);
          }
          return;
        }

        // ArrowUp -> Previous item / search input
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (e.metaKey) {
            cards[0]?.focus();
            cards[0]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          } else if (currentIndex > 0) {
            cards[currentIndex - 1].focus();
            cards[currentIndex - 1].scrollIntoView({ block: 'nearest', behavior: 'auto' });
          } else if (searchInput) {
            searchInput.focus();
          }
          return;
        }

        // ArrowRight / Enter -> Open Info Drawer
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
          e.preventDefault();
          const token = activeCard.dataset.token;
          if (token) openAppInfo(token);
          return;
        }

        // ArrowLeft -> Focus active sidebar item
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const sidebarBtn = (document.querySelector(`[data-nav-id="${currentTab}"]`) || document.querySelector('aside button')) as HTMLElement | null;
          sidebarBtn?.focus();
          return;
        }

        // PageDown -> Jump 5 items down
        if (e.key === 'PageDown') {
          e.preventDefault();
          const target = Math.min(cards.length - 1, currentIndex + 5);
          cards[target]?.focus();
          cards[target]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          if (target >= cards.length - 2) {
            loadMore?.();
          }
          return;
        }

        // PageUp -> Jump 5 items up
        if (e.key === 'PageUp') {
          e.preventDefault();
          const target = Math.max(0, currentIndex - 5);
          cards[target]?.focus();
          cards[target]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          return;
        }

        // Home -> First card
        if (e.key === 'Home') {
          e.preventDefault();
          cards[0]?.focus();
          cards[0]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          return;
        }

        // End -> Last card
        if (e.key === 'End') {
          e.preventDefault();
          loadMore?.();
          setTimeout(() => {
            const updated = Array.from(document.querySelectorAll('.app-card')) as HTMLElement[];
            const last = updated[updated.length - 1];
            last?.focus();
            last?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          }, 50);
          return;
        }
      }

      // 5. Sidebar Navigation when focused inside sidebar
      const isSidebar = activeEl && activeEl.closest('aside');
      if (isSidebar && !isInput) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const tabs = ['discover', 'all-apps', 'installed', 'updates', ...(categories || []).map((c) => c.name)];
          const currentIndex = tabs.indexOf(currentTab);
          const nextIndex =
            e.key === 'ArrowDown'
              ? currentIndex >= 0
                ? Math.min(tabs.length - 1, currentIndex + 1)
                : 0
              : currentIndex >= 0
              ? Math.max(0, currentIndex - 1)
              : 0;

          if (nextIndex !== currentIndex && tabs[nextIndex]) {
            selectTab(tabs[nextIndex]);
            setTimeout(() => {
              const itemEl = document.querySelector(`[data-nav-id="${tabs[nextIndex]}"]`) as HTMLElement | null;
              itemEl?.focus();
              itemEl?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }, 20);
          }
          return;
        }

        // ArrowRight from sidebar -> move focus into first app card
        if (e.key === 'ArrowRight') {
          const firstCard = document.querySelector('.app-card') as HTMLElement | null;
          if (firstCard) {
            e.preventDefault();
            firstCard.focus();
            firstCard.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            return;
          }
        }
      }

      // 6. Direct type-to-search when focused outside inputs
      const isKey = !e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1 && e.key !== ' ';
      if (!isInput && isKey) {
        e.preventDefault();
        if (selectedApp) closeAppInfo?.();
        const newSearch = (search || '') + e.key;
        setSearch(newSearch);
        if (currentTab === 'discover') {
          selectTab('all-apps');
        }
        setShowSidebar?.(true);
        setTimeout(() => {
          const searchEl = document.getElementById('search-input') as HTMLInputElement | null;
          if (searchEl) {
            searchEl.focus();
            const len = searchEl.value.length;
            searchEl.setSelectionRange?.(len, len);
          }
        }, 30);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentTab,
    selectTab,
    categories,
    search,
    setSearch,
    showSidebar,
    setShowSidebar,
    selectedApp,
    closeAppInfo,
    openAppInfo,
    showPasswordModal,
    loadMore,
    nextSlide,
    prevSlide,
    setViewMode,
  ]);
}
