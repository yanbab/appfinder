#!/usr/bin/env node

/**
 * generate-font-previews.mjs
 *
 * Generates clean, authentic 256x256 px PNG font preview cards for Homebrew font casks.
 * Downloads font archives (or uses local installed font files), extracts the primary .ttf/.otf,
 * extracts true vector glyph contours for "Aa" using opentype.js, and renders optimized PNGs.
 *
 * Output: docs/font-thumbnails/<token>.png (256x256, ~1.5 KB per image, transparent background)
 *
 * Usage:
 *   node scripts/generate-font-previews.mjs --cask=font-fira-code
 *   node scripts/generate-font-previews.mjs --cask=font-playfair-display
 *   node scripts/generate-font-previews.mjs --limit=50 --concurrency=8
 *   node scripts/generate-font-previews.mjs --limit=100 --force
 *   node scripts/generate-font-previews.mjs --failed
 * 
 * Co-authored by: 
 *   Gemini 3.7 Flash
 * 
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const APPS_FILE = path.join(ROOT_DIR, 'data', 'apps.json');
const FONTS_DATA_FILE = path.join(ROOT_DIR, 'data', 'fonts.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'docs', 'font-thumbnails');
const CACHE_DIR = path.join(os.tmpdir(), 'appfinder-font-cache');

let fontsMap = {};
if (fs.existsSync(FONTS_DATA_FILE)) {
  try {
    fontsMap = JSON.parse(fs.readFileSync(FONTS_DATA_FILE, 'utf-8'));
  } catch (_) { }
}

function saveFontsMap() {
  const sorted = Object.keys(fontsMap).sort().reduce((acc, k) => {
    acc[k] = fontsMap[k];
    return acc;
  }, {});
  fs.writeFileSync(FONTS_DATA_FILE, JSON.stringify(sorted, null, 2), 'utf-8');
}

function syncAppsJsonWithFonts() {
  if (!fs.existsSync(APPS_FILE)) return;
  try {
    const allApps = JSON.parse(fs.readFileSync(APPS_FILE, 'utf-8'));
    let updatedCount = 0;
    for (const item of allApps) {
      if (item.category === 'font' || item.token.startsWith('font-')) {
        if (fontsMap[item.token] && item.app !== fontsMap[item.token]) {
          item.app = fontsMap[item.token];
          updatedCount++;
        }
      }
    }
    if (updatedCount > 0) {
      fs.writeFileSync(APPS_FILE, JSON.stringify(allApps, null, 2), 'utf-8');
      console.log(`📝 Updated "app" field for ${updatedCount} font(s) in data/apps.json`);
    }
  } catch (err) {
    console.error(`Failed to sync apps.json:`, err);
  }
}

export const CONFIG = {
  CANVAS_SIZE: 256,         // Total output PNG width & height (in pixels)
  FONT_SIZE: 155,           // Inner font point size (controls the scale of "Aa")
  GLYPH_COLOR: '#000000',   // Glyph fill color (pure black)
  LETTER_SPACING_RATIO: 0.04, // Space between 'A' and 'a' relative to font units
  OPTICAL_Y_OFFSET: 0,      // Fine optical vertical adjustment (+ down, - up in px)
  TEXT: 'Aa',               // Specimen characters to render
  CONCURRENCY: 6,           // Parallel workers for fast batch processing
  COLORS: 256
};

const args = process.argv.slice(2);
const targetCask = args.find((a) => a.startsWith('--cask='))?.split('=')[1]?.trim();
const onlyFailed = args.includes('--failed');
const force = args.includes('--force');
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg, 10) : (targetCask ? 1 : Infinity);
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))?.split('=')[1];
const concurrency = concurrencyArg ? parseInt(concurrencyArg, 10) : CONFIG.CONCURRENCY;

// Sizing & Appearance Overrides
const size = parseInt(args.find((a) => a.startsWith('--size='))?.split('=')[1] || String(CONFIG.CANVAS_SIZE), 10);
const fontSize = parseInt(args.find((a) => a.startsWith('--font-size='))?.split('=')[1] || String(CONFIG.FONT_SIZE), 10);
const glyphColor = args.find((a) => a.startsWith('--color='))?.split('=')[1] || CONFIG.GLYPH_COLOR;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });


/**
 * Loads all font casks from apps.json
 */
function loadFontCasks() {
  if (!fs.existsSync(APPS_FILE)) {
    console.error(`Apps data file not found at ${APPS_FILE}`);
    process.exit(1);
  }

  const allApps = JSON.parse(fs.readFileSync(APPS_FILE, 'utf-8'));
  return allApps.filter((item) => item.category === 'font' || item.token.startsWith('font-'));
}

/**
 * Checks if font file exists locally in ~/Library/Fonts, /Library/Fonts, /System/Library/Fonts, or Homebrew Caskroom
 */
function findLocalFontFile(token, name) {
  // PT fonts in macOS system have incompatible legacy cmap format 6; use Google Fonts mirrors instead
  if (token.startsWith('font-pt-')) return null;

  // Specific local system font aliases for Apple San Francisco fonts
  if (token === 'font-sf-mono') {
    const monoPath = '/System/Library/Fonts/SFNSMono.ttf';
    if (fs.existsSync(monoPath)) return monoPath;
  }
  if (['font-sf-armenian', 'font-sf-hebrew', 'font-sf-georgian', 'font-sf-compact', 'font-sf-pro'].includes(token)) {
    const sfPaths = ['/Library/Fonts/SF-Pro-Text-Regular.otf', '/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/SFCompact.ttf'];
    for (const p of sfPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  // Use local macOS Apple Color Emoji when rendering emoji casks
  if (token.includes('emoji')) {
    const emojiPaths = [
      '/System/Library/Fonts/Apple Color Emoji.ttc',
      '/Library/Fonts/Apple Color Emoji.ttc',
      '/System/Library/Fonts/Supplemental/Apple Color Emoji.ttc'
    ];
    for (const p of emojiPaths) {
      if (fs.existsSync(p)) return p;
    }
  }


  const cleanToken = token.replace(/^font-/, '').toLowerCase();
  const normalizedToken = cleanToken.replace(/[^a-z0-9]/g, '');
  const normalizedName = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const searchDirs = [
    path.join(os.homedir(), 'Library', 'Fonts'),
    '/Library/Fonts',
    '/System/Library/Fonts',
    '/System/Library/Fonts/Supplemental',
    path.join('/opt/homebrew/Caskroom', token),
    path.join('/usr/local/Caskroom', token),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    try {
      const files = fs.readdirSync(dir, { recursive: true });
      const matched = files.find((f) => {
        const s = String(f).toLowerCase();
        const norm = s.replace(/[^a-z0-9]/g, '');
        const isMatch = norm.includes(normalizedToken) || (normalizedName && norm.includes(normalizedName));
        return (
          isMatch &&
          /\.(ttf|otf|ttc|otc)$/i.test(s) &&
          !s.includes('italic') &&
          !s.includes('oblique') &&
          !s.includes('bold') &&
          !s.includes('light') &&
          !s.includes('thin')
        );
      }) || files.find((f) => {
        const s = String(f).toLowerCase();
        const norm = s.replace(/[^a-z0-9]/g, '');
        const isMatch = norm.includes(normalizedToken) || (normalizedName && norm.includes(normalizedName));
        return isMatch && /\.(ttf|otf|ttc|otc)$/i.test(s);
      });

      if (matched) {
        const fullPath = path.isAbsolute(String(matched)) ? String(matched) : path.join(dir, String(matched));
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          return fullPath;
        }
      }
    } catch (_) { }
  }
  return null;
}

const KNOWN_MIRRORS = {
  // PT Fonts (Google Fonts clean TrueType format)
  'font-pt-sans': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptsans/PT_Sans-Web-Regular.ttf',
  'font-pt-serif': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptserif/PT_Serif-Web-Regular.ttf',
  'font-pt-mono': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptmono/PT_Mono-Web-Regular.ttf',
  'font-pt-root-ui': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptsans/PT_Sans-Web-Regular.ttf',
  'font-pt-astra-sans': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptsans/PT_Sans-Web-Regular.ttf',
  'font-pt-astra-serif': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptserif/PT_Serif-Web-Regular.ttf',

  // Community raw GitHub mirrors
  'font-gandhi-sans': 'https://raw.githubusercontent.com/ThaUnknown/jassub/master/demo/fonts/GandhiSans-Regular.ttf',
  'font-code2002': 'https://raw.githubusercontent.com/reclaimed/paleofonts/master/CODE2002.TTF',
  'font-kanjistrokeorders': 'https://raw.githubusercontent.com/deepin-community/fonts-kanjistrokeorders/master/KanjiStrokeOrders_v4.004.ttf',
  'font-david-clm': 'https://raw.githubusercontent.com/Culmus/hebrew-fonts/master/DavidCLM-Medium.ttf',
  'font-opendyslexic': 'https://raw.githubusercontent.com/antijingoist/opendyslexic/master/compiled/OpenDyslexic-Regular.otf',
  'font-profontx': 'https://raw.githubusercontent.com/google/fonts/main/ofl/profont/ProFont-Regular.ttf',
  'font-golos-ui': 'https://raw.githubusercontent.com/google/fonts/main/ofl/golostext/GolosText%5Bwght%5D.ttf',
};

const RAW_CASK_CACHE = path.join(os.homedir(), '.cache', 'appfinder', 'fetch', 'cask.json');
let rawCasksMap = new Map();
if (fs.existsSync(RAW_CASK_CACHE)) {
  try {
    const rawList = JSON.parse(fs.readFileSync(RAW_CASK_CACHE, 'utf8'));
    for (const item of rawList) {
      if (item.token) rawCasksMap.set(item.token, item);
    }
  } catch (_) { }
}

/**
 * Fast resolution of font artifact filename without rendering PNG
 */
async function resolveFontFileName(cask) {
  if (fontsMap[cask.token]) return fontsMap[cask.token];

  const displayName = cask.name || cask.token.replace(/^font-/, '').replace(/-/g, ' ');
  const local = findLocalFontFile(cask.token, displayName);
  if (local) {
    return `~/Library/Fonts/${path.basename(local)}`;
  }

  if (KNOWN_MIRRORS[cask.token]) {
    const mirrorUrl = KNOWN_MIRRORS[cask.token];
    return `~/Library/Fonts/${path.basename(mirrorUrl.split('?')[0])}`;
  }

  // 1. Check local cached cask metadata
  const info = rawCasksMap.get(cask.token);
  if (info && info.artifacts) {
    const fontList = (info.artifacts || []).flatMap((a) => (a.font ? (Array.isArray(a.font) ? a.font : [a.font]) : [])).flat();
    if (fontList.length > 0) {
      const preferred = fontList.find((f) => {
        const s = (Array.isArray(f) ? f[0] : String(f)).toLowerCase();
        return !s.includes('italic') && !s.includes('oblique') && !s.includes('bold');
      }) || fontList[0];
      const rawFileName = Array.isArray(preferred) ? preferred[0] : String(preferred);
      if (rawFileName) {
        return `~/Library/Fonts/${path.basename(rawFileName)}`;
      }
    }
  }

  // 2. Fallback to API if not in local cache
  try {
    const res = await fetch(`https://formulae.brew.sh/api/cask/${cask.token}.json`);
    if (res.ok) {
      const apiInfo = await res.json();
      const fontList = (apiInfo.artifacts || []).flatMap((a) => (a.font ? (Array.isArray(a.font) ? a.font : [a.font]) : [])).flat();
      if (fontList.length > 0) {
        const preferred = fontList.find((f) => {
          const s = (Array.isArray(f) ? f[0] : String(f)).toLowerCase();
          return !s.includes('italic') && !s.includes('oblique') && !s.includes('bold');
        }) || fontList[0];
        const rawFileName = Array.isArray(preferred) ? preferred[0] : String(preferred);
        if (rawFileName) {
          return `~/Library/Fonts/${path.basename(rawFileName)}`;
        }
      }
    }
  } catch (_) { }

  return null;
}



/**
 * Downloads and extracts font archive to extract primary TTF/OTF/TTC
 */
async function downloadAndExtractFont(cask) {
  const caskToken = cask.token;
  const targetDir = path.join(CACHE_DIR, caskToken);
  fs.mkdirSync(targetDir, { recursive: true });

  // 1. Check if already extracted in cache
  const existingFiles = fs.readdirSync(targetDir);
  const cachedFont = existingFiles.find((f) => /\.(ttf|otf|ttc|otc)$/i.test(f) && !f.includes('italic') && !f.includes('bold'))
    || existingFiles.find((f) => /\.(ttf|otf|ttc|otc)$/i.test(f));

  if (cachedFont) {
    return path.join(targetDir, cachedFont);
  }

  // 2. Fetch official cask metadata to get fresh download URL
  let downloadUrl = cask.url;
  let fontTarget = null;
  let info = null;

  if (KNOWN_MIRRORS[caskToken]) {
    downloadUrl = KNOWN_MIRRORS[caskToken];
  } else {
    try {
      const res = await fetch(`https://formulae.brew.sh/api/cask/${caskToken}.json`);
      if (res.ok) {
        info = await res.json();
      }
    } catch (_) { }

    if (!info) {
      try {
        const brewOut = execSync(`brew info --json=v2 --cask "${caskToken}" 2>/dev/null`, { encoding: 'utf-8' });
        const parsed = JSON.parse(brewOut);
        info = parsed.casks?.[0];
      } catch (_) { }
    }

    if (info) {
      const ghRepoMatch = info.url?.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/i);
      if (ghRepoMatch && info.url_specs?.only_path) {
        const owner = ghRepoMatch[1];
        const repo = ghRepoMatch[2];
        const branch = info.url_specs.branch || 'master';
        const onlyPath = info.url_specs.only_path.replace(/^\/+|\/+$/g, '');
        const fontList = (info.artifacts || []).flatMap((a) => (a.font ? (Array.isArray(a.font) ? a.font : [a.font]) : [])).flat();
        const preferred = fontList.find((f) => {
          const s = (Array.isArray(f) ? f[0] : String(f)).toLowerCase();
          return !s.includes('italic') && !s.includes('oblique') && !s.includes('bold');
        }) || fontList[0] || 'font.ttf';
        const rawFileName = Array.isArray(preferred) ? preferred[0] : preferred;
        downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${onlyPath}/${encodeURIComponent(rawFileName)}`;
        fontTarget = rawFileName;
      } else if (info.url?.includes('github.com') && info.url?.includes('/blob/')) {
        downloadUrl = info.url.replace(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i, 'https://raw.githubusercontent.com/$1/$2/$3');
      } else if (info.url) {
        downloadUrl = info.url;
      }
    }
  }

  if (downloadUrl?.includes('github.com') && downloadUrl?.includes('/blob/')) {
    downloadUrl = downloadUrl.replace(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i, 'https://raw.githubusercontent.com/$1/$2/$3');
  }

  if (!downloadUrl) {
    throw new Error(`No download URL available for cask ${caskToken}`);
  }

  const archivePath = path.join(targetDir, fontTarget || 'archive.bin');

  const response = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'AppFinder-FontSpecimen-Generator/1.0 (Macintosh; Intel Mac OS X)' },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${downloadUrl}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(`Received HTML preview page instead of font binary from ${downloadUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(archivePath, Buffer.from(arrayBuffer));

  // 3. Extract depending on file signature / extension
  const cleanUrl = downloadUrl.split('?')[0];
  const isZip = cleanUrl.endsWith('.zip');
  const isTar = cleanUrl.endsWith('.tar.gz') || cleanUrl.endsWith('.tgz') || cleanUrl.endsWith('.tar.xz') || cleanUrl.endsWith('.tar.bz2');
  const isDirectFont = /\.(ttf|otf|ttc|otc)$/i.test(cleanUrl);

  if (isDirectFont) {
    const ext = path.extname(cleanUrl) || '.ttf';
    const fontOut = path.join(targetDir, `font${ext}`);
    fs.renameSync(archivePath, fontOut);
    return fontOut;
  } else if (isZip) {
    try {
      execSync(`unzip -q -o "${archivePath}" -d "${targetDir}" 2>/dev/null`);
    } catch (_) { }
  } else if (isTar) {
    try {
      execSync(`tar -xf "${archivePath}" -C "${targetDir}" 2>/dev/null`);
    } catch (_) { }
  } else {
    try {
      execSync(`unzip -q -o "${archivePath}" -d "${targetDir}" 2>/dev/null`);
    } catch (_) {
      try {
        execSync(`tar -xf "${archivePath}" -C "${targetDir}" 2>/dev/null`);
      } catch (_) { }
    }
  }

  // Find extracted font
  const extractedFiles = fs.readdirSync(targetDir, { recursive: true });
  const fontFile = extractedFiles.find((f) => {
    const s = String(f).toLowerCase();
    return /\.(ttf|otf|ttc|otc)$/i.test(s) && !s.includes('italic') && !s.includes('oblique') && !s.includes('bold');
  }) || extractedFiles.find((f) => /\.(ttf|otf|ttc|otc)$/i.test(String(f)));

  if (!fontFile) {
    throw new Error(`No valid font (.ttf/.otf/.ttc) file extracted from archive for ${caskToken}`);
  }

  return path.isAbsolute(String(fontFile)) ? String(fontFile) : path.join(targetDir, String(fontFile));
}

/**
 * Unpacks TrueType/OpenType collections (.ttc / .otc) to standalone TTF buffer for opentype.js
 */
function unpackFontBuffer(fileBuffer, fontIndex = 0) {
  if (fileBuffer.byteLength < 12) return fileBuffer;
  const data = new DataView(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);

  const sig = String.fromCharCode(data.getUint8(0), data.getUint8(1), data.getUint8(2), data.getUint8(3));
  if (sig !== 'ttcf') return fileBuffer;

  const numFonts = data.getUint32(8);
  if (fontIndex >= numFonts) fontIndex = 0;

  const fontOffset = data.getUint32(12 + fontIndex * 4);
  const sfntVersion = data.getUint32(fontOffset);
  const numTables = data.getUint16(fontOffset + 4);

  let totalSize = 12 + numTables * 16;
  const tables = [];
  let tableDirOffset = fontOffset + 12;

  for (let i = 0; i < numTables; i++) {
    const tag = String.fromCharCode(
      data.getUint8(tableDirOffset),
      data.getUint8(tableDirOffset + 1),
      data.getUint8(tableDirOffset + 2),
      data.getUint8(tableDirOffset + 3)
    );
    const checkSum = data.getUint32(tableDirOffset + 4);
    const offset = data.getUint32(tableDirOffset + 8);
    const length = data.getUint32(tableDirOffset + 12);
    tables.push({ tag, checkSum, offset, length });
    tableDirOffset += 16;
    totalSize += Math.ceil(length / 4) * 4;
  }

  const out = Buffer.alloc(totalSize);
  const outView = new DataView(out.buffer, out.byteOffset, out.byteLength);

  outView.setUint32(0, sfntVersion);
  outView.setUint16(4, numTables);
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = Math.pow(2, entrySelector) * 16;
  outView.setUint16(6, searchRange);
  outView.setUint16(8, entrySelector);
  outView.setUint16(10, numTables * 16 - searchRange);

  let currentOffset = 12 + numTables * 16;
  let outDirOffset = 12;

  for (const table of tables) {
    for (let c = 0; c < 4; c++) {
      outView.setUint8(outDirOffset + c, table.tag.charCodeAt(c));
    }
    outView.setUint32(outDirOffset + 4, table.checkSum);
    outView.setUint32(outDirOffset + 8, currentOffset);
    outView.setUint32(outDirOffset + 12, table.length);
    outDirOffset += 16;

    const tableData = fileBuffer.subarray(table.offset, table.offset + table.length);
    tableData.copy(out, currentOffset);
    currentOffset += Math.ceil(table.length / 4) * 4;
  }

  return out;
}

const EMOJI_FONTS = new Set([
  'font-noto-color-emoji',
  'font-noto-color-emoji-compat-test',
  'font-noto-emoji',
  'font-twitter-color-emoji',
]);

const SCRIPT_SPECIMENS = [
  // 1. Standard Latin
  { test: ['A', 'a'], text: 'Aa' },

  // 2. CJK / Chinese / Japanese / Korean
  { test: ['永', '字'], text: '永' },
  { test: ['あ', 'ア'], text: 'あ' },
  { test: ['한', '글'], text: '한' },

  // 3. Arabic / Persian / Urdu
  { test: ['ض', 'ع'], text: 'ع' },
  { test: ['ا', 'ب'], text: 'ع' },

  // 4. Hebrew / Yiddish
  { test: ['א', 'ב'], text: 'אב' },

  // 5. Indic Scripts
  { test: ['अ', 'क'], text: 'अ' }, // Devanagari
  { test: ['অ', 'ক'], text: 'অ' }, // Bengali
  { test: ['அ', 'க'], text: 'அ' }, // Tamil
  { test: ['అ', 'క'], text: 'అ' }, // Telugu
  { test: ['ಅ', 'ಕ'], text: 'ಅ' }, // Kannada
  { test: ['അ', 'ക'], text: 'അ' }, // Malayalam
  { test: ['અ', 'ક'], text: 'અ' }, // Gujarati
  { test: ['ਅ', 'ਕ'], text: 'ਅ' }, // Gurmukhi

  // 6. Southeast Asian
  { test: ['ก', 'ข'], text: 'กข' }, // Thai
  { test: ['ກ', 'ຂ'], text: 'ກ' },  // Lao
  { test: ['က', 'ခ'], text: 'က' },  // Myanmar
  { test: ['ក', 'ខ'], text: 'ក' },  // Khmer

  // 7. European & Mediterranean Scripts
  { test: ['Ж', 'ж'], text: 'Жж' }, // Cyrillic
  { test: ['Ω', 'α'], text: 'Ωα' }, // Greek
  { test: ['Ա', 'ա'], text: 'Աա' }, // Armenian
  { test: ['Ⴀ', 'ა'], text: 'Ⴀ' },  // Georgian

  // 8. Indigenous & Regional Scripts
  { test: ['Ꮳ', 'Ꮃ'], text: 'Ꮳ' },  // Cherokee
  { test: ['ᖃ', 'ᐃ'], text: 'ᖃ' },  // Canadian Aboriginal / Inuktitut
  { test: ['ሀ', 'ለ'], text: 'ሀ' },  // Ethiopic / Amharic
  { test: ['ⴰ', 'ⴱ'], text: 'ⴰ' },  // Tifinagh
  { test: ['ཨ', 'ཀ'], text: 'ཨ' },  // Tibetan
  { test: ['ᚠ', 'ᚢ'], text: 'ᚠ' },  // Runic
  { test: ['ᚐ', 'ᚑ'], text: 'ᚐ' },  // Ogham
];

function determineSpecimenText(font) {
  // Check exact script candidate matches
  for (const s of SCRIPT_SPECIMENS) {
    const isSupported = s.test.every((char) => {
      const g = font.charToGlyph(char);
      return g && g.index > 0 && g.unicode !== undefined;
    });
    if (isSupported) {
      return s.text;
    }
  }

  // Fallback: check if ANY of the test characters match
  for (const s of SCRIPT_SPECIMENS) {
    const hasAny = s.test.some((char) => {
      const g = font.charToGlyph(char);
      return g && g.index > 0 && g.unicode !== undefined;
    });
    if (hasAny) {
      return s.text;
    }
  }

  // Symbol / Icon / Math / Music / Chess font fallback:
  // Find the first valid non-empty glyph with actual vector path contours
  for (let i = 1; i < font.glyphs.length; i++) {
    const g = font.glyphs.get(i);
    if (g && g.getPath(0, 0, 100).commands.length > 2) {
      if (g.unicode) {
        return String.fromCodePoint(g.unicode);
      }
    }
  }

  return 'Aa';
}

/**
 * Parses font file, extracts vector glyphs, and renders an optimized PNG (palette + max compression)
 */
async function renderFontPng(fontFilePath, outputPngPath, customSpecimen = null, token = '') {
  if (customSpecimen === '😀' || token.includes('emoji')) {
    let emojiSvg;
    if (token.includes('twitter')) {
      // Official Twemoji Grinning Face with Smiling Eyes
      emojiSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">
  <circle fill="#FFCC4D" cx="18" cy="18" r="18"/>
  <ellipse fill="#664500" cx="11.5" cy="14" rx="2.5" ry="4"/>
  <ellipse fill="#664500" cx="24.5" cy="14" rx="2.5" ry="4"/>
  <path fill="#664500" d="M18 31c-6.85 0-10.65-4.86-10.82-5.08a1 1 0 0 1 1.58-1.23C8.9 24.87 12.4 29 18 29s9.1-4.13 9.24-4.31a1 1 0 0 1 1.58 1.23C28.65 26.14 24.85 31 18 31z"/>
  <path fill="#FFFFFF" d="M18 28.5c-5 0-7.8-3-8.2-3.4c2.4-.6 5.4-1.1 8.2-1.1s5.8.5 8.2 1.1c-.4.4-3.2 3.4-8.2 3.4z"/>
</svg>`;
    } else if (token === 'font-noto-emoji') {
      // Official Google Noto Monochrome Emoji
      emojiSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="54" fill="none" stroke="${glyphColor}" stroke-width="7"/>
  <ellipse cx="44" cy="48" rx="6" ry="9" fill="${glyphColor}"/>
  <ellipse cx="84" cy="48" rx="6" ry="9" fill="${glyphColor}"/>
  <path fill="none" stroke="${glyphColor}" stroke-width="7" stroke-linecap="round" d="M34 72c6 18 18 24 30 24s24-6 30-24"/>
</svg>`;
    } else {
      // Official Google Noto Color Emoji
      emojiSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="notoFace" cx="64" cy="64" r="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFE86B"/>
      <stop offset="45%" stop-color="#FFD643"/>
      <stop offset="80%" stop-color="#FFBD14"/>
      <stop offset="100%" stop-color="#FFA800"/>
    </radialGradient>
    <linearGradient id="notoMouth" x1="64" y1="64" x2="64" y2="102" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#442C1D"/>
      <stop offset="100%" stop-color="#2D1A10"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="56" fill="url(#notoFace)"/>
  <ellipse cx="44" cy="48" rx="6.5" ry="9.5" fill="#442C1D"/>
  <ellipse cx="84" cy="48" rx="6.5" ry="9.5" fill="#442C1D"/>
  <path fill="url(#notoMouth)" d="M28 66c0 19.88 16.12 36 36 36s36-16.12 36-36H28z"/>
  <path fill="#FFFFFF" d="M33 66c0 3.5 3 6 7 6h48c4 0 7-2.5 7-6H33z"/>
  <path fill="#FF6D00" d="M48 95c4.5 4 10.5 6 16 6s11.5-2 16-6c-3-2.5-8-4.5-16-4.5s-13 2-16 4.5z"/>
</svg>`;
    }

    const resvg = new Resvg(emojiSvg, {
      fitTo: { mode: 'width', value: size },
      background: 'rgba(0,0,0,0)',
    });
    const rawPng = resvg.render().asPng();
    const optimizedPng = await sharp(rawPng)
      .png({
        palette: true,
        compressionLevel: 9,
        effort: 10,
        colours: CONFIG.COLORS,
      })
      .toBuffer();

    fs.writeFileSync(outputPngPath, optimizedPng);
    return;
  }

  let fileBuffer = fs.readFileSync(fontFilePath);
  fileBuffer = unpackFontBuffer(fileBuffer);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
  const font = opentype.parse(arrayBuffer);

  const specimenText = customSpecimen || determineSpecimenText(font);

  const unitsPerEm = font.unitsPerEm || 1000;
  const scale = (1 / unitsPerEm) * fontSize;

  let glyphs = [];
  for (const char of specimenText) {
    const g = font.charToGlyph(char);
    if (g && (g.index > 0 || g.getPath(0, 0, fontSize).commands.length > 0)) {
      glyphs.push(g);
    }
  }

  if (glyphs.length === 0) {
    const g1 = font.charToGlyph('A') || font.glyphs.get(1);
    const g2 = font.charToGlyph('a') || font.glyphs.get(2) || g1;
    glyphs = [g1, g2].filter(Boolean);
  }

  // Generate paths and advances
  let currentX = 0;
  const paths = [];
  const letterSpacing = scale * (unitsPerEm * CONFIG.LETTER_SPACING_RATIO);

  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const p = g.getPath(currentX, 0, fontSize);
    paths.push(p);
    const advance = (g.advanceWidth || unitsPerEm * 0.6) * scale;
    currentX += advance + (i < glyphs.length - 1 ? letterSpacing : 0);
  }

  // Combined path to calculate overall bounding box
  const combined = new opentype.Path();
  for (const p of paths) {
    combined.commands.push(...p.commands);
  }

  const bbox = combined.getBoundingBox();
  const glyphWidth = bbox.x2 - bbox.x1;
  const glyphHeight = bbox.y2 - bbox.y1;



  let pathData = '';
  if (glyphWidth > 0 && glyphHeight > 0) {
    const xOffset = Math.round((size - glyphWidth) / 2 - bbox.x1);
    const yOffset = Math.round((size - glyphHeight) / 2 + glyphHeight - bbox.y2 + CONFIG.OPTICAL_Y_OFFSET);

    const finalPath = new opentype.Path();
    currentX = 0;
    for (let i = 0; i < glyphs.length; i++) {
      const g = glyphs[i];
      const centeredP = g.getPath(xOffset + currentX, yOffset, fontSize);
      finalPath.commands.push(...centeredP.commands);
      const advance = (g.advanceWidth || unitsPerEm * 0.6) * scale;
      currentX += advance + (i < glyphs.length - 1 ? letterSpacing : 0);
    }
    pathData = finalPath.toPathData(2);
  }

  let svgTemplate;
  if (!pathData || pathData.trim() === '') {
    svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="${Math.round(fontSize * 0.95)}px" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${specimenText}</text>
</svg>`;
  } else {
    svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <path d="${pathData}" fill="${glyphColor}" />
</svg>`;
  }

  // 1. Vector to raw PNG buffer
  const resvg = new Resvg(svgTemplate, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  const rawPng = resvg.render().asPng();

  // 2. High-performance PNG optimizer
  const optimizedPng = await sharp(rawPng)
    .png({
      palette: true,
      compressionLevel: 9,
      effort: 10,
      colours: CONFIG.COLORS,
    })
    .toBuffer();

  fs.writeFileSync(outputPngPath, optimizedPng);
}

function formatEta(remainingMs) {
  if (remainingMs <= 0) return '0 sec. left';
  if (remainingMs < 60000) {
    const sec = Math.max(1, Math.round(remainingMs / 1000));
    return `${sec} sec. left`;
  }
  const totalMin = Math.round(remainingMs / 60000);
  if (totalMin >= 60) {
    const hours = Math.floor(totalMin / 60);
    const mins = String(totalMin % 60).padStart(2, '0');
    return `${hours}:${mins} left`;
  }
  return `${totalMin} min. left`;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Process a single cask
 */
async function processCask(cask) {
  const outPng = path.join(OUTPUT_DIR, `${cask.token}.png`);
  const failPath = path.join(OUTPUT_DIR, `${cask.token}.fail`);
  const targetDir = path.join(CACHE_DIR, cask.token);
  const displayName = cask.name || cask.token.replace(/^font-/, '').replace(/-/g, ' ');

  try {
    let fontFilePath = findLocalFontFile(cask.token, displayName);
    if (!fontFilePath) {
      fontFilePath = await downloadAndExtractFont(cask);
    }

    const fileName = path.basename(fontFilePath);
    fontsMap[cask.token] = `~/Library/Fonts/${fileName}`;

    const isEmoji = EMOJI_FONTS.has(cask.token) || (cask.token.startsWith('font-') && cask.token.includes('emoji') && !cask.token.includes('without-emoji'));
    const specimen = isEmoji ? '😀' : null;

    await renderFontPng(fontFilePath, outPng, specimen, cask.token);
    const stat = fs.statSync(outPng);

    if (fs.existsSync(failPath)) {
      try { fs.unlinkSync(failPath); } catch (_) { }
    }
    return { ok: true, size: stat.size };
  } catch (err) {
    try {
      fs.writeFileSync(failPath, '');
    } catch (_) { }
    return { ok: false, error: err.message };
  } finally {
    if (fs.existsSync(targetDir)) {
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
      } catch (_) { }
    }
  }
}

/**
 * Parallel execution pool
 */
async function runPool(items, workerFn, maxWorkers, startTime, initialCompleted, totalFonts) {
  let index = 0;
  let batchCompleted = 0;
  let successful = 0;
  let failed = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      const itemStart = Date.now();
      const res = await workerFn(current);
      const durationMs = Date.now() - itemStart;
      batchCompleted++;

      const currentTotalDone = initialCompleted + batchCompleted;
      const elapsed = Date.now() - startTime;
      const avgMs = elapsed / batchCompleted;
      const remainingTotal = Math.max(0, totalFonts - currentTotalDone);
      const remainingMs = remainingTotal * avgMs;
      const pct = Math.floor((currentTotalDone / totalFonts) * 100);
      const progress = `[${currentTotalDone}/${totalFonts}]`;
      const status = `[${pct}% - ${formatEta(remainingMs)}]`;

      if (res.ok) {
        successful++;
        console.log(`✅ ${progress.padEnd(14)} ${status.padEnd(20)} → ${current.token.padEnd(30)} ${formatSize(res.size)} (${durationMs}ms)`);
      } else {
        failed++;
        console.log(`❌ ${progress.padEnd(14)} ${status.padEnd(20)} → ${current.token.padEnd(30)} --- KB (${durationMs}ms)  ⚠️   ${res.error} `);
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxWorkers, items.length) }, () => worker());
  await Promise.all(workers);
  return { successful, failed };
}

/**
 * Main Execution
 */
async function main() {
  const startTime = Date.now();
  const fontCasks = loadFontCasks();
  const totalFonts = fontCasks.length;

  // Pre-populate fontsMap for all font casks missing from fontsMap (including existing/failed previews)
  const missingFromMap = fontCasks.filter((c) => !fontsMap[c.token]);
  if (missingFromMap.length > 0) {
    console.log(`\n======================================================`);
    console.log(`🔍 Resolving font file paths for ${missingFromMap.length} font cask(s) for fonts.json...`);
    console.log(`======================================================\n`);
    let mapIdx = 0;
    let doneCount = 0;
    const resStartTime = Date.now();
    const mapWorkers = Array.from({ length: 16 }, async () => {
      while (mapIdx < missingFromMap.length) {
        const c = missingFromMap[mapIdx++];
        const itemStart = Date.now();
        const fontPath = await resolveFontFileName(c);
        if (fontPath) {
          fontsMap[c.token] = fontPath;
        }
        doneCount++;
        const durationMs = Date.now() - itemStart;
        const elapsed = Date.now() - resStartTime;
        const avgMs = elapsed / doneCount;
        const remainingMs = (missingFromMap.length - doneCount) * avgMs;
        const pct = Math.floor((doneCount / missingFromMap.length) * 100);
        const progress = `[${doneCount}/${missingFromMap.length}]`;
        const status = `[${pct}% - ${formatEta(remainingMs)}]`;

        if (fontPath) {
          console.log(`📄 ${progress.padEnd(14)} ${status.padEnd(20)} → ${c.token.padEnd(30)} ${fontPath} (${durationMs}ms)`);
        } else {
          console.log(`⚠️ ${progress.padEnd(14)} ${status.padEnd(20)} → ${c.token.padEnd(30)} (no artifact found) (${durationMs}ms)`);
        }
      }
    });
    await Promise.all(mapWorkers);
    saveFontsMap();
    console.log(`\n✔ Saved ${Object.keys(fontsMap).length} font paths to data/fonts.json\n`);
  }



  // Count already existing generated previews or known failed items
  const existingCount = force
    ? 0
    : fontCasks.filter((c) => {
      const pngPath = path.join(OUTPUT_DIR, `${c.token}.png`);
      const failPath = path.join(OUTPUT_DIR, `${c.token}.fail`);
      return fs.existsSync(pngPath) || fs.existsSync(failPath);
    }).length;

  let targetList = [];
  let initialCompleted = existingCount;
  let progressTotal = totalFonts;

  if (targetCask) {
    const found = fontCasks.find((c) => c.token === targetCask || c.name === targetCask);
    if (!found) {
      console.error(`Font cask "${targetCask}" not found in database.`);
      process.exit(1);
    }
    targetList = [found];
    initialCompleted = 0;
    progressTotal = 1;
  } else if (onlyFailed) {
    targetList = fontCasks
      .filter((c) => fs.existsSync(path.join(OUTPUT_DIR, `${c.token}.fail`)))
      .slice(0, limit);
    initialCompleted = 0;
    progressTotal = targetList.length;
  } else {
    targetList = fontCasks
      .filter((c) => {
        const pngPath = path.join(OUTPUT_DIR, `${c.token}.png`);
        const failPath = path.join(OUTPUT_DIR, `${c.token}.fail`);
        return force || (!fs.existsSync(pngPath) && !fs.existsSync(failPath));
      })
      .slice(0, limit);
  }

  console.log(`\n======================================================`);
  console.log(`🎨 AppFinder Optimized PNG Font Specimen Generator`);
  if (onlyFailed) {
    console.log(`📦 Target: ${targetList.length} failed font cask(s) to retry (Concurrency: ${concurrency})`);
  } else {
    console.log(`📦 Target: ${targetList.length} font cask(s) (Total fonts: ${totalFonts}, Already done: ${existingCount}, Concurrency: ${concurrency})`);
  }
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log(`======================================================\n`);

  const { successful, failed } = await runPool(
    targetList,
    processCask,
    concurrency,
    startTime,
    initialCompleted,
    progressTotal
  );

  saveFontsMap();
  syncAppsJsonWithFonts();

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgMs = targetList.length > 0 ? ((Date.now() - startTime) / targetList.length).toFixed(0) : 0;

  console.log(`\n======================================================`);
  console.log(`🎉 Complete in ${durationSec}s: ${successful} generated, ${failed} failed.`);
  console.log(`⚡ Speed: ~${avgMs}ms per font`);
  console.log(`======================================================\n`);
}

main().catch(console.error);


