import React, { useMemo } from 'react';
import { useAppStore, useTermStore, useShellStore, selectFilteredItems } from '@/stores';
import { formatDate } from '@/hooks/utils';
import { AppList } from './AppList';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';

export function AppListUpdates(): React.JSX.Element {
  const lastCheckedTime = useAppStore((s) => s.lastCheckedTime);
  const items = useAppStore((s) => s.items);
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
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
  const formattedLastChecked = lastCheckedTime ? formatDate(lastCheckedTime, __) : __('Never');
  const isSearchActive = Boolean(search && search.trim().length > 0);

  // If empty and refreshing, show loading spinner state
  if (filteredCount === 0 && isRefreshRunning) {
    return <EmptyState loading />;
  }

  // If no updates available:
  if (filteredCount === 0) {
    if (isSearchActive) {
      return (
        <EmptyState
          icon="magnifyingglass"
          title={__('No casks found')}
          subtitle={__('Try adjusting your search or category filter.')}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSearch('')}
          >
            {__('Clear search')}
          </Button>
        </EmptyState>
      );
    }

    return (
      <EmptyState
        icon="checkmark"
        title={__('Up to date')}
        subtitle={`${__('Last check :')} ${formattedLastChecked}`}
      >
        <Button
          disabled={isRefreshRunning}
          onClick={() => startAction('refresh', 'refresh')}
          icon={<ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className={`size-3.5 ${isRefreshRunning ? 'animate-spin' : ''}`} />}
        >
          {__('Refresh')}
        </Button>
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

  return <AppList header={header} />;
}

export default AppListUpdates;
