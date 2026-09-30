const path = require('path');
const fs = require('fs');
const os = require('os');

const configDir = path.join(os.homedir(), '.config', 'appfinder');
const updatesCachePath = path.join(configDir, 'updates.json');

// In-memory cache for cask details with TTL & capacity bounding
const MAX_CACHE_ENTRIES = 300;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const infoCache = new Map();

function getCachedCaskInfo(token) {
  if (!token || !infoCache.has(token)) return null;
  const entry = infoCache.get(token);
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    infoCache.delete(token);
    return null;
  }
  return entry.data;
}

function setCachedCaskInfo(token, data) {
  if (!token || !data) return;
  if (infoCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = infoCache.keys().next().value;
    if (oldestKey) infoCache.delete(oldestKey);
  }
  infoCache.set(token, {
    data,
    timestamp: Date.now()
  });
}

function clearCaskInfoCache() {
  infoCache.clear();
}

async function getUpdates(force = false, fetchOutdatedFn) {
  if (!force) {
    try {
      const raw = await fs.promises.readFile(updatesCachePath, 'utf8').catch(() => null);
      if (raw && raw.trim()) {
        const data = JSON.parse(raw);
        const casks = Array.isArray(data) ? data : (data?.casks || []);
        return { casks };
      }
    } catch (e) {
      console.error('Failed to read cached updates:', e);
    }
  }

  if (typeof fetchOutdatedFn !== 'function') {
    return { casks: [] };
  }

  try {
    const casks = await fetchOutdatedFn();
    try {
      await fs.promises.mkdir(configDir, { recursive: true });
      await fs.promises.writeFile(updatesCachePath, JSON.stringify(casks, null, 2));
    } catch (err) {
      console.error('Failed to write updates cache:', err);
    }
    return { casks };
  } catch (err) {
    console.error('Failed to get updates:', err);
    return { casks: [] };
  }
}

module.exports = {
  getCachedCaskInfo,
  setCachedCaskInfo,
  clearCaskInfoCache,
  getUpdates
};
