import { create } from './createStore';
import { useAppStore } from './useAppStore';
import { useShellStore } from './useShellStore';
import { getAppName, getIconDataUrl, extractTaskError, formatStatusBarMessage } from '../hooks/utils';
import type { TaskLogEvent, TaskPromptEvent, TaskCompleteEvent } from '../../types/ipc';

export type TerminalSubscriber = (text: string, clear?: boolean) => void;

const terminalSubscribers = new Set<TerminalSubscriber>();

export interface TermStoreState {
  runningTasks: Record<string, string>;
  activeTaskId: string | null;
  activeTaskToken: string | null;
  activeTaskAction: string | null;
  drawerTitle: string;
  showPasswordModal: boolean;
  terminalHistory: string;
  updateQueue: string[];
  isUpdatingAll: boolean;
  errorLog: string;

  registerTerminalSubscriber: (cb: TerminalSubscriber) => () => void;
  clearTerminal: () => void;
  executeTask: (action: string, token?: string, zap?: boolean, remainingCount?: number | null) => void;
  processNextQueuedUpdate: () => void;
  startAction: (action: string, token?: string, appName?: string) => Promise<void>;
  cancelAction: () => void;
  submitPassword: (pass: string) => void;
  cancelPassword: () => void;
  handleTaskLog: (data: TaskLogEvent) => void;
  handleStatusLog: (text: string) => void;
  handleTaskPrompt: (prompt: TaskPromptEvent) => void;
  handleTaskComplete: (data: TaskCompleteEvent) => void;
}

export const useTermStore = create<TermStoreState>((set, get) => ({
  // State
  runningTasks: {},
  activeTaskId: null,
  activeTaskToken: null,
  activeTaskAction: null,
  drawerTitle: '',
  showPasswordModal: false,
  terminalHistory: '',
  updateQueue: [],
  isUpdatingAll: false,
  errorLog: '',

  // Terminal actions
  registerTerminalSubscriber: (cb: TerminalSubscriber) => {
    terminalSubscribers.add(cb);
    const history = get().terminalHistory;
    if (history) cb(history);
    return () => terminalSubscribers.delete(cb);
  },

  clearTerminal: () => {
    set({ terminalHistory: '' });
    terminalSubscribers.forEach((cb) => cb('', true));
  },

  // Task execution
  executeTask: (action: string, token: string = '', zap: boolean = false, remainingCount: number | null = null) => {
    get().clearTerminal();
    const taskId = `cask-${action}-${token || Date.now()}`;

    set((state) => ({
      activeTaskId: taskId,
      activeTaskToken: token,
      activeTaskAction: action,
      errorLog: '',
      runningTasks: token ? { ...state.runningTasks, [token]: action } : state.runningTasks
    }));

    const items = useAppStore.getState().items;
    const cask = items.find((c) => c.token === token);
    const name = cask ? getAppName(cask) : token;
    let title = action === 'install' ? `Installing ${name}...`
      : action === 'uninstall' ? `Deleting ${name}...`
        : action === 'upgrade' ? `Updating ${name}...`
          : `${action}...`;

    if (remainingCount !== null && remainingCount > 0) {
      title = `${action === 'upgrade' ? 'Updating' : 'Installing'} ${name}... (${remainingCount} remaining)`;
    }

    set({ drawerTitle: title });
    window.ipc?.runAction?.(taskId, action, token, zap, name);
  },

  processNextQueuedUpdate: () => {
    const { isUpdatingAll, updateQueue } = get();
    if (!isUpdatingAll || updateQueue.length === 0) {
      set({ isUpdatingAll: false, updateQueue: [], drawerTitle: '' });
      return;
    }
    const nextQueue = [...updateQueue];
    const nextToken = nextQueue.shift();
    set({ updateQueue: nextQueue });
    if (nextToken) {
      get().executeTask('upgrade', nextToken, false, nextQueue.length + 1);
    }
  },

  startAction: async (action: string, token: string = '', appName?: string) => {
    const { items, outdatedMap } = useAppStore.getState();
    const __ = useShellStore.getState().__;

    if (action === 'open') {
      const cask = items.find((c) => c.token === token);
      const app = appName || (cask ? (cask.app || cask.name) : null);
      window.ipc?.openApp?.(token, app ?? undefined);
      return;
    }

    if (get().activeTaskId) {
      alert(__('Another operation is currently running. Please wait.'));
      return;
    }

    if (action === 'upgrade-all') {
      const outdatedTokens = Object.keys(outdatedMap);
      if (outdatedTokens.length === 0) return;
      set({ isUpdatingAll: true, updateQueue: [...outdatedTokens] });
      get().processNextQueuedUpdate();
      return;
    }

    if (action === 'refresh' || action === 'cleanup' || action === 'fetch') {
      get().clearTerminal();
      const taskId = `cask-${action}-${Date.now()}`;
      set((state) => ({
        activeTaskId: taskId,
        activeTaskToken: action,
        activeTaskAction: action,
        errorLog: '',
        runningTasks: { ...state.runningTasks, [action]: action },
        drawerTitle:
          action === 'refresh' ? __('Checking for updates...')
            : action === 'fetch' ? __('Checking for new applications...')
              : __('Cleaning up Homebrew cache...')
      }));
      if (action === 'cleanup') {
        useShellStore.getState().setShowTerminal(true);
      }
      window.ipc?.runAction?.(taskId, action, '', false);
      return;
    }

    let zap = false;
    if (action === 'uninstall') {
      const cask = items.find((c) => c.token === token);
      const name = cask ? getAppName(cask) : token;
      if (window.ipc?.showMessage) {
        const config = (await window.ipc?.getConfig?.()) || { zap: false };
        const title = __('Confirm Delete');
        const rawMsg = __('Are you sure you want to delete %s?') || 'Are you sure you want to delete %s?';
        const message = rawMsg.includes('%s') ? rawMsg.replace('%s', name) : `Are you sure you want to delete ${name}?`;
        const icon = cask?.iconUrl ? await getIconDataUrl(cask.iconUrl) : null;

        const response = await window.ipc.showMessage({
          type: 'question',
          buttons: [__('Delete'), __('Cancel')],
          defaultId: 0,
          cancelId: 1,
          title,
          message,
          icon,
          checkboxLabel: __('Delete settings and data'),
          checkboxChecked: !!config.zap,
        });

        if (response.response !== 0) return;
        zap = !!response.checkboxChecked;
        await window.ipc.updateConfig({ zap });
      } else if (!window.confirm(`Are you sure you want to delete ${name}?`)) {
        return;
      }
    }

    get().executeTask(action, token, zap);
  },

  cancelAction: () => {
    const currentId = get().activeTaskId;
    if (currentId) {
      window.ipc?.writePtyInput?.(currentId, '\x03');
      window.ipc?.cancelAction?.(currentId);
    }
    set({
      activeTaskId: null,
      activeTaskToken: null,
      activeTaskAction: null,
      runningTasks: {},
      showPasswordModal: false,
      drawerTitle: '',
      isUpdatingAll: false,
      updateQueue: [],
      errorLog: ''
    });
  },

  submitPassword: (pass: string) => {
    set({ showPasswordModal: false });
    const currentId = get().activeTaskId;
    if (currentId) {
      window.ipc?.writePtyInput?.(currentId, (pass || '') + '\r');
    }
  },

  cancelPassword: () => {
    get().cancelAction();
  },

  // IPC Event Handlers
  handleTaskLog: (data: TaskLogEvent) => {
    const text = data.text || '';
    set({ terminalHistory: text, errorLog: text });
    terminalSubscribers.forEach((cb) => cb(text));
    if (data.line) {
      const statusMsg = formatStatusBarMessage(data.line);
      if (statusMsg) set({ drawerTitle: statusMsg });
    }
  },

  handleStatusLog: (text: string) => {
    if (!text) return;
    set((state) => {
      const updated = state.terminalHistory ? `${state.terminalHistory}\n${text}` : text;
      terminalSubscribers.forEach((cb) => cb(updated));
      return { terminalHistory: updated };
    });
  },

  handleTaskPrompt: ({ type }: TaskPromptEvent) => {
    if (type === 'password') {
      set({ showPasswordModal: true });
    }
  },

  handleTaskComplete: (data: TaskCompleteEvent) => {
    const { activeTaskToken, activeTaskAction, isUpdatingAll, errorLog } = get();
    const __ = useShellStore.getState().__;

    set((state) => {
      const copy = { ...state.runningTasks };
      if (activeTaskToken) delete copy[activeTaskToken];
      if (activeTaskAction) delete copy[activeTaskAction];
      if (data?.taskId) {
        ['fetch', 'refresh', 'cleanup'].forEach((a) => {
          if (data.taskId.includes(a)) delete copy[a];
        });
      }
      return {
        activeTaskId: null,
        activeTaskToken: null,
        activeTaskAction: null,
        runningTasks: copy,
        showPasswordModal: false
      };
    });

    if (data.code === 0) {
      if (activeTaskToken) {
        if (activeTaskAction === 'install') {
          useAppStore.getState().optimisticInstall(activeTaskToken);
        } else if (activeTaskAction === 'uninstall') {
          useAppStore.getState().optimisticUninstall(activeTaskToken);
        } else if (activeTaskAction === 'upgrade') {
          useAppStore.getState().optimisticUpgrade(activeTaskToken);
        }
      }
      useAppStore.getState().refreshInstalled();
      useAppStore.getState().refreshUpdates(true);
      useAppStore.getState().refreshServiceStatuses();
      if (isUpdatingAll) {
        get().processNextQueuedUpdate();
        return;
      }
      set({ drawerTitle: '' });
    } else {
      set({ isUpdatingAll: false, updateQueue: [] });
      if (!data.cancelled && data.code !== 130) {
        const rawErr: any = data.error || (errorLog ? extractTaskError(errorLog, activeTaskToken || '') : null);
        const errDetail: string = typeof rawErr === 'object' && rawErr !== null
          ? (rawErr.details || rawErr.title || JSON.stringify(rawErr))
          : String(rawErr || __('No error details recorded.'));
        const alertTitle = __(`%s ${activeTaskAction === 'install' ? 'installation' : activeTaskAction === 'uninstall' ? 'removal' : activeTaskAction === 'upgrade' ? 'update' : 'cleanup'} failed`, activeTaskToken || 'Task');
        window.ipc?.showErrorDialog?.(alertTitle, errDetail);
      }
      set({ drawerTitle: '' });
    }
  }
}));
