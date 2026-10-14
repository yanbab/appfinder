import React, { useState } from 'react';
import { cn, name2initials, name2color, resolveAssetUrl, getFaviconUrl, getFontSpecimenCharacter } from '@/hooks/utils';
import type { CaskItem } from '@/types';
import { ShellIcon } from './ShellIcon';
import { useAppStore } from '@/stores';

export interface AppIconProps {
  item?: CaskItem | { name?: string; token?: string; category?: string; iconUrl?: string | null; homepage?: string; secondCategory?: string } | null;
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

  const name = item?.name || item?.token || "";
  const token = item?.token || "";
  const isFont = Boolean(item?.category === 'font' || (token && token.startsWith('font-')));
  const isService = Boolean(item?.category === 'services');
  const isInstalled = useAppStore((s) => Boolean(token && s.installed.includes(token)));
  const isRowSize = size === 'row' || size === 'sm' || size === 'xs' || size === 'md';
  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

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

  const isGitHub = Boolean(
    (item as any)?.homepage && (
      (item as any).homepage.includes('github.com') ||
      (item as any).homepage.includes('github.io')
    )
  );

  React.useEffect(() => {
    setLoaded(false);
    setHasError(false);

    if (isService && (item as any)?.homepage && !isGitHub) {
      try {
        const rawUrl = (item as any).homepage.trim();
        const withProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
        const url = new URL(withProto);
        const domain = url.hostname.replace(/^www\./, '');
        if (domain && window.ipc?.checkServiceFavicon) {
          window.ipc.checkServiceFavicon(domain).then((isValid) => {
            if (!isValid) {
              setHasError(true);
            }
          }).catch(() => {});
        }
      } catch (_) {}
    }
  }, [token, item?.iconUrl, (item as any)?.homepage, isService, isGitHub]);

  const serviceFaviconUrl = (isService && !isGitHub) ? getFaviconUrl((item as any)?.homepage, 128) : null;
  const fontThumbnailUrl = isFont && token
    ? `https://yanbab.github.io/appfinder/font-thumbnails/${token}.png`
    : null;

  const rawIconUrl = item?.iconUrl || (item as any)?.thumbnailUrl || fontThumbnailUrl || serviceFaviconUrl;
  const activeIconUrl = resolveAssetUrl(rawIconUrl);
  const hasIcon = Boolean(activeIconUrl && !hasError);

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
        hasIcon && !isService && !isFont
          ? "bg-transparent dark:bg-transparent ring-0 border-0 shadow-none"
          : isService
          ? "bg-slate-200/70 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 ring-1 ring-inset ring-slate-400/20 dark:ring-slate-500/25 shadow-2xs rounded-[var(--radius-card)]"
          : isFont
          ? (isRowSize
              ? "bg-neutral-100 dark:bg-neutral-800/90 ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-2xs rounded-[var(--radius-card)]"
              : "bg-transparent dark:bg-transparent shadow-none ring-0 border-0 rounded-none")
          : "bg-neutral-100 dark:bg-neutral-800/90 ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-2xs",
        currentSizeClass,
        className
      )}
    >
      {hasIcon && activeIconUrl && (
        isService ? (
          <img
            src={activeIconUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className={cn(
              "w-[62cqw] h-[62cqw] object-contain rounded-[14cqw] select-none pointer-events-none drop-shadow-2xs transition-opacity duration-150",
              loaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setHasError(true)}
          />
        ) : (
          <img
            src={activeIconUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className={cn(
              "w-full h-full object-contain",
              isFont
                ? (isEmojiOrColorFont
                    ? (isRowSize ? "p-1 rounded-[inherit]" : "rounded-none")
                    : (isRowSize ? "p-1 dark:invert rounded-[inherit]" : "dark:invert rounded-none"))
                : "rounded-[inherit]",
              loaded ? "block" : "invisible"
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setHasError(true)}
          />
        )
      )}

      {isService && hasIcon && !loaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-foreground/35 rounded-[inherit] pointer-events-none">
          <ShellIcon
            name={SERVICE_ICONS[(item as any)?.secondCategory || ''] || 'server.rack'}
            className="w-[50%] h-[50%]"
          />
        </div>
      )}

      {(!hasIcon || hasError) && (
        isFont ? (
          <div
            className="w-full h-full flex items-center justify-center font-serif text-neutral-800 dark:text-neutral-200 tracking-tight select-none text-[32cqw] bg-transparent"
          >
            {getFontSpecimenCharacter(item)}
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

