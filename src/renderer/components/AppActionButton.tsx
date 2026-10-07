import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore, useTermStore } from '@/stores';
import { useAppItemState } from '@/hooks/useAppItemState';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';
import { formatReason } from '@/hooks/utils';

export interface AppActionButtonProps {
  item: CaskItem;
  variant?: 'icon' | 'row' | 'hero' | 'panel';
  className?: string;
  caskStatus?: { isDisabled?: boolean; isDeprecated?: boolean; disableReason?: string; deprecationReason?: string };
}

export function AppActionButton({
  item,
  variant = 'row',
  className,
  caskStatus,
}: AppActionButtonProps) {
  const __ = useShellStore((s) => s.__);
  const startAction = useTermStore((s) => s.startAction);
  const { isRunning, isInstalled, isOutdated, canOpen, install, upgrade, uninstall, open } = useAppItemState(item);

  // Stop propagation helper for cards / rows
  const stopProp = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  // 1. ICON MODE (Used in Grid/Cards)
  if (variant === 'icon') {
    return (
      <div
        className={`shrink-0 flex items-center ${className || ''}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isRunning ? (
          <Button
            variant="ghost"
            disabled
            icon={<ShellIcon name="spinner" className="size-4 animate-spin text-muted-foreground" />}
            title={__('Working...')}
          />
        ) : isOutdated ? (
          <Button
            variant="ghost"
            onClick={stopProp(upgrade)}
            icon={<ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className="size-4" />}
            title={__('Upgrade')}
          />
        ) : isInstalled ? (
          canOpen ? (
            <Button
              variant="ghost"
              onClick={stopProp(open)}
              icon={<ShellIcon name="play.fill" className="size-3.5" />}
              title={__('Open')}
            />
          ) : (
            <Button
              variant="ghost"
              onClick={stopProp(uninstall)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20 [&:hover_svg]:text-destructive"
              icon={<ShellIcon name="trash" className="size-4" />}
              title={__('Uninstall')}
            />
          )
        ) : (
          <Button
            variant="ghost"
            onClick={stopProp(install)}
            icon={<ShellIcon name="arrow.down.to.line" className="size-4" />}
            title={__('Install')}
          />
        )}
      </div>
    );
  }

  // 2. HERO MODE (Used in Featured Carousel / Banner)
  if (variant === 'hero') {
    return (
      <div className={`pt-0.5 flex items-center gap-2 ${className || ''}`} onClick={(e) => e.stopPropagation()}>
        {isRunning ? (
          <Button size="sm" variant="secondary" disabled className="bg-white/20 text-white border-0">
            <ShellIcon name="spinner" className="size-3.5 animate-spin mr-1.5" />
            <span>{__('Working...')}</span>
          </Button>
        ) : isOutdated ? (
          <Button
            size="sm"
            onClick={stopProp(upgrade)}
            className="bg-white hover:bg-white/90 text-black font-medium border-0 cursor-default"
          >
            <span>{__('Upgrade')}</span>
          </Button>
        ) : isInstalled ? (
          canOpen ? (
            <Button
              size="sm"
              onClick={stopProp(open)}
              className="bg-white hover:bg-white/90 text-black font-medium border-0 cursor-default"
            >
              <span>{__('Open')}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              className="bg-white/30 text-white font-medium border-0 cursor-not-allowed"
            >
              <span>{__('Open')}</span>
            </Button>
          )
        ) : (
          <Button
            size="sm"
            onClick={stopProp(install)}
            className="bg-white hover:bg-white/90 text-black font-medium border-0 cursor-default"
          >
            <span>{__('Install')}</span>
          </Button>
        )}
      </div>
    );
  }

  // 3. PANEL MODE (Used in InfoPanel)
  if (variant === 'panel') {
    return (
      <div className={`flex items-center gap-2 pt-0.5 ${className || ''}`}>
        {isRunning ? (
          <Button className="w-full gap-2" variant="secondary" disabled icon={<ShellIcon name="spinner" className="size-3.5 animate-spin" />}>
            {__('Working...')}
          </Button>
        ) : (
          <>
            {isOutdated && (
              <Button
                className="flex-1"
                variant="default"
                onClick={() => startAction('upgrade', item.token)}
              >
                {__('Upgrade')}
              </Button>
            )}

            {isInstalled && item.app && !isOutdated && (
              <Button
                className="flex-1"
                variant="default"
                onClick={() => startAction('open', item.token, item.app ?? undefined)}
              >
                {__('Open')}
              </Button>
            )}

            {isInstalled && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => startAction('uninstall', item.token)}
              >
                {__('Delete')}
              </Button>
            )}

            {!isInstalled && caskStatus?.isDisabled ? (
              <Button
                className="w-full opacity-60 cursor-not-allowed"
                variant="secondary"
                disabled
                title={formatReason(caskStatus.disableReason || '', __) || __('Cask Disabled')}
              >
                {__('Disabled')}
              </Button>
            ) : !isInstalled ? (
              <Button
                className="w-full"
                variant="default"
                onClick={() => startAction('install', item.token)}
              >
                {__('Install')}
              </Button>
            ) : null}
          </>
        )}
      </div>
    );
  }

  // 4. ROW / COMPACT MODE (Used in List View)
  return (
    <div
      className={`flex items-center gap-2 shrink-0 ${className || ''}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {isRunning ? (
        <Button variant="secondary" disabled icon={<ShellIcon name="spinner" className="size-3.5 animate-spin mr-1.5" />}>
          {__('Working...')}
        </Button>
      ) : isOutdated ? (
        <Button variant="secondary" onClick={stopProp(upgrade)}>
          {__('Upgrade')}
        </Button>
      ) : isInstalled ? (
        <>
          <Button
            icon={<ShellIcon name="trash" className="size-[18px]" />}
            onClick={stopProp(uninstall)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20 [&:hover_svg]:text-destructive"
            title={__('Uninstall')}
          />
          {item.app ? (
            <Button variant="secondary" onClick={stopProp(open)}>
              {__('Open')}
            </Button>
          ) : (
            <Button variant="secondary" disabled className="opacity-40 cursor-not-allowed">
              {__('Open')}
            </Button>
          )}
        </>
      ) : (
        <Button variant="secondary" onClick={stopProp(install)}>
          {__('Install')}
        </Button>
      )}
    </div>
  );
}

export default AppActionButton;
