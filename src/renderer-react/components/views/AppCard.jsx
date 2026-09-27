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
    : (item.desc || 'No description available');

  return (
    <div
      onClick={() => openAppInfo(item)}
      className={`group relative flex flex-col justify-between p-3.5 rounded-xl bg-transparent text-card-foreground select-none cursor-default transition-none active:bg-muted/50 ${
        isSelected ? 'bg-accent/40 ring-1 ring-primary/40' : ''
      }`}
    >
      <div className="flex items-start gap-3.5">
        <AppIcon item={item} size="grid" className="size-16 rounded-2xl shadow-2xs shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
            {desc}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-muted-foreground/70 font-mono truncate max-w-[100px]">
          {item.token}
        </span>

        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <Button size="xs" variant="secondary" disabled className="gap-1.5 text-xs">
              <Loader2 className="size-3 animate-spin" />
              <span>{__('Working...')}</span>
            </Button>
          ) : isOutdated ? (
            <Button
              size="xs"
              variant="default"
              onClick={() => startAction('upgrade', item.token)}
              className="gap-1.5 text-xs"
            >
              <UpgradeIcon className="size-3.5" />
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
                <TrashIcon className="size-3.5" />
              </Button>
              {item.app && (
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => startAction('open', item.token, item.app)}
                  className="gap-1.5 text-xs"
                >
                  <OpenIcon className="size-3.5" />
                  <span>{__('Open')}</span>
                </Button>
              )}
            </>
          ) : (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => startAction('install', item.token)}
              className="gap-1.5 text-xs"
            >
              <InstallIcon className="size-3.5" />
              <span>{__('Install')}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
