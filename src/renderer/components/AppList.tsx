import React, { useRef, useMemo, useState } from 'react';
import { useAppStore, useShellStore, selectFilteredItems } from '@/stores';
import { EmptyState } from './EmptyState';
import { List } from './List';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';
import { AppCard } from './AppCard';
import { FontRow } from './category-views/fonts/FontRow';
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

  const filteredItems = useMemo(
    () => selectFilteredItems({ items, search, order, installed, outdatedMap, categories }, currentTab),
    [items, search, order, installed, outdatedMap, categories, currentTab]
  );

  const isFontTab = currentTab === 'font' || currentTab === 'fonts';
  const isServiceTab = currentTab === 'services';

  const tabFilteredItems = useMemo(() => {
    if (isFontTab && fontFilter !== 'all') {
      if (fontFilter === 'installed') {
        const instSet = new Set(installed);
        return filteredItems.filter((i) => instSet.has(i.token));
      }
      const target = fontFilter.toLowerCase();
      return filteredItems.filter((i) => {
        const c2 = (i.secondCategory || '').toLowerCase();
        const c3 = (i.thirdCategory || '').toLowerCase();
        return c2.includes(target) || c3.includes(target);
      });
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

  const fontHeader = (
    <div className="flex items-center justify-between select-none">
      <h3 className="text-xs font-semibold text-muted-foreground">
        {__('Fonts')}
      </h3>
      <div className="flex items-center gap-2">
        <Select
          value={fontFilter}
          onChange={(e) => {
            setFontFilter(e.target.value);
            if (containerRef.current) containerRef.current.scrollTop = 0;
          }}
          aria-label={__('Filter fonts')}
        >
          <option value="all" className="bg-popover text-popover-foreground">{__('All')}</option>
          <option value="installed" className="bg-popover text-popover-foreground">{__('Installed')}</option>
          <option disabled className="text-muted-foreground">──────────</option>
          <option value="latin" className="bg-popover text-popover-foreground">Latin</option>
          <option value="hebrew" className="bg-popover text-popover-foreground">Hebrew</option>
          <option value="arabic" className="bg-popover text-popover-foreground">Arabic</option>
          <option value="cyrillic" className="bg-popover text-popover-foreground">Cyrillic</option>
          <option value="cjk" className="bg-popover text-popover-foreground">CJK</option>
          <option value="greek" className="bg-popover text-popover-foreground">Greek</option>
          <option value="devanagari" className="bg-popover text-popover-foreground">Devanagari</option>
          <option value="thai" className="bg-popover text-popover-foreground">Thai</option>
          <option value="bengali" className="bg-popover text-popover-foreground">Bengali</option>
          <option value="tamil" className="bg-popover text-popover-foreground">Tamil</option>
          <option value="armenian" className="bg-popover text-popover-foreground">Armenian</option>
          <option value="georgian" className="bg-popover text-popover-foreground">Georgian</option>
          <option disabled className="text-muted-foreground">──────────</option>
          <option value="monospace" className="bg-popover text-popover-foreground">Monospace</option>
          <option value="sans-serif" className="bg-popover text-popover-foreground">Sans-Serif</option>
          <option value="serif" className="bg-popover text-popover-foreground">Serif</option>
          <option value="display" className="bg-popover text-popover-foreground">Display</option>
          <option value="script" className="bg-popover text-popover-foreground">Handwriting</option>
          <option value="symbols" className="bg-popover text-popover-foreground">Symbols & Emoji</option>
        </Select>
      </div>
    </div>
  );

  const serviceHeader = (
    <div className="flex items-center justify-between select-none">
      <h3 className="text-xs font-semibold text-muted-foreground">
        {__('Services')}
      </h3>
      <div className="flex items-center gap-2">
        <Select
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value);
            if (containerRef.current) containerRef.current.scrollTop = 0;
          }}
          aria-label={__('Filter services')}
        >
          <option value="all" className="bg-popover text-popover-foreground">{__('All')}</option>
          <option value="installed" className="bg-popover text-popover-foreground">{__('Installed')}</option>
          <option value="running" className="bg-popover text-popover-foreground">{__('Running')}</option>
          <option disabled className="text-muted-foreground">──────────</option>
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

  const activeHeader = header !== undefined ? header : (isFontTab ? fontHeader : isServiceTab ? serviceHeader : null);

  if (loading) {
    return <EmptyState loading />;
  }

  if (filteredCount === 0) {
    const isSearchActive = Boolean(search && search.trim().length > 0);
    const isFilterActive = (isFontTab && fontFilter !== 'all') || (isServiceTab && serviceFilter !== 'all');
    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
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
      <div className={viewMode === 'grid' ? "w-full space-y-4" : "max-w-[var(--content-max-width)] mx-auto w-full space-y-4"}>
        {activeHeader}
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

