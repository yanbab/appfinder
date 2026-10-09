import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { Button } from '../../Button';
import { ShellIcon } from '../../ShellIcon';
import { AppIcon } from '../../AppIcon';
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
      className={`app-card app-row font-row group flex items-center justify-between px-3 py-2.5 bg-card text-card-foreground select-none cursor-default focus:outline-none focus-visible:bg-[var(--card-active-bg)] transition-colors ${isSelected ? 'bg-[var(--card-active-bg)]' : ''
        } ${className || ''}`.trim()}
    >
      {/* Left: Font Thumbnail & Identity */}
      <div className="flex items-center gap-3.5 min-w-0 w-64 shrink-0 mr-4">
        <AppIcon
          item={item}
          size="48"
          className="size-12 rounded-[var(--radius-card)] shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[13px] text-foreground truncate leading-snug">
              {name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground truncate">
              {item.secondCategory ? item.secondCategory : __('Font Family')}
            </span>
            {item.version && (
              <span className="text-[10px] text-muted-foreground/70 font-mono">
                v{item.version}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Font Specimen Banner (Apple Font Book style preview) */}
      <div className="hidden md:flex flex-1 items-center min-w-0 px-4 mr-4 text-muted-foreground/90 font-serif italic text-sm truncate tracking-wide border-x border-border/20">
        <span className="truncate">
          “The quick brown fox jumps over the lazy dog”
        </span>
      </div>

      {/* Right: Actions & Status */}
      <div
        className="flex items-center gap-2 shrink-0 ml-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isInstalled ? (
          <>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20 mr-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {__('Installed')}
            </span>
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
