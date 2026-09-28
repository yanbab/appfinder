const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);
const dataDir = path.join(__dirname, '..', '..', '..', 'data');

let cachedBrewPath = null;

function getBrewPath() {
  if (cachedBrewPath && fs.existsSync(cachedBrewPath)) {
    return cachedBrewPath;
  }
  const paths = [
    '/opt/homebrew/bin/brew',
    '/usr/local/bin/brew'
  ];
  cachedBrewPath = paths.find(p => fs.existsSync(p)) || 'brew';
  return cachedBrewPath;
}

function getEnvWithBrew() {
  const extraPaths = ['/opt/homebrew/bin', '/usr/local/bin'];
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

async function fetchOutdatedCasks() {
  const brewPath = getBrewPath();
  const { stdout } = await execAsync(`"${brewPath}" outdated --cask --json`, { env: getEnvWithBrew() });
  const match = stdout.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const data = match ? JSON.parse(match[0]) : JSON.parse(stdout);
  return Array.isArray(data) ? data : (data?.casks || []);
}

async function fetchCaskJson(sanitizedToken) {
  const brewPath = getBrewPath();
  const { stdout } = await execAsync(`"${brewPath}" info --json=v2 --cask "${sanitizedToken}"`, {
    env: getEnvWithBrew(),
    maxBuffer: 10 * 1024 * 1024
  }).catch(() => ({ stdout: null }));

  if (stdout) {
    try {
      return JSON.parse(stdout)?.casks?.[0] ?? null;
    } catch { }
  }
  return null;
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

module.exports = {
  getBrewPath,
  getEnvWithBrew,
  getData,
  getApps,
  getCategories,
  getInstalled,
  fetchOutdatedCasks,
  fetchCaskJson,
  cleanCache
};
