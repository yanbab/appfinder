// Brew Facade - Coordinates modular services for Homebrew and App operations

const brewCli = require('./services/brew-cli');
const taskRunner = require('./services/task-runner');
const appLocator = require('./services/app-locator');
const cacheService = require('./services/cache-service');
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

function runAction(event, data) {
  return taskRunner.runAction(event, data, () => getUpdates(true));
}

function cancelAction(event, taskId) {
  return taskRunner.cancelAction(event, taskId);
}

function writePtyInput(taskId, text) {
  return taskRunner.writePtyInput(taskId, text);
}

module.exports = {
  getApps: brewCli.getApps,
  getCategories: brewCli.getCategories,
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
