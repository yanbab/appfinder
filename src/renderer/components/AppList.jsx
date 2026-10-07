import React, { useRef, useMemo } from 'react';
import { useAppStore, useShellStore, selectFilteredItems } from '@/stores';
import { AppCard } from './AppCard';
import { AppRow } from './AppRow';
import { Empty } from './Empty';

export function AppList({ header, footer }) {
  const currentTab = useShellStore((s) => s.currentTab);
  const viewMode = useShellStore((s) => s.viewMode);
  const __ = useShellStore((s) => s.__);

  const loading = useAppStore((s) => s.loading);
  const displayedCount = useAppStore((s) => s.displayedCount);
  const loadMore = useAppStore((s) => s.loadMore);
  const appState = useAppStore();

  const filteredItems = useMemo(() => selectFilteredItems(appState, currentTab), [appState, currentTab]);
  const filteredCount = filteredItems.length;
  const displayedItems = useMemo(() => filteredItems.slice(0, displayedCount), [filteredItems, displayedCount]);

  const containerRef = useRef(null);

  const handleScroll = (e) => {
    const el = e.target;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 250) {
      if (displayedItems.length < filteredCount) {
        loadMore();
      }
    }
  };

  if (loading) {
    return <Empty loading />;
  }

  if (filteredCount === 0) {
    return (
      <Empty
        icon="magnifyingglass"
        title={__('No casks found')}
        subtitle={__('Try adjusting your search or category filter.')}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4"
    >
      <div className={viewMode === 'grid' ? "w-full space-y-4" : "max-w-[var(--content-max-width)] mx-auto w-full space-y-4"}>
        {header}
        <div
          className={
            viewMode === 'grid'
              ? "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5"
              : "rounded-[var(--radius-card)] overflow-hidden bg-card divide-y divide-border/20 shadow-2xs w-full"
          }
        >
          {displayedItems.map((item) =>
            viewMode === 'grid' ? (
              <AppCard key={item.token} item={item} />
            ) : (
              <AppRow key={item.token} item={item} />
            )
          )}
        </div>
        {footer}
      </div>
    </div>
  );
}

export default AppList;
