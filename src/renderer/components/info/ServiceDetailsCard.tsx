import React from 'react';
import type { CaskItem } from '@/types';
import { useShellStore } from '@/stores';
import { useServiceControl } from '@/hooks/useServiceControl';
import { InfoSectionCard } from '../InfoSectionCard';
import { Switch } from '../Switch';
import { Button } from '../Button';

export interface ServiceDetailsCardProps {
  item: CaskItem;
  isInstalled: boolean;
}

export function ServiceDetailsCard({ item, isInstalled }: ServiceDetailsCardProps) {
  const __ = useShellStore((s) => s.__);
  const {
    isStarted,
    isPending,
    switchChecked,
    statusLabel,
    statusDotClass,
    statusTextClass,
    statusInfo,
    handleToggle,
    handleRestart,
  } = useServiceControl(item);

  const handleViewLogs = () => {
    window.ipc?.openApp(item.token, `service:log:${item.token}`);
  };

  return (
    <InfoSectionCard
      title={__('Service Daemon')}
      defaultOpen={true}
    >
      <div className="space-y-2 py-0.5 text-xs">
        {/* Row 1: Status + Toggle */}
        <div className="flex items-center justify-between py-0.5">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full shrink-0 ${statusDotClass}`} />
            <span className={`text-xs font-medium ${statusTextClass}`}>
              {statusLabel}
            </span>
            {statusInfo?.pid && (
              <span className="text-[10px] text-muted-foreground font-mono">
                PID {statusInfo.pid}
              </span>
            )}
          </div>
          <Switch
            checked={switchChecked}
            disabled={isPending || !isInstalled}
            onCheckedChange={handleToggle}
            title={switchChecked ? __('Stop service') : __('Start service')}
          />
        </div>

        {/* Row 2: Two text-only buttons: Restart and View Logs */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/30">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 text-xs"
            disabled={isPending || !isInstalled || !isStarted}
            onClick={handleRestart}
          >
            {__('Restart')}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="flex-1 text-xs"
            disabled={!isInstalled}
            onClick={handleViewLogs}
          >
            {__('View Logs')}
          </Button>
        </div>
      </div>
    </InfoSectionCard>
  );
}

export default ServiceDetailsCard;
