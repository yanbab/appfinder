import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAppName, detectPrompt, getIconDataUrl, extractTaskError, formatStatusBarMessage } from './utils';

const TaskContext = createContext(null);

export function TaskProvider({
  items = [],
  outdatedMap = {},
  refreshInstalledState,
  refreshUpdatesState,
  __,
  children
}) {
  const [runningTasks, setRunningTasks] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [activeTaskToken, setActiveTaskToken] = useState(null);
  const [activeTaskAction, setActiveTaskAction] = useState(null);
  const activeTaskRef = useRef({ id: null, token: null, action: null });
  activeTaskRef.current = { id: activeTaskId, token: activeTaskToken, action: activeTaskAction };

  const [drawerTitle, setDrawerTitle] = useState('');
  const [taskProgressPercent, setTaskProgressPercent] = useState(null);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const activeTaskPasswordRef = useRef(null);
  const lastPasswordSentTimeRef = useRef(0);
  const lastPasswordAttemptFailedRef = useRef(false);
  const activeTaskErrorLogRef = useRef('');
  const updateQueueRef = useRef([]);
  const isUpdatingAllRef = useRef(false);
  const batchActionRef = useRef('upgrade');

  // Terminal history & log subscribers
  const terminalHistoryRef = useRef('');
  const terminalLogSubscribers = useRef(new Set());

  const registerTerminalSubscriber = useCallback((cb) => {
    terminalLogSubscribers.current.add(cb);
    if (terminalHistoryRef.current) {
      cb(terminalHistoryRef.current);
    }
    return () => {
      terminalLogSubscribers.current.delete(cb);
    };
  }, []);

  const clearTerminal = useCallback(() => {
    terminalHistoryRef.current = '';
    terminalLogSubscribers.current.forEach(cb => cb('', true));
  }, []);

  // Execute task helper
  const executeTask = useCallback((action, token, zap = false, remainingCount = null) => {
    clearTerminal();
    setTaskProgressPercent(null);
    activeTaskErrorLogRef.current = '';
    const taskId = `cask-${action}-${token}-${Date.now()}`;
    setActiveTaskId(taskId);
    setActiveTaskToken(token);
    setActiveTaskAction(action);
    setRunningTasks(prev => ({ ...prev, [token]: action }));

    const cask = items.find(c => c.token === token);
    const name = cask ? getAppName(cask) : token;
    let title = action === 'install' ? `Installing ${name}...`
      : action === 'uninstall' ? `Deleting ${name}...`
        : action === 'upgrade' ? `Updating ${name}...`
          : `${action}...`;

    if (remainingCount !== null && remainingCount > 0) {
      title = `${action === 'upgrade' ? 'Updating' : 'Installing'} ${name}... (${remainingCount} remaining)`;
    }

    setDrawerTitle(title);
    setShowDrawer(true);

    window.ipc?.runAction?.(taskId, action, token, zap, name);
  }, [items, clearTerminal]);
  const executeTaskRef = useRef(executeTask);
  executeTaskRef.current = executeTask;

  // Process next update in batch queue
  const processNextQueuedUpdate = useCallback(() => {
    if (!isUpdatingAllRef.current || updateQueueRef.current.length === 0) {
      isUpdatingAllRef.current = false;
      updateQueueRef.current = [];
      setShowDrawer(false);
      setDrawerTitle('');
      return;
    }
    const nextToken = updateQueueRef.current.shift();
    const action = batchActionRef.current || 'upgrade';
    executeTaskRef.current(action, nextToken, false, updateQueueRef.current.length + 1);
  }, []);
  const processNextQueuedUpdateRef = useRef(processNextQueuedUpdate);
  processNextQueuedUpdateRef.current = processNextQueuedUpdate;

  // Start Action
  const startAction = useCallback(async (action, token, appName) => {
    if (action === 'open') {
      const cask = items.find(c => c.token === token);
      const app = appName || (cask ? (cask.app || cask.name) : null);
      try {
        await window.ipc?.openApp?.(token, app);
      } catch (e) {
        console.error('Failed to open app:', e);
      }
      return;
    }

    if (activeTaskRef.current.id) {
      alert(__ ? __('Another operation is currently running. Please wait.') : 'Another operation is currently running. Please wait.');
      return;
    }

    if (action === 'upgrade-all') {
      const outdatedTokens = Object.keys(outdatedMap);
      if (outdatedTokens.length === 0) return;
      isUpdatingAllRef.current = true;
      batchActionRef.current = 'upgrade';
      updateQueueRef.current = [...outdatedTokens];
      processNextQueuedUpdateRef.current();
      return;
    }

    if (action === 'refresh' || action === 'cleanup' || action === 'fetch') {
      clearTerminal();
      const taskId = `cask-${action}-${Date.now()}`;
      setActiveTaskId(taskId);
      setActiveTaskToken(action);
      setActiveTaskAction(action);
      setRunningTasks(prev => ({ ...prev, [action]: action }));
      setDrawerTitle(
        action === 'refresh' ? (__ ? __('Checking for updates...') : 'Checking for updates...')
        : action === 'fetch' ? (__ ? __('Checking for new applications...') : 'Checking for new applications...')
        : (__ ? __('Cleaning up Homebrew cache...') : 'Cleaning up Homebrew cache...')
      );
      setShowDrawer(true);
      window.ipc?.runAction?.(taskId, action, '', false);
      return;
    }

    let zap = false;
    if (action === 'uninstall') {
      const cask = items.find(c => c.token === token);
      const name = cask ? getAppName(cask) : token;

      if (window.ipc?.showMessage) {
        const config = (await window.ipc?.getConfig?.()) || {};
        const title = __ ? __('Confirm Delete') : 'Confirm Delete';
        const rawMsg = (__ ? __('Are you sure you want to delete %s?') : null) || 'Are you sure you want to delete %s?';
        const message = rawMsg.includes('%s') ? rawMsg.replace('%s', name) : `Are you sure you want to delete ${name}?`;
        const icon = cask?.iconUrl ? await getIconDataUrl(cask.iconUrl) : null;

        const response = await window.ipc.showMessage({
          type: 'question',
          buttons: [__ ? __('Delete') : 'Delete', __ ? __('Cancel') : 'Cancel'],
          defaultId: 0,
          cancelId: 1,
          title,
          message,
          detail: '',
          icon,
          checkboxLabel: __ ? __('Delete settings and data') : 'Delete settings and data',
          checkboxChecked: !!config.zap,
        });

        if (response.response !== 0) return;
        zap = !!response.checkboxChecked;
        await window.ipc.updateConfig({ zap });
      } else {
        const confirmed = window.confirm(`Are you sure you want to delete ${name}?`);
        if (!confirmed) return;
      }
    }

    executeTaskRef.current(action, token, zap);
  }, [items, outdatedMap, clearTerminal, __]);

  const cancelAction = useCallback(() => {
    const currentId = activeTaskRef.current.id;
    if (currentId) {
      window.ipc?.writePtyInput?.(currentId, '\x03');
      window.ipc?.cancelAction?.(currentId);
    }
    isUpdatingAllRef.current = false;
    updateQueueRef.current = [];
    setShowPasswordModal(false);
    setIsWaitingForInput(false);
    setShowDrawer(false);
    setDrawerTitle('');
  }, []);

  const submitPassword = useCallback((pass) => {
    activeTaskPasswordRef.current = pass || '';
    lastPasswordAttemptFailedRef.current = false;
    lastPasswordSentTimeRef.current = Date.now();
    setIsWaitingForInput(false);
    setShowPasswordModal(false);
    if (activeTaskRef.current.id) {
      window.ipc?.writePtyInput?.(activeTaskRef.current.id, (pass || '') + '\r');
    }
  }, []);

  const cancelPassword = useCallback(() => {
    cancelAction();
  }, [cancelAction]);

  // Setup IPC task event listeners
  useEffect(() => {
    if (!window.ipc) return;
    const unsubs = [];

    if (window.ipc.onTaskLog) {
      unsubs.push(window.ipc.onTaskLog(data => {
        const text = data.text || '';
        terminalHistoryRef.current = text;
        terminalLogSubscribers.current.forEach(cb => cb(text));
        activeTaskErrorLogRef.current = text;

        if (data.line) {
          const statusMsg = formatStatusBarMessage(data.line);
          if (statusMsg) {
            setDrawerTitle(statusMsg);
          }
        }

        const promptInfo = detectPrompt(data.raw || text);
        if (promptInfo.isRetry) {
          lastPasswordAttemptFailedRef.current = true;
          activeTaskPasswordRef.current = null;
        }

        if (promptInfo.isPasswordPrompt) {
          if (Date.now() - lastPasswordSentTimeRef.current < 1500) return;
          if (activeTaskPasswordRef.current && !lastPasswordAttemptFailedRef.current) {
            lastPasswordSentTimeRef.current = Date.now();
            window.ipc.writePtyInput?.(activeTaskRef.current.id, activeTaskPasswordRef.current + '\r');
            setIsWaitingForInput(false);
            return;
          }
          setIsWaitingForInput(true);
          setShowPasswordModal(true);
        }
      }));
    }

    if (window.ipc.onStatusLog) {
      unsubs.push(window.ipc.onStatusLog(text => {
        if (!text) return;
        terminalHistoryRef.current = terminalHistoryRef.current ? `${terminalHistoryRef.current}\n${text}` : text;
        terminalLogSubscribers.current.forEach(cb => cb(terminalHistoryRef.current));
      }));
    }

    if (window.ipc.onTaskComplete) {
      unsubs.push(window.ipc.onTaskComplete(async data => {
        const finishedToken = activeTaskRef.current.token;
        const finishedAction = activeTaskRef.current.action;
        const errorLog = activeTaskErrorLogRef.current;

        setActiveTaskId(null);
        setActiveTaskToken(null);
        setActiveTaskAction(null);
        setTaskProgressPercent(null);
        setIsWaitingForInput(false);
        setShowPasswordModal(false);

        setRunningTasks(prev => {
          const copy = { ...prev };
          if (finishedToken) delete copy[finishedToken];
          return copy;
        });

        if (data.code === 0) {
          if (refreshInstalledState) refreshInstalledState();
          if (refreshUpdatesState) refreshUpdatesState(true);
          if (isUpdatingAllRef.current) {
            processNextQueuedUpdateRef.current();
            return;
          }
          setShowDrawer(false);
          setDrawerTitle('');
        } else {
          isUpdatingAllRef.current = false;
          updateQueueRef.current = [];

          if (!data.cancelled && data.code !== 130) {
            const rawErr = data.error || (errorLog ? extractTaskError(errorLog, finishedToken) : null);
            const errDetail = rawErr || (__ ? __('No error details recorded.') : 'No error details recorded.');
            const defaultTitle = `${finishedAction || 'Task'} failed`;
            const alertTitle = __ ? __(`%s ${finishedAction === 'install' ? 'installation' : finishedAction === 'uninstall' ? 'removal' : finishedAction === 'upgrade' ? 'update' : 'cleanup'} failed`, finishedToken || 'Task') : defaultTitle;

            if (window.ipc?.showErrorDialog) {
              window.ipc.showErrorDialog(alertTitle, errDetail);
            }
          }
          setShowDrawer(false);
          setDrawerTitle('');
        }
      }));
    }

    if (window.ipc.onClearCache) {
      unsubs.push(window.ipc.onClearCache(() => {
        startAction('cleanup');
      }));
    }

    return () => unsubs.forEach(u => u());
  }, [items, refreshInstalledState, refreshUpdatesState, startAction, __]);

  const value = {
    runningTasks,
    activeTaskId,
    activeTaskToken,
    activeTaskAction,
    drawerTitle,
    setDrawerTitle,
    taskProgressPercent,
    isWaitingForInput,
    showPasswordModal,
    showDrawer,
    setShowDrawer,

    startAction,
    cancelAction,
    submitPassword,
    cancelPassword,
    registerTerminalSubscriber,
    clearTerminal,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTask() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
}
