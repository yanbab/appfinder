import React, { useState } from 'react';
import { cn, name2initials, name2color } from '@/hooks/utils';
import type { CaskItem } from '@/types';

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

  React.useEffect(() => {
    setLoaded(false);
    setHasError(false);
  }, [token, item?.iconUrl]);

  const fontThumbnailUrl = isFont && token
    ? (typeof window !== 'undefined' && window.location.protocol.startsWith('http')
        ? `/font-thumbnails/${token}.png`
        : `font-thumbnail://${token}.png`)
    : null;

  const activeIconUrl = item?.iconUrl || fontThumbnailUrl;
  const hasIcon = Boolean(activeIconUrl && !hasError);

  return (
    <div
      className={cn(
        "relative shrink-0 select-none overflow-hidden flex items-center justify-center [container-type:inline-size]",
        isFont && "bg-neutral-100 dark:bg-neutral-800/90 border border-black/5 dark:border-white/10 shadow-2xs",
        currentSizeClass,
        className
      )}
    >
      {hasIcon && activeIconUrl && (
        <>
          {!loaded && (
            <div className="absolute inset-0 bg-muted/60 animate-pulse rounded-[inherit]" />
          )}
          <img
            src={activeIconUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className={cn(
              "w-full h-full object-contain rounded-[inherit]",
              isFont && "p-[10%] dark:invert",
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
            className="w-[87.5%] h-[87.5%] flex items-center justify-center font-serif text-neutral-800 dark:text-neutral-200 tracking-tight select-none text-[41cqw] rounded-[inherit]"
          >
            Aa
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

