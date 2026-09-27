import React from 'react';
import { useShell } from '@/store/useShell';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/button';
import { getAppName, formatVersion } from '@/lib/utils';
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
      className={`app-card group relative flex items-start gap-3 p-2.5 rounded-lg bg-card text-card-foreground select-none cursor-default transition-none active:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        isSelected ? 'bg-muted/60' : ''
      }`}
    >
      <AppIcon item={item} size="grid" className="size-16 rounded-xl shadow-2xs shrink-0" />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-sm text-foreground truncate">
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
