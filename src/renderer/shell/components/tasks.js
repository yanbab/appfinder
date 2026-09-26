// Unified Task Execution, Terminal Drawer, and Password Prompt Extension

let term = null;

const TaskPrompt = {
    detectPrompt(text) {
        const clean = window.ShellUtils ? window.ShellUtils.stripAnsi(text) : text;
        const isRetry = /sorry, try again|incorrect password|authentication failure/i.test(clean);
        const isPasswordPrompt = /password\s*[:?]|passphrase\s*[:?]|mot de passe\s*[:?]|(?:sudo|admin).*(?:password|passphrase)/i.test(clean);
        const isInteractivePrompt = isPasswordPrompt || /\[y\/n\]/i.test(clean);
        return { isRetry, isPasswordPrompt, isInteractivePrompt };
    },

    extractTaskError(logText, action, appName, catalog, __) {
        const translate = typeof __ === 'function' ? __ : (s => s);
        const actionKeys = {
            install: '%s installation failed',
            uninstall: '%s removal failed',
            cleanup: '%s cleanup failed',
            upgrade: '%s update failed'
        };

        const failedTitleKey = actionKeys[action] || '%s failed';
        const rawFailedTitle = translate(failedTitleKey) || failedTitleKey;
        const title = rawFailedTitle.includes('%s') ? rawFailedTitle.replace('%s', appName) : `${appName} failed`;

        const cleanLogs = window.ShellUtils ? window.ShellUtils.stripAnsi(logText) : logText;
        const lines = cleanLogs.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        const defaultError = translate('No error details recorded.');

        const errorLines = lines.filter(l => !l.startsWith('==>') && (
            /error/i.test(l) || /permission denied/i.test(l) || /operation not permitted/i.test(l) ||
            /access/i.test(l) || /sudo/i.test(l) || /failed/i.test(l)
        ));

        const nonProgressLines = lines.filter(l => !l.startsWith('==>'));
        let rawError = errorLines.length > 0 ? errorLines.slice(-3).join('\n')
            : nonProgressLines.length > 0 ? nonProgressLines[nonProgressLines.length - 1]
            : lines.length > 0 ? lines[lines.length - 1] : defaultError;

        let matchedKey = null;
        if (catalog) {
            for (const key of Object.keys(catalog)) {
                if (key && key.length > 5 && rawError.includes(key)) {
                    matchedKey = key;
                    break;
                }
            }
        }
        return { title, details: matchedKey ? translate(matchedKey) : translate(rawError) };
    },

    async confirmUninstall(cask, name, __) {
        const translate = typeof __ === 'function' ? __ : (s => s);
        try {
            const config = (await window.ipc?.getConfig?.()) || {};
            const title = translate('Confirm Delete');
            const rawMsg = translate('Are you sure you want to delete %s?') || 'Are you sure you want to delete %s?';
            const message = rawMsg.includes('%s') ? rawMsg.replace('%s', name) : `Are you sure you want to delete ${name}?`;
            let iconDataUrl = cask?.iconUrl && window.ShellUtils ? await window.ShellUtils.getIconDataUrl(cask.iconUrl) : null;

            const response = await window.ipc.showMessage({
                type: 'question',
                buttons: [translate('Delete'), translate('Cancel')],
                defaultId: 0,
                cancelId: 1,
                title,
                message,
                detail: '',
                icon: iconDataUrl,
                checkboxLabel: translate('Delete settings and data'),
                checkboxChecked: !!config.zap
            });

            if (response.response !== 0) return { confirmed: false };
            const zap = !!response.checkboxChecked;
            await window.ipc.updateConfig({ zap });
            return { confirmed: true, zap };
        } catch (e) {
            console.error('Failed to confirm uninstall:', e);
            return { confirmed: false };
        }
    }
};

window.TaskPrompt = TaskPrompt;

Object.assign(window.shell, {
    activeTaskId: null,
    activeTaskToken: null,
    activeTaskAction: null,
    activeTaskErrorLog: '',
    activeTaskPassword: null,
    lastPasswordAttemptFailed: false,
    lastPasswordSentTime: 0,
    drawerTitle: '',
    showDrawer: false,
    showTerminal: false,
    alwaysShowStatusBar: false,
    updateQueue: [],
    totalUpdateCount: 0,
    isUpdatingAll: false,
    isWaitingForInput: false,
    lastCheckedTime: null,

    // Password modal state
    showPasswordModal: false,
    passwordValue: '',
    caskName: '',
    caskIcon: '',
    caskToken: '',
    caskAction: '',

    initTasks() {
        const applyConfig = (config) => {
            if (!config) return;
            this.alwaysShowStatusBar = !!config.alwaysShowStatusBar;
            if (this.alwaysShowStatusBar && !this.activeTaskId) {
                this.drawerTitle = '';
            }
        };

        if (window.ipc?.getConfig) window.ipc.getConfig().then(applyConfig);
        if (window.ipc?.onConfigUpdated) window.ipc.onConfigUpdated(applyConfig);

        this.initTerminalInstance();

        this.$watch('showTerminal', (val) => { if (val) setTimeout(() => this.fitTerminal(), 50); });
        this.$watch('showDrawer', (val) => { if (val) setTimeout(() => this.fitTerminal(), 50); });

        // Stream output logs & interactive prompt detection
        window.ipc?.onTaskLog?.((data) => {
            if (data.taskId !== this.activeTaskId) return;
            if (term) {
                term.write(data.text);
                term.scrollToBottom();
            }
            this.activeTaskErrorLog += data.text;

            // Live progress title from Brew output
            const rawLines = data.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            const brewLine = rawLines.slice().reverse().find(l => l.startsWith('==>'));
            if (brewLine && this.activeTaskId) {
                const clean = brewLine.replace(/^==>\s*/, '').trim();
                if (clean) this.drawerTitle = clean;
            }

            const promptInfo = TaskPrompt.detectPrompt(data.text);
            if (promptInfo.isRetry) {
                this.lastPasswordAttemptFailed = true;
                this.activeTaskPassword = null;
            }

            if (promptInfo.isInteractivePrompt) {
                if (promptInfo.isPasswordPrompt) {
                    if (Date.now() - (this.lastPasswordSentTime || 0) < 1500) return;
                    if (this.activeTaskPassword && !this.lastPasswordAttemptFailed) {
                        this.lastPasswordSentTime = Date.now();
                        window.ipc.writePtyInput(this.activeTaskId, this.activeTaskPassword + '\r');
                        this.isWaitingForInput = false;
                        return;
                    }
                    this.isWaitingForInput = true;
                    this.requestPassword(this.activeTaskToken, this.activeTaskAction);
                } else {
                    this.isWaitingForInput = true;
                }
            }
        });

        window.ipc?.onStatusLog?.((text) => {
            if (term) {
                term.write(text);
                term.scrollToBottom();
            }
        });

        // Task completion handler
        window.ipc?.onTaskComplete?.(async (data) => {
            if (data.taskId !== this.activeTaskId) return;

            const finishedToken = this.activeTaskToken;
            const finishedAction = this.activeTaskAction;
            const errorLog = this.activeTaskErrorLog;

            this.resetTaskState();
            const updated = { ...this.runningTasks };
            delete updated[finishedToken];
            this.runningTasks = updated;

            const isSuccess = data.code === 0;
            const isCancelled = data.cancelled;

            if (term) {
                if (isCancelled) term.write('\r\n\x1b[31mProcess cancelled by user.\x1b[0m\r\n');
                else if (isSuccess) term.write('\r\n\x1b[32mProcess completed successfully!\x1b[0m\r\n');
                else term.write(`\r\n\x1b[31mProcess failed with exit code: ${data.code}\x1b[0m\r\n`);
                term.scrollToBottom();
            }

            if (!isSuccess && !isCancelled) {
                const cask = this.items?.find(c => c.token === finishedToken);
                const name = cask ? this.getAppName(cask) : finishedToken;
                const err = TaskPrompt.extractTaskError(errorLog, finishedAction, name, this.catalog, this.__.bind(this));
                window.ipc.showErrorDialog(err.title, `${err.details}`);
            }

            if (finishedAction === 'cleanup' && isSuccess) {
                const cleanLogs = window.ShellUtils ? window.ShellUtils.stripAnsi(errorLog) : errorLog;
                const lines = cleanLogs.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const freedLine = lines.slice().reverse().find(l => /freed|disk space/i.test(l));
                const lastLine = (freedLine || (lines.length > 0 ? lines[lines.length - 1] : ''))
                    .replace(/^==>\s*/, '').trim() || this.__('No files cleaned up.');
                const title = this.__('Cleanup Finished');
                window.ipc.showMessage({ type: 'info', title, message: title, detail: lastLine, buttons: ['OK'] });
            }

            if (this.isUpdatingAll) {
                if (isCancelled || !isSuccess) this.stopUpdateAll();
                else setTimeout(() => this.processNextQueuedUpdate(), 1000);
            } else {
                this.showDrawer = false;
                this.drawerTitle = '';
            }

            if (isSuccess && finishedToken && (finishedAction === 'upgrade' || finishedAction === 'uninstall')) {
                if (this.outdatedMap && this.outdatedMap[finishedToken]) {
                    delete this.outdatedMap[finishedToken];
                    this.updates = Object.keys(this.outdatedMap).length;
                }
            }

            if (finishedAction === 'refresh') {
                this.lastCheckedTime = new Date();
                await this.refreshStatus(true);
            } else {
                await this.refreshInstalled();
            }
        });
    },

    getStatusDefaultText() {
        let text = '';
        if (this.updates > 0) {
            text = this.__('%d updates available').replace('%d', this.updates);
        } else {
            text = this.__('Up to date');
        }
        if (this.lastCheckedTime) {
            try {
                const timeStr = this.lastCheckedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                text += ` • ${this.__('Checked at %s').replace('%s', timeStr)}`;
            } catch (_) {}
        }
        return text;
    },

    getTerminalTheme() {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark ? {
            background: '#222222', foreground: '#e0e0e0', cursor: '#e0e0e0',
            selection: 'rgba(255, 255, 255, 0.25)', black: '#222222', red: '#f87171',
            green: '#4ade80', yellow: '#facc15', blue: '#60a5fa', magenta: '#c084fc',
            cyan: '#38bdf8', white: '#e0e0e0', brightBlack: '#666666', brightRed: '#fca5a5',
            brightGreen: '#86efac', brightYellow: '#fde047', brightBlue: '#93c5fd',
            brightMagenta: '#d8b4fe', brightCyan: '#7dd3fc', brightWhite: '#ffffff'
        } : {
            background: '#eeeeee', foreground: '#2d2d2f', cursor: '#2d2d2f',
            selection: 'rgba(0, 0, 0, 0.15)', black: '#2d2d2f', red: '#dc2626',
            green: '#16a34a', yellow: '#ca8a04', blue: '#2563eb', magenta: '#9333ea',
            cyan: '#0891b2', white: '#f3f4f6', brightBlack: '#6b7280', brightRed: '#ef4444',
            brightGreen: '#22c55e', brightYellow: '#eab308', brightBlue: '#3b82f6',
            brightMagenta: '#a855f7', brightCyan: '#06b6d4', brightWhite: '#ffffff'
        };
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
                if (term) term.options.theme = this.getTerminalTheme();
            });
        }

        const container = document.getElementById('terminal-container');
        if (container) {
            term.open(container);
            this.fitTerminal();
            if (window.ResizeObserver) {
                new ResizeObserver(() => this.fitTerminal()).observe(container);
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

        const cellHeight = term._core?._renderService?.dimensions?.css?.cell?.height || 15;
        const cellWidth = term._core?._renderService?.dimensions?.css?.cell?.width || 7.2;
        const rows = Math.max(1, Math.floor((container.clientHeight - 10) / cellHeight));
        const cols = Math.max(10, Math.floor((container.clientWidth - 10) / cellWidth));

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
        this.drawerTitle = '';
        this.isWaitingForInput = false;
    },

    stopUpdateAll() {
        this.isUpdatingAll = false;
        this.updateQueue = [];
        this.totalUpdateCount = 0;
        this.showDrawer = false;
    },

    processNextQueuedUpdate() {
        if (!this.isUpdatingAll || this.updateQueue.length === 0) {
            this.stopUpdateAll();
            return;
        }

        const nextToken = this.updateQueue.shift();
        this.activeTaskId = `cask-upgrade-${nextToken}-${Date.now()}`;
        this.activeTaskToken = nextToken;
        this.activeTaskAction = 'upgrade';
        this.activeTaskErrorLog = '';
        this.activeTaskPassword = null;
        this.lastPasswordAttemptFailed = false;
        this.lastPasswordSentTime = 0;

        this.runningTasks = { ...this.runningTasks, [nextToken]: 'upgrade' };

        const cask = this.items?.find(c => c.token === nextToken);
        const name = cask ? this.getAppName(cask) : nextToken;
        this.drawerTitle = `Updating ${name}... (${this.updateQueue.length + 1} remaining)`;

        if (term) {
            term.reset();
            term.focus();
        }
        this.showDrawer = true;
        window.ipc.runAction(this.activeTaskId, 'upgrade', nextToken, false);
    },

    runSystemAction(action) {
        this.activeTaskId = `cask-${action}-${Date.now()}`;
        this.activeTaskToken = action;
        this.activeTaskAction = action;
        this.activeTaskErrorLog = '';

        this.runningTasks = { ...this.runningTasks, [action]: action };
        if (term) term.reset();

        if (action === 'refresh') {
            this.drawerTitle = this.__('Checking for updates...');
        } else if (action === 'cleanup') {
            this.drawerTitle = this.__('Cleaning up Homebrew cache...');
            this.showTerminal = true;
        }

        this.showDrawer = true;
        if (term) term.focus();
        window.ipc.runAction(this.activeTaskId, action, '', false);
    },

    launchTask(action, token, name, zap) {
        this.activeTaskId = `cask-${action}-${token}-${Date.now()}`;
        this.activeTaskToken = token;
        this.activeTaskAction = action;
        this.activeTaskErrorLog = '';
        this.activeTaskPassword = null;
        this.lastPasswordAttemptFailed = false;
        this.lastPasswordSentTime = 0;

        this.runningTasks = { ...this.runningTasks, [token]: action };
        if (term) term.reset();

        const titleTemplate = action === 'install' ? 'Installing {name}...'
            : action === 'uninstall' ? 'Deleting {name}...' : 'Updating {name}...';
        this.drawerTitle = titleTemplate.replace('{name}', name);
        this.showDrawer = true;
        if (term) term.focus();

        window.ipc.runAction(this.activeTaskId, action, token, zap);
    },

    async startAction(action, token, appName) {
        if (action === 'open') {
            const cask = this.items?.find(c => c.token === token);
            const app = appName || (cask ? (cask.app || cask.name) : null);
            try {
                await window.ipc.openApp(token, app);
            } catch (e) {
                console.error('Failed to open app:', e);
            }
            return;
        }

        if (this.activeTaskId) {
            alert(this.__('Another operation is currently running. Please wait.'));
            return;
        }

        if (action === 'upgrade-all') {
            const outdatedTokens = Object.keys(this.outdatedMap || {});
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

        const cask = this.items?.find(c => c.token === token);
        const name = cask ? this.getAppName(cask) : token;

        let zap = false;
        if (action === 'uninstall') {
            const res = await TaskPrompt.confirmUninstall(cask, name, this.__.bind(this));
            if (!res.confirmed) return;
            zap = res.zap;
        }

        this.launchTask(action, token, name, zap);
    },

    sendPassword(pass) {
        this.activeTaskPassword = pass || '';
        this.lastPasswordAttemptFailed = false;
        this.lastPasswordSentTime = Date.now();
        this.isWaitingForInput = false;
        if (this.activeTaskId) {
            window.ipc.writePtyInput(this.activeTaskId, (pass || '') + '\r');
        }
    },

    cancelPassword() {
        this.activeTaskPassword = null;
        this.lastPasswordAttemptFailed = false;
        this.lastPasswordSentTime = 0;
        this.isWaitingForInput = false;
        if (this.activeTaskId) {
            window.ipc.writePtyInput(this.activeTaskId, '\x03');
        }
    },

    cancel() {
        this.cancelPassword();
        this.dismissPasswordModal();
        if (this.activeTaskId) window.ipc.cancelAction(this.activeTaskId);
        if (this.isUpdatingAll) this.stopUpdateAll();
    },

    requestPassword(token, action) {
        const cask = this.items?.find(c => c.token === token);
        if (cask) {
            this.caskName = this.getAppName(cask);
            this.caskIcon = cask.iconUrl;
            this.caskToken = cask.token;
        } else {
            this.caskName = action === 'refresh' ? 'Homebrew' : (token || 'System');
            this.caskIcon = '';
            this.caskToken = '';
        }
        this.caskAction = action;
        this.showPasswordModal = true;
    },

    submitPassword() {
        this.sendPassword(this.passwordValue);
        this.dismissPasswordModal();
    },

    dismissPasswordModal() {
        this.showPasswordModal = false;
        this.passwordValue = '';
    }
});

// Backward-compatible global aliases
window.startAction = (action, token) => window.shell?.startAction(action, token);
window.cancelCurrentAction = () => window.shell?.cancel();
window.terminal = window.shell;
