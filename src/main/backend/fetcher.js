//
// Application Catalog Fetcher
//
// Downloads and parses Homebrew casks, analytics, and CaskFlow metadata
// directly in Node.js without requiring bash, curl, or external subprocesses.
//

const fs = require('fs');
const path = require('path');

const CACHE_APPFINDER_DIR = path.join(process.env.HOME || '', '.cache', 'appfinder');
const FETCH_DIR = path.join(CACHE_APPFINDER_DIR, 'fetch');
const ICON_BASE_URL = 'https://cdn.jsdelivr.net/gh/alielsokary/CaskFlow@icons/';

const CATEGORIES_DEF = [
  { "name": "developerTools", "displayName": "Developer Tools", "symbolName": "hammer" },
  { "name": "browsers", "displayName": "Browsers", "symbolName": "globe" },
  { "name": "communication", "displayName": "Communication", "symbolName": "message" },
  { "name": "productivity", "displayName": "Productivity", "symbolName": "checklist" },
  { "name": "utilities", "displayName": "Utilities", "symbolName": "gearshape.2" },
  { "name": "designGraphics", "displayName": "Design & Graphics", "symbolName": "paintpalette" },
  { "name": "audioMusic", "displayName": "Audio & Music", "symbolName": "music.note" },
  { "name": "videoMedia", "displayName": "Video & Media", "symbolName": "film" },
  { "name": "games", "displayName": "Games", "symbolName": "gamecontroller" },
  { "name": "securityPrivacy", "displayName": "Security & Privacy", "symbolName": "lock.shield" },
  { "name": "financeCrypto", "displayName": "Finance & Crypto", "symbolName": "creditcard" },
  { "name": "cloudStorage", "displayName": "Cloud & Storage", "symbolName": "cloud" },
  { "name": "scienceEducation", "displayName": "Science & Education", "symbolName": "graduationcap" },
  { "name": "menuBar", "displayName": "Menu Bar", "symbolName": "menubar.rectangle" },
  { "name": "officeTools", "displayName": "Office Tools", "symbolName": "doc.text" },
  { "name": "screensaverWallpaper", "displayName": "Screensaver & Wallpaper", "symbolName": "photo.stack" },
  { "name": "ai", "displayName": "AI & LLMs", "symbolName": "sparkles" },
  { "name": "font", "displayName": "Fonts", "symbolName": "textformat" },
  { "name": "other", "displayName": "Other", "symbolName": "square.grid.2x2" }
];

async function downloadJson(url, destPath, signal) {
  const res = await fetch(url, { signal, headers: { 'User-Agent': 'AppFinder' } });
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  }
  const data = await res.json();
  try {
    fs.writeFileSync(destPath, JSON.stringify(data), 'utf8');
  } catch (_) {}
  return data;
}

function processAppsData(casksRaw, categoriesRaw, downloadsRaw, addedRaw) {
  const tokenToCategory = categoriesRaw?.tokenToCategory || {};
  const downloadsFormulae = downloadsRaw?.formulae || {};
  const iconTokensSet = new Set(categoriesRaw?.iconTokens || []);
  const addedDates = addedRaw?.tokenAddedDates || {};

  return casksRaw.map(c => {
    const token = c.token;
    const catInfo = tokenToCategory[token] || { primary: 'other', secondary: [] };
    let primaryCat = catInfo.primary || 'other';
    if (primaryCat === 'other' && token && token.startsWith('font-')) {
      primaryCat = 'font';
      c.desc = 'Font';
    }

    let count = 0;
    if (downloadsFormulae[token] && downloadsFormulae[token][0]) {
      const countStr = downloadsFormulae[token][0].count || '0';
      count = parseInt(String(countStr).replace(/,/g, ''), 10) || 0;
    }

    let appValue = null;
    if (c.artifacts && Array.isArray(c.artifacts)) {
      for (const art of c.artifacts) {
        if (art.app && Array.isArray(art.app) && art.app[0]) {
          appValue = art.app[0];
          break;
        }
      }
    }

    let secondCategory = null;
    let thirdCategory = null;
    if (catInfo.secondary && Array.isArray(catInfo.secondary)) {
      if (catInfo.secondary[0]) secondCategory = catInfo.secondary[0];
      if (catInfo.secondary[1]) thirdCategory = catInfo.secondary[1];
    }

    const caskItem = {
      token: c.token,
      name: c.name && c.name[0] ? c.name[0] : c.token,
      desc: c.desc,
      homepage: c.homepage,
      app: appValue,
      version: c.version,
      category: primaryCat,
      secondCategory: secondCategory || undefined,
      thirdCategory: thirdCategory || undefined,
      count: count,
      added: addedDates[token] || null
    };

    if (iconTokensSet.has(token)) {
      caskItem.iconUrl = `${ICON_BASE_URL}${token}.png`;
    }

    return caskItem;
  });
}

/**
 * Fetches and updates apps and categories data files.
 * @param {Object} options
 * @param {Function} [options.onLog] - Callback for streaming progress
 * @param {AbortSignal} [options.signal] - Abort signal for cancellation
 * @returns {Promise<{ apps: Array, categories: Array }>}
 */
async function fetchCatalog({ onLog, signal } = {}) {
  if (!fs.existsSync(FETCH_DIR)) {
    fs.mkdirSync(FETCH_DIR, { recursive: true });
  }
  if (!fs.existsSync(CACHE_APPFINDER_DIR)) {
    fs.mkdirSync(CACHE_APPFINDER_DIR, { recursive: true });
  }

  onLog?.('==> Updating Homebrew casks...');
  const casksRaw = await downloadJson('https://formulae.brew.sh/api/cask.json', path.join(FETCH_DIR, 'cask.json'), signal);

  onLog?.('==> Updating analytics (30d)...');
  await downloadJson('https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/30d.json', path.join(FETCH_DIR, '30d.json'), signal);

  onLog?.('==> Updating analytics (90d)...');
  await downloadJson('https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/90d.json', path.join(FETCH_DIR, '90d.json'), signal);

  onLog?.('==> Updating analytics (365d)...');
  const downloadsRaw = await downloadJson('https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/365d.json', path.join(FETCH_DIR, '365d.json'), signal);

  onLog?.('==> Updating CaskFlow applications...');
  const categoriesRaw = await downloadJson('https://github.com/alielsokary/CaskFlow/releases/latest/download/categories.json', path.join(FETCH_DIR, 'categories.json'), signal);

  onLog?.('==> Updating CaskFlow dates...');
  const addedRaw = await downloadJson('https://github.com/alielsokary/CaskFlow/releases/latest/download/added_dates.json', path.join(FETCH_DIR, 'added_dates.json'), signal);

  onLog?.('==> Caching apps...');
  const processedApps = processAppsData(casksRaw, categoriesRaw, downloadsRaw, addedRaw);
  fs.writeFileSync(path.join(CACHE_APPFINDER_DIR, 'apps.json'), JSON.stringify(processedApps, null, 2), 'utf8');

  onLog?.('==> Caching categories...');
  fs.writeFileSync(path.join(CACHE_APPFINDER_DIR, 'categories.json'), JSON.stringify(CATEGORIES_DEF, null, 2), 'utf8');

  onLog?.('==> ✔︎ Updated');
  return { apps: processedApps, categories: CATEGORIES_DEF };
}

module.exports = {
  fetchCatalog,
  processAppsData,
  CATEGORIES_DEF,
  CACHE_APPFINDER_DIR,
  FETCH_DIR
};
