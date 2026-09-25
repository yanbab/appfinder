// Task prompt detection, error parsing, and interactive dialogs

window.TaskPrompt = {
    detectPrompt(text) {
        const cleanText = window.ShellUtils.stripAnsi(text);

        const isRetry = /sorry, try again/i.test(cleanText) ||
            /incorrect password/i.test(cleanText) ||
            /authentication failure/i.test(cleanText);

        const isPasswordPrompt = /password\s*[:?]/i.test(cleanText) ||
            /passphrase\s*[:?]/i.test(cleanText) ||
            /mot de passe\s*[:?]/i.test(cleanText) ||
            /(?:sudo|admin).*(?:password|passphrase)/i.test(cleanText);

        const isInteractivePrompt = isPasswordPrompt || /\[y\/n\]/i.test(cleanText);

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

        const cleanLogs = window.ShellUtils.stripAnsi(logText);
        const lines = cleanLogs.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        const defaultError = translate('No error details recorded.');

        // Filter out Brew progress lines starting with ==> to find actual error details
        const errorLines = lines.filter(l => !l.startsWith('==>') && (
            /error/i.test(l) ||
            /permission denied/i.test(l) ||
            /operation not permitted/i.test(l) ||
            /access/i.test(l) ||
            /sudo/i.test(l) ||
            /failed/i.test(l)
        ));

        const nonProgressLines = lines.filter(l => !l.startsWith('==>'));

        let rawError = "";
        if (errorLines.length > 0) {
            rawError = errorLines.slice(-3).join('\n');
        } else if (nonProgressLines.length > 0) {
            rawError = nonProgressLines[nonProgressLines.length - 1];
        } else if (lines.length > 0) {
            rawError = lines[lines.length - 1];
        } else {
            rawError = defaultError;
        }

        let matchedKey = null;
        if (catalog) {
            for (const key of Object.keys(catalog)) {
                if (key && key.length > 5 && rawError.includes(key)) {
                    matchedKey = key;
                    break;
                }
            }
        }

        const details = matchedKey ? translate(matchedKey) : translate(rawError);
        return { title, details };
    },

    async confirmUninstall(cask, name, __) {
        const translate = typeof __ === 'function' ? __ : (s => s);
        try {
            const config = await window.ipc.getConfig();
            const title = translate('Confirm Delete');
            const rawMsg = translate('Are you sure you want to delete %s?') || 'Are you sure you want to delete %s?';
            const message = rawMsg.includes('%s') ? rawMsg.replace('%s', name) : `Are you sure you want to delete ${name}?`;
            const detail = ""; //translate('You can reinstall this application later.');
            const removeAppLabel = translate('Delete');
            const cancelLabel = translate('Cancel');
            const deleteSettingsLabel = translate('Delete settings and data');

            let iconDataUrl = null;
            if (cask && cask.iconUrl) {
                iconDataUrl = await window.ShellUtils.getIconDataUrl(cask.iconUrl);
            }

            const response = await window.ipc.showMessage({
                type: 'question',
                buttons: [removeAppLabel, cancelLabel],
                defaultId: 0,
                cancelId: 1,
                title,
                message,
                detail,
                icon: iconDataUrl,
                checkboxLabel: deleteSettingsLabel,
                checkboxChecked: !!config.zap
            });

            if (response.response !== 0) {
                return { confirmed: false };
            }

            const zap = !!response.checkboxChecked;
            await window.ipc.updateConfig({ zap });
            return { confirmed: true, zap };
        } catch (e) {
            console.error('Failed to confirm uninstall:', e);
            return { confirmed: false };
        }
    }
};

// Task action runners and Password modal extension
Object.assign(window.shell, {
    onTaskStarted(token, action) {
        this.runningTasks = { ...this.runningTasks, [token]: action };
    },

    onTaskFinished(token) {
        const updated = { ...this.runningTasks };
        delete updated[token];
        this.runningTasks = updated;
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
        if (window.startAction) {
            await window.startAction(action, token);
        }
    },

    cancelCurrentAction() {
        if (window.cancelCurrentAction) {
            window.cancelCurrentAction();
        }
    },

    requestPassword(token, action) {
        const cask = this.items?.find(c => c.token === token);
        if (cask) {
            this.caskName = this.getAppName(cask);
            this.caskIcon = cask.iconUrl;
            this.caskToken = cask.token;
        } else {
            this.caskName = action === 'refresh' ? 'Homebrew' : (token || 'System');
            this.caskIcon = "";
            this.caskToken = "";
        }
        this.caskAction = action;
        this.showPasswordModal = true;
    },

    submitPassword() {
        window.terminal?.sendPassword(this.passwordValue);
        this.dismissPasswordModal();
    },

    cancelPassword() {
        window.terminal?.cancelPassword();
        this.dismissPasswordModal();
    },

    dismissPasswordModal() {
        this.showPasswordModal = false;
        this.passwordValue = "";
    }
});
