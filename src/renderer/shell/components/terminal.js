// Terminal Drawer & Task Runner Component

let term = null;

const terminalComponent = {
    activeTaskId: null,
    activeTaskToken: null,
    activeTaskAction: null,
    activeTaskErrorLog: "",
    activeTaskPassword: null,
    lastPasswordAttemptFailed: false,
    lastPasswordSentTime: 0,
    drawerTitle: "",
    showDrawer: false,
    showTerminal: false,
    alwaysShowStatusBar: false,
    updateQueue: [],
    totalUpdateCount: 0,
    isUpdatingAll: false,
    isWaitingForInput: false,

    init() {
        const applyConfig = (config) => {
            if (!config) return;
            this.alwaysShowStatusBar = !!config.alwaysShowStatusBar;
            if (this.alwaysShowStatusBar && !this.activeTaskId) {
                this.drawerTitle = "";
            }
        };

        if (window.ipc?.getConfig) window.ipc.getConfig().then(applyConfig);
        if (window.ipc?.onConfigUpdated) window.ipc.onConfigUpdated(applyConfig);

        this.initTerminalInstance();
        window.terminal = this;

        this.$watch('showTerminal', (val) => {
            if (val) {
                setTimeout(() => this.fitTerminal(), 50);
            }
        });

        this.$watch('showDrawer', (val) => {
            if (val) {
                setTimeout(() => this.fitTerminal(), 50);
            }
        });

        // Listen for task logs & detect prompts
        window.ipc?.onTaskLog((data) => {
            if (data.taskId !== this.activeTaskId) return;
            if (term) {
                term.write(data.text);
                term.scrollToBottom();
            }
            this.activeTaskErrorLog += data.text;

            const promptInfo = window.TaskPrompt.detectPrompt(data.text);
            if (promptInfo.isRetry) {
                this.lastPasswordAttemptFailed = true;
                this.activeTaskPassword = null;
            }

            if (promptInfo.isInteractivePrompt) {
                if (promptInfo.isPasswordPrompt) {
                    if (Date.now() - (this.lastPasswordSentTime || 0) < 1500) return;

                    // Reuse successfully supplied password if not failed
                    if (this.activeTaskPassword && !this.lastPasswordAttemptFailed) {
                        this.lastPasswordSentTime = Date.now();
                        window.ipc.writePtyInput(this.activeTaskId, this.activeTaskPassword + "\r");
                        this.isWaitingForInput = false;
                        return;
                    }

                    this.isWaitingForInput = true;
                    if (window.shell?.requestPassword) {
                        window.shell.requestPassword(this.activeTaskToken, this.activeTaskAction);
                    }
                } else {
                    this.isWaitingForInput = true;
                }
            }
        });

        // Listen for status logs (system status check)
        window.ipc?.onStatusLog((text) => {
            if (term) {
                term.write(text);
                term.scrollToBottom();
            }
        });

        // Listen for task completion
        window.ipc?.onTaskComplete(async (data) => {
            if (data.taskId !== this.activeTaskId) return;

            const appStore = window.shell;
            const finishedToken = this.activeTaskToken;
            const finishedAction = this.activeTaskAction;
            const errorLog = this.activeTaskErrorLog;

            this.resetTaskState();
            if (appStore) appStore.onTaskFinished(finishedToken);

            const isSuccess = data.code === 0;
            const isCancelled = data.cancelled;

            if (term) {
                if (isCancelled) term.write(`\r\n\x1b[31mProcess cancelled by user.\x1b[0m\r\n`);
                else if (isSuccess) term.write(`\r\n\x1b[32mProcess completed successfully!\x1b[0m\r\n`);
                else term.write(`\r\n\x1b[31mProcess failed with exit code: ${data.code}\x1b[0m\r\n`);
                term.scrollToBottom();
            }

            if (!isSuccess && !isCancelled) {
                const cask = appStore?.items?.find(c => c.token === finishedToken);
                const name = cask ? appStore.getAppName(cask) : finishedToken;
                const err = window.TaskPrompt.extractTaskError(errorLog, finishedAction, name, appStore?.catalog, appStore?.__.bind(appStore));
                window.ipc.showErrorDialog(err.title, `${err.details}`);
            }

            if (finishedAction === 'cleanup' && isSuccess) {
                const cleanLogs = window.ShellUtils.stripAnsi(errorLog);
                const lines = cleanLogs.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const freedLine = lines.slice().reverse().find(l => /freed|disk space/i.test(l));
                const defaultNoFiles = appStore ? appStore.__('No files cleaned up.') : 'No files cleaned up.';
                const lastLine = (freedLine || (lines.length > 0 ? lines[lines.length - 1] : ''))
                    .replace(/^==>\s*/, '')
                    .trim() || defaultNoFiles;
                const title = appStore ? appStore.__('Cleanup Finished') : 'Cleanup Finished';
                window.ipc.showMessage({
                    type: 'info',
                    title,
                    message: title,
                    detail: lastLine,
                    buttons: ['OK']
                });
            }

            if (this.isUpdatingAll) {
                if (isCancelled || !isSuccess) {
                    this.stopUpdateAll();
                } else {
                    setTimeout(() => this.processNextQueuedUpdate(), 1000);
                }
            } else {
                this.showDrawer = false;
                this.drawerTitle = "";
            }

            if (appStore) {
                if (isSuccess && finishedToken && (finishedAction === 'upgrade' || finishedAction === 'uninstall')) {
                    if (appStore.outdatedMap && appStore.outdatedMap[finishedToken]) {
                        delete appStore.outdatedMap[finishedToken];
                        appStore.updates = Object.keys(appStore.outdatedMap).length;
                    }
                }

                if (finishedAction === 'refresh') {
                    await appStore.refreshStatus(true);
                } else {
                    await appStore.refreshInstalled();
                }
            }
        });
    },

    getTerminalTheme() {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
            return {
                background: '#222222',
                foreground: '#e0e0e0',
                cursor: '#e0e0e0',
                selection: 'rgba(255, 255, 255, 0.25)',
                black: '#222222',
                red: '#f87171',
                green: '#4ade80',
                yellow: '#facc15',
                blue: '#60a5fa',
                magenta: '#c084fc',
                cyan: '#38bdf8',
                white: '#e0e0e0',
                brightBlack: '#666666',
                brightRed: '#fca5a5',
                brightGreen: '#86efac',
                brightYellow: '#fde047',
                brightBlue: '#93c5fd',
                brightMagenta: '#d8b4fe',
                brightCyan: '#7dd3fc',
                brightWhite: '#ffffff'
            };
        } else {
            return {
                background: '#eeeeee',
                foreground: '#2d2d2f',
                cursor: '#2d2d2f',
                selection: 'rgba(0, 0, 0, 0.15)',
                black: '#2d2d2f',
                red: '#dc2626',
                green: '#16a34a',
                yellow: '#ca8a04',
                blue: '#2563eb',
                magenta: '#9333ea',
                cyan: '#0891b2',
                white: '#f3f4f6',
                brightBlack: '#6b7280',
                brightRed: '#ef4444',
                brightGreen: '#22c55e',
                brightYellow: '#eab308',
                brightBlue: '#3b82f6',
                brightMagenta: '#a855f7',
                brightCyan: '#06b6d4',
                brightWhite: '#ffffff'
            };
        }
    },

    initTerminalInstance() {
        if (term) return;
        term = new Terminal({
            fontFamily: 'Menlo, Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.25,
            theme: this.getTerminalTheme(),
            cursorBlink: false,
            convertEol: true,
            scrollback: 1000
        });

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (term) {
                    term.options.theme = this.getTerminalTheme();
                }
            });
        }

        const termContainer = document.getElementById('terminal-container');
        if (termContainer) {
            term.open(termContainer);
            this.fitTerminal();
            if (window.ResizeObserver) {
                const ro = new ResizeObserver(() => {
                    this.fitTerminal();
                });
                ro.observe(termContainer);
            }
        }

        term.onData((data) => {
            if (data === '\x03') {
                this.cancel();
                return;
            }
            if (this.activeTaskId) {
                window.ipc.writePtyInput(this.activeTaskId, data);
                this.isWaitingForInput = false;
            }
        });
    },

    fitTerminal() {
        if (!term) return;
        const container = document.getElementById('terminal-container');
        if (!container || container.clientHeight === 0) return;

        // 5px padding on all sides
        const paddingY = 10;
        const paddingX = 10;
        const availableHeight = container.clientHeight - paddingY;
        const availableWidth = container.clientWidth - paddingX;

        const cellHeight = term._core?._renderService?.dimensions?.css?.cell?.height ||
                           term._core?._renderService?.dimensions?.actualCellHeight || 
                           15;
        const cellWidth = term._core?._renderService?.dimensions?.css?.cell?.width ||
                          term._core?._renderService?.dimensions?.actualCellWidth || 
                          7.2;

        const rows = Math.max(1, Math.floor(availableHeight / cellHeight));
        const cols = Math.max(10, Math.floor(availableWidth / cellWidth));

        if (term.rows !== rows || term.cols !== cols) {
            term.resize(cols, rows);
        }
    },

    resetTaskState() {
        this.activeTaskId = null;
        this.activeTaskToken = null;
        this.activeTaskAction = null;
        this.activeTaskPassword = null;
        this.lastPasswordAttemptFailed = false;
        this.lastPasswordSentTime = 0;
        this.drawerTitle = "";
        this.isWaitingForInput = false;
    },

    stopUpdateAll() {
        this.isUpdatingAll = false;
        this.updateQueue = [];
        this.totalUpdateCount = 0;
        this.showDrawer = false;
        if (window.ipc?.setProgressBar) window.ipc.setProgressBar(-1);
    },

    async processNextQueuedUpdate() {
        if (!this.isUpdatingAll || this.updateQueue.length === 0) {
            this.stopUpdateAll();
            return;
        }

        if (this.totalUpdateCount > 0 && window.ipc?.setProgressBar) {
            const completed = this.totalUpdateCount - this.updateQueue.length;
            const progress = completed / this.totalUpdateCount;
            window.ipc.setProgressBar(Math.max(0.05, progress));
        }

        const nextToken = this.updateQueue.shift();
        const appStore = window.shell;
        if (!appStore) return;

        this.activeTaskId = `cask-upgrade-${nextToken}-${Date.now()}`;
        this.activeTaskToken = nextToken;
        this.activeTaskAction = 'upgrade';
        this.activeTaskErrorLog = "";
        this.activeTaskPassword = null;
        this.lastPasswordAttemptFailed = false;
        this.lastPasswordSentTime = 0;

        appStore.onTaskStarted(nextToken, 'upgrade');

        const cask = appStore.items?.find(c => c.token === nextToken);
        const name = cask ? appStore.getAppName(cask) : nextToken;
        this.drawerTitle = `Updating ${name}... (${this.updateQueue.length + 1} remaining)`;

        if (term) {
            term.reset();
            term.focus();
        }
        this.showDrawer = true;
        window.ipc.runAction(this.activeTaskId, 'upgrade', nextToken, false);
    },

    runSystemAction(action) {
        const appStore = window.shell;
        this.activeTaskId = `cask-${action}-${Date.now()}`;
        this.activeTaskToken = action;
        this.activeTaskAction = action;
        this.activeTaskErrorLog = "";

        if (appStore) appStore.onTaskStarted(action, action);
        if (term) term.reset();

        if (action === 'refresh') {
            this.drawerTitle = 'Checking for updates...';
        } else if (action === 'cleanup') {
            this.drawerTitle = appStore?.__ ? appStore.__('Cleaning up Homebrew cache...') : 'Cleaning up Homebrew cache...';
            this.showTerminal = true;
        }

        this.showDrawer = true;
        if (term) term.focus();
        window.ipc.runAction(this.activeTaskId, action, '', false);
    },

    launchTask(action, token, name, zap) {
        const appStore = window.shell;
        this.activeTaskId = `cask-${action}-${token}-${Date.now()}`;
        this.activeTaskToken = token;
        this.activeTaskAction = action;
        this.activeTaskErrorLog = "";
        this.activeTaskPassword = null;
        this.lastPasswordAttemptFailed = false;
        this.lastPasswordSentTime = 0;

        if (appStore) appStore.onTaskStarted(token, action);
        if (term) term.reset();

        const titleTemplate = action === 'install' ? 'Installing {name}...'
            : action === 'uninstall' ? 'Deleting {name}...'
                : 'Updating {name}...';
        this.drawerTitle = titleTemplate.replace('{name}', name);
        this.showDrawer = true;
        if (term) term.focus();

        window.ipc.runAction(this.activeTaskId, action, token, zap);
    },

    async start(action, token) {
        const appStore = window.shell;
        if (!appStore) return;

        if (action === 'open') {
            const cask = appStore.items ? appStore.items.find(c => c.token === token) : null;
            try {
                await window.ipc.openApp(token, cask ? (cask.app || cask.name) : null);
            } catch (e) {
                console.error('Failed to open app:', e);
            }
            return;
        }

        if (this.activeTaskId) {
            alert('Another operation is currently running. Please wait.');
            return;
        }

        if (action === 'upgrade-all') {
            const outdatedTokens = Object.keys(appStore.outdatedMap || {});
            if (outdatedTokens.length === 0) return;
            this.updateQueue = [...outdatedTokens];
            this.totalUpdateCount = outdatedTokens.length;
            this.isUpdatingAll = true;
            this.processNextQueuedUpdate();
            return;
        }

        if (action === 'refresh' || action === 'cleanup') {
            this.runSystemAction(action);
            return;
        }

        const cask = appStore.items?.find(c => c.token === token);
        const name = cask ? appStore.getAppName(cask) : token;

        let zap = false;
        if (action === 'uninstall') {
            const res = await window.TaskPrompt.confirmUninstall(cask, name, appStore.__.bind(appStore));
            if (!res.confirmed) return;
            zap = res.zap;
        }

        this.launchTask(action, token, name, zap);
    },

    sendPassword(pass) {
        this.activeTaskPassword = pass || "";
        this.lastPasswordAttemptFailed = false;
        this.lastPasswordSentTime = Date.now();
        this.isWaitingForInput = false;
        if (this.activeTaskId) {
            window.ipc.writePtyInput(this.activeTaskId, (pass || "") + "\r");
        }
    },

    cancelPassword() {
        this.activeTaskPassword = null;
        this.lastPasswordAttemptFailed = false;
        this.lastPasswordSentTime = 0;
        this.isWaitingForInput = false;
        if (this.activeTaskId) {
            window.ipc.writePtyInput(this.activeTaskId, "\x03");
        }
    },

    cancel() {
        this.cancelPassword();
        if (window.shell) window.shell.dismissPasswordModal();
        if (this.activeTaskId) window.ipc.cancelAction(this.activeTaskId);
        if (this.isUpdatingAll) this.stopUpdateAll();
    }
};

// Register Alpine component & global shortcuts
document.addEventListener('alpine:init', () => {
    Alpine.data('terminal', () => terminalComponent);
});

window.startAction = (action, token) => window.terminal?.start(action, token);
window.cancelCurrentAction = () => window.terminal?.cancel();
