const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');

const execFileAsync = promisify(execFile);

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

async function getDownloadSize(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;

  try {
    const headRes = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    const len = headRes.headers.get('content-length');
    if (len) {
      const num = parseInt(len, 10);
      if (num > 0) return num;
    }
  } catch (_) { }

  try {
    const rangeRes = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    const range = rangeRes.headers.get('content-range');
    const match = range?.match(/\/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0) return num;
    }

    const len = rangeRes.headers.get('content-length');
    if (len && rangeRes.status === 200) {
      const num = parseInt(len, 10);
      if (num > 0) return num;
    }
  } catch (_) { }

  return null;
}

async function getPathSize(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return 0;
  try {
    const { stdout } = await execFileAsync('/usr/bin/du', ['-sk', targetPath]);
    const kb = parseInt(stdout.trim().split(/\s+/)[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch (_) {
    return 0;
  }
}

async function getZapDataSize(cask) {
  if (!cask) return 0;
  const rawPaths = [];
  const home = os.homedir();

  const extractFromZap = (zapObj) => {
    if (!zapObj) return;
    if (Array.isArray(zapObj)) {
      zapObj.forEach(extractFromZap);
      return;
    }
    const keys = ['trash', 'rmdir'];
    for (const k of keys) {
      const val = zapObj[k];
      if (Array.isArray(val)) rawPaths.push(...val);
      else if (typeof val === 'string') rawPaths.push(val);
    }
  };

  if (cask.zap) extractFromZap(cask.zap);
  if (Array.isArray(cask.artifacts)) {
    for (const art of cask.artifacts) {
      if (art.zap) extractFromZap(art.zap);
    }
  }

  let totalBytes = 0;
  const expanded = Array.from(new Set(rawPaths.map(p => {
    if (typeof p !== 'string') return null;
    return p.startsWith('~/') ? path.join(home, p.slice(2)) : p;
  }).filter(Boolean)));

  for (const p of expanded) {
    if (fs.existsSync(p)) {
      totalBytes += await getPathSize(p);
    }
  }

  return totalBytes;
}

async function getCaskSizes(cask, appPath) {
  const result = {
    downloadSize: null,
    installedSize: null,
    dataSize: null
  };

  const url = cask?.url || (Array.isArray(cask?.url_specs) ? cask.url_specs[0] : null);
  const [dlBytes, instBytes, zapBytes] = await Promise.all([
    getDownloadSize(url),
    appPath ? getPathSize(appPath) : Promise.resolve(0),
    getZapDataSize(cask)
  ]);

  if (dlBytes) result.downloadSize = formatBytes(dlBytes);
  if (instBytes > 0) result.installedSize = formatBytes(instBytes);
  if (zapBytes > 0) result.dataSize = formatBytes(zapBytes);

  return result;
}

module.exports = {
  formatBytes,
  getDownloadSize,
  getPathSize,
  getZapDataSize,
  getCaskSizes
};
