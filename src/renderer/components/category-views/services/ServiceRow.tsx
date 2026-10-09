import React, { useState } from 'react';
import type { CaskItem } from '@/types';
import { useShellStore, useAppStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { Button } from '../../Button';
import { ShellIcon } from '../../ShellIcon';
import { Switch } from '../../Switch';
import { getAppName } from '@/hooks/utils';

export interface ServiceRowProps {
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

const CATEGORY_LABELS: Record<string, string> = {
  database: 'Databases & Storage',
  webServer: 'Web & Proxies',
  cacheQueue: 'Cache & Messaging',
  aiLlm: 'AI & LLMs',
  networkingDns: 'Networking & DNS',
  monitoring: 'Monitoring',
  developerTools: 'Developer Daemons',
  otherServices: 'Services',
};

export function ServiceRow({ item, className }: ServiceRowProps) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const __ = useShellStore((s) => s.__);

  const serviceStatusMap = useAppStore((s) => s.serviceStatusMap);
  const refreshServiceStatuses = useAppStore((s) => s.refreshServiceStatuses);
  const { isRunning: isTaskRunning, isInstalled, install, uninstall } = useAppItemState(item);

  const [isToggling, setIsToggling] = useState(false);

  const isSelected = selectedApp?.token === item.token;
  const name = getAppName(item);
  const statusInfo = serviceStatusMap[item.token];
  const isStarted = statusInfo?.status === 'started';

  const categoryKey = item.secondCategory || 'otherServices';
  const iconName = CATEGORY_ICONS[categoryKey] || 'server.rack';
  const categoryLabel = CATEGORY_LABELS[categoryKey] || 'Services';

  const handleToggle = async (nextState: boolean) => {
    if (isToggling || isTaskRunning) return;
    setIsToggling(true);
    try {
      await window.ipc?.openApp(item.token, item.app || `service:${item.token}`);
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
      className={`app-card app-row group flex items-center justify-between pl-2 pr-4 py-2.5 bg-card text-card-foreground select-none cursor-default focus:outline-none focus-visible:bg-[var(--card-active-bg)] ${isSelected ? 'bg-[var(--card-active-bg)]' : ''
        } ${className || ''}`.trim()}
    >
      {/* Icon & Details */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
        <div className="size-12 rounded-[var(--radius-card)] bg-muted/60 dark:bg-muted/40 border border-black/5 dark:border-white/10 shadow-2xs flex items-center justify-center shrink-0">
          <ShellIcon name={iconName} className="size-6 text-foreground/80" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[13px] text-foreground truncate leading-snug">
              {name}
            </span>
            {item.version && (
              <span className="text-[10px] text-muted-foreground/80 font-mono">
                v{item.version}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {__(categoryLabel)}
            </span>
          </div>

          {item.serviceCommand && (
            <div className="mt-0.5">
              <code className="text-[11px] font-mono text-muted-foreground/90 bg-muted/50 px-1 py-0.2 rounded truncate block max-w-lg">
                $ {item.serviceCommand}
              </code>
            </div>
          )}

          {item.desc && (
            <p className="text-xs text-muted-foreground line-clamp-1 leading-snug mt-0.5">
              {item.desc}
            </p>
          )}
        </div>
      </div>

      {/* Status & Actions */}
      <div
        className="shrink-0 flex items-center gap-3"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isInstalled && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium mr-1 select-none">
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
        )}

        {isTaskRunning || isToggling ? (
          <Button
            variant="ghost"
            disabled
            icon={<ShellIcon name="spinner" className="size-4 animate-spin text-muted-foreground" />}
            title={__('Working...')}
          />
        ) : isInstalled ? (
          <div className="flex items-center gap-2">
            <Switch
              checked={isStarted}
              onChange={handleToggle}
              title={isStarted ? __('Stop service') : __('Start service')}
            />
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                uninstall();
              }}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              icon={<ShellIcon name="trash" className="size-4" />}
              title={__('Uninstall')}
            />
          </div>
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
    </div>
  );
}

export default ServiceRow;
