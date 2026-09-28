const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execFileAsync = promisify(execFile);

function findInstalledAppPath(caskOrToken, appName) {
  const token = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.token : caskOrToken) || '';
  const candidate = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.app || caskOrToken.name : appName) || token;
  if (!candidate && !token) return null;

  if (typeof candidate === 'string' && path.isAbsolute(candidate) && fs.existsSync(candidate)) {
    return candidate;
  }

  const appFile = path.basename(candidate);
  const cleanApp = appFile && !appFile.endsWith('.app') ? `${appFile}.app` : appFile;
  const tokenApp = token && !token.endsWith('.app') ? `${token}.app` : token;

  const searchDirs = [
    '/Applications',
    path.join(process.env.HOME || '', 'Applications'),
    '/Applications/Utilities',
    '/System/Applications',
    '/System/Applications/Utilities'
  ];

  const namesToTry = Array.from(new Set([cleanApp, tokenApp, appFile].filter(Boolean)));

  for (const dir of searchDirs) {
    for (const name of namesToTry) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

async function getAppFileDates(foundPath, token) {
  const result = {
    modified: null,
    lastOpened: null,
    installed: null
  };

  if (foundPath) {
    try {
      const stats = await fs.promises.stat(foundPath).catch(() => null);
      if (stats) {
        if (stats.mtime) {
          result.modified = stats.mtime.toISOString();
        }
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
        foundPath
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

async function openApp(caskOrToken, appName) {
  const foundPath = findInstalledAppPath(caskOrToken, appName);

  try {
    if (foundPath) {
      await execFileAsync('/usr/bin/open', [foundPath]);
      return { success: true, path: foundPath };
    }

    const token = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.token : caskOrToken) || '';
    const appCandidate = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.app || caskOrToken.name : appName) || token;
    const appFile = appCandidate ? path.basename(appCandidate) : '';
    const cleanAppFile = appFile && !appFile.endsWith('.app') ? `${appFile}.app` : appFile;
    const nameWithoutApp = cleanAppFile.endsWith('.app') ? cleanAppFile.slice(0, -4) : cleanAppFile;
    const targets = Array.from(new Set([nameWithoutApp, cleanAppFile, appCandidate, token].filter(Boolean)));

    for (const target of targets) {
      try {
        await execFileAsync('/usr/bin/open', ['-a', target]);
        return { success: true };
      } catch (_) { }
    }

    return { success: false, error: 'Application not found' };
  } catch (e) {
    console.error('Failed to open app:', e);
    return { success: false, error: e.message };
  }
}

module.exports = {
  findInstalledAppPath,
  getAppFileDates,
  openApp
};
