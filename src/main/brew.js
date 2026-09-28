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

async function fetchLatestReleaseDate(rubySourcePath, token) {
  try {
    const filePath = rubySourcePath || `Casks/${token[0].toLowerCase()}/${token}.rb`;
    const url = `https://api.github.com/repos/Homebrew/homebrew-cask/commits?path=${encodeURIComponent(filePath)}&per_page=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AppFinder-App',
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data) && data[0]?.commit?.author?.date) {
      return data[0].commit.author.date;
    }
  } catch {
    // Fail gracefully if offline or rate limited
  }
  return null;
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

  const [fileDates, releaseDate] = await Promise.all([
    appLocator.getAppFileDates(foundPath, sanitized),
    fetchLatestReleaseDate(cask.ruby_source_path, sanitized),
  ]);

  if (fileDates) {
    if (fileDates.modified) result.modifiedDate = fileDates.modified;
    if (fileDates.lastOpened) result.lastOpenedDate = fileDates.lastOpened;
    if (fileDates.installed) result.installedDate = fileDates.installed;
  }

  if (releaseDate) {
    result.releaseDate = releaseDate;
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
