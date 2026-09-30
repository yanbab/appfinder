const path = require('path');
const fs = require('fs');
const macosApps = require('./macos');

/**
 * Finds the installed path for a Homebrew cask application
 * @param {object|string} caskOrToken
 * @param {string} [appName]
 * @returns {string|null}
 */
function findInstalledAppPath(caskOrToken, appName) {
  const token = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.token : caskOrToken) || '';
  const candidate = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.app || caskOrToken.name : appName) || token;
  if (!candidate && !token) return null;

  return macosApps.findAppBundle([candidate, token]);
}

/**
 * Retrieves file dates for an application, falling back to Caskroom if necessary
 * @param {string} foundPath - Installed .app path
 * @param {string} token - Homebrew cask token
 * @returns {Promise<{ modified: string|null, lastOpened: string|null, installed: string|null }|null>}
 */
async function getAppFileDates(foundPath, token) {
  let result = {
    modified: null,
    lastOpened: null,
    installed: null
  };

  if (foundPath) {
    result = await macosApps.getAppDates(foundPath);
  }

  // Fallback to Caskroom directory for installed date if needed
  if (!result.installed && token) {
    const caskroomBases = ['/opt/homebrew/Caskroom', '/usr/local/Caskroom'];
    for (const base of caskroomBases) {
      const tDir = path.join(base, token);
      const stat = await fs.promises.stat(tDir).catch(() => null);
      if (stat) {
        if (stat.birthtime && stat.birthtime.getTime() > 0) {
          result.installed = stat.birthtime.toISOString();
        } else if (stat.ctime) {
          result.installed = stat.ctime.toISOString();
        } else if (stat.mtime) {
          result.installed = stat.mtime.toISOString();
        }
        break;
      }
    }
  }

  return (result.modified || result.lastOpened || result.installed) ? result : null;
}

/**
 * Launches an application associated with a cask or token
 * @param {object|string} caskOrToken
 * @param {string} [appName]
 * @returns {Promise<{ success: boolean, path?: string, error?: string }>}
 */
async function openApp(caskOrToken, appName) {
  const foundPath = findInstalledAppPath(caskOrToken, appName);
  if (foundPath) {
    return macosApps.launchApp(foundPath);
  }

  const token = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.token : caskOrToken) || '';
  const appCandidate = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.app || caskOrToken.name : appName) || token;

  return macosApps.launchApp([appCandidate, token].filter(Boolean));
}

module.exports = {
  findInstalledAppPath,
  getAppFileDates,
  openApp
};
