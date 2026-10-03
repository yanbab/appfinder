const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const taskRunner = require('./task-runner');

const execFileAsync = promisify(execFile);

// Cache definitions
const memoryCache = new Map();
const caskInfoCache = new Map();
const CACHE_DIR = path.join(process.env.HOME || '', '.config', 'appfinder');
const UPDATES_CACHE_FILE = path.join(CACHE_DIR, 'updates.json');
const UPDATES_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');

function getData(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch (e) {
    console.error(`Failed to read data file ${file}:`, e);
    return [];
  }
}

function getApps() {
  return getData('apps.json');
}

function getCategories() {
  return getData('categories.json');
}

function ensureCacheDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to create cache dir:', e);
  }
}

function getBrewPath() {
  const brewPaths = [
    '/opt/homebrew/bin/brew',
    '/usr/local/bin/brew',
    '/usr/bin/brew',
    '/bin/brew'
  ];
  for (const p of brewPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'brew';
}

function getEnvWithBrew() {
  const defaultPath = '/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
  const env = {
    ...process.env,
    PATH: process.env.PATH ? `${process.env.PATH}:${defaultPath}` : defaultPath,
    HOMEBREW_NO_AUTO_UPDATE: '1'
  };
  delete env.HOMEBREW_NO_COLOR;
  delete env.HOMEBREW_NO_EMOJI;
  return env;
}

async function runBrew(args) {
  try {
    const { stdout } = await execFileAsync(getBrewPath(), args, {
      env: getEnvWithBrew(),
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout;
  } catch (error) {
    console.error(`Brew command failed: brew ${args.join(' ')}`, error);
    return null;
  }
}

async function getInstalled(onLog) {
  try {
    onLog?.('Checking installed casks...');
    const stdout = await runBrew(['list', '--cask', '--versions']);
    if (!stdout) return { tokens: [], versions: {} };

    const tokens = [];
    const versions = {};

    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 1 && parts[0]) {
        const token = parts[0];
        tokens.push(token);
        if (parts.length >= 2) {
          versions[token] = parts.slice(1).join(' ');
        }
      }
    }

    return { tokens, versions };
  } catch (e) {
    console.error('Error fetching installed casks:', e);
    return { tokens: [], versions: {} };
  }
}

async function fetchOutdatedCasks() {
  try {
    const stdout = await runBrew(['outdated', '--cask', '--json=v2']);
    if (!stdout) return { casks: [] };
    const data = JSON.parse(stdout);
    return { casks: data.casks || [] };
  } catch (e) {
    console.error('Error fetching outdated casks:', e);
    return { casks: [] };
  }
}

async function getUpdates(force = false) {
  if (!force) {
    const mem = memoryCache.get('updates');
    if (mem && (Date.now() - mem.timestamp < UPDATES_CACHE_DURATION)) {
      return mem.data;
    }
    try {
      if (fs.existsSync(UPDATES_CACHE_FILE)) {
        const stat = fs.statSync(UPDATES_CACHE_FILE);
        if (Date.now() - stat.mtimeMs < UPDATES_CACHE_DURATION) {
          const data = JSON.parse(fs.readFileSync(UPDATES_CACHE_FILE, 'utf8'));
          memoryCache.set('updates', { data, timestamp: stat.mtimeMs });
          return data;
        }
      }
    } catch (_) { }
  }

  const fresh = await fetchOutdatedCasks();
  memoryCache.set('updates', { data: fresh, timestamp: Date.now() });
  ensureCacheDir();
  try {
    fs.writeFileSync(UPDATES_CACHE_FILE, JSON.stringify(fresh));
  } catch (_) { }

  return fresh;
}

function getCachedCaskInfo(token) {
  return caskInfoCache.get(token) || null;
}

function setCachedCaskInfo(token, data) {
  caskInfoCache.set(token, data);
}

async function fetchCaskJson(token) {
  try {
    const stdout = await runBrew(['info', '--cask', '--json=v2', token]);
    if (!stdout) return null;
    const data = JSON.parse(stdout);
    return (data.casks && data.casks[0]) || null;
  } catch (e) {
    console.error(`Error fetching cask json for ${token}:`, e);
    return null;
  }
}

async function getCaskInfo(token) {
  if (!token || typeof token !== 'string') return null;
  const sanitized = token.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitized) return null;

  let cask = getCachedCaskInfo(sanitized);
  if (!cask) {
    cask = await fetchCaskJson(sanitized);
    if (cask) {
      setCachedCaskInfo(sanitized, cask);
    }
  }
  return cask;
}

/**
 * Resolves CLI arguments for a given action
 * @param {string} action
 * @param {string} token
 * @param {boolean} [zap=false]
 * @returns {string[] | null}
 */
function getActionArgs(action, token, zap = false) {
  const actions = {
    install: ['install', '--force', '--cask', token],
    upgrade: ['upgrade', '--force', '--cask', token],
    uninstall: zap ? ['uninstall', '--force', '--zap', '--cask', token] : ['uninstall', '--force', '--cask', token],
    refresh: ['update'],
    cleanup: ['cleanup', '--prune=all']
  };
  return actions[action] || null;
}

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
    const stdout = await runBrew(['cleanup', '--prune=all']);
    return { success: true, stdout: stdout || '' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Executes a Homebrew action via taskRunner
 */
function runAction(data, callbacks = {}) {
  const cbs = typeof callbacks === 'function' ? { onComplete: callbacks } : (callbacks || {});
  const { onLog, onComplete, onPrompt, onRefreshUpdates } = cbs;
  const { taskId, action, token, zap } = data || {};

  const args = getActionArgs(action, token, zap);
  if (!args) {
    onComplete?.({ taskId, code: 1, error: 'Invalid action' });
    return;
  }

  taskRunner.runTask(
    {
      taskId,
      command: getBrewPath(),
      args,
      env: getEnvWithBrew()
    },
    {
      onLog,
      onPrompt,
      onComplete: ({ taskId: tid, code, error, cancelled }) => {
        if (code === 0 && action === 'refresh') {
          if (typeof onRefreshUpdates === 'function') {
            onRefreshUpdates().catch(() => { });
          } else {
            getUpdates(true).catch(() => { });
          }
        }
        onComplete?.({ taskId: tid, code, error, cancelled });
      }
    }
  );
}

function cancelAction(taskId, onComplete) {
  taskRunner.cancelTask(taskId, onComplete);
}

function writePtyInput(taskId, text) {
  taskRunner.writeTaskInput(taskId, text);
}

module.exports = {
  getApps,
  getCategories,
  getData,
  getBrewPath,
  getEnvWithBrew,
  runBrew,
  getInstalled,
  getUpdates,
  getCachedCaskInfo,
  setCachedCaskInfo,
  fetchCaskJson,
  getCaskInfo,
  getActionArgs,
  launchApp,
  cleanCache,
  runAction,
  cancelAction,
  writePtyInput
};
