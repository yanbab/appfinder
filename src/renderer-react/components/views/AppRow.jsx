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
      className={`group flex items-center justify-between px-3.5 py-2.5 text-card-foreground transition-colors cursor-default select-none ${
        isSelected
          ? 'bg-accent/40'
          : 'hover:bg-muted/50'
      }`}
    >
      {/* Icon & Details */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
        <AppIcon item={item} size="row" className="size-12 rounded-xl shadow-2xs shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground truncate">
              {name}
            </span>
          </div>
          {desc && (
            <p className="text-xs text-muted-foreground truncate leading-snug mt-0.5">
              {desc}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
  );
}
