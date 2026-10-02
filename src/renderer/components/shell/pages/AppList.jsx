import React, { useRef } from 'react';
import { useShell } from '@/hooks/useShell';
import { AppItemGrid } from '@/components/shell/components/AppItemGrid';
import { AppItemList } from '@/components/shell/components/AppItemList';
import { Empty } from './Empty';

export function AppList({ header, footer }) {
  const {
    displayedItems,
    filteredCount,
    loadMore,
    loading,
    currentTab,
    updatesCount,
    viewMode,
    __,
  } = useShell();

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
      <div className="max-w-[var(--content-max-width)] mx-auto w-full space-y-4">
        {header}
        <div
          className={
            viewMode === 'grid'
              ? "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5"
              : "border border-[var(--card-border)] rounded-[var(--radius-card)] overflow-hidden bg-card divide-y divide-[var(--card-border)] shadow-2xs w-full"
          }
        >
          {displayedItems.map((item) =>
            viewMode === 'grid' ? (
              <AppItemGrid key={item.token} item={item} />
            ) : (
              <AppItemList key={item.token} item={item} />
            )
          )}
        </div>
        {footer}
      </div>
    </div>
  );
}

// Backward-compatible alias
export const AppsListView = AppList;
