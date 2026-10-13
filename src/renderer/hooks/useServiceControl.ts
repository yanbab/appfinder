import type { CaskItem } from '@/types';
import { useShellStore, useAppStore, useTermStore } from '@/stores';
import { getAppName } from './utils';

export function useServiceControl(item?: CaskItem | null) {
  const __ = useShellStore((s) => s.__);
  const serviceStatusMap = useAppStore((s) => s.serviceStatusMap);
  const servicePendingMap = useAppStore((s) => s.servicePendingMap);
  const setServicePending = useAppStore((s) => s.setServicePending);

  const token = item?.token || '';
  const name = item ? getAppName(item) : '';
  const statusInfo = token ? serviceStatusMap[token] : undefined;
  const isStarted = statusInfo?.status === 'started';
  const pendingAction = token ? servicePendingMap[token] || null : null;
  const isPending = pendingAction !== null;

  const switchChecked = pendingAction === 'starting'
    ? true
    : pendingAction === 'stopping'
    ? false
    : isStarted;

  const statusLabel = pendingAction === 'starting'
    ? __('Starting...')
    : pendingAction === 'stopping'
    ? __('Stopping...')
    : isStarted
    ? (statusInfo?.pid ? `${__('Running')} (${statusInfo.pid})` : __('Running'))
    : __('Stopped');

  const statusDotClass = pendingAction !== null
    ? 'bg-amber-500 animate-pulse shadow-xs shadow-amber-500/50'
    : isStarted
    ? 'bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50'
    : 'bg-neutral-400 dark:bg-neutral-600';

  const statusTextClass = pendingAction !== null
    ? 'text-amber-600 dark:text-amber-400 font-medium'
    : isStarted
    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
    : 'text-muted-foreground';

  const handleToggle = async () => {
    if (!token || isPending || useAppStore.getState().servicePendingMap[token]) return;
    const targetAction: 'starting' | 'stopping' = isStarted ? 'stopping' : 'starting';
    const subAction: 'start' | 'stop' = isStarted ? 'stop' : 'start';
    const explicitCmd = `service:${subAction}:${token}`;
    const cmdStr = `brew services ${subAction} ${token}`;

    setServicePending(token, targetAction);

    // 1. Log command invocation to console
    const termStore = useTermStore.getState();
    termStore.handleStatusLog(`$ ${cmdStr}`);

    // 2. Set status bar progress indicator
    const taskId = `service-${subAction}-${token}-${Date.now()}`;
    const actionLabel = subAction === 'start' ? __('Starting %s...', name) : __('Stopping %s...', name);
    useTermStore.setState({
      activeTaskId: taskId,
      drawerTitle: actionLabel,
    });

    try {
      const res = await window.ipc?.openApp(token, explicitCmd);

      // 3. Log stdout / stderr output to console
      if (res?.output) {
        termStore.handleStatusLog(res.output);
      }
      if (res?.error) {
        termStore.handleStatusLog(res.error);
      }

      if (res && res.success === false) {
        throw new Error(res.error || (subAction === 'start' ? __('Failed to start service') : __('Failed to stop service')));
      }

      // Small pause to allow launchd to update state
      await new Promise((r) => setTimeout(r, 250));

      // 4. Background 'brew services list --json' (only show in console/statusbar)
      await useAppStore.getState().refreshServiceStatuses(true);
    } catch (err: any) {
      console.error(`[SERVICE CONTROL ERROR]:`, err);
      const errorTitle = targetAction === 'starting'
        ? __('Failed to start service')
        : __('Failed to stop service');
      const errorMessage = err?.message || String(err);

      termStore.handleStatusLog(`Error: ${errorMessage}`);
      useTermStore.setState({
        activeTaskId: null,
        drawerTitle: `Error: ${errorMessage}`,
      });

      if (window.ipc?.showErrorDialog) {
        window.ipc.showErrorDialog(errorTitle, errorMessage);
      } else {
        alert(`${errorTitle}: ${errorMessage}`);
      }
    } finally {
      setServicePending(token, null);
    }
  };

  const handleRestart = async () => {
    if (!token || isPending || useAppStore.getState().servicePendingMap[token]) return;
    setServicePending(token, 'starting');
    const cmdStr = `brew services restart ${token}`;

    const termStore = useTermStore.getState();
    termStore.handleStatusLog(`$ ${cmdStr}`);

    const taskId = `service-restart-${token}-${Date.now()}`;
    useTermStore.setState({
      activeTaskId: taskId,
      drawerTitle: __('Restarting %s...', name),
    });

    try {
      const res = await window.ipc?.openApp(token, `service:restart:${token}`);

      if (res?.output) {
        termStore.handleStatusLog(res.output);
      }
      if (res?.error) {
        termStore.handleStatusLog(res.error);
      }

      if (res && res.success === false) {
        throw new Error(res.error || __('Failed to restart service'));
      }

      await new Promise((r) => setTimeout(r, 250));
      await useAppStore.getState().refreshServiceStatuses(true);
    } catch (err: any) {
      console.error(`[SERVICE RESTART ERROR]:`, err);
      const errorMessage = err?.message || String(err);
      termStore.handleStatusLog(`Error: ${errorMessage}`);
      useTermStore.setState({
        activeTaskId: null,
        drawerTitle: `Error: ${errorMessage}`,
      });

      if (window.ipc?.showErrorDialog) {
        window.ipc.showErrorDialog(__('Failed to restart service'), errorMessage);
      }
    } finally {
      setServicePending(token, null);
    }
  };

  return {
    isStarted,
    isPending,
    pendingAction,
    switchChecked,
    statusLabel,
    statusDotClass,
    statusTextClass,
    statusInfo,
    handleToggle,
    handleRestart,
  };
}

export default useServiceControl;
