const { execFile } = require('child_process');
const { promisify } = require('util');
const brewService = require('./brew-service');

const execFileAsync = promisify(execFile);

/**
 * Launches an installed application via macOS /usr/bin/open
 * @param {string} appName
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function launchApp(appName) {
  try {
    await execFileAsync('/usr/bin/open', ['-a', appName]);
    return { success: true };
  } catch (err) {
    console.error(`Failed to launch app "${appName}":`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Cleans Homebrew cache via brew cleanup --prune=all
 * @returns {Promise<{ success: boolean, stdout?: string, error?: string }>}
 */
async function cleanCache() {
  try {
    const stdout = await brewService.runBrew(['cleanup', '--prune=all']);
    return { success: true, stdout: stdout || '' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  launchApp,
  cleanCache
};
