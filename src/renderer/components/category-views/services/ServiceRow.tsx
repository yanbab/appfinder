import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { useServiceControl } from '@/hooks/useServiceControl';
import { Switch } from '../../Switch';
import { AppIcon } from '../../AppIcon';
import { AppButtons } from '../../AppButtons';
import { getAppName } from '@/hooks/utils';

export interface ServiceRowProps {
  item: CaskItem;
  className?: string;
}

export function ServiceRow({ item, className }: ServiceRowProps) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const __ = useShellStore((s) => s.__);
  const { isInstalled } = useAppItemState(item);

  const {
    isPending,
    switchChecked,
    statusLabel,
    statusDotClass,
    statusTextClass,
    handleToggle,
  } = useServiceControl(item);

  const isSelected = selectedApp?.token === item.token;
  const name = getAppName(item);

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
      className={`app-card app-row group flex items-center justify-between pl-2 pr-4 py-2 bg-card text-card-foreground select-none cursor-default focus:outline-none focus-visible:bg-[var(--card-active-bg)] ${isSelected ? 'bg-[var(--card-active-bg)]' : ''
        } ${className || ''}`.trim()}
    >
      {/* Icon & Details */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
        <AppIcon item={item} size="row" className="size-12 rounded-[var(--radius-card)] shadow-2xs shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[13px] text-foreground truncate leading-snug">
              {name}
            </span>
          </div>

          {isInstalled ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium leading-snug mt-0.5 select-none">
              <span className={`size-2 rounded-full shrink-0 ${statusDotClass}`} />
              <span className={statusTextClass}>{statusLabel}</span>
            </div>
          ) : (
            item.desc && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-snug mt-0.5">
                {item.desc}
              </p>
            )
          )}
        </div>
      </div>

      {/* Action: Switch toggle when installed, otherwise standard AppButtons */}
      {isInstalled ? (
        <div
          className="shrink-0 flex items-center"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Switch
            checked={switchChecked}
            disabled={isPending}
            onChange={handleToggle}
            title={switchChecked ? __('Stop service') : __('Start service')}
          />
        </div>
      ) : (
        <AppButtons item={item} variant="row" />
      )}
    </div>
  );
}

export default ServiceRow;
