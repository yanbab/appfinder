import React, { useMemo } from 'react';
import { useAppStore, useTermStore, useShellStore, selectFilteredItems } from '@/stores';
import { AppList } from './AppList';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';

function formatLastChecked(date: Date | string | null | undefined, __: (key: string) => string): string {
  if (!date) return __('Never');
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return __('Never');

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `${__('Today')}, ${timeStr}`;
  }
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

export function AppListUpdates(): React.JSX.Element {
  const lastCheckedTime = useAppStore((s) => s.lastCheckedTime);
  const items = useAppStore((s) => s.items);
  const search = useAppStore((s) => s.search);
  const order = useAppStore((s) => s.order);
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const categories = useAppStore((s) => s.categories);

  const runningTasks = useTermStore((s) => s.runningTasks);
  const startAction = useTermStore((s) => s.startAction);
  const __ = useShellStore((s) => s.__);

  const filteredItems = useMemo(
    () => selectFilteredItems({ items, search, order, installed, outdatedMap, categories }, 'updates'),
    [items, search, order, installed, outdatedMap, categories]
  );
  const filteredCount = filteredItems.length;

  const isRefreshRunning = Boolean(runningTasks['refresh']);
  const formattedLastChecked = formatLastChecked(lastCheckedTime, __);

  // If empty and refreshing, show loading spinner state
  if (filteredCount === 0 && isRefreshRunning) {
    return <EmptyState loading />;
  }

  // If no updates available, show Empty state with refresh button and last check date
  if (filteredCount === 0) {
    return (
      <EmptyState
        icon="checkmark"
        title={__('Up to date')}
        subtitle={__('All installed casks are updated to their latest versions.')}
      >
        <div className="flex flex-col items-center gap-2">
          <Button
            disabled={isRefreshRunning}
            onClick={() => startAction('refresh', 'refresh')}
            icon={<ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className={`size-3.5 ${isRefreshRunning ? 'animate-spin' : ''}`} />}
          >
            {__('Refresh')}
          </Button>
          <div className="text-xs text-muted-foreground mt-1">
            {__('Last check :')} <span className="font-medium text-muted-foreground">{formattedLastChecked}</span>
          </div>
        </div>
      </EmptyState>
    );
  }

  const header = (
    <div className="flex items-center justify-between select-none">
      <h3 className="text-xs font-semibold text-muted-foreground">
        {filteredCount === 1
          ? __('1 update available')
          : (__('%d updates available') || '%d updates available').replace('%d', String(filteredCount))}
      </h3>

      <div className="flex items-center gap-2">
        <Button
          disabled={isRefreshRunning}
          onClick={() => startAction('refresh', 'refresh')}
          icon={<ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className={`size-3.5 ${isRefreshRunning ? 'animate-spin' : ''}`} />}
        >
          {__('Refresh')}
        </Button>

        {filteredCount >= 1 && (
          <Button
            variant="default"
            onClick={() => startAction('upgrade-all')}
          >
            {__('Update All')}
          </Button>
        )}
      </div>
    </div>
  );

  const footer = (
    <div className="text-center pt-1 pb-1 text-xs text-muted-foreground select-none">
      {__('Last check :')} {formattedLastChecked}
    </div>
  );

  return <AppList header={header} footer={footer} />;
}

export default AppListUpdates;
