import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { useServiceControl } from '@/hooks/useServiceControl';
import { Card } from '../../Card';
import { Switch } from '../../Switch';
import { AppIcon } from '../../AppIcon';
import { AppButtons } from '../../AppButtons';
import { getAppName } from '@/hooks/utils';

export interface ServiceTileProps {
  item: CaskItem;
  className?: string;
}

export function ServiceTile({ item, className }: ServiceTileProps) {
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
      className={`app-card relative flex items-center justify-between ${className || ''}`.trim()}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <AppIcon item={item} size="64" className="size-16 rounded-[var(--radius-card)] shrink-0" />

        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <h3 className="font-semibold text-[13px] text-foreground truncate leading-snug">
            {name}
          </h3>

          {isInstalled ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium leading-snug mt-0.5 select-none">
              <span className={`size-2 rounded-full shrink-0 ${statusDotClass}`} />
              <span className={statusTextClass}>{statusLabel}</span>
            </div>
          ) : (
            item.desc && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
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
        <AppButtons item={item} variant="icon" />
      )}
    </Card>
  );
}

export default ServiceTile;
