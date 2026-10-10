import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { Card } from '../../Card';
import { AppButtons } from '../../AppButtons';
import { AppIcon } from '../../AppIcon';
import { getAppName } from '@/hooks/utils';

export interface FontTileProps {
  item: CaskItem;
  className?: string;
}

export function FontTile({ item, className }: FontTileProps) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const { isInstalled } = useAppItemState(item);

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
      className={`app-card font-tile relative flex flex-col items-center justify-between aspect-square p-2 group select-none ${className || ''}`.trim()}
    >
      {/* Top action button (same level as top of icon) */}
      <div className="absolute top-2 right-2 z-10">
        <AppButtons item={item} variant="icon" />
      </div>

      {/* Visual preview at top (fixed 128x128px, same level as button) */}
      <div
        className="w-full flex items-center justify-center p-0 shrink-0 transition-opacity"
        style={!isInstalled ? { opacity: 0.85 } : undefined}
      >
        <AppIcon
          item={item}
          size="128"
          className="size-32 w-32 h-32 shrink-0 object-contain shadow-none border-0 bg-transparent dark:bg-transparent"
        />
      </div>

      {/* Font Name moved up directly under icon (secondary text) */}
      <div className="w-full text-center -mt-2 pb-0.5 shrink-0 px-1">
        <span className="text-[11px] font-normal text-muted-foreground truncate block leading-tight">
          {name}
        </span>
      </div>
    </Card>
  );
}

export default FontTile;
