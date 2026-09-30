const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const execFileAsync = promisify(execFile);

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
  return {
    ...process.env,
    PATH: process.env.PATH ? `${process.env.PATH}:${defaultPath}` : defaultPath,
    HOMEBREW_NO_AUTO_UPDATE: '1',
    HOMEBREW_NO_EMOJI: '1',
    HOMEBREW_NO_COLOR: '1'
  };
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

async function cleanCache() {
  try {
    const stdout = await runBrew(['cleanup', '--prune=all']);
    return { success: true, stdout: stdout || '' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  getBrewPath,
  getEnvWithBrew,
  runBrew,
  getInstalled,
  fetchOutdatedCasks,
  fetchCaskJson,
  cleanCache
};
