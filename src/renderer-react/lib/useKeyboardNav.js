import { useEffect } from 'react';
import { useShell } from '@/store/useShell';

export function useKeyboardNav() {
  const {
    currentTab,
    selectTab,
    categories,
    search,
    setSearch,
    showSidebar,
    setShowSidebar,
    showDrawer,
    closeAppInfo,
    openAppInfo,
    showPasswordModal,
    displayedItems,
    filteredCount,
    loadMore,
  } = useShell();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showPasswordModal) return;

      const searchInput = document.getElementById('search-input');
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.isContentEditable;
      const isSearch = document.activeElement === searchInput;

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
        if (showDrawer) {
          e.preventDefault();
          closeAppInfo?.();
          return;
        }
        if (isSearch && search) {
          e.preventDefault();
          setSearch('');
          return;
        }
        if (isInput) {
          document.activeElement.blur();
          return;
        }
        if (showSidebar && window.innerWidth <= 560) {
          e.preventDefault();
          setShowSidebar(false);
          return;
        }
        return;
      }

      // 3. From Search input: ArrowDown jumps into first app card
      if (isSearch && e.key === 'ArrowDown' && !e.metaKey && !e.altKey && !e.ctrlKey) {
        const firstCard = document.querySelector('.app-card');
        if (firstCard) {
          e.preventDefault();
          firstCard.focus();
          firstCard.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          return;
        }
      }

      // 4. App cards/rows keyboard navigation
      const activeCard = document.activeElement ? document.activeElement.closest('.app-card') : null;
      if (activeCard && currentTab !== 'discover') {
        const cards = Array.from(document.querySelectorAll('.app-card'));
        const currentIndex = cards.indexOf(activeCard);
        if (currentIndex === -1) return;

        // ArrowDown -> Next item
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (e.metaKey) {
            // Meta+ArrowDown -> Jump to last
            if (displayedItems.length < filteredCount) {
              loadMore?.();
            }
            setTimeout(() => {
              const updated = Array.from(document.querySelectorAll('.app-card'));
              const last = updated[updated.length - 1];
              last?.focus();
              last?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }, 50);
          } else if (currentIndex < cards.length - 1) {
            cards[currentIndex + 1].focus();
            cards[currentIndex + 1].scrollIntoView({ block: 'nearest', behavior: 'auto' });
          } else if (displayedItems.length < filteredCount) {
            loadMore?.();
            setTimeout(() => {
              const updated = Array.from(document.querySelectorAll('.app-card'));
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
          const item = displayedItems.find((c) => c.token === token);
          if (item) openAppInfo(item);
          return;
        }

        // ArrowLeft -> Focus active sidebar item
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const sidebarBtn = document.querySelector(`[data-nav-id="${currentTab}"]`) || document.querySelector('aside button');
          sidebarBtn?.focus();
          return;
        }

        // PageDown -> Jump 5 items down
        if (e.key === 'PageDown') {
          e.preventDefault();
          const target = Math.min(cards.length - 1, currentIndex + 5);
          cards[target]?.focus();
          cards[target]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          if (target >= cards.length - 2 && displayedItems.length < filteredCount) {
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
          if (displayedItems.length < filteredCount) {
            loadMore?.();
          }
          setTimeout(() => {
            const updated = Array.from(document.querySelectorAll('.app-card'));
            const last = updated[updated.length - 1];
            last?.focus();
            last?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          }, 50);
          return;
        }
      }

      // 5. Sidebar Navigation when focused inside sidebar
      const activeEl = document.activeElement;
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
              const itemEl = document.querySelector(`[data-nav-id="${tabs[nextIndex]}"]`);
              itemEl?.focus();
              itemEl?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }, 20);
          }
          return;
        }

        // ArrowRight from sidebar -> move focus into first app card
        if (e.key === 'ArrowRight') {
          const firstCard = document.querySelector('.app-card');
          if (firstCard) {
            e.preventDefault();
            firstCard.focus();
            firstCard.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            return;
          }
        }
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
    showDrawer,
    closeAppInfo,
    openAppInfo,
    showPasswordModal,
    displayedItems,
    filteredCount,
    loadMore,
  ]);
}
