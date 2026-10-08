import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore, useAppStore } from '@/stores';
import { AppIcon } from './AppIcon';
import { AppButtons } from './AppButtons';
import { Card } from './Card';
import { getAppName, formatVersion } from '@/hooks/utils';

export interface AppCardProps {
  item: CaskItem;
  className?: string;
}

export function AppCard({ item, className }: AppCardProps) {
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
    <Card
      variant="interactive"
      padding="default"
      selected={isSelected}
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
      className={`app-card relative flex items-center justify-between ${className || ''}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <AppIcon item={item} size="grid" className="size-14 rounded-[var(--radius-card)] shadow-2xs shrink-0" />
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <h3 className="font-semibold text-[13px] text-foreground truncate leading-snug">
            {name}
          </h3>
          {desc && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
              {desc}
            </p>
          )}
        </div>
      </div>

      <AppButtons item={item} variant="icon" />
    </Card>
  );
}

export default AppCard;
