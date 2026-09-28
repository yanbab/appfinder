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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Featured Carousel Banner */}
      {activeFeatured && (
        <div
          onClick={() => openAppInfo(activeFeatured)}
          className="relative overflow-hidden rounded-2xl p-6 min-h-[200px] shadow-sm transition-all cursor-pointer select-none group flex items-center"
        >
          {/* Ambient Zoomed-in Icon Background */}
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 rounded-2xl">
            {activeFeatured.iconUrl ? (
              <img
                className="absolute top-1/2 left-1/2 w-[140%] h-[140%] -translate-x-1/2 -translate-y-1/2 scale-[3.5] group-hover:scale-[3.8] object-cover blur-[48px] saturate-[240%] brightness-[0.8] opacity-90 transition-transform duration-600 ease-out"
                src={activeFeatured.iconUrl}
                alt=""
                loading="eager"
              />
            ) : (
              <div
                className="absolute inset-0 w-full h-full blur-[50px] opacity-80"
                style={{ backgroundColor: name2color(activeFeatured.name) }}
              />
            )}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-black/20 via-black/35 to-black/55 backdrop-blur-md" />
          </div>

          <div className="relative z-1 flex items-center gap-6 w-full min-w-0">
            {/* App Icon with no border */}
            <div className="size-28 sm:size-32 shrink-0 flex items-center justify-center group-hover:scale-[1.03] transition-transform duration-300">
              <AppIcon item={activeFeatured} size="hero" className="size-full rounded-2xl" />
            </div>

            {/* Details with Carousel Dots above, larger name, description, and action button underneath */}
            <div className="min-w-0 flex-1 space-y-2">
              {/* Carousel Indicators at top */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {featuredItems.map((item, idx) => (
                  <button
                    key={item.token}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlideIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${slideIndex === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                    title={item.name}
                  />
                ))}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md truncate">
                {getAppName(activeFeatured)}
              </h2>

              <p className="text-sm text-white/90 drop-shadow-sm line-clamp-2 max-w-xl leading-relaxed">
                {activeFeatured.desc || 'No description available for this package.'}
              </p>

              {/* Action Button underneath description with round border and no icon */}
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                {runningTasks[activeFeatured.token] ? (
                  <Button size="sm" variant="secondary" disabled className="rounded-full px-4 text-xs bg-white/90 text-primary font-semibold">
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    <span>{__('Working...')}</span>
                  </Button>
                ) : outdatedMap[activeFeatured.token] ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      startAction('upgrade', activeFeatured.token);
                    }}
                    className="rounded-full px-4 text-xs bg-white text-primary font-bold hover:bg-white/90 shadow-sm border border-white/20"
                  >
                    <span>{__('Upgrade')}</span>
                  </Button>
                ) : installed.includes(activeFeatured.token) && activeFeatured.app ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      startAction('open', activeFeatured.token, activeFeatured.app);
                    }}
                    className="rounded-full px-4 text-xs bg-white text-primary font-bold hover:bg-white/90 shadow-sm border border-white/20"
                  >
                    <span>{__('Open')}</span>
                  </Button>
                ) : !installed.includes(activeFeatured.token) ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      startAction('install', activeFeatured.token);
                    }}
                    className="rounded-full px-4 text-xs bg-white text-primary font-bold hover:bg-white/90 shadow-sm border border-white/20"
                  >
                    <span>{__('Install')}</span>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Cards - Left aligned, larger font, lesser weight */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => selectTab('all-apps')}
          className="flex flex-col items-start justify-center py-2.5 px-3.5 rounded-lg bg-card border border-border shadow-2xs select-none cursor-default transition-none active:bg-muted/60 text-left"
        >
          <span className="text-2xl sm:text-3xl font-light tracking-tight text-foreground leading-tight">
            {allAppsCount.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            {__('Available')}
          </span>
        </button>

        <button
          onClick={() => selectTab('installed')}
          className="flex flex-col items-start justify-center py-2.5 px-3.5 rounded-lg bg-card border border-border shadow-2xs select-none cursor-default transition-none active:bg-muted/60 text-left"
        >
          <span className="text-2xl sm:text-3xl font-light tracking-tight text-foreground leading-tight">
            {installed.length.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            {__('Installed')}
          </span>
        </button>

        <button
          onClick={() => selectTab('updates')}
          className="flex flex-col items-start justify-center py-2.5 px-3.5 rounded-lg bg-card border border-border shadow-2xs select-none cursor-default transition-none active:bg-muted/60 text-left"
        >
          <span className="text-2xl sm:text-3xl font-light tracking-tight text-foreground leading-tight">
            {updatesCount}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
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
                className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border shadow-2xs select-none cursor-default transition-none active:bg-muted/60 group"
              >
                <div className="flex items-center gap-3 min-w-0">
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
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-card border border-border shadow-2xs active:bg-muted/60 text-left group select-none cursor-default transition-none"
              >
                <CategoryIcon
                  html={cat.icon}
                  className="size-[18px] shrink-0 text-muted-foreground group-hover:text-primary"
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
