import React, { useState, useEffect } from 'react';
import { useShell } from '@/store/useShell';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/icons';
import { getAppName, name2color } from '@/lib/utils';
import { ChevronRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

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
    loading,
    slideIndex,
    setSlideIndex,
    nextSlide,
    __,
  } = useShell();

  const [showAllCategories, setShowAllCategories] = useState(false);

  // Carousel timer
  useEffect(() => {
    if (!featuredItems || featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(interval);
  }, [featuredItems, nextSlide]);


  // Full skeleton during initial load to completely prevent layout jumping
  if (loading || !featuredItems || featuredItems.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-none">
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
          <div className="absolute top-4 right-5 flex items-center gap-1.5">
            <div className="h-1.5 w-5 rounded-full bg-muted/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-muted/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-muted/40" />
          </div>
        </div>

        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[74px] flex flex-col items-start justify-center py-2 px-3 rounded-[var(--radius-card)] bg-card border border-[var(--card-border)] shadow-2xs">
              <div className="h-8 sm:h-9 w-20 bg-muted/70 rounded animate-pulse" />
              <div className="h-3.5 w-14 bg-muted/50 rounded animate-pulse mt-1" />
            </div>
          ))}
        </div>

        {/* Popular Apps Skeleton */}
        <div className="space-y-2.5">
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Featured Carousel Banner with smooth crossfade between slides */}
      {featuredItems && featuredItems.length > 0 && (
        <div className="relative overflow-hidden rounded-[var(--radius-card)] h-[210px] shadow-sm select-none">
          {featuredItems.map((item, idx) => {
            const isActive = idx === slideIndex;
            return (
              <div
                key={item.token}
                onClick={() => openAppInfo(item)}
                className={`absolute inset-0 p-6 flex items-center transition-opacity duration-500 ease-in-out cursor-default ${
                  isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Ambient Zoomed-in Icon Background */}
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 rounded-[var(--radius-card)]">
                  {item.iconUrl ? (
                    <img
                      className="absolute top-1/2 left-1/2 w-[140%] h-[140%] -translate-x-1/2 -translate-y-1/2 scale-[3.5] object-cover blur-[48px] saturate-[240%] brightness-[0.8] opacity-90"
                      src={item.iconUrl}
                      alt=""
                      loading="eager"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 w-full h-full blur-[50px] opacity-80"
                      style={{ backgroundColor: name2color(item.name) }}
                    />
                  )}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-black/20 via-black/35 to-black/55 backdrop-blur-md" />
                </div>

                <div className="relative z-1 flex items-center gap-6 w-full min-w-0">
                  {/* App Icon */}
                  <div className="size-28 sm:size-32 shrink-0 flex items-center justify-center">
                    <AppIcon item={item} size="hero" className="size-full rounded-[var(--radius-card)]" />
                  </div>

                  {/* Details with larger name, description, and action button underneath */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md truncate">
                      {getAppName(item)}
                    </h2>

                    <p className="text-sm text-white/90 drop-shadow-sm line-clamp-2 max-w-xl leading-relaxed">
                      {item.desc || 'No description available for this package.'}
                    </p>

                    {/* Action Button underneath description */}
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      {runningTasks[item.token] ? (
                        <Button size="pill" variant="pill" disabled className="bg-white/80 text-primary">
                          <Loader2 className="size-3 animate-spin mr-1" />
                          <span>{__('Working...')}</span>
                        </Button>
                      ) : outdatedMap[item.token] ? (
                        <Button
                          size="pill"
                          variant="pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            startAction('upgrade', item.token);
                          }}
                        >
                          <span>{__('Upgrade')}</span>
                        </Button>
                      ) : installed.includes(item.token) && item.app ? (
                        <Button
                          size="pill"
                          variant="pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            startAction('open', item.token, item.app);
                          }}
                        >
                          <span>{__('Open')}</span>
                        </Button>
                      ) : !installed.includes(item.token) ? (
                        <Button
                          size="pill"
                          variant="pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            startAction('install', item.token);
                          }}
                        >
                          <span>{__('Install')}</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Carousel Indicators at top right */}
          <div className="absolute top-4 right-5 flex items-center gap-1.5 z-20" onClick={(e) => e.stopPropagation()}>
            {featuredItems.map((item, idx) => (
              <button
                key={item.token}
                onClick={(e) => {
                  e.stopPropagation();
                  setSlideIndex(idx);
                }}
                className={`h-1.5 rounded-full bg-white/25 transition-all duration-300 cursor-default ${
                  slideIndex === idx ? 'w-5 bg-white/80' : 'w-1.5'
                }`}
                title={item.name}
              />
            ))}
          </div>
        </div>
      )}

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
                <CategoryIcon
                  html={cat.icon}
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
