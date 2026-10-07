import React, { useState, useMemo } from 'react';
import {
  useAppStore,
  useShellStore,
  selectFeaturedItems,
  selectTopInstalledItems,
  selectRecentItems
} from '@/stores';
import { AppIcon } from './AppIcon';
import { ShellIcon } from './ShellIcon';
import { DiscoverSlider } from './DiscoverSlider';
import { DiscoverHub } from './DiscoverHub';
import { getAppName } from '@/hooks/utils';
import type { CaskItem } from '../../types/cask';

export function Discover(): React.JSX.Element {
  const selectTab = useShellStore((s) => s.selectTab);
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const __ = useShellStore((s) => s.__);

  const items = useAppStore((s) => s.items);
  const categories = useAppStore((s) => s.categories);
  const loading = useAppStore((s) => s.loading);
  const setOrder = useAppStore((s) => s.setOrder);

  const featuredItems = useMemo(() => selectFeaturedItems(items), [items]);
  const topInstalledItems = useMemo(() => selectTopInstalledItems(items), [items]);
  const recentItems = useMemo(() => selectRecentItems(items), [items]);

  const [showAllCategories, setShowAllCategories] = useState(false);

  const getCategoryDisplayName = (categoryName?: string) => {
    if (!categoryName) return '';
    const found = categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase() || (c.displayName && c.displayName.toLowerCase() === categoryName.toLowerCase())
    );
    return __(found?.displayName || categoryName);
  };

  // Full skeleton during initial load to completely prevent layout jumping
  if (loading || !featuredItems || featuredItems.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 select-none">
        <div className="max-w-[var(--content-max-width)] mx-auto w-full space-y-4">
          {/* Featured Hero Skeleton */}
          <div className="relative overflow-hidden rounded-[calc(var(--radius-card)*2)] p-4 sm:p-5 h-[160px] bg-card shadow-2xs flex items-center">
            <div className="flex items-center gap-5 w-full min-w-0">
              <div className="size-24 sm:size-28 rounded-[var(--radius-card)] bg-muted/70 animate-pulse shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-6 w-44 rounded-[var(--radius-btn)] bg-muted/80 animate-pulse" />
                <div className="space-y-1 max-w-xl">
                  <div className="h-3.5 w-full rounded bg-muted/60 animate-pulse" />
                  <div className="h-3.5 w-3/4 rounded bg-muted/50 animate-pulse" />
                </div>
                <div className="pt-0.5">
                  <div className="h-5 w-16 rounded-full bg-muted/70 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

        {/* Dynamic Hub Skeleton */}
        <div className="w-full rounded-[var(--radius-card)] bg-card shadow-2xs p-2 flex items-center justify-between animate-pulse">
          <div className="h-7 w-36 rounded-[var(--radius-btn)] bg-muted/60" />
          <div className="h-4 w-28 rounded bg-muted/40 hidden sm:block" />
          <div className="h-7 w-32 rounded-[var(--radius-btn)] bg-muted/60" />
        </div>

        {/* Recent Apps Skeleton */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 pt-2.5 pb-0.5">
            <div className="h-3 w-16 bg-muted/60 rounded animate-pulse" />
            <div className="h-2.5 w-14 bg-muted/40 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-[var(--radius-card)] bg-card shadow-2xs">
                <div className="size-12 rounded-[var(--radius-card)] bg-muted/70 animate-pulse shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="h-4 w-28 bg-muted/70 rounded animate-pulse" />
                  <div className="h-3 w-36 bg-muted/50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Apps Skeleton */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 pt-2.5 pb-0.5">
            <div className="h-3 w-16 bg-muted/60 rounded animate-pulse" />
            <div className="h-2.5 w-14 bg-muted/40 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-[var(--radius-card)] bg-card shadow-2xs">
                <div className="size-12 rounded-[var(--radius-card)] bg-muted/70 animate-pulse shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="h-4 w-28 bg-muted/70 rounded animate-pulse" />
                  <div className="h-3 w-36 bg-muted/50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Grid Skeleton */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 pt-2.5 pb-0.5">
            <div className="h-3 w-20 bg-muted/60 rounded animate-pulse" />
            <div className="h-2.5 w-14 bg-muted/40 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-card)] bg-card shadow-2xs">
                <div className="size-[18px] rounded bg-muted/70 animate-pulse shrink-0" />
                <div className="h-3.5 w-20 bg-muted/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="flex-1 overflow-y-auto p-4 select-none">
      <div className="max-w-[var(--content-max-width)] mx-auto w-full space-y-4">
        {/* Featured Carousel Banner */}
        <DiscoverSlider />

        {/* Dynamic Hub Bar */}
        <DiscoverHub />

      {/* Recent Apps Section */}
      {recentItems && recentItems.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 pt-2.5 pb-0.5 select-none">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase">
              {__('Recent')}
            </h3>
            <button
              type="button"
              onClick={() => {
                setOrder('date');
                selectTab('all-apps');
              }}
              className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase active:text-foreground cursor-default outline-none focus:outline-none"
            >
              <span>{__('Show All')}</span>
              <ShellIcon name="chevron.right" className="size-3 text-muted-foreground/70 shrink-0" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {recentItems.map((item: CaskItem) => (
              <div
                key={item.token}
                onClick={() => openAppInfo(item)}
                className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-card shadow-2xs select-none cursor-default active:bg-[var(--card-active-bg)] group min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <AppIcon item={item} size="tile" className="size-12 rounded-[var(--radius-card)] shadow-2xs shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-[13px] text-foreground truncate leading-snug">
                      {getAppName(item)}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate leading-snug mt-0.5">
                      {getCategoryDisplayName(item.category)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Apps Section */}
      {topInstalledItems.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 pt-2.5 pb-0.5 select-none">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase">
              {__('Popular')}
            </h3>
            <button
              type="button"
              onClick={() => {
                setOrder('popularity');
                selectTab('all-apps');
              }}
              className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase active:text-foreground cursor-default outline-none focus:outline-none"
            >
              <span>{__('Show All')}</span>
              <ShellIcon name="chevron.right" className="size-3 text-muted-foreground/70 shrink-0" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {topInstalledItems.map((item: CaskItem) => (
              <div
                key={item.token}
                onClick={() => openAppInfo(item)}
                className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-card shadow-2xs select-none cursor-default active:bg-[var(--card-active-bg)] group min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <AppIcon item={item} size="tile" className="size-12 rounded-[var(--radius-card)] shadow-2xs shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-[13px] text-foreground truncate leading-snug">
                      {getAppName(item)}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate leading-snug mt-0.5">
                      {getCategoryDisplayName(item.category)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {categories.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 pt-2.5 pb-0.5 select-none">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase">
              {__('Categories')}
            </h3>
            {categories.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase active:text-foreground cursor-default outline-none focus:outline-none"
              >
                <span>{showAllCategories ? __('Show Less') : __('Show All')}</span>
                <ShellIcon
                  name="chevron.right"
                  className={`size-3 text-muted-foreground/70 shrink-0 transition-transform duration-150 ease-out ${
                    showAllCategories ? 'rotate-90' : 'rotate-0'
                  }`}
                />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(showAllCategories ? categories : categories.slice(0, 8)).map((cat) => (
              <button
                key={cat.name}
                onClick={() => selectTab(cat.name)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-card)] bg-card shadow-2xs active:bg-[var(--card-active-bg)] text-left group select-none cursor-default"
              >
                <ShellIcon
                  name={cat.symbolName}
                  className="size-[18px] shrink-0 text-muted-foreground"
                />
                <span className="text-xs font-medium text-foreground truncate">
                  {__(cat.displayName)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Discover;
