import React from 'react';
import { useShell } from '@/hooks/useShell';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/button';
import { getAppName, formatVersion } from '@/hooks/utils';
import { Loader2, Trash2 } from 'lucide-react';

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
      data-token={item.token}
      tabIndex={0}
      onClick={() => openAppInfo(item)}
      className={`app-card app-row group flex items-center justify-between px-3 py-2 bg-card text-card-foreground select-none cursor-default active:bg-[var(--card-active-bg)] focus:outline-none focus-visible:bg-[var(--card-active-bg)] ${
        isSelected ? 'bg-[var(--card-active-bg)]' : ''
      }`}
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
            <p className="text-xs text-muted-foreground truncate leading-snug mt-0.5">
              {desc}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isRunning ? (
          <Button size="sm" variant="secondary" disabled>
            <Loader2 className="size-3.5 animate-spin mr-1.5" />
            <span>{__('Working...')}</span>
          </Button>
        ) : isOutdated ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => startAction('upgrade', item.token)}
          >
            <span>{__('Upgrade')}</span>
          </Button>
        ) : isInstalled ? (
          <>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => startAction('uninstall', item.token)}
              className="text-muted-foreground active:text-destructive cursor-default"
              title="Uninstall"
            >
              <Trash2 className="size-4" />
            </Button>
            {item.app ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => startAction('open', item.token, item.app)}
              >
                <span>{__('Open')}</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled
                className="opacity-40 cursor-not-allowed"
              >
                <span>{__('Open')}</span>
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => startAction('install', item.token)}
          >
            <span>{__('Install')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
