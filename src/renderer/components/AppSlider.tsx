import React, { useEffect, useMemo } from 'react';
import { useShellStore, useAppStore, selectFeaturedItems } from '@/stores';
import { AppIcon } from './AppIcon';
import { AppActionButton } from './AppActionButton';
import { getAppName, name2color } from '@/hooks/utils';

export function AppSlider() {
  const items = useAppStore((s) => s.items);
  const featuredItems = useMemo(() => selectFeaturedItems(items), [items]);
  const slideIndex = useShellStore((s) => s.slideIndex);
  const nextSlide = useShellStore((s) => s.nextSlide);
  const openAppInfo = useShellStore((s) => s.openAppInfo);

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

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-[calc(var(--radius-card)*2)] h-[210px] shadow-sm select-none"
    >
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
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-black/20 via-black/35 to-black/55 backdrop-blur-md" />
            </div>

            <div className="relative z-1 flex items-center gap-6 w-full min-w-0">
              {/* App Icon */}
              <div className="size-28 sm:size-32 shrink-0 flex items-center justify-center">
                <AppIcon item={item} size="hero" className="size-full rounded-[var(--radius-card)]" />
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm truncate">
                    {getAppName(item)}
                  </h2>
                  {item.desc && (
                    <p className="text-xs sm:text-sm text-white/80 line-clamp-2 leading-relaxed drop-shadow-xs max-w-xl">
                      {item.desc}
                    </p>
                  )}
                </div>

                <AppActionButton item={item} variant="hero" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AppSlider;
