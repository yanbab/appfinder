// Check if a command is available

const fs = require('fs');
const i18n = require('./i18n');

function checkCommand(cmd) {
    const paths = [
        `/usr/local/bin/${cmd}`,
        `/opt/homebrew/bin/${cmd}`,
        `/usr/bin/${cmd}`,
        `/bin/${cmd}`
    ];
    for (const p of paths) if (fs.existsSync(p)) return true;
    return false;
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