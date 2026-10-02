import React from 'react';
import { useShell } from '@/hooks/useShell';
import { AppList } from './AppList';
import { Empty } from './Empty';
import { ShellButton, ShellIcon } from '@/components/shell/components';

function formatLastChecked(date, __) {
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

export function AppListUpdates() {
  const {
    filteredCount,
    startAction,
    runningTasks,
    isRefreshing,
    lastCheckedTime,
    __,
  } = useShell();

  const isRefreshRunning = Boolean(runningTasks['refresh']) || isRefreshing;
  const formattedLastChecked = formatLastChecked(lastCheckedTime, __);

  // If empty and refreshing, show loading spinner state
  if (filteredCount === 0 && isRefreshRunning) {
    return <Empty loading />;
  }

  // If no updates available, show Empty state with refresh button and last check date
  if (filteredCount === 0) {
    return (
      <Empty
        icon="checkmark"
        title={__('Up to date')}
        subtitle={__('All installed casks are updated to their latest versions.')}
      >
        <div className="flex flex-col items-center gap-2">
          <ShellButton
            disabled={isRefreshRunning}
            onClick={() => startAction('refresh', 'refresh')}
            icon={<ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className={`size-3.5 ${isRefreshRunning ? 'animate-spin' : ''}`} />}
          >
            {__('Refresh')}
          </ShellButton>
          <div className="text-xs text-muted-foreground mt-1">
            {__('Last check :')} <span className="font-medium text-muted-foreground">{formattedLastChecked}</span>
          </div>
        </div>
      </Empty>
    );
  }

  const header = (
    <div className="flex items-center justify-between select-none">
      <h3 className="text-xs font-semibold text-muted-foreground">
        {filteredCount === 1
          ? __('1 update available')
          : (__('%d updates available') || '%d updates available').replace('%d', filteredCount)}
      </h3>

      <div className="flex items-center gap-2">
        <ShellButton
          disabled={isRefreshRunning}
          onClick={() => startAction('refresh', 'refresh')}
          icon={<ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className={`size-3.5 ${isRefreshRunning ? 'animate-spin' : ''}`} />}
        >
          {__('Refresh')}
        </ShellButton>

        {filteredCount >= 1 && (
          <ShellButton
            variant="default"
            onClick={() => startAction('upgrade-all')}
          >
            {__('Update All')}
          </ShellButton>
        )}
      </div>
    </div>
  );

  const footer = (
    <div className="text-center pt-2 pb-3 text-xs text-muted-foreground select-none">
      {__('Last check :')} {formattedLastChecked}
    </div>
  );

  return <AppList header={header} footer={footer} />;
}

// Backward-compatible alias
export const AppListUpdatesView = AppListUpdates;
export default AppListUpdates;
