// Flatpak Backend - Coordinates services for Flatpak operations on Linux

const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ptyRunner = require('../brew/pty');

const execFileAsync = promisify(execFile);

function getFlatpakPath() {
  const flatpakPaths = [
    '/usr/bin/flatpak',
    '/usr/local/bin/flatpak',
    '/var/lib/flatpak/exports/bin/flatpak',
    path.join(os.homedir(), '.local/share/flatpak/exports/bin/flatpak')
  ];
  for (const p of flatpakPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'flatpak';
}

function getEnvWithFlatpak() {
  const defaultPath = '/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:/var/lib/flatpak/exports/bin:' +
    path.join(os.homedir(), '.local/share/flatpak/exports/bin');
  return {
    ...process.env,
    PATH: process.env.PATH ? `${process.env.PATH}:${defaultPath}` : defaultPath
  };
}

async function runFlatpak(args) {
  try {
    const { stdout } = await execFileAsync(getFlatpakPath(), args, {
      env: getEnvWithFlatpak(),
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout;
  } catch (error) {
    console.error(`Flatpak command failed: flatpak ${args.join(' ')}`, error);
    return null;
  }
}

async function getInstalled(onLog) {
  try {
    onLog?.('Checking installed flatpaks...');
    const stdout = await runFlatpak(['list', '--app', '--columns=application,version']);
    if (!stdout) return { tokens: [], versions: {} };

    const tokens = [];
    const versions = {};

    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\t+|\s{2,}/);
      if (parts.length >= 1 && parts[0]) {
        const token = parts[0].trim();
        tokens.push(token);
        if (parts.length >= 2) {
          versions[token] = parts[1].trim();
        }
      }
    }

    return { tokens, versions };
  } catch (e) {
    console.error('Error fetching installed flatpaks:', e);
    return { tokens: [], versions: {} };
  }
}

async function getUpdates(force = false) {
  try {
    const stdout = await runFlatpak(['remote-ls', '--updates', '--columns=application,version']);
    if (!stdout) return { casks: [] };

    const casks = [];
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\t+|\s{2,}/);
      if (parts.length >= 1 && parts[0]) {
        const token = parts[0].trim();
        const version = parts.length >= 2 ? parts[1].trim() : '';
        casks.push({
          name: token,
          installed_version: '',
          current_version: version
        });
      }
    }
    return { casks };
  } catch (e) {
    console.error('Error fetching flatpak updates:', e);
    return { casks: [] };
  }
}

function findInstalledAppPath(token, appName) {
  if (!token) return null;
  const home = os.homedir();
  const searchPaths = [
    `/var/lib/flatpak/exports/share/applications/${token}.desktop`,
    path.join(home, `.local/share/flatpak/exports/share/applications/${token}.desktop`),
    `/var/lib/flatpak/app/${token}`,
    path.join(home, `.local/share/flatpak/app/${token}`)
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

async function getCaskInfo(token) {
  if (!token || typeof token !== 'string') return null;
  const sanitized = token.replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!sanitized) return null;

  try {
    const stdout = await runFlatpak(['info', sanitized]);
    const foundPath = findInstalledAppPath(sanitized);

    const info = {
      token: sanitized,
      name: [sanitized],
      version: null,
      desc: null,
      homepage: null,
      appPath: foundPath || null,
      installed: !!foundPath
    };

    if (stdout) {
      const lines = stdout.split('\n');
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim().toLowerCase();
          const val = line.slice(colonIdx + 1).trim();
          if (key === 'version') info.version = val;
          if (key === 'origin' || key === 'remote') info.origin = val;
          if (key === 'arch') info.arch = val;
          if (key === 'branch') info.branch = val;
          if (key === 'license') info.license = val;
        }
      }
    }

    return info;
  } catch (e) {
    console.error(`Error getting flatpak info for ${sanitized}:`, e);
    return null;
  }
}

async function getCaskSizesByToken(token) {
  if (!token || typeof token !== 'string') {
    return { downloadSize: null, installedSize: null, dataSize: null };
  }
  const sanitized = token.replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!sanitized) {
    return { downloadSize: null, installedSize: null, dataSize: null };
  }

  try {
    const stdout = await runFlatpak(['info', '--show-size', sanitized]);
    let installedSize = null;
    if (stdout) {
      installedSize = stdout.trim();
    }
    return {
      downloadSize: null,
      installedSize,
      dataSize: null
    };
  } catch (_) {
    return { downloadSize: null, installedSize: null, dataSize: null };
  }
}

async function openApp(token, appName) {
  if (!token) return { success: false, error: 'No token provided' };
  try {
    const cp = spawn(getFlatpakPath(), ['run', token], {
      detached: true,
      stdio: 'ignore',
      env: getEnvWithFlatpak()
    });
    cp.unref();
    return { success: true };
  } catch (e) {
    console.error(`Failed to launch flatpak app ${token}:`, e);
    return { success: false, error: e.message };
  }
}

function runAction({ taskId, action, token, zap }, callbacks = {}) {
  const { onLog, onComplete, onRefreshUpdates } = callbacks;

  const actions = {
    install: ['install', '-y', 'flathub', token],
    upgrade: ['update', '-y', token],
    uninstall: zap ? ['uninstall', '-y', '--delete-data', token] : ['uninstall', '-y', token],
    refresh: ['update', '--appstream'],
    cleanup: ['uninstall', '--unused', '-y']
  };

  const args = actions[action];
  if (!args) {
    onComplete?.({ taskId, code: 1, error: 'Invalid action' });
    return;
  }

  const flatpakCmd = `"${getFlatpakPath()}" ${args.map(a => `"${a}"`).join(' ')}`;

  ptyRunner.runTask(
    {
      taskId,
      command: flatpakCmd,
      env: getEnvWithFlatpak()
    },
    {
      onLog,
      onComplete: ({ taskId: tid, code, error, cancelled }) => {
        if (code === 0 && action === 'refresh' && typeof onRefreshUpdates === 'function') {
          onRefreshUpdates().catch(() => { });
        }
        onComplete?.({ taskId: tid, code, error, cancelled });
      }
    }
  );
}

function cancelAction(taskId, onComplete) {
  ptyRunner.cancelTask(taskId, onComplete);
}

function writePtyInput(taskId, text) {
  ptyRunner.writeTaskInput(taskId, text);
}

async function cleanCache() {
  try {
    const stdout = await runFlatpak(['uninstall', '--unused', '-y']);
    return { success: true, stdout: stdout || '' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  getInstalled,
  getUpdates,
  getCaskInfo,
  getCaskSizesByToken,
  openApp,
  findInstalledAppPath,
  runAction,
  cancelAction,
  writePtyInput,
  cleanCache,
  getFlatpakPath,
  getEnvWithFlatpak
};
