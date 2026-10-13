import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore, useAppStore } from '@/stores';
import { AppRow } from '../../AppRow';
import { AppIcon } from '../../AppIcon';
import { AppButtons } from '../../AppButtons';
import { getAppName, formatVersion, resolveAssetUrl } from '@/hooks/utils';

export interface FontRowProps {
  item: CaskItem;
  className?: string;
}

export function FontRow({ item, className }: FontRowProps) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const currentTab = useShellStore((s) => s.currentTab);
  const outdatedMap = useAppStore((s) => s.outdatedMap);

  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [item.token]);

  const rawUrl = item.screenshotUrl;
  const previewUrl = !hasError && rawUrl ? resolveAssetUrl(rawUrl) : null;

  if (!previewUrl) {
    return <AppRow item={item} className={`font-row ${className || ''}`.trim()} />;
  }

  const isSelected = selectedApp?.token === item.token;
  const isOutdated = Boolean(outdatedMap[item.token]);
  const name = getAppName(item);
  const desc = currentTab === 'updates' && isOutdated
    ? `${formatVersion(outdatedMap[item.token]?.installedVersion)} → ${formatVersion(outdatedMap[item.token]?.currentVersion)}`
    : (item.desc || '');

  return (
    <div
      data-token={item.token}
      tabIndex={0}
      role="button"
      onClick={() => openAppInfo(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openAppInfo(item);
        }
      }}
      className={`app-card app-row font-row group flex items-center justify-between pl-2 pr-4 py-2 bg-card text-card-foreground select-none cursor-default focus:outline-none focus-visible:bg-[var(--card-active-bg)] transition-colors ${isSelected ? 'bg-[var(--card-active-bg)]' : ''
        } ${className || ''}`.trim()}
    >
      {/* Icon & Font Preview + Description */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-4">
        <AppIcon item={item} size="row" className="size-12 rounded-[var(--radius-card)] shadow-2xs shrink-0" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className={`flex items-center min-w-0 overflow-hidden h-7 ${desc ? '-mt-1' : ''}`}>
            <img
              src={previewUrl}
              alt={name}
              loading="lazy"
              decoding="async"
              onError={() => setHasError(true)}
              className="h-7 max-h-7 w-auto max-w-none object-left select-none pointer-events-none dark:invert shrink-0"
            />
          </div>
          {desc && (
            <p className="text-xs text-muted-foreground truncate leading-snug mt-0.5">
              {desc}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions shared with standard AppRow */}
      <AppButtons item={item} variant="row" />
    </div>
  );
}

export default FontRow;


