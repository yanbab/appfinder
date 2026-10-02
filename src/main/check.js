const fs = require('fs');
const { execSync } = require('child_process');
const i18n = require('./i18n');

function checkCommand(cmd) {
    const paths = [
        `/opt/homebrew/bin/${cmd}`,
        `/usr/local/bin/${cmd}`,
        `/usr/bin/${cmd}`,
        `/bin/${cmd}`
    ];
    for (const p of paths) {
        try {
            if (fs.existsSync(p)) return true;
        } catch (_) { }
    }
    try {
        execSync(`which ${cmd}`, { stdio: 'ignore' });
        return true;
    } catch (_) {
        return false;
    }
}

function checkCommandDialog(cmd) {
    const { dialog } = require('electron');
    dialog.showErrorBox(
        i18n.__('Command "%s" not found', cmd),
        i18n.__(`Please install "%s" and try again.`, cmd)
    );
}

module.exports = {
    checkCommand,
    checkCommandDialog
};