import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { InfoSectionCard } from '../InfoSectionCard';
import { InfoCopyButton } from '../InfoCopyButton';
import { Button } from '../Button';

export interface AppPackageCardProps {
  item: CaskItem;
  appDetails: any;
  isInstalled: boolean;
}

export function AppPackageCard({ item, appDetails, isInstalled }: AppPackageCardProps) {
  const __ = useShellStore((s) => s.__);

  const bundleId = appDetails?.bundleId || null;
  const binaries: string[] = appDetails?.binaries || [];
  const autoUpdates = appDetails?.autoUpdates;
  const appPath = item.app
    ? (item.app.startsWith('/') || item.app.startsWith('~') ? item.app : `/Applications/${item.app}`)
    : (isInstalled ? `/Applications/${item.name}.app` : null);

  const handleReveal = () => {
    window.ipc?.revealApp(item.app || item.token, item.token);
  };

  const badgeElement = isInstalled ? (
    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
      {__('Installed')}
    </span>
  ) : null;

  return (
    <InfoSectionCard
      title={__('Application Package')}
      badge={badgeElement}
      defaultOpen={true}
    >
      <div className="space-y-2 py-0.5 text-xs">
        {/* Bundle Location with label on its own line */}
        {appPath && (
          <div className="space-y-1 py-0.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{__('Bundle Location')}</span>
              <InfoCopyButton text={appPath} />
            </div>
            <div className="font-mono text-[11px] text-foreground break-all select-text bg-black/[0.03] dark:bg-white/[0.04] p-1.5 rounded-[var(--radius-btn)] border border-border/40">
              {appPath.replace(/^\/Users\/[^/]+/, '~')}
            </div>
          </div>
        )}

        {/* Bundle Identifier */}
        {bundleId && (
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">{__('Bundle ID')}</span>
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-mono text-[11px] text-foreground select-text truncate max-w-[150px]" title={bundleId}>
                {bundleId}
              </span>
              <InfoCopyButton text={bundleId} />
            </div>
          </div>
        )}

        {/* CLI Binaries */}
        {binaries.length > 0 && (
          <div className="flex items-start justify-between py-0.5 gap-2">
            <span className="text-muted-foreground shrink-0">{__('CLI Commands')}</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
              {binaries.map((bin) => (
                <span
                  key={bin}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[var(--radius-btn)] bg-muted/60 text-[11px] font-mono text-foreground"
                >
                  <span className="text-muted-foreground/70">$</span>
                  <span>{bin}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Auto-Updates Status */}
        {autoUpdates !== undefined && (
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">{__('Auto-Updates')}</span>
            <span className="text-[11px] text-foreground font-medium">
              {autoUpdates ? __('Supported (in-app)') : __('Managed via Homebrew')}
            </span>
          </div>
        )}

        {/* Show in Finder: Normal button without icon */}
        <div className="pt-1 border-t border-border/30">
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            disabled={!isInstalled && !appPath}
            onClick={handleReveal}
          >
            {__('Show in Finder')}
          </Button>
        </div>
      </div>
    </InfoSectionCard>
  );
}

export default AppPackageCard;
