import React, { useState } from 'react';
import { cn, name2initials, name2color } from '@/hooks/utils';
import type { CaskItem } from '@/types';
import { ShellIcon } from './ShellIcon';
import { useAppStore } from '@/stores';

export interface AppIconProps {
  item?: CaskItem | { name?: string; token?: string; category?: string; iconUrl?: string | null } | null;
  size?: 'xs' | 'sm' | 'md' | 'row' | 'tile' | '48' | 'lg' | 'grid' | '64' | 'xl' | '2xl' | 'hero' | '128' | string;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: "size-5 rounded-sm",
  sm: "size-7 rounded-md",
  md: "size-12 rounded-xl",
  row: "size-12 rounded-xl",
  tile: "size-12 rounded-xl",
  "48": "size-12 rounded-xl",
  lg: "size-16 rounded-2xl",
  grid: "size-16 rounded-2xl",
  "64": "size-16 rounded-2xl",
  xl: "size-32 rounded-[28px]",
  "2xl": "size-32 rounded-[28px]",
  hero: "size-32 rounded-[28px]",
  "128": "size-32 rounded-[28px]",
};

export function AppIcon({ item, size = "md", className }: AppIconProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const name = item?.name || item?.token || "";
  const token = item?.token || "";
  const isFont = Boolean(item?.category === 'font' || (token && token.startsWith('font-')));
  const isService = Boolean(item?.category === 'services');
  const isInstalled = useAppStore((s) => Boolean(token && s.installed.includes(token)));

  const SERVICE_ICONS: Record<string, string> = {
    database: 'cylinder',
    webServer: 'network',
    cacheQueue: 'tray.2',
    aiLlm: 'sparkles',
    networkingDns: 'antenna.radiowaves.left.and.right',
    monitoring: 'chart.xyaxis.line',
    developerTools: 'hammer',
    otherServices: 'server.rack',
  };

  React.useEffect(() => {
    setLoaded(false);
    setHasError(false);
  }, [token, item?.iconUrl]);

  // FIXME: hardcoded font thumbnails url
  const fontThumbnailUrl = isFont && token
    ? `https://yanbab.github.io/appfinder/font-thumbnails/${token}.png`
    : null;


  const activeIconUrl = item?.iconUrl || fontThumbnailUrl;
  const hasIcon = Boolean(activeIconUrl && !hasError);

  const isLargeFont = isFont && ['128', 'hero', 'xl', '2xl', 'grid', 'tile', 'lg'].includes(size);
  const isEmojiOrColorFont = isFont && (
    Boolean((item as any)?.isColorFont) ||
    token.toLowerCase().includes('emoji') ||
    name.toLowerCase().includes('emoji') ||
    Boolean((item as any)?.secondCategory?.toLowerCase().includes('emoji')) ||
    Boolean((item as any)?.thirdCategory?.toLowerCase().includes('emoji')) ||
    Boolean((item as any)?.desc?.toLowerCase().includes('emoji'))
  );

  return (
    <div
      style={isFont && !isInstalled ? { opacity: 0.85 } : undefined}
      className={cn(
        "relative shrink-0 select-none overflow-hidden flex items-center justify-center [container-type:inline-size]",
        isService
          ? "bg-muted/60 dark:bg-muted/40 ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-2xs"
          : "bg-neutral-100 dark:bg-neutral-800/90 ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-2xs",
        currentSizeClass,
        className,
        isFont && "bg-transparent dark:bg-transparent shadow-none ring-0 border-0 rounded-none"
      )}
    >
      {hasIcon && activeIconUrl && (
        <>
          {!loaded && !isFont && (
            <div className="absolute inset-0 bg-muted/60 animate-pulse rounded-[inherit]" />
          )}
          <img
            src={activeIconUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className={cn(
              "w-full h-full object-contain",
              isFont ? (isEmojiOrColorFont ? "rounded-none" : "dark:invert rounded-none") : "absolute inset-0 rounded-[inherit]",
              loaded ? "block" : "invisible"
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setHasError(true)}
          />
        </>
      )}

      {(!hasIcon || hasError) && (
        isFont ? (
          <div
            className="w-full h-full flex items-center justify-center font-serif text-neutral-800 dark:text-neutral-200 tracking-tight select-none text-[32cqw] bg-transparent"
          >
            Aa
          </div>
        ) : isService ? (
          <div
            className="w-full h-full flex items-center justify-center text-foreground/80 rounded-[inherit]"
          >
            <ShellIcon
              name={SERVICE_ICONS[(item as any)?.secondCategory || ''] || 'server.rack'}
              className="w-[50%] h-[50%]"
            />
          </div>
        ) : (
          <div
            className="w-[87.5%] h-[87.5%] flex items-center justify-center text-white font-normal tracking-tight shadow-xs rounded-[inherit] select-none text-[41cqw]"
            style={{
              backgroundColor: name2color(name),
            }}
          >
            {name2initials(name)}
          </div>
        )
      )}
    </div>
  );
}

export default AppIcon;

