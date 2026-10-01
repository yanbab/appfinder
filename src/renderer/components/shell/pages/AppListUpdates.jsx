import React from 'react';
import { useShell } from '@/hooks/useShell';
import { AppList } from './AppList';
import { ShellButton } from '@/components/shell/components';
import { RefreshCw } from 'lucide-react';

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

  const header = (
    <div className="flex items-center justify-between select-none">
      <h2 className="text-base font-semibold text-foreground tracking-tight">
        {filteredCount > 0
          ? (filteredCount === 1
              ? __('1 update available')
              : (__('%d updates available') || '%d updates available').replace('%d', filteredCount))
          : __('Updates')}
      </h2>

      <div className="flex items-center gap-2">
        <ShellButton
          variant="outline"
          disabled={isRefreshRunning}
          onClick={() => startAction('refresh', 'refresh')}
          icon={<RefreshCw className={`size-3.5 ${isRefreshRunning ? 'animate-spin' : ''}`} />}
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
      {__('Last check :')} <span className="font-medium text-foreground/80">{formattedLastChecked}</span>
    </div>
  );

  return <AppList header={header} footer={footer} />;
}

// Backward-compatible alias
export const AppListUpdatesView = AppListUpdates;
