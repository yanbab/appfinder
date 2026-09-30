const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

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

  return {
    downloadSize,
    installedSize,
    dataSize
  };
}

module.exports = {
  getCaskSizes,
  formatBytes,
  getDownloadSize,
  getInstalledSize,
  getDataSize
};
