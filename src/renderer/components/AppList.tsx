import React, { useRef, useMemo } from 'react';
import { useAppStore, useShellStore, selectFilteredItems } from '@/stores';
import { AppCard } from './AppCard';
import { AppRow } from './AppRow';
import { EmptyState } from './EmptyState';
import { Card } from './Card';

export interface AppListProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function AppList({ header, footer }: AppListProps): React.JSX.Element {
  const currentTab = useShellStore((s) => s.currentTab);
  const viewMode = useShellStore((s) => s.viewMode);
  const __ = useShellStore((s) => s.__);

  const loading = useAppStore((s) => s.loading);
  const displayedCount = useAppStore((s) => s.displayedCount);
  const loadMore = useAppStore((s) => s.loadMore);

  const items = useAppStore((s) => s.items);
  const search = useAppStore((s) => s.search);
  const order = useAppStore((s) => s.order);
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const categories = useAppStore((s) => s.categories);

  const filteredItems = useMemo(
    () => selectFilteredItems({ items, search, order, installed, outdatedMap, categories }, currentTab),
    [items, search, order, installed, outdatedMap, categories, currentTab]
  );
  const filteredCount = filteredItems.length;
  const displayedItems = useMemo(() => filteredItems.slice(0, displayedCount), [filteredItems, displayedCount]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 250) {
      if (displayedItems.length < filteredCount) {
        loadMore();
      }
    }
  };

  if (loading) {
    return <EmptyState loading />;
  }

  if (filteredCount === 0) {
    return (
      <EmptyState
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
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
            {displayedItems.map((item) => (
              <AppCard key={item.token} item={item} />
            ))}
          </div>
        ) : (
          <Card padding="none" className="overflow-hidden divide-y divide-border/20 w-full">
            {displayedItems.map((item) => (
              <AppRow key={item.token} item={item} />
            ))}
          </Card>
        )}
        {footer}
      </div>
    </div>
  );
}

export default AppList;
