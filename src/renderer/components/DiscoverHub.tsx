import React, { useMemo } from 'react';
import { useAppStore, useTermStore, useShellStore } from '@/stores';
import { ShellIcon } from './ShellIcon';
import { Button } from './Button';

function formatTimestamp(date: Date | string | null | undefined, __: (key: string) => string): string {
  if (!date) return __('Just now');
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return __('Just now');

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return timeStr;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return `${__('Yesterday')}, ${timeStr}`;
  }

  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DiscoverHub(): React.JSX.Element {
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const lastCheckedTime = useAppStore((s) => s.lastCheckedTime);
  const isCheckingUpdates = useAppStore((s) => s.isCheckingUpdates);
  const refreshUpdates = useAppStore((s) => s.refreshUpdates);

  const runningTasks = useTermStore((s) => s.runningTasks);
  const startAction = useTermStore((s) => s.startAction);

  const selectTab = useShellStore((s) => s.selectTab);
  const __ = useShellStore((s) => s.__);

  const updatesCount = useMemo(() => Object.keys(outdatedMap).length, [outdatedMap]);
  const isRefreshRunning = Boolean(runningTasks['refresh']);
  const isBusy = isRefreshRunning || isCheckingUpdates;

  const formattedTime = formatTimestamp(lastCheckedTime, __);

  const handleCheckUpdates = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBusy) return;
    if (window.ipc) {
      startAction('refresh', 'refresh');
    } else {
      refreshUpdates(true);
    }
  };

  return (
    <div
      className="w-full p-2 rounded-[var(--radius-card)] bg-gradient-to-b from-card via-card/95 to-card/85 text-card-foreground shadow-2xs flex items-center justify-between select-none cursor-default"
      role="region"
      aria-label="Discover Hub"
    >
      {/* Left: State 1 (Updates Available) or State 2 (All Up to Date) */}
      <div className="flex items-center min-w-0">
        {updatesCount > 0 ? (
          /* State 1: Updates Available with Theme Accent Gradient */
          <button
            type="button"
            onClick={() => selectTab('updates')}
            title={__('View Available Updates')}
            className="group/badge inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium cursor-default select-none transition-all duration-150 bg-gradient-to-r from-primary/22 via-primary/16 to-primary/10 text-foreground/85 hover:from-primary/30 hover:to-primary/18 hover:text-foreground active:from-primary/35 active:to-primary/22"
          >
            <span className="size-2 rounded-full bg-primary/90 shrink-0" />
            <span className="truncate">
              {updatesCount === 1
                ? __('1 update available')
                : (__('%d updates available') || '%d updates available').replace('%d', String(updatesCount))}
            </span>
          </button>
        ) : (
          /* State 2: Up to Date with Subtle Muted Gradient */
          <div
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium select-none bg-gradient-to-r from-muted/80 to-muted/50 text-muted-foreground/90"
          >
            <span className="size-2 rounded-full bg-muted-foreground/50 shrink-0" />
            <span className="truncate">{__('All apps up to date')}</span>
          </div>
        )}
      </div>

      {/* Middle: Last checked / updated timestamp */}
      <div className="text-xs text-muted-foreground/80 font-normal truncate px-2 select-none text-center">
        <span>{__('Last updated:')}</span>{' '}
        <span className="font-medium text-foreground/75">{formattedTime}</span>
      </div>

      {/* Right: Check for Updates Button */}
      <div className="flex items-center shrink-0">
        <Button
          variant="secondary"
          size="default"
          disabled={isBusy}
          onClick={handleCheckUpdates}
          icon={isBusy ? <ShellIcon name="spinner" className="size-3.5 animate-spin mr-1.5 text-muted-foreground" /> : undefined}
        >
          {isBusy ? __('Checking...') : __('Check for Updates')}
        </Button>
      </div>
    </div>
  );
}

export default DiscoverHub;
