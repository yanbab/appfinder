import React from 'react';
import { useShell } from '@/store/useShell';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/button';
import { getAppName, formatVersion } from '@/lib/utils';
import { UpgradeIcon, OpenIcon, InstallIcon, TrashIcon } from '@/components/ui/icons';
import { Loader2 } from 'lucide-react';

export function AppRow({ item }) {
  const {
    openAppInfo,
    selectedApp,
    installed,
    outdatedMap,
    runningTasks,
    currentTab,
    startAction,
    __,
  } = useShell();

  const isSelected = selectedApp?.token === item.token;
  const isRunning = Boolean(runningTasks[item.token]);
  const isInstalled = installed.includes(item.token);
  const isOutdated = Boolean(outdatedMap[item.token]);

  const name = getAppName(item);
  const desc = currentTab === 'updates' && isOutdated
    ? `${formatVersion(outdatedMap[item.token].installedVersion)} → ${formatVersion(outdatedMap[item.token].currentVersion)}`
    : (item.desc || '');

  return (
    <div
      onClick={() => openAppInfo(item)}
      className={`group flex items-center justify-between px-3 py-2 rounded-lg border text-card-foreground transition-all cursor-pointer ${
        isSelected
          ? 'bg-accent/40 border-primary/50'
          : 'bg-card/40 border-transparent hover:border-border/60 hover:bg-card/80'
      }`}
    >
      {/* Icon & Details */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
        <AppIcon item={item} size="md" className="rounded-lg shadow-2xs" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
              {name}
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-mono truncate hidden sm:inline">
              {item.token}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate leading-snug">
            {desc}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isRunning ? (
          <Button size="xs" variant="secondary" disabled className="gap-1 text-[11px]">
            <Loader2 className="size-3 animate-spin" />
            <span>{__('Working...')}</span>
          </Button>
        ) : isOutdated ? (
          <Button
            size="xs"
            variant="default"
            onClick={() => startAction('upgrade', item.token)}
            className="gap-1 text-[11px]"
          >
            <UpgradeIcon className="size-3" />
            <span>{__('Upgrade')}</span>
          </Button>
        ) : isInstalled ? (
          <>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => startAction('uninstall', item.token)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Uninstall"
            >
              <TrashIcon className="size-3" />
            </Button>
            {item.app && (
              <Button
                size="xs"
                variant="secondary"
                onClick={() => startAction('open', item.token, item.app)}
                className="gap-1 text-[11px]"
              >
                <OpenIcon className="size-3" />
                <span>{__('Open')}</span>
              </Button>
            )}
          </>
        ) : (
          <Button
            size="xs"
            variant="secondary"
            onClick={() => startAction('install', item.token)}
            className="gap-1 text-[11px]"
          >
            <InstallIcon className="size-3" />
            <span>{__('Install')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
