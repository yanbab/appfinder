import React from 'react';
import { useShell } from '@/hooks/useShell';
import { useAppItemState } from '@/hooks/useAppItemState';
import { AppIcon } from './AppIcon';
import { ShellButton } from './ShellButton';
import { ShellIcon } from './ShellIcon';
import { getAppName, formatVersion } from '@/hooks/utils';
import { Loader2 } from 'lucide-react';

export function AppItemList({ item }) {
  const {
    openAppInfo,
    selectedApp,
    outdatedMap,
    currentTab,
    __,
  } = useShell();

  const { isRunning, isInstalled, isOutdated, canOpen, install, upgrade, uninstall, open } = useAppItemState(item);

  const isSelected = selectedApp?.token === item.token;
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
        className="flex items-center gap-1.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isRunning ? (
          <ShellButton
            variant="secondary"
            size="sm"
            disabled
            icon={<Loader2 className="size-3.5 animate-spin shrink-0" />}
            title="Working..."
            className="w-7 sm:w-auto px-0 sm:px-2.5 justify-center"
          >
            <span className="hidden sm:inline ml-1">{__('Working...')}</span>
          </ShellButton>
        ) : isOutdated ? (
          <ShellButton
            variant="secondary"
            size="sm"
            onClick={upgrade}
            icon={<ShellIcon name="arrow.uturn.down" className="size-3.5 shrink-0 text-primary" />}
            title="Upgrade"
            className="w-7 sm:w-auto px-0 sm:px-2.5 justify-center"
          >
            <span className="hidden sm:inline ml-1">{__('Upgrade')}</span>
          </ShellButton>
        ) : isInstalled ? (
          <>
            <ShellButton
              variant="ghost"
              size="icon-sm"
              icon={<ShellIcon name="trash" className="size-[17px] text-muted-foreground hover:text-destructive" />}
              onClick={uninstall}
              className="hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20"
              title="Uninstall"
            />
            {canOpen ? (
              <ShellButton
                variant="secondary"
                size="sm"
                onClick={open}
                icon={<ShellIcon name="play" className="size-3.5 shrink-0" />}
                title="Open"
                className="w-7 sm:w-auto px-0 sm:px-2.5 justify-center"
              >
                <span className="hidden sm:inline ml-1">{__('Open')}</span>
              </ShellButton>
            ) : (
              <ShellButton
                variant="secondary"
                size="sm"
                disabled
                icon={<ShellIcon name="play" className="size-3.5 shrink-0" />}
                className="opacity-40 cursor-not-allowed w-7 sm:w-auto px-0 sm:px-2.5 justify-center"
                title="Open"
              >
                <span className="hidden sm:inline ml-1">{__('Open')}</span>
              </ShellButton>
            )}
          </>
        ) : (
          <ShellButton
            variant="secondary"
            size="sm"
            onClick={install}
            icon={<ShellIcon name="arrow.down.to.line" className="size-3.5 shrink-0" />}
            title="Install"
            className="w-7 sm:w-auto px-0 sm:px-2.5 justify-center"
          >
            <span className="hidden sm:inline ml-1">{__('Install')}</span>
          </ShellButton>
        )}
      </div>
    </div>
  );
}

// Backward-compatible alias
export const AppRow = AppItemList;
