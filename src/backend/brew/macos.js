const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execFileAsync = promisify(execFile);

const STANDARD_APP_DIRS = [
  '/Applications',
  path.join(process.env.HOME || '', 'Applications'),
  '/Applications/Utilities',
  '/System/Applications',
  '/System/Applications/Utilities'
];

/**
 * Searches for a macOS application bundle (.app) across standard directories
 * @param {string|string[]} candidateNames - Candidate app names or paths
 * @param {string[]} [customDirs] - Optional custom directories to search
 * @returns {string|null}
 */
function findAppBundle(candidateNames, customDirs = STANDARD_APP_DIRS) {
  const candidates = Array.isArray(candidateNames) ? candidateNames : [candidateNames];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    if (path.isAbsolute(candidate) && fs.existsSync(candidate)) {
      return candidate;
    }

    const appFile = path.basename(candidate);
    const cleanApp = appFile && !appFile.endsWith('.app') ? `${appFile}.app` : appFile;
    const tokenApp = candidate && !candidate.endsWith('.app') ? `${candidate}.app` : candidate;
    const namesToTry = Array.from(new Set([cleanApp, tokenApp, appFile].filter(Boolean)));

    for (const dir of customDirs) {
      for (const name of namesToTry) {
        const fullPath = path.join(dir, name);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
    }
  }

  return null;
}

/**
 * Locates an installed macOS app path given token and optional appName
 */
function findInstalledAppPath(token, appName) {
  if (!token && !appName) return null;
  const candidates = [appName, token].filter(Boolean);
  return findAppBundle(candidates);
}

/**
 * Retrieves file dates (modified, last opened, installed/created) via fs.stat and Spotlight mdls
 * @param {string} appPath - Absolute path to the .app bundle
 * @returns {Promise<{ modified: string|null, lastOpened: string|null, installed: string|null }>}
 */
async function getAppDates(appPath) {
  const result = {
    modified: null,
    lastOpened: null,
    installed: null
  };

  if (!appPath) return result;

  try {
    const stats = await fs.promises.stat(appPath).catch(() => null);
    if (stats) {
      if (stats.mtime) result.modified = stats.mtime.toISOString();
      if (stats.birthtime && stats.birthtime.getTime() > 0) {
        result.installed = stats.birthtime.toISOString();
      }
    }
  } catch (_) { }

  try {
    const { stdout: mdlsOut } = await execFileAsync('/usr/bin/mdls', [
      '-name', 'kMDItemLastUsedDate',
      '-name', 'kMDItemContentModificationDate',
      '-name', 'kMDItemDateAdded',
      appPath
    ], { timeout: 1500 }).catch(() => ({ stdout: '' }));

    const modMatch = mdlsOut.match(/kMDItemContentModificationDate\s*=\s*([0-9-]+\s+[0-9:]+\s+\+[0-9]+)/);
    const usedMatch = mdlsOut.match(/kMDItemLastUsedDate\s*=\s*([0-9-]+\s+[0-9:]+\s+\+[0-9]+)/);
    const addedMatch = mdlsOut.match(/kMDItemDateAdded\s*=\s*([0-9-]+\s+[0-9:]+\s+\+[0-9]+)/);

    if (modMatch && modMatch[1]) {
      const d = new Date(modMatch[1]);
      if (!isNaN(d.getTime())) result.modified = d.toISOString();
    }
    if (usedMatch && usedMatch[1]) {
      const d = new Date(usedMatch[1]);
      if (!isNaN(d.getTime())) result.lastOpened = d.toISOString();
    }
    if (addedMatch && addedMatch[1]) {
      const d = new Date(addedMatch[1]);
      if (!isNaN(d.getTime())) result.installed = d.toISOString();
    }
  } catch (_) { }

  return result;
}

async function getAppFileDates(appPath, token) {
  const targetPath = appPath || findInstalledAppPath(token);
  return getAppDates(targetPath);
}

/**
 * Launches an application via macOS /usr/bin/open
 * @param {string|string[]} target - Path or application candidate names
 * @returns {Promise<{ success: boolean, path?: string, error?: string }>}
 */
async function launchApp(target) {
  const targets = Array.isArray(target) ? target : [target];

  try {
    for (const item of targets) {
      if (!item || typeof item !== 'string') continue;

      if (path.isAbsolute(item) && fs.existsSync(item)) {
        await execFileAsync('/usr/bin/open', [item]);
        return { success: true, path: item };
      }
    }

    for (const item of targets) {
      if (!item || typeof item !== 'string') continue;
      const appFile = path.basename(item);
      const cleanAppFile = appFile && !appFile.endsWith('.app') ? `${appFile}.app` : appFile;
      const nameWithoutApp = cleanAppFile.endsWith('.app') ? cleanAppFile.slice(0, -4) : cleanAppFile;
      const namesToTry = Array.from(new Set([nameWithoutApp, cleanAppFile, item].filter(Boolean)));

      for (const name of namesToTry) {
        try {
          await execFileAsync('/usr/bin/open', ['-a', name]);
          return { success: true };
        } catch (_) { }
      }
    }

    return { success: false, error: 'Application not found' };
  } catch (e) {
    console.error('Failed to open app:', e);
    return { success: false, error: e.message };
  }
}

async function openApp(token, appName) {
  const candidates = [appName, token].filter(Boolean);
  return launchApp(candidates);
}

// Sizes & Disk Space Utilities
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1).replace(/\.0$/, '')} ${units[unitIndex]}`;
}

async function getDirSizeBytes(dirPath) {
  try {
    const { stdout } = await execFileAsync('/usr/bin/du', ['-sk', dirPath], { timeout: 3000 });
    const match = stdout.trim().match(/^(\d+)/);
    if (match) {
      return parseInt(match[1], 10) * 1024;
    }
  } catch (_) { }
  return null;
}

async function getDownloadSize(cask) {
  if (!cask || !cask.url) return null;
  try {
    const response = await fetch(cask.url, { method: 'HEAD', redirect: 'follow' });
    const length = response.headers.get('content-length');
    if (length) {
      const bytes = parseInt(length, 10);
      if (!isNaN(bytes) && bytes > 0) {
        return formatBytes(bytes);
      }
    }
  } catch (_) { }
  return null;
}

async function getInstalledSize(appPath) {
  if (!appPath || !fs.existsSync(appPath)) return null;
  const bytes = await getDirSizeBytes(appPath);
  return formatBytes(bytes);
}

async function getDataSize(cask) {
  if (!cask || !cask.artifacts) return null;
  const home = process.env.HOME || '';
  let totalBytes = 0;

  for (const art of cask.artifacts) {
    if (art.zap && Array.isArray(art.zap)) {
      for (const item of art.zap) {
        if (item.trash) {
          const targets = Array.isArray(item.trash) ? item.trash : [item.trash];
          for (const target of targets) {
            if (typeof target === 'string') {
              const fullPath = target.replace(/^~/, home);
              if (fs.existsSync(fullPath)) {
                const b = await getDirSizeBytes(fullPath);
                if (b) totalBytes += b;
              }
            }
          }
        }
      }
    }
  }

  return formatBytes(totalBytes);
}

async function getCaskSizes(cask, appPath) {
  const [downloadSize, installedSize, dataSize] = await Promise.all([
    getDownloadSize(cask),
    getInstalledSize(appPath),
    getDataSize(cask)
  ]);

  return { downloadSize, installedSize, dataSize };
}

module.exports = {
  STANDARD_APP_DIRS,
  findAppBundle,
  findInstalledAppPath,
  getAppDates,
  getAppFileDates,
  launchApp,
  openApp,
  formatBytes,
  getCaskSizes,
  getDownloadSize,
  getInstalledSize,
  getDataSize
};
