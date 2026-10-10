import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { AppRow } from '../../AppRow';
import { Button } from '../../Button';
import { ShellIcon } from '../../ShellIcon';
import { getAppName } from '@/hooks/utils';

export interface FontRowProps {
  item: CaskItem;
  className?: string;
}

export function FontRow({ item, className }: FontRowProps) {
  const openAppInfo = useShellStore((s) => s.openAppInfo);
  const selectedApp = useShellStore((s) => s.selectedApp);
  const __ = useShellStore((s) => s.__);
  const { isRunning, isInstalled, install, open, uninstall } = useAppItemState(item);

  const hasIcon = Boolean(item.icon || item.iconUrl);

  if (!hasIcon) {
    return <AppRow item={item} className={`font-row ${className || ''}`.trim()} />;
  }

  const isSelected = selectedApp?.token === item.token;
  const name = getAppName(item);
  const previewUrl = `https://yanbab.github.io/appfinder/font-previews/${item.token}.png`;

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
      className={`app-card app-row font-row group flex items-center justify-between px-3 py-2 bg-card text-card-foreground select-none cursor-default focus:outline-none focus-visible:bg-[var(--card-active-bg)] transition-colors ${
        isSelected ? 'bg-[var(--card-active-bg)]' : ''
      } ${className || ''}`.trim()}
    >
      {/* Left / Center: Font Preview (64px height) */}
      <div className="flex items-center min-w-0 flex-1 mr-4 overflow-hidden h-16">
        <img
          src={previewUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          className="h-16 max-h-16 object-contain select-none pointer-events-none dark:invert shrink-0"
        />
      </div>

      {/* Right: Actions */}
      <div
        className="flex items-center gap-2 shrink-0 ml-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isInstalled ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={open}
              disabled={isRunning}
              icon={<ShellIcon name="play.fill" className="size-3" />}
            >
              {__('Open')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={uninstall}
              disabled={isRunning}
              title={__('Uninstall')}
              icon={<ShellIcon name="trash" className="size-3.5 text-muted-foreground hover:text-destructive" />}
            />
          </>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={install}
            disabled={isRunning}
            icon={
              isRunning ? (
                <ShellIcon name="spinner" className="size-3 animate-spin" />
              ) : (
                <ShellIcon name="arrow.down.to.line" className="size-3" />
              )
            }
          >
            {__('Install')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default FontRow;

