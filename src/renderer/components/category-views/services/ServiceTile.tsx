import React, { useState } from 'react';
import type { CaskItem } from '@/types';
import { useShellStore, useAppStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { Card } from '../../Card';
import { Button } from '../../Button';
import { ShellIcon } from '../../ShellIcon';
import { Switch } from '../../Switch';
import { getAppName } from '@/hooks/utils';

export interface ServiceTileProps {
  item: CaskItem;
  className?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  database: 'cylinder',
  webServer: 'network',
  cacheQueue: 'tray.2',
  aiLlm: 'sparkles',
  networkingDns: 'antenna.radiowaves.left.and.right',
  monitoring: 'chart.xyaxis.line',
  developerTools: 'hammer',
  otherServices: 'server.rack',
};

export function ServiceTile({ item, className }: ServiceTileProps) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const __ = useShellStore((s) => s.__);

  const serviceStatusMap = useAppStore((s) => s.serviceStatusMap);
  const refreshServiceStatuses = useAppStore((s) => s.refreshServiceStatuses);
  const { isRunning: isTaskRunning, isInstalled, install } = useAppItemState(item);

  const [isToggling, setIsToggling] = useState(false);

  const isSelected = selectedApp?.token === item.token;
  const name = getAppName(item);
  const statusInfo = serviceStatusMap[item.token];
  const isStarted = statusInfo?.status === 'started';

  const categoryKey = item.secondCategory || 'otherServices';
  const iconName = CATEGORY_ICONS[categoryKey] || 'server.rack';

  const handleToggle = async (nextState: boolean) => {
    if (isToggling || isTaskRunning) return;
    setIsToggling(true);
    try {
      await window.ipc?.openApp(item.token, item.app || `service:${item.token}`);
      // Refresh status after toggling daemon
      setTimeout(() => {
        refreshServiceStatuses();
        setIsToggling(false);
      }, 500);
    } catch (err) {
      console.error('Failed to toggle service:', err);
      setIsToggling(false);
    }
  };

  return (
    <Card
      variant="interactive"
      padding="default"
      selected={isSelected}
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
      className={`app-card relative flex items-center justify-between gap-3 ${className || ''}`.trim()}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="size-14 rounded-[var(--radius-card)] bg-muted/60 dark:bg-muted/40 border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-center shrink-0">
          <ShellIcon name={iconName} className="size-7 text-foreground/80" />
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-semibold text-[13px] text-foreground truncate leading-snug">
              {name}
            </h3>
            {item.version && (
              <span className="text-[10px] text-muted-foreground/80 font-mono shrink-0">
                v{item.version}
              </span>
            )}
          </div>

          {item.desc && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
              {item.desc}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1 select-none">
            {isInstalled ? (
              <div className="inline-flex items-center gap-1 text-[11px] font-medium leading-none">
                <span
                  className={`size-2 rounded-full shrink-0 ${isStarted
                      ? 'bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50'
                      : 'bg-neutral-400 dark:bg-neutral-600'
                    }`}
                />
                <span className={isStarted ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'}>
                  {isStarted ? (statusInfo?.pid ? `${__('Running')} (${statusInfo.pid})` : __('Running')) : __('Stopped')}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground/70">
                {__('Not Installed')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Switch / Button */}
      <div
        className="shrink-0 flex items-center"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isTaskRunning || isToggling ? (
          <Button
            variant="ghost"
            disabled
            icon={<ShellIcon name="spinner" className="size-4 animate-spin text-muted-foreground" />}
            title={__('Working...')}
          />
        ) : isInstalled ? (
          <Switch
            checked={isStarted}
            onChange={handleToggle}
            title={isStarted ? __('Stop service') : __('Start service')}
          />
        ) : (
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              install();
            }}
            icon={<ShellIcon name="arrow.down.to.line" className="size-4" />}
            title={__('Install')}
          />
        )}
      </div>
    </Card>
  );
}

export default ServiceTile;
