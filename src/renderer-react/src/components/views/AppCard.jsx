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
      className={`group relative flex flex-col justify-between p-3.5 rounded-xl border bg-card text-card-foreground shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
        isSelected ? 'border-primary ring-1 ring-primary/40 bg-accent/30' : 'border-border hover:border-border/80'
      }`}
    >
      <div className="flex items-start gap-3">
        <AppIcon item={item} size="lg" className="rounded-xl shadow-2xs" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
            {desc}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10px] text-muted-foreground/70 font-mono truncate max-w-[100px]">
          {item.token}
        </span>

        <div className="flex items-center gap-1.5">
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
    </div>
  );
}
