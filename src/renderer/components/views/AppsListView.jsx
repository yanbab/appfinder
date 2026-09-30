import React, { useRef, useEffect, useState } from 'react';
import { useShell } from '@/hooks/useShell';
import { AppItem } from './AppItem';
import { CheckCircle2, Search, Loader2 } from 'lucide-react';
import { cn } from '@/hooks/utils';

export function AppsListView() {
  const {
    displayedItems,
    filteredCount,
    loadMore,
    loading,
    currentTab,
    updatesCount,
    viewMode,
    pulseListTrigger,
    __,
  } = useShell();

  const containerRef = useRef(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevTriggerRef = useRef(pulseListTrigger);

  useEffect(() => {
    if (pulseListTrigger > 0 && pulseListTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = pulseListTrigger;
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 550);
      return () => clearTimeout(timer);
    }
  }, [pulseListTrigger]);

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
          <CheckCircle2 strokeWidth={1.25} className="size-16 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-base text-foreground">{__('Up to date')}</h3>
          <p className="text-xs text-muted-foreground mt-1">All installed casks are updated to their latest versions.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground select-none">
        <Search strokeWidth={1.25} className="size-16 text-muted-foreground/35 mb-3" />
        <h3 className="font-semibold text-base text-foreground">{__('No casks found')}</h3>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or category filter.</p>
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
        className={cn(
          viewMode === 'grid'
            ? "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5"
            : "border border-[var(--card-border)] rounded-[var(--radius-card)] overflow-hidden bg-card divide-y divide-[var(--card-border)] shadow-2xs",
          isPulsing && "animate-list-pulse"
        )}
      >
        {displayedItems.map((item) => (
          <AppItem key={item.token} item={item} />
        ))}
      </div>
    </div>
  );
}
