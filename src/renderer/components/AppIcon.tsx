import React, { useState } from 'react';
import { cn, name2initials, name2color, resolveAssetUrl } from '@/hooks/utils';
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

export function getFontSpecimenCharacter(
  item?: CaskItem | { name?: string; token?: string; category?: string; iconUrl?: string | null } | null
): string {
  if (!item) return 'Aa';
  const token = (item.token || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const c2 = ((item as any).secondCategory || '').toLowerCase();
  const c3 = ((item as any).thirdCategory || '').toLowerCase();
  const desc = ((item as any).desc || '').toLowerCase();

  // 1. Emoji / Color fonts
  if (
    c2.includes('emoji') ||
    c3.includes('emoji') ||
    token.includes('emoji') ||
    name.includes('emoji') ||
    desc.includes('emoji') ||
    Boolean((item as any).isColorFont)
  ) {
    return '😀';
  }

  // 2. Hebrew
  if (c3.includes('hebrew') || token.includes('hebrew') || name.includes('hebrew')) {
    return 'אב';
  }

  // 3. Arabic
  if (c3.includes('arabic') || token.includes('arabic') || name.includes('arabic')) {
    return 'أب';
  }

  // 4. CJK (Chinese / Japanese / Korean)
  if (c3.includes('cjk') || token.includes('cjk') || name.includes('cjk') || token.includes('chinese') || name.includes('chinese')) {
    return '永';
  }
  if (c3.includes('japanese') || token.includes('japanese') || name.includes('japanese') || token.includes('kana')) {
    return 'あ';
  }
  if (c3.includes('korean') || token.includes('korean') || name.includes('korean') || token.includes('hangul')) {
    return '가';
  }

  // 5. Thai
  if (c3.includes('thai') || token.includes('thai') || name.includes('thai')) {
    return 'ก';
  }

  // 6. Devanagari / Indic
  if (c3.includes('devanagari') || token.includes('devanagari') || name.includes('devanagari')) {
    return 'अ';
  }
  if (c3.includes('bengali') || token.includes('bengali')) return 'অ';
  if (c3.includes('tamil') || token.includes('tamil')) return 'அ';
  if (c3.includes('telugu') || token.includes('telugu')) return 'అ';
  if (c3.includes('gujarati') || token.includes('gujarati')) return 'અ';
  if (c3.includes('kannada') || token.includes('kannada')) return 'ಅ';
  if (c3.includes('malayalam') || token.includes('malayalam')) return 'അ';

  // 7. Armenian / Georgian
  if (c3.includes('armenian') || token.includes('armenian')) return 'Աա';
  if (c3.includes('georgian') || token.includes('georgian')) return 'Ⴀა';

  // 8. Greek / Cyrillic
  if (c3.includes('greek') || token.includes('greek') || name.includes('greek')) return 'Αα';
  if (c3.includes('cyrillic') || token.includes('cyrillic') || name.includes('cyrillic')) return 'Аа';

  // 9. Symbols / Nerd Font
  if (c2.includes('symbols') || token.includes('nerd-font')) return '⌘';

  // Default: Latin
  return 'Aa';
}

export function AppIcon({ item, size = "md", className }: AppIconProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const name = item?.name || item?.token || "";
  const token = item?.token || "";
  const isFont = Boolean(item?.category === 'font' || (token && token.startsWith('font-')));
  const isService = Boolean(item?.category === 'services');
  const isInstalled = useAppStore((s) => Boolean(token && s.installed.includes(token)));
  const currentSizeClass = isFont ? (sizeClasses['128'] || "size-32") : (sizeClasses[size] || sizeClasses.md);

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

  const fontThumbnailUrl = isFont && token
    ? `https://yanbab.github.io/appfinder/font-thumbnails/${token}.png`
    : null;

  const rawIconUrl = item?.iconUrl || (item as any)?.thumbnailUrl || fontThumbnailUrl;
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
        hasIcon
          ? "bg-transparent dark:bg-transparent ring-0 border-0 shadow-none"
          : isService
          ? "bg-muted/60 dark:bg-muted/40 ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-2xs"
          : isFont
          ? "bg-transparent dark:bg-transparent shadow-none ring-0 border-0 rounded-none"
          : "bg-neutral-100 dark:bg-neutral-800/90 ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-2xs",
        isFont ? "size-32 w-32 h-32" : currentSizeClass,
        className
      )}
    >
      {hasIcon && activeIconUrl && (
        <img
          src={activeIconUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className={cn(
            "w-full h-full object-contain",
            isFont ? (isEmojiOrColorFont ? "rounded-none" : "dark:invert rounded-none") : "rounded-[inherit]",
            loaded ? "block" : "invisible"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
        />
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

