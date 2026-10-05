const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const taskRunner = require('./task-runner');

const execFileAsync = promisify(execFile);

// Cache definitions
const memoryCache = new Map();
const caskInfoCache = new Map();
const CACHE_DIR = path.join(process.env.HOME || '', '.config', 'appfinder');
const UPDATES_CACHE_FILE = path.join(CACHE_DIR, 'updates.json');
const UPDATES_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');

const CODE_NAMES = {
  high_sierra: '10.13', mojave: '10.14', catalina: '10.15',
  big_sur: '11', monterey: '12', ventura: '13', sonoma: '14', sequoia: '15', tahoe: '16'
};

function getSystemInfo() {
  let sysVer = '';
  try {
    sysVer = typeof process.getSystemVersion === 'function' ? process.getSystemVersion() : '';
    if (!sysVer && process.platform === 'darwin') {
      const dMajor = parseInt(os.release().split('.')[0], 10);
      sysVer = dMajor >= 20 ? String(dMajor - 9) : (dMajor >= 5 ? `10.${dMajor - 4}` : '15');
    }
  } catch (_) { }
  return {
    platform: process.platform,
    arch: process.arch || 'arm64',
    systemVersion: sysVer || '15'
  };
}

function parseVer(v) {
  const s = String(v || '').replace(/^[:]/, '').toLowerCase().trim();
  const resolved = CODE_NAMES[s] || s;
  return String(resolved).split('.').map(n => parseInt(n, 10) || 0);
}

function compareVer(v1, v2) {
  const [a1, b1 = 0] = parseVer(v1), [a2, b2 = 0] = parseVer(v2);
  return a1 !== a2 ? a1 - a2 : b1 - b2;
}

function getCaskRequirements(cask) {
  const macos = cask?.depends_on?.macos;
  if (!macos) return null;
  if (typeof macos === 'string') return `macOS ${macos}`;
  if (Array.isArray(macos)) return `macOS ${macos.join(', ')}`;
  if (typeof macos === 'object') {
    const text = Object.entries(macos)
      .map(([op, val]) => `${op === '>=' ? '' : op + ' '}${Array.isArray(val) ? val.join(', ') : val}${op === '>=' ? '+' : ''}`)
      .join(', ');
    return text ? `macOS ${text}` : 'macOS';
  }
  return 'macOS';
}

function isRequirementMet(cask, sysInfo) {
  const info = typeof sysInfo === 'string' ? { systemVersion: sysInfo } : (sysInfo || getSystemInfo());
  if ((info.platform || 'darwin') !== 'darwin') return false;
  const macos = cask?.depends_on?.macos;
  if (!macos || !info.systemVersion) return true;

  const pairs = typeof macos === 'object' && !Array.isArray(macos)
    ? Object.entries(macos).flatMap(([op, val]) => (Array.isArray(val) ? val : [val]).map(v => [op, v]))
    : (Array.isArray(macos) ? macos : [macos]).map(req => {
      const m = String(req).match(/^(>=|<=|>|<|==|=)?\s*(.*)$/);
      return [m?.[1] || '>=', m?.[2] || ''];
    });

  return pairs.every(([op, target]) => {
    const diff = compareVer(info.systemVersion, target);
    if (op === '>=' || op === '>= ') return diff >= 0;
    if (op === '<=' || op === '<= ') return diff <= 0;
    if (op === '>') return diff > 0;
    if (op === '<') return diff < 0;
    if (op === '==' || op === '=') return diff === 0;
    return true;
  });
}

function getCaskArchCompatibility(cask, sysInfo) {
  const info = typeof sysInfo === 'string' ? { arch: sysInfo } : (sysInfo || getSystemInfo());
  const currentArch = info.arch === 'x64' ? 'x64' : 'arm64';
  const archField = JSON.stringify(cask?.depends_on?.arch || '').toLowerCase();

  let requiredArch = null;
  if (archField.includes('arm')) requiredArch = 'arm64';
  else if (archField.includes('intel') || archField.includes('x86_64') || archField.includes('x64')) requiredArch = 'x64';

  const rosetta = Boolean(cask?.caveats_rosetta) || /rosetta\s*2/i.test(cask?.caveats || '');

  if (requiredArch === 'arm64') {
    return currentArch === 'arm64'
      ? { requiredArch: 'arm64', isSupported: true, status: 'native', label: 'Apple Silicon' }
      : { requiredArch: 'arm64', isSupported: false, status: 'incompatible', label: 'Apple Silicon only' };
  }
  if (requiredArch === 'x64' || rosetta) {
    return currentArch === 'x64'
      ? { requiredArch: 'x64', isSupported: true, status: 'native', label: 'Intel 64-bit' }
      : { requiredArch: 'x64', isSupported: true, status: 'rosetta', label: 'Intel (Rosetta 2)' };
  }
  return { requiredArch: null, isSupported: true, status: 'universal', label: 'Universal' };
}

function getCaskDependencies(cask) {
  const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
  return {
    casks: toArr(cask?.depends_on?.cask),
    formulae: toArr(cask?.depends_on?.formula)
  };
}

function getCaskStatus(cask) {
  return {
    isDisabled: Boolean(cask?.disabled),
    disableReason: cask?.disable_reason || cask?.disable_args?.because || null,
    disableReplacement: cask?.disable_replacement_cask || cask?.disable_args?.replacement_cask || null,
    isDeprecated: Boolean(cask?.deprecated),
    deprecationReason: cask?.deprecation_reason || cask?.deprecate_args?.because || null,
    deprecationReplacement: cask?.deprecation_replacement_cask || cask?.deprecate_args?.replacement_cask || null
  };
}

function normalizeCaskInfo(cask, sysInfo) {
  if (!cask) return null;
  const info = sysInfo || getSystemInfo();
  return {
    ...cask,
    reqText: getCaskRequirements(cask),
    reqMet: isRequirementMet(cask, info),
    archCompat: getCaskArchCompatibility(cask, info),
    dependencies: getCaskDependencies(cask),
    status: getCaskStatus(cask)
  };
}

function getData(file) {
  if (memoryCache.has(file)) {
    return memoryCache.get(file);
  }
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    memoryCache.set(file, data);
    return data;
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
    const raw = await fetchCaskJson(sanitized);
    if (raw) {
      cask = normalizeCaskInfo(raw);
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
  getSystemInfo,
  getCaskRequirements,
  isRequirementMet,
  getCaskArchCompatibility,
  getCaskDependencies,
  getCaskStatus,
  normalizeCaskInfo,
  getActionArgs,
  launchApp,
  cleanCache,
  runAction,
  cancelAction,
  writePtyInput
};
