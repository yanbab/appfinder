// Brew Backend - Coordinates services for Homebrew operations

const brew = require('./brew');
const macos = require('./macos');

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
  let cask = brew.getCachedCaskInfo(sanitizedToken);
  if (!cask) {
    cask = await brew.fetchCaskJson(sanitizedToken);
    if (cask) {
      brew.setCachedCaskInfo(sanitizedToken, cask);
    }
  }
  return cask;
}

async function getCaskInfo(token) {
  if (!token || typeof token !== 'string') return null;
  const sanitized = token.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitized) return null;

  const cask = await getRawCask(sanitized);
  if (!cask) return null;

  const result = { ...cask };
  const candidate = getAppCandidateName(cask, sanitized);
  const foundPath = macos.findInstalledAppPath(sanitized, candidate);

  if (foundPath) {
    result.appPath = foundPath;
  }

  const fileDates = await macos.getAppFileDates(foundPath, sanitized);
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
  const foundPath = macos.findInstalledAppPath(sanitized, candidate);
  return await macos.getCaskSizes(cask, foundPath);
}

function runAction(data, callbacks) {
  const cbs = typeof callbacks === 'function' ? { onComplete: callbacks } : (callbacks || {});
  return brew.runAction(data, {
    ...cbs,
    onRefreshUpdates: cbs.onRefreshUpdates || (() => brew.getUpdates(true))
  });
}

module.exports = {
  getApps: brew.getApps,
  getCategories: brew.getCategories,
  getInstalled: brew.getInstalled,
  getUpdates: (force) => brew.getUpdates(force),
  getCaskInfo,
  getCaskSizesByToken,
  openApp: macos.openApp,
  findInstalledAppPath: macos.findInstalledAppPath,
  runAction,
  cancelAction: brew.cancelAction,
  writePtyInput: brew.writePtyInput,
  cleanCache: brew.cleanCache,
  getBrewPath: brew.getBrewPath,
  getEnvWithBrew: brew.getEnvWithBrew
};
