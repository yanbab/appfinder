import React, { useRef, useMemo } from 'react';
import { useAppStore, useShellStore, selectFilteredItems } from '@/stores';
import { EmptyState } from './EmptyState';
import { List } from './List';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';
import { AppCard } from './AppCard';
import { FontRow } from './category-views/fonts/FontRow';
import { getCategoryViews } from './category-views/registry';
import type { CaskItem } from '@/types';

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
  const setSearch = useAppStore((s) => s.setSearch);
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
  const isFontTab = currentTab === 'font' || currentTab === 'fonts';
  const isServiceTab = currentTab === 'services';

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 250) {
      if (displayedItems.length < filteredCount) {
        loadMore();
      }
    }
  };

  const resolveViews = (item: CaskItem) => {
    const isFontItem = item.category === 'font' || item.token.startsWith('font-');
    const isServiceItem = item.category === 'services';

    if (isServiceTab || isServiceItem) {
      return getCategoryViews('services');
    }

    if (isFontTab) {
      return getCategoryViews('font');
    }

    if (isFontItem) {
      return {
        Tile: AppCard,
        Row: FontRow,
      };
    }

    return getCategoryViews(item.category);
  };

  if (loading) {
    return <EmptyState loading />;
  }

  if (filteredCount === 0) {
    const isSearchActive = Boolean(search && search.trim().length > 0);
    return (
      <EmptyState
        icon="magnifyingglass"
        title={__('No casks found')}
        subtitle={__('Try adjusting your search or category filter.')}
      >
        {isSearchActive && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSearch('')}
          >
            {__('Clear search')}
          </Button>
        )}
      </EmptyState>
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
          <div className={`grid gap-2.5 ${isFontTab ? 'grid-cols-[repeat(auto-fill,minmax(148px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'}`}>
            {displayedItems.map((item) => {
              const { Tile } = resolveViews(item);
              return <Tile key={item.token} item={item} />;
            })}
          </div>
        ) : (
          <List>
            {displayedItems.map((item) => {
              const { Row } = resolveViews(item);
              return <Row key={item.token} item={item} />;
            })}
          </List>
        )}
        {footer}
      </div>
    </div>
  );
}

export default AppList;
