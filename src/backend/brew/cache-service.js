const fs = require('fs');
const path = require('path');

const memoryCache = new Map();
const caskInfoCache = new Map();

const CACHE_DIR = path.join(process.env.HOME || '', '.config', 'appfinder');
const UPDATES_CACHE_FILE = path.join(CACHE_DIR, 'updates.json');
const UPDATES_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

function ensureCacheDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to create cache dir:', e);
  }
}

function getCachedUpdates(force = false) {
  if (force) return null;
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
  } catch (e) {
    console.error('Error reading updates cache:', e);
  }
  return null;
}

function setCachedUpdates(data) {
  memoryCache.set('updates', { data, timestamp: Date.now() });
  ensureCacheDir();
  try {
    fs.writeFileSync(UPDATES_CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing updates cache:', e);
  }
}

async function getUpdates(force = false, fetcher) {
  const cached = getCachedUpdates(force);
  if (cached) return cached;
  const fresh = await fetcher();
  setCachedUpdates(fresh);
  return fresh;
}

function getCachedCaskInfo(token) {
  return caskInfoCache.get(token) || null;
}

function setCachedCaskInfo(token, data) {
  caskInfoCache.set(token, data);
}

module.exports = {
  getUpdates,
  getCachedUpdates,
  setCachedUpdates,
  getCachedCaskInfo,
  setCachedCaskInfo
};
