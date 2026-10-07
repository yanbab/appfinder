import { useAppStore, useTermStore } from '@/stores';
import type { CaskItem } from '@/types';

export function useAppItemState(item?: CaskItem | null) {
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const runningTasks = useTermStore((s) => s.runningTasks);
  const startAction = useTermStore((s) => s.startAction);

  const token = item?.token || '';
  const isRunning = Boolean(token && runningTasks?.[token]);
  const isInstalled = Boolean(token && installed?.includes(token));
  const isOutdated = Boolean(token && outdatedMap?.[token]);
  const canOpen = Boolean(item?.app);

  return {
    isRunning,
    isInstalled,
    isOutdated,
    canOpen,
    install: () => token && startAction('install', token),
    upgrade: () => token && startAction('upgrade', token),
    uninstall: () => token && startAction('uninstall', token),
    open: () => token && startAction('open', token, item?.app),
  };
}

export default useAppItemState;
