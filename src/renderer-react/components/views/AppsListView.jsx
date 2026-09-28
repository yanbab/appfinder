import React, { useRef, useEffect } from 'react';
import { useShell } from '@/store/useShell';
import { AppItem } from './AppItem';
import { CheckCircle2, Search, Loader2 } from 'lucide-react';

export function AppsListView() {
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
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 text-primary animate-spin" />
      </div>
    );
  }

  if (filteredCount === 0) {
    if (currentTab === 'updates' && updatesCount === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground select-none">
          <CheckCircle2 className="size-12 text-primary/70 mb-3" />
          <h3 className="font-semibold text-base text-foreground">{__('Up to date')}</h3>
          <p className="text-sm text-muted-foreground mt-1">All installed casks are updated to their latest versions.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground select-none">
        <Search className="size-12 text-muted-foreground/40 mb-3" />
        <h3 className="font-semibold text-base text-foreground">{__('No casks found')}</h3>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or category filter.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4"
    >
      <div
        className={
          viewMode === 'grid'
            ? "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5"
            : "border border-border rounded-lg overflow-hidden bg-card divide-y divide-border shadow-2xs"
        }
      >
        {displayedItems.map((item) => (
          <AppItem key={item.token} item={item} />
        ))}
      </div>
    </div>
  );
}
