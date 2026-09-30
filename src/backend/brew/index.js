// Brew Backend - Coordinates services for Homebrew operations

const brewCli = require('./brew-cli');
const taskRunner = require('./task-runner');
const appLocator = require('./app-locator');
const cacheService = require('./cache-service');
const { getCaskSizes } = require('./sizes');

function getAppCandidateName(cask, token) {
  if (cask?.artifacts) {
    for (const art of cask.artifacts) {
      if (art.app && Array.isArray(art.app) && art.app[0]) {
        return art.app[0];
      }
    }
  }
  return (cask?.name && cask.name[0]) || token;
}

async function getRawCask(sanitizedToken) {
  let cask = cacheService.getCachedCaskInfo(sanitizedToken);
  if (!cask) {
    cask = await brewCli.fetchCaskJson(sanitizedToken);
    if (cask) {
      cacheService.setCachedCaskInfo(sanitizedToken, cask);
    }
  }
  return cask;
}

async function getUpdates(force = false) {
  return cacheService.getUpdates(force, brewCli.fetchOutdatedCasks);
}

async function getCaskInfo(token) {
  if (!token || typeof token !== 'string') return null;
  const sanitized = token.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitized) return null;

  const cask = await getRawCask(sanitized);
  if (!cask) return null;

  const result = { ...cask };
  const candidate = getAppCandidateName(cask, sanitized);
  const foundPath = appLocator.findInstalledAppPath(sanitized, candidate);

  if (foundPath) {
    result.appPath = foundPath;
  }

  const fileDates = await appLocator.getAppFileDates(foundPath, sanitized);

  if (fileDates) {
    if (fileDates.modified) result.modifiedDate = fileDates.modified;
    if (fileDates.lastOpened) result.lastOpenedDate = fileDates.lastOpened;
    if (fileDates.installed) result.installedDate = fileDates.installed;
  }

  return result;
}

async function getCaskSizesByToken(token) {
  if (!token || typeof token !== 'string') return null;
  const sanitized = token.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitized) return null;

  const cask = await getRawCask(sanitized);
  if (!cask) return null;

  const candidate = getAppCandidateName(cask, sanitized);
  const foundPath = appLocator.findInstalledAppPath(sanitized, candidate);
  return await getCaskSizes(cask, foundPath);
}

function runAction(data, callbacks) {
  const cbs = typeof callbacks === 'function' ? { onComplete: callbacks } : (callbacks || {});
  return taskRunner.runAction(data, {
    ...cbs,
    onRefreshUpdates: cbs.onRefreshUpdates || (() => getUpdates(true))
  });
}

function cancelAction(taskId, onComplete) {
  return taskRunner.cancelAction(taskId, onComplete);
}

function writePtyInput(taskId, text) {
  return taskRunner.writePtyInput(taskId, text);
}

module.exports = {
  getInstalled: brewCli.getInstalled,
  getUpdates,
  getCaskInfo,
  getCaskSizesByToken,
  openApp: appLocator.openApp,
  findInstalledAppPath: appLocator.findInstalledAppPath,
  runAction,
  cancelAction,
  writePtyInput,
  cleanCache: brewCli.cleanCache,
  getBrewPath: brewCli.getBrewPath,
  getEnvWithBrew: brewCli.getEnvWithBrew
};
