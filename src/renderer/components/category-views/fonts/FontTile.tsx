import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { Card } from '../../Card';
import { Button } from '../../Button';
import { ShellIcon } from '../../ShellIcon';
import { AppIcon } from '../../AppIcon';
import { getAppName } from '@/hooks/utils';

export interface FontTileProps {
  item: CaskItem;
  className?: string;
}

export function FontTile({ item, className }: FontTileProps) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const __ = useShellStore((s) => s.__);
  const { isRunning, isInstalled, install, open } = useAppItemState(item);

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
      className={`app-card font-tile relative flex flex-col items-center justify-between aspect-square p-3 group select-none ${className || ''}`.trim()}
    >
      {/* Top action badge */}
      <div className="w-full flex items-center justify-end h-6">
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isRunning ? (
            <ShellIcon name="spinner" className="size-4 animate-spin text-muted-foreground" />
          ) : isInstalled ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              icon={<ShellIcon name="play.fill" className="size-3 text-muted-foreground hover:text-foreground" />}
              title={__('Open in Font Book')}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                install();
              }}
              icon={<ShellIcon name="arrow.down.to.line" className="size-3.5 text-muted-foreground hover:text-foreground" />}
              title={__('Install')}
            />
          )}
        </div>
      </div>

      {/* Large visual preview in center (Font Book style) */}
      <div
        className="flex-1 w-full flex items-center justify-center p-0 min-h-0 overflow-hidden transition-opacity"
        style={!isInstalled ? { opacity: 0.85 } : undefined}
      >
        <AppIcon
          item={item}
          size="128"
          className="w-full h-full object-contain shadow-none border-0 bg-transparent dark:bg-transparent"
        />
      </div>

      {/* Font Name & Info at bottom */}
      <div className="w-full text-center mt-1">
        <h3 className="font-semibold text-xs text-foreground truncate leading-tight">
          {name}
        </h3>
        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
          {isInstalled ? __('Installed') : __('Font')}
        </p>
      </div>
    </Card>
  );
}

export default FontTile;
