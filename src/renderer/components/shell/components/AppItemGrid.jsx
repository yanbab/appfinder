import React from 'react';
import { useShell } from '@/hooks/useShell';
import { useAppItemState } from '@/hooks/useAppItemState';
import { AppIcon } from './AppIcon';
import { ShellButton } from './ShellButton';
import { ShellIcon } from './ShellIcon';
import { getAppName, formatVersion } from '@/hooks/utils';
import { Loader2, ArrowDownToLine, ArrowUpCircle, ExternalLink } from 'lucide-react';

export function AppItemGrid({ item }) {
  const { openAppInfo, selectedApp, outdatedMap, currentTab } = useShell();
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
      className={`app-card group relative flex items-center justify-between gap-2.5 p-2 rounded-[var(--radius-card)] bg-card text-card-foreground border border-[var(--card-border)] shadow-2xs select-none cursor-default focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 ${
        isSelected ? 'bg-[var(--card-active-bg)]' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
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

      {/* Single Icon Action Button */}
      <div
        className="shrink-0 mr-0.5 flex items-center"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isRunning ? (
          <ShellButton
            variant="ghost"
            disabled
            icon={<Loader2 className="size-4 animate-spin text-muted-foreground" />}
            title="Working..."
          />
        ) : isOutdated ? (
          <ShellButton
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              upgrade();
            }}
            icon={<ArrowUpCircle className="size-4 text-primary" />}
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
              icon={<ExternalLink className="size-4 text-muted-foreground group-hover:text-foreground" />}
              title="Open"
            />
          ) : (
            <ShellButton
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                uninstall();
              }}
              icon={<ShellIcon name="trash" className="size-4 text-muted-foreground hover:text-destructive" />}
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
            icon={<ArrowDownToLine className="size-4 text-muted-foreground group-hover:text-foreground" />}
            title="Install"
          />
        )}
      </div>
    </div>
  );
}

// Backward-compatible alias
export const AppCard = AppItemGrid;
