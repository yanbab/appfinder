import React, { useRef, useMemo, useState } from 'react';
import { useAppStore, useShellStore, selectFilteredItems } from '@/stores';
import { EmptyState } from './EmptyState';
import { List } from './List';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';
import { AppCard } from './AppCard';
import { AppRow } from './AppRow';
import { FontFilter, matchFontFilter } from './category-views/fonts/FontFilter';
import { getCategoryViews } from './category-views/registry';
import { Select } from './Select';
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
  const setDisplayedCount = useAppStore((s) => s.setDisplayedCount);
  const loadMore = useAppStore((s) => s.loadMore);

  const items = useAppStore((s) => s.items);
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const order = useAppStore((s) => s.order);
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const categories = useAppStore((s) => s.categories);
  const serviceStatusMap = useAppStore((s) => s.serviceStatusMap);

  const [fontFilter, setFontFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  React.useEffect(() => {
    setFontFilter('all');
    setServiceFilter('all');
  }, [currentTab]);

  const filteredItems = useMemo(
    () => selectFilteredItems({ items, search, order, installed, outdatedMap, categories }, currentTab),
    [items, search, order, installed, outdatedMap, categories, currentTab]
  );

  const isFontTab = currentTab === 'font' || currentTab === 'fonts';
  const isServiceTab = currentTab === 'services';

  const tabFilteredItems = useMemo(() => {
    if (isFontTab && fontFilter !== 'all') {
      const instSet = new Set(installed);
      return filteredItems.filter((i) => matchFontFilter(i, fontFilter, instSet));
    }

    if (isServiceTab && serviceFilter !== 'all') {
      if (serviceFilter === 'installed') {
        const instSet = new Set(installed);
        return filteredItems.filter((i) => instSet.has(i.token));
      }
      if (serviceFilter === 'running') {
        return filteredItems.filter((i) => serviceStatusMap[i.token]?.status === 'started');
      }
      const target = serviceFilter.toLowerCase();
      return filteredItems.filter((i) => {
        const c2 = (i.secondCategory || 'otherServices').toLowerCase();
        return c2 === target;
      });
    }

    return filteredItems;
  }, [filteredItems, isFontTab, fontFilter, isServiceTab, serviceFilter, installed, serviceStatusMap]);

  const filteredCount = tabFilteredItems.length;
  const displayedItems = useMemo(() => tabFilteredItems.slice(0, displayedCount), [tabFilteredItems, displayedCount]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setDisplayedCount(50);
  }, [currentTab, viewMode, search, order, fontFilter, serviceFilter]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 250) {
      if (displayedItems.length < filteredCount) {
        loadMore();
      }
    }
  };

  const resolveViews = (_item: CaskItem) => {
    if (isServiceTab) {
      return getCategoryViews('services');
    }

    if (isFontTab) {
      return getCategoryViews('font');
    }

    return {
      Tile: AppCard,
      Row: AppRow,
    };
  };

  const fontHeader = (
    <FontFilter
      value={fontFilter}
      onChange={(newVal) => setFontFilter(newVal)}
    />
  );


  const serviceHeader = (
    <div className="flex items-center justify-between select-none">
      <h3 className="text-xs font-semibold text-muted-foreground">
        {__('Services')}
      </h3>
      <div className="flex items-center gap-2">
        <Select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          aria-label={__('Filter services')}
        >
          <option value="all" className="bg-popover text-popover-foreground">{__('All')}</option>
          <option value="installed" className="bg-popover text-popover-foreground">{__('Installed')}</option>
          <option value="running" className="bg-popover text-popover-foreground">{__('Running')}</option>
          <hr />
          <option value="database" className="bg-popover text-popover-foreground">Databases & Storage</option>
          <option value="webServer" className="bg-popover text-popover-foreground">Web & Proxies</option>
          <option value="cacheQueue" className="bg-popover text-popover-foreground">Cache & Messaging</option>
          <option value="developerTools" className="bg-popover text-popover-foreground">Developer Daemons</option>
          <option value="networkingDns" className="bg-popover text-popover-foreground">Networking & DNS</option>
          <option value="monitoring" className="bg-popover text-popover-foreground">Monitoring</option>
          <option value="aiLlm" className="bg-popover text-popover-foreground">AI & LLMs</option>
          <option value="otherServices" className="bg-popover text-popover-foreground">Other Services</option>
        </Select>
      </div>
    </div>
  );

  const isInstalledTab = currentTab === 'installed';

  const installedGroups = useMemo(() => {
    if (!isInstalledTab) return null;

    const apps: CaskItem[] = [];
    const fonts: CaskItem[] = [];
    const services: CaskItem[] = [];

    for (const item of tabFilteredItems) {
      if (item.category === 'services') {
        services.push(item);
      } else if (item.category === 'font' || item.token?.startsWith('font-')) {
        fonts.push(item);
      } else {
        apps.push(item);
      }
    }

    return [
      {
        type: 'applications',
        title: `${apps.length} ${apps.length > 1 ? __('Applications') : __('Application')}`,
        count: apps.length,
        items: apps,
        views: getCategoryViews('applications'),
      },
      {
        type: 'fonts',
        title: `${fonts.length} ${fonts.length > 1 ? __('Fonts') : __('Font')}`,
        count: fonts.length,
        items: fonts,
        views: getCategoryViews('font'),
      },
      {
        type: 'services',
        title: `${services.length} ${services.length > 1 ? __('Services') : __('Service')}`,
        count: services.length,
        items: services,
        views: getCategoryViews('services'),
      },
    ].filter((g) => g.count > 0);
  }, [isInstalledTab, tabFilteredItems, __]);

  const activeHeader = header !== undefined ? header : (isFontTab ? fontHeader : isServiceTab ? serviceHeader : null);

  if (loading) {
    return <EmptyState loading />;
  }

  if (filteredCount === 0) {
    const isSearchActive = Boolean(search && search.trim().length > 0);
    const isFilterActive = (isFontTab && fontFilter !== 'all') || (isServiceTab && serviceFilter !== 'all');
    return (
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 flex flex-col">
        {activeHeader && (
          <div className={viewMode === 'grid' ? "w-full mb-4" : "max-w-[var(--content-max-width)] mx-auto w-full mb-4"}>
            {activeHeader}
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon="magnifyingglass"
            title={__('No casks found')}
            subtitle={__('Try adjusting your search or category filter.')}
          >
            {(isSearchActive || isFilterActive) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (isSearchActive) setSearch('');
                  if (isFontTab) setFontFilter('all');
                  if (isServiceTab) setServiceFilter('all');
                }}
              >
                {isSearchActive ? __('Clear search') : __('Show All')}
              </Button>
            )}
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4"
    >
      <div className={viewMode === 'grid' ? "w-full space-y-5" : "max-w-[var(--content-max-width)] mx-auto w-full space-y-5"}>
        {activeHeader}
        {isInstalledTab && installedGroups ? (
          installedGroups.map((group) => {
            const { Tile, Row } = group.views;
            return (
              <div key={group.type} className="space-y-2">
                <div className="flex items-center justify-between px-1 pt-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.title}
                  </h3>
                </div>
                {viewMode === 'grid' ? (
                  <div className={`grid gap-3 ${group.type === 'fonts' ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'}`}>
                    {group.items.map((item) => (
                      <Tile key={item.token} item={item} />
                    ))}
                  </div>
                ) : (
                  <List>
                    {group.items.map((item) => (
                      <Row key={item.token} item={item} />
                    ))}
                  </List>
                )}
              </div>
            );
          })
        ) : viewMode === 'grid' ? (
          <div className={`grid gap-3 ${isFontTab ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'}`}>
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

