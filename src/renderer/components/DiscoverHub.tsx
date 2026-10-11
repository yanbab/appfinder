import React, { useMemo } from 'react';
import { useAppStore, useTermStore, useShellStore } from '@/stores';
import { ShellIcon } from './ShellIcon';
import { Button } from './Button';
import { Card } from './Card';

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
    <Card
      variant="hub"
      padding="default"
      className="w-full flex items-center justify-between gap-3 select-none"
      role="region"
      aria-label="Discover Hub"
    >
      {/* Left: State 1 (Updates Available) or State 2 (All Up to Date) + Timestamp */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {updatesCount > 0 ? (
          <button
            type="button"
            onClick={() => selectTab('updates')}
            title={__('View Available Updates')}
            className="group/badge inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium cursor-default select-none transition-all duration-150 bg-gradient-to-r from-primary/22 via-primary/16 to-primary/10 text-foreground/90 hover:from-primary/30 hover:to-primary/18 hover:text-foreground shrink-0"
          >
            <span className="size-2 rounded-full bg-primary shrink-0 animate-pulse" />
            <span className="font-semibold truncate">
              {updatesCount === 1
                ? __('1 update available')
                : (__('%d updates available') || '%d updates available').replace('%d', String(updatesCount))}
            </span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium select-none bg-muted/60 text-muted-foreground shrink-0">
            <span className="size-2 rounded-full bg-emerald-500/80 shrink-0" />
            <span className="truncate">{__('All apps up to date')}</span>
          </div>
        )}

        <span className="text-xs text-muted-foreground/40 hidden sm:inline select-none">•</span>

        <div className="text-xs text-muted-foreground/80 font-normal truncate select-none hidden sm:block">
          <span>{__('Last updated:')}</span>{' '}
          <span className="font-medium text-foreground/75">{formattedTime}</span>
        </div>
      </div>

      {/* Right: Check for Updates Button */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="default"
          disabled={isBusy}
          onClick={handleCheckUpdates}
          icon={
            isBusy ? (
              <ShellIcon name="spinner" className="size-3.5 animate-spin mr-1.5 text-muted-foreground" />
            ) : (
              <ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className="size-3.5 mr-1.5 text-muted-foreground" />
            )
          }
        >
          {isBusy ? __('Checking...') : __('Check for Updates')}
        </Button>
      </div>
    </Card>
  );
}

export default DiscoverHub;
