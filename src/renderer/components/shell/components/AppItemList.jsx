import React from 'react';
import { useShellStore, useAppStore, useTermStore } from '@/stores';
import { AppIcon } from './AppIcon';
import { ShellButton } from './ShellButton';
import { ShellIcon } from './ShellIcon';
import { getAppName, formatVersion } from '@/hooks/utils';
import { Loader2 } from 'lucide-react';

export function AppItemList({ item }) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const currentTab = useShellStore((s) => s.currentTab);
  const __ = useShellStore((s) => s.__);
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const runningTasks = useTermStore((s) => s.runningTasks);
  const startAction = useTermStore((s) => s.startAction);

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
      role="button"
      onClick={() => openAppInfo(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openAppInfo(item);
        }
      }}
      className={`app-card app-row group flex items-center justify-between pl-2 pr-4 py-2 bg-card text-card-foreground select-none cursor-default focus:outline-none focus-visible:bg-[var(--card-active-bg)] ${isSelected ? 'bg-[var(--card-active-bg)]' : ''
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
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug mt-0.5">
              {desc}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isRunning ? (
          <ShellButton variant="secondary" disabled icon={<Loader2 className="size-3.5 animate-spin mr-1.5" />}>
            {__('Working...')}
          </ShellButton>
        ) : isOutdated ? (
          <ShellButton
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              startAction('upgrade', item.token);
            }}
          >
            {__('Upgrade')}
          </ShellButton>
        ) : isInstalled ? (
          <>
            <ShellButton
              icon={<ShellIcon name="trash" className="size-[18px]" />}
              onClick={(e) => {
                e.stopPropagation();
                startAction('uninstall', item.token);
              }}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20 [&:hover_svg]:text-destructive"
              title="Uninstall"
            />
            {item.app ? (
              <ShellButton
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  startAction('open', item.token, item.app);
                }}
              >
                {__('Open')}
              </ShellButton>
            ) : (
              <ShellButton
                variant="secondary"
                disabled
                className="opacity-40 cursor-not-allowed"
              >
                {__('Open')}
              </ShellButton>
            )}
          </>
        ) : (
          <ShellButton
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              startAction('install', item.token);
            }}
          >
            {__('Install')}
          </ShellButton>
        )}
      </div>
    </div>
  );
}

// Backward-compatible alias
export const AppRow = AppItemList;
