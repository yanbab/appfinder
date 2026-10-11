import React, { useEffect, useMemo } from 'react';
import { useShellStore, useAppStore, selectFeaturedItems } from '@/stores';
import { AppIcon } from './AppIcon';
import { AppButtons } from './AppButtons';
import { getAppName, name2color } from '@/hooks/utils';

export function DiscoverSlider() {
  const items = useAppStore((s) => s.items);
  const categories = useAppStore((s) => s.categories);
  const featuredItems = useMemo(() => selectFeaturedItems(items), [items]);
  const slideIndex = useShellStore((s) => s.slideIndex);
  const setSlideIndex = useShellStore((s) => s.setSlideIndex);
  const nextSlide = useShellStore((s) => s.nextSlide);
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const __ = useShellStore((s) => s.__);

  const [isPaused, setIsPaused] = React.useState(false);

  // Carousel timer with pause on hover
  useEffect(() => {
    if (!featuredItems || featuredItems.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(interval);
  }, [featuredItems, nextSlide, isPaused]);

  if (!featuredItems || featuredItems.length === 0) return null;

  const getCategoryName = (catName?: string) => {
    if (!catName) return null;
    const found = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    return __(found?.displayName || catName);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-[calc(var(--radius-card)*2)] h-[168px] sm:h-[176px] shadow-sm select-none"
    >
      {featuredItems.map((item, idx) => {
        const isActive = idx === slideIndex;
        const categoryLabel = getCategoryName(item.category);
        return (
          <div
            key={item.token}
            onClick={() => openAppInfo(item)}
            className={`absolute inset-0 p-4 sm:p-5 flex items-center transition-opacity duration-500 ease-in-out cursor-default ${
              isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Ambient Zoomed-in Icon Background */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 rounded-[calc(var(--radius-card)*2)]">
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
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-black/25 via-black/40 to-black/60 backdrop-blur-md" />
            </div>

            <div className="relative z-1 flex items-center gap-5 w-full min-w-0 pr-12">
              {/* App Icon */}
              <div className="size-24 sm:size-28 shrink-0 flex items-center justify-center">
                <AppIcon item={item} size="hero" className="size-full rounded-[var(--radius-card)] drop-shadow-md" />
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1 space-y-2">
                {/* Eyebrow & Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 drop-shadow-xs">
                    {__('Featured App')}
                  </span>
                  {categoryLabel && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/15 text-white/95 backdrop-blur-xs drop-shadow-xs">
                      {categoryLabel}
                    </span>
                  )}
                  {item.version && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/80 backdrop-blur-xs hidden sm:inline-block">
                      v{item.version}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div className="space-y-0.5">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm truncate">
                    {getAppName(item)}
                  </h2>
                  {item.desc && (
                    <p className="text-xs text-white/85 line-clamp-2 leading-relaxed drop-shadow-xs max-w-xl">
                      {item.desc}
                    </p>
                  )}
                </div>

                <div className="pt-0.5 flex items-center gap-3">
                  <AppButtons item={item} variant="hero" />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination Dot Indicators */}
      {featuredItems.length > 1 && (
        <div
          className="absolute bottom-3 right-3.5 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/35 backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          {featuredItems.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={() => setSlideIndex(dotIdx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                dotIdx === slideIndex
                  ? 'w-4 bg-white'
                  : 'w-1.5 bg-white/40 hover:bg-white/75'
              }`}
              aria-label={`Slide ${dotIdx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default DiscoverSlider;

