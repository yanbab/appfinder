import React from 'react';
import { useShellStore, useAppStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { AppIcon } from './AppIcon';
import { ShellButton } from './ShellButton';
import { ShellIcon } from './ShellIcon';
import { getAppName, formatVersion } from '@/hooks/utils';

export function AppItemGrid({ item }) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const currentTab = useShellStore((s) => s.currentTab);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
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
      className={`app-card relative flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-card text-card-foreground shadow-2xs select-none cursor-default focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 ${
        isSelected ? 'bg-[var(--card-active-bg)]' : ''
      }`}
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

      {/* Single Icon Action Button (0px gap with column, no card hover highlight) */}
      <div
        className="shrink-0 flex items-center"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isRunning ? (
          <ShellButton
            variant="ghost"
            disabled
            icon={<ShellIcon name="spinner" className="size-4 animate-spin text-muted-foreground" />}
            title="Working..."
          />
        ) : isOutdated ? (
          <ShellButton
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              upgrade();
            }}
            icon={<ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className="size-4" />}
            title="Upgrade"
          />
        ) : isInstalled ? (
          canOpen ? (
            <ShellButton
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              icon={<ShellIcon name="play.fill" className="size-3.5" />}
              title="Open"
            />
          ) : (
            <ShellButton
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                uninstall();
              }}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20 [&:hover_svg]:text-destructive"
              icon={<ShellIcon name="trash" className="size-4" />}
              title="Uninstall"
            />
          )
        ) : (
          <ShellButton
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              install();
            }}
            icon={<ShellIcon name="arrow.down.to.line" className="size-4" />}
            title="Install"
          />
        )}
      </div>
    </div>
  );
}

// Backward-compatible alias
export const AppCard = AppItemGrid;
