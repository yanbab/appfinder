import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
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
      className={`app-card font-tile relative w-full flex flex-col items-center justify-between p-2 pb-2.5 group select-none ${className || ''}`.trim()}
    >
      {/* Top action button: top right */}
      <div className="absolute top-2 right-2 z-10">
        <AppButtons item={item} variant="icon" />
      </div>

      {/* Specimen thumbnail with 5px margin left and right */}
      <div className="w-full mx-[5px] flex items-center justify-center shrink-0">
        <AppIcon
          item={item}
          size="128"
          className="size-32 w-32 h-32 shrink-0 object-contain shadow-none border-0 bg-transparent dark:bg-transparent"
        />
      </div>

      {/* Font title: 10px down from thumbnail, centered */}
      <div className="w-full text-center mt-[10px] px-1 shrink-0">
        <span className="text-[11px] font-medium text-foreground truncate block leading-tight">
          {name}
        </span>
      </div>
    </Card>
  );
}

export default FontTile;


