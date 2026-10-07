import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore, useAppStore } from '@/stores';
import { AppIcon } from './AppIcon';
import { AppActionButton } from './AppActionButton';
import { getAppName, formatVersion } from '@/hooks/utils';

export interface AppRowProps {
  item: CaskItem;
  className?: string;
}

export function AppRow({ item, className }: AppRowProps) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const currentTab = useShellStore((s) => s.currentTab);
  const outdatedMap = useAppStore((s) => s.outdatedMap);

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
      className={`app-card app-row group flex items-center justify-between pl-2 pr-4 py-2 bg-card text-card-foreground select-none cursor-default focus:outline-none focus-visible:bg-[var(--card-active-bg)] ${
        isSelected ? 'bg-[var(--card-active-bg)]' : ''
      } ${className || ''}`}
    >
      {/* Icon & Details */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
        <AppIcon item={item} size="row" className="size-12 rounded-[var(--radius-card)] shadow-2xs shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[13px] text-foreground truncate leading-snug">
              {name}
            </span>
          </div>
          {desc && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug mt-0.5">
              {desc}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <AppActionButton item={item} variant="row" />
    </div>
  );
}

// Backward-compatible alias
export const AppItemList = AppRow;
export default AppRow;
