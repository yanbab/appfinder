import React, { useState } from 'react';
import { useShell } from '@/hooks/useShell';
import { AppIcon } from '@/components/shell/components/AppIcon';
import { ShellIcon } from '@/components/shell/components';
import { AppItemSlider } from '@/components/shell/components/AppItemSlider';


import { getAppName } from '@/hooks/utils';
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

export function Discover() {
  const {
    topInstalledItems,
    categories,
    selectTab,
    setOrder,
    openAppInfo,
    allAppsCount,
    installed,
    updatesCount,
    loading,
    featuredItems,
    __,
  } = useShell();

  const [showAllCategories, setShowAllCategories] = useState(false);

  // Full skeleton during initial load to completely prevent layout jumping
  if (loading || !featuredItems || featuredItems.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-none max-w-[var(--content-max-width)] mx-auto w-full">
        {/* Featured Hero Skeleton */}
        <div className="relative overflow-hidden rounded-[var(--radius-card)] p-6 min-h-[210px] bg-card shadow-2xs flex items-center">
          <div className="flex items-center gap-6 w-full min-w-0">
            <div className="size-28 sm:size-32 rounded-[var(--radius-card)] bg-muted/70 animate-pulse shrink-0" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="h-7 w-48 rounded-[var(--radius-btn)] bg-muted/80 animate-pulse" />
              <div className="space-y-1.5 max-w-xl">
                <div className="h-4 w-full rounded bg-muted/60 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="pt-1">
                <div className="h-5.5 w-16 rounded-full bg-muted/70 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[74px] p-3 rounded-[var(--radius-card)] bg-card border border-[var(--card-border)] shadow-2xs flex flex-col justify-center space-y-2">
              <div className="h-6 w-16 bg-muted/70 rounded animate-pulse" />
              <div className="h-3 w-12 bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Popular Apps Skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-20 bg-muted/60 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-[var(--radius-card)] bg-card border border-[var(--card-border)] shadow-2xs">
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
        <div className="space-y-2">
          <div className="h-4 w-24 bg-muted/60 rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-card)] bg-card border border-[var(--card-border)] shadow-2xs">
                <div className="size-[18px] rounded bg-muted/70 animate-pulse shrink-0" />
                <div className="h-3.5 w-20 bg-muted/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-[var(--content-max-width)] mx-auto w-full">
      {/* Featured Carousel Banner */}
      <AppItemSlider />

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => selectTab('all-apps')}
          className="h-[74px] flex flex-col items-start justify-center py-2 px-3 rounded-[var(--radius-card)] bg-card border border-[var(--card-border)] shadow-2xs select-none cursor-default active:bg-[var(--card-active-bg)] text-left group"
        >
          <span className="text-2xl sm:text-3xl font-light tracking-tight text-foreground leading-tight">
            {allAppsCount.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground font-medium mt-0.5">
            {__('Available')}
          </span>
        </button>

        <button
          onClick={() => selectTab('installed')}
          className="h-[74px] flex flex-col items-start justify-center py-2 px-3 rounded-[var(--radius-card)] bg-card border border-[var(--card-border)] shadow-2xs select-none cursor-default active:bg-[var(--card-active-bg)] text-left group"
        >
          <span className="text-2xl sm:text-3xl font-light tracking-tight text-foreground leading-tight">
            {installed.length.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground font-medium mt-0.5">
            {__('Installed')}
          </span>
        </button>

        <button
          onClick={() => selectTab('updates')}
          className="h-[74px] flex flex-col items-start justify-center py-2 px-3 rounded-[var(--radius-card)] bg-card border border-[var(--card-border)] shadow-2xs select-none cursor-default active:bg-[var(--card-active-bg)] text-left group"
        >
          <span className="text-2xl sm:text-3xl font-light tracking-tight text-foreground leading-tight">
            {updatesCount}
          </span>
          <span className="text-xs text-muted-foreground font-medium mt-0.5">
            {updatesCount === 1 ? __('Update') : __('Updates')}
          </span>
        </button>
      </div>

      {/* Popular Apps Section */}
      {topInstalledItems.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground">
              {__('Popular')}
            </h3>
            <button
              onClick={() => {
                setOrder('popularity');
                selectTab('all-apps');
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground active:text-foreground cursor-default outline-none focus:outline-none"
            >
              <span>{__('Show All')}</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {topInstalledItems.map((item) => (
              <div
                key={item.token}
                onClick={() => openAppInfo(item)}
                className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-card border border-[var(--card-border)] shadow-2xs select-none cursor-default active:bg-[var(--card-active-bg)] group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AppIcon item={item} size="tile" className="size-12 rounded-[var(--radius-card)] shadow-2xs shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-[13px] text-foreground truncate leading-snug">
                      {getAppName(item)}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate leading-snug mt-0.5">
                      {item.desc || item.category || ''}
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground">
              {__('Categories')}
            </h3>
            {categories.length > 8 && (
              <button
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-muted-foreground active:text-foreground cursor-default outline-none focus:outline-none"
              >
                <span>{showAllCategories ? __('Show Less') : __('Show All')}</span>
                {showAllCategories ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(showAllCategories ? categories : categories.slice(0, 8)).map((cat) => (
              <button
                key={cat.name}
                onClick={() => selectTab(cat.name)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-card)] bg-card border border-[var(--card-border)] shadow-2xs active:bg-[var(--card-active-bg)] text-left group select-none cursor-default"
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
  );
}

// Backward-compatible alias
export const DiscoverView = Discover;
