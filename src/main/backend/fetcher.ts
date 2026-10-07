//
// Application Catalog Fetcher
//
// Downloads and parses Homebrew casks, analytics, and CaskFlow metadata
// directly in Node.js without requiring bash, curl, or external subprocesses.
//

import fs from 'fs';
import path from 'path';
import { CACHE_DIR } from '../path';
import type { CaskItem, CategoryItem } from '../../types/cask';

export const FETCH_DIR: string = path.join(CACHE_DIR, 'fetch');
export const CACHED_APPS_FILE: string = path.join(CACHE_DIR, 'apps.json');
export const CACHED_CATEGORIES_FILE: string = path.join(CACHE_DIR, 'categories.json');
export const ICON_BASE_URL: string = 'https://cdn.jsdelivr.net/gh/alielsokary/CaskFlow@icons/';

export const CATEGORIES_DEF: CategoryItem[] = [
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

export function writeJsonAtomic(destPath: string, data: any): void {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${destPath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tmpPath, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, destPath);
}

async function downloadJson(url: string, destPath: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal, headers: { 'User-Agent': 'AppFinder' } });
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  }
  const data = await res.json();
  try {
    writeJsonAtomic(destPath, data);
  } catch (_) { }
  return data;
}

export function processAppsData(
  casksRaw: any[],
  categoriesRaw?: any,
  downloadsRaw?: any,
  addedRaw?: any
): CaskItem[] {
  const tokenToCategory = categoriesRaw?.tokenToCategory || {};
  const downloadsFormulae = downloadsRaw?.formulae || {};
  const iconTokensSet = new Set(categoriesRaw?.iconTokens || []);
  const addedDates = addedRaw?.tokenAddedDates || {};

  return casksRaw.map((c: any) => {
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

    let appValue: string | null = null;
    if (c.artifacts && Array.isArray(c.artifacts)) {
      for (const art of c.artifacts) {
        if (art.app && Array.isArray(art.app) && art.app[0]) {
          appValue = art.app[0];
          break;
        }
      }
    }

    let secondCategory: string | undefined = undefined;
    let thirdCategory: string | undefined = undefined;
    if (catInfo.secondary && Array.isArray(catInfo.secondary)) {
      if (catInfo.secondary[0]) secondCategory = catInfo.secondary[0];
      if (catInfo.secondary[1]) thirdCategory = catInfo.secondary[1];
    }

    const caskItem: CaskItem = {
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

export interface FetchCatalogOptions {
  onLog?: (msg: string) => void;
  signal?: AbortSignal;
}

export interface FetchCatalogResult {
  apps: CaskItem[];
  categories: CategoryItem[];
}

export async function fetchCatalog({ onLog, signal }: FetchCatalogOptions = {}): Promise<FetchCatalogResult> {
  if (!fs.existsSync(FETCH_DIR)) {
    fs.mkdirSync(FETCH_DIR, { recursive: true });
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
  writeJsonAtomic(CACHED_APPS_FILE, processedApps);

  onLog?.('==> Caching categories...');
  writeJsonAtomic(CACHED_CATEGORIES_FILE, CATEGORIES_DEF);

  onLog?.('==> ✔︎ Updated');
  return { apps: processedApps, categories: CATEGORIES_DEF };
}


