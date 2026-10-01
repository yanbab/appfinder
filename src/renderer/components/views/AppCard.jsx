import React from 'react';
import { useShell } from '@/hooks/useShell';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/button';
import { getAppName, formatVersion } from '@/hooks/utils';
import { UpgradeIcon, OpenIcon, InstallIcon, TrashIcon } from '@/components/ui/icons';
import { Loader2 } from 'lucide-react';

export function AppCard({ item }) {
  const {
    openAppInfo,
    selectedApp,
    outdatedMap,
    currentTab,
  } = useShell();

  const isSelected = selectedApp?.token === item.token;
  const isOutdated = Boolean(outdatedMap[item.token]);

  const name = getAppName(item);
  const desc = currentTab === 'updates' && isOutdated
    ? `${formatVersion(outdatedMap[item.token].installedVersion)} → ${formatVersion(outdatedMap[item.token].currentVersion)}`
    : (item.desc || '');

  return (
    <div
      data-token={item.token}
      tabIndex={0}
      onClick={() => openAppInfo(item)}
      className={`app-card group relative flex items-center gap-2.5 p-2 rounded-[var(--radius-card)] bg-card text-card-foreground border border-[var(--card-border)] shadow-2xs select-none cursor-default active:bg-[var(--card-active-bg)] focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 ${
        isSelected ? 'bg-[var(--card-active-bg)]' : ''
      }`}
    >
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
  );
}
