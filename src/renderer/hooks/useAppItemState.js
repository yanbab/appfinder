import { useAppStore, useTermStore } from '@/stores';

export function useAppItemState(item) {
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const runningTasks = useTermStore((s) => s.runningTasks);
  const startAction = useTermStore((s) => s.startAction);

  const isRunning = Boolean(runningTasks?.[item?.token]);
  const isInstalled = Boolean(installed?.includes(item?.token));
  const isOutdated = Boolean(outdatedMap?.[item?.token]);
  const canOpen = Boolean(item?.app);

  return {
    isRunning,
    isInstalled,
    isOutdated,
    canOpen,
    install: () => startAction('install', item.token),
    upgrade: () => startAction('upgrade', item.token),
    uninstall: () => startAction('uninstall', item.token),
    open: () => startAction('open', item.token, item.app),
  };
}

export default useAppItemState;
