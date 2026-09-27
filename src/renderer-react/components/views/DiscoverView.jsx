import React, { useState, useEffect } from 'react';
import { useShell } from '@/store/useShell';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/button';
import { CategoryIcon, UpgradeIcon, OpenIcon, InstallIcon } from '@/components/ui/icons';
import { getAppName } from '@/lib/utils';
import { ChevronRight, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';

export function DiscoverView() {
  const {
    featuredItems,
    topInstalledItems,
    categories,
    selectTab,
    setOrder,
    openAppInfo,
    allAppsCount,
    installed,
    updatesCount,
    runningTasks,
    outdatedMap,
    startAction,
    __,
  } = useShell();

  const [slideIndex, setSlideIndex] = useState(0);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Carousel timer
  useEffect(() => {
    if (!featuredItems || featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % featuredItems.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [featuredItems]);

  const activeFeatured = featuredItems[slideIndex] || featuredItems[0];
  const displayedCategories = showAllCategories ? categories : categories.slice(0, 8);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Featured Carousel Banner */}
      {activeFeatured && (
        <div
          onClick={() => openAppInfo(activeFeatured)}
          className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 to-card/40 p-5 shadow-xs transition-all hover:border-primary/50 cursor-pointer select-none"
        >
          {/* Subtle Ambient Glow */}
          <div
            className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{
              backgroundColor: 'var(--primary)',
            }}
          />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5 min-w-0">
              <AppIcon item={activeFeatured} size="hero" className="size-32 rounded-3xl shadow-sm shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="size-3.5" />
                    {__('Featured')}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-foreground truncate">
                  {getAppName(activeFeatured)}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-xl mt-0.5">
                  {activeFeatured.desc || 'No description available for this package.'}
                </p>
              </div>
            </div>

            {/* Actions & Carousel Indicators */}
            <div
              className="flex items-center gap-3 shrink-0 self-end sm:self-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5">
                {featuredItems.map((item, idx) => (
                  <button
                    key={item.token}
                    onClick={() => setSlideIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      slideIndex === idx ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    title={item.name}
                  />
                ))}
              </div>

              <div className="ml-2">
                {runningTasks[activeFeatured.token] ? (
                  <Button size="sm" variant="secondary" disabled className="gap-1.5 text-xs">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>{__('Working...')}</span>
                  </Button>
                ) : outdatedMap[activeFeatured.token] ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => startAction('upgrade', activeFeatured.token)}
                    className="gap-1.5 text-xs"
                  >
                    <UpgradeIcon className="size-3.5" />
                    <span>{__('Upgrade')}</span>
                  </Button>
                ) : installed.includes(activeFeatured.token) && activeFeatured.app ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => startAction('open', activeFeatured.token, activeFeatured.app)}
                    className="gap-1.5 text-xs"
                  >
                    <OpenIcon className="size-3.5" />
                    <span>{__('Open')}</span>
                  </Button>
                ) : !installed.includes(activeFeatured.token) ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => startAction('install', activeFeatured.token)}
                    className="gap-1.5 text-xs"
                  >
                    <InstallIcon className="size-3.5" />
                    <span>{__('Install')}</span>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => selectTab('all-apps')}
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-card/60 hover:bg-muted/40 transition-all text-center select-none cursor-default"
        >
          <span className="text-xl font-bold text-foreground">
            {allAppsCount.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {__('Available')}
          </span>
        </button>

        <button
          onClick={() => selectTab('installed')}
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-card/60 hover:bg-muted/40 transition-all text-center select-none cursor-default"
        >
          <span className="text-xl font-bold text-foreground">
            {installed.length.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {__('Installed')}
          </span>
        </button>

        <button
          onClick={() => selectTab('updates')}
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-card/60 hover:bg-muted/40 transition-all text-center select-none cursor-default"
        >
          <span className="text-xl font-bold text-foreground">
            {updatesCount}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {updatesCount === 1 ? __('Update') : __('Updates')}
          </span>
        </button>
      </div>

      {/* Popular Apps Section (bg on popular tiles like in app rows) */}
      {topInstalledItems.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {__('Popular')}
            </h3>
            <button
              onClick={() => {
                setOrder('popularity');
                selectTab('all-apps');
              }}
              className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium cursor-default"
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
                className="flex items-center justify-between p-2.5 rounded-lg bg-card select-none cursor-default transition-none active:bg-muted/60 group"
              >
                <div className="flex items-center gap-3 min-w-0 mr-2">
                  <AppIcon item={item} size="tile" className="size-12 rounded-xl shadow-2xs shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">
                      {getAppName(item)}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                      {item.desc || item.category || ''}
                    </p>
                  </div>
                </div>

                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {runningTasks[item.token] ? (
                    <Button size="icon-xs" variant="secondary" disabled className="rounded-sm">
                      <Loader2 className="size-3 animate-spin" />
                    </Button>
                  ) : outdatedMap[item.token] ? (
                    <Button
                      size="icon-xs"
                      variant="default"
                      className="rounded-sm"
                      onClick={() => startAction('upgrade', item.token)}
                    >
                      <UpgradeIcon className="size-3.5" />
                    </Button>
                  ) : installed.includes(item.token) && item.app ? (
                    <Button
                      size="icon-xs"
                      variant="secondary"
                      className="rounded-sm"
                      onClick={() => startAction('open', item.token, item.app)}
                    >
                      <OpenIcon className="size-3.5" />
                    </Button>
                  ) : !installed.includes(item.token) ? (
                    <Button
                      size="icon-xs"
                      variant="secondary"
                      className="rounded-sm"
                      onClick={() => startAction('install', item.token)}
                    >
                      <InstallIcon className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Grid (No border on categories and less padding) */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {__('Categories')}
            </h3>
            {categories.length > 8 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium cursor-default"
              >
                <span>{showAllCategories ? __('Show Less') : __('Show All')}</span>
                {showAllCategories ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {displayedCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => selectTab(cat.name)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-card/60 hover:bg-muted/40 transition-colors text-left group select-none cursor-default"
              >
                <CategoryIcon
                  html={cat.icon}
                  className="size-[18px] shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                />
                <span className="text-sm font-medium text-foreground truncate">
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
