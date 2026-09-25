const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');
const pty = require('node-pty');

const execAsync = promisify(exec);
const configDir = path.join(os.homedir(), '.config', 'appfinder');
const updatesCachePath = path.join(configDir, 'updates.json');
const dataDir = path.join(__dirname, '..', '..', 'data');
const activeTasks = new Map();

// Fix spawn-helper permissions for packaged node-pty on macOS
try {
  const ptyDir = path.dirname(require.resolve('node-pty/package.json'));
  const prebuildsDir = path.join(ptyDir, 'prebuilds');
  if (fs.existsSync(prebuildsDir)) {
    for (const d of fs.readdirSync(prebuildsDir)) {
      const helper = path.join(prebuildsDir, d, 'spawn-helper');
      if (fs.existsSync(helper)) {
        try { fs.chmodSync(helper, 0o755); } catch (_) { }
      }
    }
  }
  const releaseHelper = path.join(ptyDir, 'build', 'Release', 'spawn-helper');
  if (fs.existsSync(releaseHelper)) {
    try { fs.chmodSync(releaseHelper, 0o755); } catch (_) { }
  }
} catch (_) { }

function getBrewPath() {
  const paths = [
    '/opt/homebrew/bin/brew',
    '/usr/local/bin/brew',
    '/home/linuxbrew/.linuxbrew/bin/brew'
  ];
  return paths.find(p => fs.existsSync(p)) || 'brew';
}

function getEnvWithBrew() {
  const extraPaths = ['/opt/homebrew/bin', '/usr/local/bin', '/home/linuxbrew/.linuxbrew/bin'];
  const currentPath = process.env.PATH || '';
  const missing = extraPaths.filter(p => !currentPath.includes(p));
  return {
    ...process.env,
    SUDO_PROMPT: 'Password: ',
    HOMEBREW_NO_AUTO_UPDATE: '1',
    HOMEBREW_NO_ENV_HINTS: '1',
    PATH: missing.length ? `${missing.join(':')}:${currentPath}` : currentPath
  };
}

function getData(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  } catch (e) {
    console.error(`Failed to read data file ${file}:`, e);
    return [];
  }
}

function updateDockBadge(count) {
  if (process.platform === 'darwin') {
    const { app } = require('electron');
    if (app?.dock?.setBadge) {
      app.dock.setBadge(count > 0 ? String(count) : '');
    }
  }
}

function getApps() {
  return getData('apps.json');
}

function getCategories() {
  return getData('categories.json');
}

async function getInstalled(event) {
  const brewPath = getBrewPath();
  try {
    const { stdout } = await execAsync(`"${brewPath}" list --cask --versions`, { env: getEnvWithBrew() });
    const lines = stdout.trim().split('\n').filter(Boolean);
    const tokens = [];
    const versions = {};
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const token = parts[0];
      const ver = parts.slice(1).join(' ') || null;
      if (token) {
        tokens.push(token);
        if (ver) versions[token] = ver;
      }
    }
    return { tokens, versions };
  } catch (err) {
    console.error('Failed to run brew list --cask --versions:', err);
    event?.sender?.send('status:log', `\x1b[31mFailed to check installed casks: ${err.message}\x1b[0m\r\n`);
    return { tokens: [], versions: {} };
  }
}

async function getUpdates(force = false) {
  if (!force) {
    try {
      const raw = await fs.promises.readFile(updatesCachePath, 'utf8').catch(() => null);
      if (raw && raw.trim()) {
        const data = JSON.parse(raw);
        const casks = Array.isArray(data) ? data : (data?.casks || []);
        updateDockBadge(casks.length);
        return { casks };
      }
    } catch (e) {
      console.error('Failed to read cached updates:', e);
    }
  }

  try {
    const brewPath = getBrewPath();
    const { stdout } = await execAsync(`"${brewPath}" outdated --cask --json`, { env: getEnvWithBrew() });
    const match = stdout.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const data = match ? JSON.parse(match[0]) : JSON.parse(stdout);
    const casks = Array.isArray(data) ? data : (data?.casks || []);

    try {
      await fs.promises.mkdir(configDir, { recursive: true });
      await fs.promises.writeFile(updatesCachePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to write updates cache:', err);
    }

    updateDockBadge(casks.length);
    return { casks };
  } catch (err) {
    console.error('Failed to get updates:', err);
    return { casks: [] };
  }
}

function findInstalledAppPath(caskOrToken, appName) {
  // FIXME: SLOP
  const token = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.token : caskOrToken) || '';
  const appCandidate = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.app || caskOrToken.name : appName) || token;
  const appFile = appCandidate ? path.basename(appCandidate) : '';
  const cleanAppFile = appFile && !appFile.endsWith('.app') ? `${appFile}.app` : appFile;
  const rawTarget = appName ? path.basename(appName) : '';

  const userHome = process.env.HOME || '';
  const pathsToTry = [];
  if (cleanAppFile) {
    pathsToTry.push(path.join('/Applications', cleanAppFile));
    pathsToTry.push(path.join(userHome, 'Applications', cleanAppFile));
    pathsToTry.push(path.join('/Applications/Utilities', cleanAppFile));
    pathsToTry.push(path.join('/System/Applications', cleanAppFile));
    pathsToTry.push(path.join('/System/Applications/Utilities', cleanAppFile));
  }
  if (appCandidate && appCandidate !== cleanAppFile) {
    pathsToTry.push(path.join('/Applications', appCandidate));
    pathsToTry.push(path.join(userHome, 'Applications', appCandidate));
  }
  if (rawTarget) {
    pathsToTry.push(path.join('/opt/homebrew/bin', rawTarget));
    pathsToTry.push(path.join('/usr/local/bin', rawTarget));
    pathsToTry.push(path.join(userHome, 'Library/Fonts', rawTarget));
    pathsToTry.push(path.join('/Library/Fonts', rawTarget));
    pathsToTry.push(path.join(userHome, 'bin', rawTarget));
    pathsToTry.push(path.join(userHome, '.local/bin', rawTarget));
  }

  // Check Homebrew Caskroom locations
  const caskroomBases = ['/opt/homebrew/Caskroom', '/usr/local/Caskroom', '/home/linuxbrew/.linuxbrew/Caskroom'];
  if (token) {
    for (const base of caskroomBases) {
      const tokenDir = path.join(base, token);
      if (fs.existsSync(tokenDir)) {
        try {
          const versions = fs.readdirSync(tokenDir);
          for (const ver of versions) {
            const verDir = path.join(tokenDir, ver);
            if (fs.existsSync(verDir) && fs.statSync(verDir).isDirectory()) {
              if (cleanAppFile) {
                const directApp = path.join(verDir, cleanAppFile);
                if (fs.existsSync(directApp)) pathsToTry.push(directApp);
              }
              if (rawTarget) {
                const directTarget = path.join(verDir, rawTarget);
                if (fs.existsSync(directTarget)) pathsToTry.push(directTarget);
              }
              const files = fs.readdirSync(verDir);
              for (const f of files) {
                if (f.endsWith('.app') || (rawTarget && f === rawTarget)) {
                  pathsToTry.push(path.join(verDir, f));
                }
              }
            }
          }
        } catch (_) { }
      }
    }
  }

  let foundPath = pathsToTry.find(p => fs.existsSync(p));

  // If still not found, search via Spotlight mdfind
  if (!foundPath && cleanAppFile && process.platform === 'darwin') {
    try {
      const { execSync } = require('child_process');
      const targetQuery = rawTarget || cleanAppFile;
      const output = execSync(`/usr/bin/mdfind "kMDItemFSName == '${targetQuery}'"`, { encoding: 'utf8', timeout: 2000 });
      const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        foundPath = lines[0];
      }
    } catch (_) { }
  }

  return foundPath || null;
}

function getAppFileDates(foundPath, token) {

  const result = {
    modified: null,
    lastOpened: null,
    installed: null
  };

  if (foundPath && fs.existsSync(foundPath)) {
    try {
      const stats = fs.statSync(foundPath);
      if (stats.mtime) {
        result.modified = stats.mtime.toISOString();
      }
      if (stats.birthtime && stats.birthtime.getTime() > 0) {
        result.installed = stats.birthtime.toISOString();
      }
    } catch (_) { }

    if (process.platform === 'darwin') {
      try {
        const { execSync } = require('child_process');
        const mdlsOut = execSync(`/usr/bin/mdls -name kMDItemLastUsedDate -name kMDItemContentModificationDate -name kMDItemDateAdded "${foundPath}"`, { encoding: 'utf8', timeout: 1500 });
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
  }

  // Fallback to Caskroom directory for installed date if needed
  if (!result.installed && token) {
    const caskroomBases = ['/opt/homebrew/Caskroom', '/usr/local/Caskroom'];
    for (const base of caskroomBases) {
      const tDir = path.join(base, token);
      if (fs.existsSync(tDir)) {
        try {
          const stat = fs.statSync(tDir);
          if (stat.birthtime && stat.birthtime.getTime() > 0) {
            result.installed = stat.birthtime.toISOString();
          } else if (stat.ctime) {
            result.installed = stat.ctime.toISOString();
          } else if (stat.mtime) {
            result.installed = stat.mtime.toISOString();
          }
        } catch (_) { }
        break;
      }
    }
  }

  return (result.modified || result.lastOpened || result.installed) ? result : null;
}

async function openApp(caskOrToken, appName) {
  const { shell } = require('electron');
  const foundPath = findInstalledAppPath(caskOrToken, appName);

  try {
    if (foundPath) {
      if (shell && shell.openPath) {
        const errMsg = await shell.openPath(foundPath);
        if (!errMsg) return { success: true, path: foundPath };
      }
      exec(`open "${foundPath}"`);
      return { success: true, path: foundPath };
    }

    // Fallback attempts with open -a
    const { execSync } = require('child_process');
    const token = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.token : caskOrToken) || '';
    const appCandidate = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.app || caskOrToken.name : appName) || token;
    const appFile = appCandidate ? path.basename(appCandidate) : '';
    const cleanAppFile = appFile && !appFile.endsWith('.app') ? `${appFile}.app` : appFile;
    const nameWithoutApp = cleanAppFile.endsWith('.app') ? cleanAppFile.slice(0, -4) : cleanAppFile;
    const targets = [nameWithoutApp, cleanAppFile, appCandidate, token].filter(Boolean);
    for (const target of targets) {
      try {
        execSync(`open -a "${target}"`, { stdio: 'ignore', timeout: 2000 });
        return { success: true };
      } catch (_) { }
    }

    return { success: false, error: 'Application not found' };
  } catch (e) {
    console.error('Failed to open app:', e);
    return { success: false, error: e.message };
  }
}

function runAction(event, { taskId, action, token, zap }) {
  const { BrowserWindow } = require('electron');
  const getTargetWindow = () => {
    try {
      return event?.sender && !event.sender.isDestroyed() ? BrowserWindow.fromWebContents(event.sender) : null;
    } catch (_) {
      return null;
    }
  };

  const targetWin = getTargetWindow();
  if (targetWin && !targetWin.isDestroyed()) {
    targetWin.setProgressBar(0.5);
  }

  const actions = {
    install: ['install', '--force', '--cask', token],
    upgrade: ['upgrade', '--force', '--cask', token],
    uninstall: zap ? ['uninstall', '--force', '--zap', '--cask', token] : ['uninstall', '--force', '--cask', token],
    refresh: ['update'],
    cleanup: ['cleanup', '--prune=all']
  };

  const args = actions[action];
  if (!args) {
    if (targetWin && !targetWin.isDestroyed()) targetWin.setProgressBar(-1);
    event.reply('task:complete', { taskId, code: 1, error: 'Invalid action' });
    return;
  }

  const brewCmd = `"${getBrewPath()}" ${args.map(a => `"${a}"`).join(' ')}`;
  const shellCmd = process.platform === 'win32'
    ? 'cmd.exe'
    : (fs.existsSync('/bin/zsh') ? '/bin/zsh' : (fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh'));
  const shellArgs = process.platform === 'win32' ? ['/c', brewCmd] : ['-l', '-c', brewCmd];
  const env = getEnvWithBrew();

  const handleProgress = (data) => {
    const text = typeof data === 'string' ? data : data.toString();
    const match = text.match(/#*\s*(\d{1,3}(?:\.\d+)?)%/);
    if (match) {
      const percent = parseFloat(match[1]);
      if (!isNaN(percent) && percent >= 0 && percent <= 100) {
        const win = getTargetWindow();
        if (win && !win.isDestroyed()) {
          win.setProgressBar(percent / 100);
        }
      }
    }
  };

  const onTaskFinished = (exitCode) => {
    activeTasks.delete(taskId);
    if (activeTasks.size === 0) {
      const win = getTargetWindow();
      if (win && !win.isDestroyed()) {
        win.setProgressBar(-1);
      }
    }
    if (exitCode === 0 && (action === 'install' || action === 'uninstall')) {
      if (process.platform === 'darwin') {
        const { app } = require('electron');
        if (app?.dock?.bounce) {
          app.dock.bounce('informational');
        }
      }
    }
    if (action === 'cleanup') {
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('cleanup:status', 'complete');
        }
      });
    }
    if (exitCode === 0 && action === 'refresh') {
      getUpdates(true).catch(() => { });
    }
    event.sender.send('task:complete', { taskId, code: exitCode });
  };

  let ptyProcess = null;
  try {
    ptyProcess = pty.spawn(shellCmd, shellArgs, {
      name: 'xterm-color',
      cols: 80,
      rows: 15,
      cwd: process.env.HOME || '/tmp',
      env
    });
  } catch (err) {
    console.warn('node-pty spawn failed, falling back to child_process.spawn:', err);
  }

  if (ptyProcess) {
    activeTasks.set(taskId, ptyProcess);
    ptyProcess.onData((data) => {
      handleProgress(data);
      event.sender.send('task:log', { taskId, type: 'stdout', text: data });
    });
    ptyProcess.onExit(({ exitCode }) => {
      onTaskFinished(exitCode);
    });
  } else {
    const cp = spawn(shellCmd, shellArgs, {
      cwd: process.env.HOME || '/tmp',
      env
    });
    activeTasks.set(taskId, {
      write: (data) => { try { cp.stdin.write(data); } catch (_) { } },
      kill: () => { try { cp.kill(); } catch (_) { } }
    });

    const forward = (stream) => stream.on('data', (data) => {
      const text = data.toString();
      handleProgress(text);
      event.sender.send('task:log', { taskId, type: 'stdout', text });
    });

    forward(cp.stdout);
    forward(cp.stderr);
    cp.on('close', (exitCode) => {
      onTaskFinished(exitCode || 0);
    });
  }
}

function cancelAction(event, taskId) {
  const { BrowserWindow } = require('electron');
  const task = activeTasks.get(taskId);
  if (task) {
    task.kill();
    activeTasks.delete(taskId);
    if (activeTasks.size === 0) {
      try {
        const win = event?.sender && !event.sender.isDestroyed() ? BrowserWindow.fromWebContents(event.sender) : null;
        if (win && !win.isDestroyed()) win.setProgressBar(-1);
      } catch (_) { }
    }
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) win.webContents.send('cleanup:status', 'complete');
    });
    event.reply('task:complete', { taskId, code: -1, cancelled: true });
  }
}

function writePtyInput(taskId, text) {
  activeTasks.get(taskId)?.write?.(text);
}

async function cleanCache() {
  try {
    const { stdout } = await execAsync(`"${getBrewPath()}" cleanup --prune=all`, { env: getEnvWithBrew() });
    return { success: true, stdout: stdout ? stdout.trim() : '' };
  } catch (err) {
    console.error('Failed to run brew cleanup:', err);
    return { success: false, error: err.message };
  }
}

const infoCache = new Map();

async function getCaskInfo(token) {
  if (!token || typeof token !== 'string') return null;
  const sanitized = token.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitized) return null;

  let cask = infoCache.get(sanitized);

  if (!cask) {
    const brewPath = getBrewPath();
    const { stdout } = await execAsync(`"${brewPath}" info --json=v2 --cask "${sanitized}"`, {
      env: getEnvWithBrew(),
      maxBuffer: 10 * 1024 * 1024
    }).catch(() => ({ stdout: null }));

    if (stdout) {
      try {
        cask = JSON.parse(stdout)?.casks?.[0] ?? null;
        if (cask) infoCache.set(sanitized, cask);
      } catch { }
    }
  }

  if (cask) {
    const result = { ...cask };
    let candidate = '';
    if (cask.artifacts) {
      for (const art of cask.artifacts) {
        if (art.app && Array.isArray(art.app) && art.app[0]) {
          candidate = art.app[0];
          break;
        }
      }
    }
    const foundPath = findInstalledAppPath(sanitized, candidate || (cask.name && cask.name[0]) || sanitized);
    if (foundPath) {
      result.appPath = foundPath;
    }
    const fileDates = getAppFileDates(foundPath, sanitized);
    if (fileDates) {
      if (fileDates.modified) result.modifiedDate = fileDates.modified;
      if (fileDates.lastOpened) result.lastOpenedDate = fileDates.lastOpened;
      if (fileDates.installed) result.installedDate = fileDates.installed;
    }
    return result;
  }

  return null;
}

async function revealInFinder(caskOrToken, appName) {
  const { shell } = require('electron');
  const token = (typeof caskOrToken === 'object' && caskOrToken !== null ? caskOrToken.token : caskOrToken) || '';
  let foundPath = findInstalledAppPath(caskOrToken, appName);
  if (!foundPath && token) {
    const caskroomBases = ['/opt/homebrew/Caskroom', '/usr/local/Caskroom', '/home/linuxbrew/.linuxbrew/Caskroom'];
    for (const base of caskroomBases) {
      const tokenDir = path.join(base, token);
      if (fs.existsSync(tokenDir)) {
        foundPath = tokenDir;
        break;
      }
    }
  }
  if (foundPath && fs.existsSync(foundPath)) {
    shell.showItemInFolder(foundPath);
    return { success: true, path: foundPath };
  }
  return { success: false, error: 'File not found' };
}

module.exports = {
  getData: getApps,
  getApps,
  getCategories,
  getInstalled,
  getUpdates,
  getCaskInfo,
  open: openApp,
  openApp,
  reveal: revealInFinder,
  revealInFinder,
  findInstalledAppPath,
  runAction,
  cancelAction,
  writePtyInput,
  cleanCache,
  getBrewPath,
  getEnvWithBrew
};
