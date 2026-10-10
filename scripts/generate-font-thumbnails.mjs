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
const FONTS_FILE = path.join(ROOT_DIR, 'data', 'fonts.json');
const THUMBNAILS_DIR = path.join(ROOT_DIR, 'docs', 'font-thumbnails');
const PREVIEWS_DIR = path.join(ROOT_DIR, 'docs', 'font-previews');
const CACHE_DIR = path.join(os.tmpdir(), 'appfinder-font-cache');

export const CONFIG = {
  CANVAS_SIZE: 256,         // Total output PNG width & height for thumbnails (in pixels)
  PREVIEW_HEIGHT: 128,      // Total output PNG height for previews (in pixels)
  FONT_SIZE: 155,           // Inner font point size (controls the scale of "Aa")
  PREVIEW_FONT_SIZE: 64,    // Base font point size for preview text
  GLYPH_COLOR: '#000000',   // Glyph fill color (pure black)
  LETTER_SPACING_RATIO: 0.04, // Space between 'A' and 'a' relative to font units
  OPTICAL_Y_OFFSET: 0,      // Fine optical vertical adjustment (+ down, - up in px)
  TEXT: 'Aa',               // Specimen characters to render for thumbnail
  CONCURRENCY: 6,           // Parallel workers for fast batch processing
  COLORS: 256
};

// CLI Arguments
const args = process.argv.slice(2);
const targetCask = args.find((a) => a.startsWith('--cask='))?.split('=')[1]?.trim();
const onlyFailed = args.includes('--failed');
const consolidate = args.includes('--consolidate') || args.includes('--consolidate-only');
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg, 10) : (targetCask ? 1 : (onlyFailed ? Infinity : 10));
const force = args.includes('--force');
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))?.split('=')[1];
const concurrency = concurrencyArg ? parseInt(concurrencyArg, 10) : CONFIG.CONCURRENCY;

// Sizing & Appearance Overrides
const size = parseInt(args.find((a) => a.startsWith('--size='))?.split('=')[1] || String(CONFIG.CANVAS_SIZE), 10);
const fontSize = parseInt(args.find((a) => a.startsWith('--font-size='))?.split('=')[1] || String(CONFIG.FONT_SIZE), 10);
const glyphColor = args.find((a) => a.startsWith('--color='))?.split('=')[1] || CONFIG.GLYPH_COLOR;

fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

// In-memory fonts database loaded from data/fonts.json
let fontsDatabase = {};
if (fs.existsSync(FONTS_FILE)) {
  try {
    fontsDatabase = JSON.parse(fs.readFileSync(FONTS_FILE, 'utf-8'));
  } catch (_) {
    fontsDatabase = {};
  }
}

/**
 * Persists in-memory fonts database to data/fonts.json atomically
 */
function saveFontsDatabase() {
  try {
    const tmp = `${FONTS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(fontsDatabase, null, 2) + '\n', 'utf-8');
    fs.renameSync(tmp, FONTS_FILE);
  } catch (err) {
    try {
      fs.writeFileSync(FONTS_FILE, JSON.stringify(fontsDatabase, null, 2) + '\n', 'utf-8');
    } catch (_) { }
  }
}

/**
 * Updates a single font entry in fonts database
 */
function updateFontMetadata(token, metadata) {
  const existing = fontsDatabase[token];
  if (typeof existing === 'object' && existing !== null) {
    fontsDatabase[token] = { ...existing, ...metadata };
  } else {
    fontsDatabase[token] = metadata;
  }
  saveFontsDatabase();
}

/**
 * Extracts localized or preferred string from opentype.js font.names
 */
function getFontName(names, key) {
  if (!names) return undefined;
  for (const plat of ['', 'windows', 'macintosh']) {
    const target = plat ? names[plat] : names;
    if (target && target[key]) {
      const val = target[key];
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (typeof val === 'object' && val !== null) {
        const str = val.en || Object.values(val)[0];
        if (typeof str === 'string' && str.trim()) return str.trim();
      }
    }
  }
  return undefined;
}

/**
 * Extracts style names from list of font file paths
 */
function extractStyleNamesFromFiles(filePaths, fallbackSubfamily = 'Regular') {
  const styles = new Set();
  for (const fp of filePaths) {
    const filename = path.basename(fp, path.extname(fp));
    const match = filename.match(/[-_ ]([A-Za-z0-9]+(?:[A-Za-z0-9]+)?)$/);
    if (match && match[1]) {
      let styleName = match[1]
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim();
      styles.add(styleName);
    } else {
      styles.add(filename);
    }
  }
  if (styles.size === 0 && fallbackSubfamily) {
    styles.add(fallbackSubfamily);
  }
  return Array.from(styles);
}

/**
 * Extracts rich font metadata from parsed opentype font & cask metadata
 */
function extractFontMetadata(font, cask, allFontFiles = [], primaryFilePath = '') {
  const family = getFontName(font.names, 'fontFamily') || getFontName(font.names, 'preferredFamily') || cask.name || cask.token.replace(/^font-/, '');
  const subfamily = getFontName(font.names, 'fontSubfamily') || getFontName(font.names, 'preferredSubfamily') || 'Regular';
  const designer = getFontName(font.names, 'designer');
  const foundry = getFontName(font.names, 'manufacturer') || getFontName(font.names, 'vendorURL') || getFontName(font.names, 'designerURL');
  const license = getFontName(font.names, 'license');
  const licenseUrl = getFontName(font.names, 'licenseURL');
  const version = getFontName(font.names, 'version') || cask.version;
  const desc = (cask.desc && cask.desc !== 'Font') ? cask.desc : getFontName(font.names, 'description');

  // Monospace detection
  const isMonospace = Boolean(
    font.tables?.post?.isFixedPitch ||
    (font.tables?.os2?.panose && (font.tables.os2.panose[3] === 9 || font.tables.os2.panose.bProportion === 9)) ||
    cask.token.includes('mono') ||
    cask.token.includes('code')
  );

  // Variable font detection
  const fvarAxes = font.tables?.fvar?.axes;
  const isVariable = Boolean(fvarAxes && fvarAxes.length > 0);
  const variableAxes = isVariable
    ? fvarAxes.map((axis) => ({
      tag: axis.tag,
      min: axis.minValue,
      max: axis.maxValue,
      default: axis.defaultValue,
      name: axis.name?.en || (typeof axis.name === 'string' ? axis.name : axis.tag)
    }))
    : undefined;

  // Format detection
  const ext = path.extname(primaryFilePath).replace(/^\./, '').toLowerCase() || (font.tables?.cff ? 'otf' : 'ttf');

  // Styles & Variants
  const styles = extractStyleNamesFromFiles(allFontFiles, subfamily);
  if (font.tables?.fvar?.instances && font.tables.fvar.instances.length > 0) {
    for (const inst of font.tables.fvar.instances) {
      const instName = inst.name?.en || (typeof inst.name === 'string' ? inst.name : null);
      if (instName && !styles.includes(instName)) {
        styles.push(instName);
      }
    }
  }

  const fontFileName = path.basename(primaryFilePath);
  const fontPath = `~/Library/Fonts/${fontFileName}`;

  const meta = {
    file: fontPath,
    family,
    ...(foundry ? { foundry } : {}),
    ...(designer ? { designer } : {}),
    ...(desc && desc !== 'Font' ? { desc } : {}),
    ...(cask.homepage ? { homepage: cask.homepage } : {}),
    styles,
    stylesCount: styles.length,
    variants: styles,
    ...(license ? { license } : {}),
    ...(licenseUrl ? { licenseUrl } : {}),
    isMonospace,
    isVariable,
    ...(variableAxes ? { variableAxes } : {}),
    glyphCount: font.numGlyphs || (font.glyphs ? font.glyphs.length : 0),
    format: ext,
    ...(version ? { version } : {})
  };

  return meta;
}

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
    if (fs.existsSync(monoPath)) return { primary: monoPath, all: [monoPath] };
  }
  if (['font-sf-armenian', 'font-sf-hebrew', 'font-sf-georgian', 'font-sf-compact', 'font-sf-pro'].includes(token)) {
    const sfPaths = ['/Library/Fonts/SF-Pro-Text-Regular.otf', '/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/SFCompact.ttf'];
    for (const p of sfPaths) {
      if (fs.existsSync(p)) return { primary: p, all: [p] };
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
      const fontFiles = files
        .map((f) => (path.isAbsolute(String(f)) ? String(f) : path.join(dir, String(f))))
        .filter((f) => {
          const s = path.basename(f).toLowerCase();
          const norm = s.replace(/[^a-z0-9]/g, '');
          const isMatch = norm.includes(normalizedToken) || (normalizedName && norm.includes(normalizedName));
          return isMatch && /\.(ttf|otf|ttc|otc)$/i.test(s) && fs.existsSync(f) && fs.statSync(f).isFile();
        });

      if (fontFiles.length > 0) {
        const preferred = fontFiles.find((f) => {
          const s = path.basename(f).toLowerCase();
          return !s.includes('italic') && !s.includes('oblique') && !s.includes('bold') && !s.includes('light') && !s.includes('thin');
        }) || fontFiles[0];

        return { primary: preferred, all: fontFiles };
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
    return { primary: fontOut, all: [fontOut] };
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
  const allFontFiles = extractedFiles
    .map((f) => (path.isAbsolute(String(f)) ? String(f) : path.join(targetDir, String(f))))
    .filter((f) => /\.(ttf|otf|ttc|otc)$/i.test(path.basename(f)) && fs.existsSync(f) && fs.statSync(f).isFile());

  const fontFile = allFontFiles.find((f) => {
    const s = path.basename(f).toLowerCase();
    return !s.includes('italic') && !s.includes('oblique') && !s.includes('bold');
  }) || allFontFiles[0];

  if (!fontFile) {
    throw new Error(`No valid font (.ttf/.otf/.ttc) file extracted from archive for ${caskToken}`);
  }

  return { primary: fontFile, all: allFontFiles };
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

/**
 * Loads opentype Font object from file path
 */
function loadOpentypeFont(fontFilePath) {
  let fileBuffer = fs.readFileSync(fontFilePath);
  fileBuffer = unpackFontBuffer(fileBuffer);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
  return opentype.parse(arrayBuffer);
}

/**
 * Renders thumbnail PNG (256x256 "Aa")
 */
async function renderFontThumbnailPng(font, outputPngPath) {
  const unitsPerEm = font.unitsPerEm || 1000;
  const scale = (1 / unitsPerEm) * fontSize;

  // Retrieve glyphs directly to avoid ligature errors
  const glyphA = font.charToGlyph('A') || font.glyphs.get(1);
  const glyphSmallA = font.charToGlyph('a') || font.charToGlyph('A') || font.glyphs.get(2);

  // Generate paths
  const pathA = glyphA.getPath(0, 0, fontSize);
  const advanceA = (glyphA.advanceWidth || unitsPerEm * 0.6) * scale;
  const letterSpacing = scale * (unitsPerEm * CONFIG.LETTER_SPACING_RATIO);
  const pathSmallA = glyphSmallA.getPath(advanceA + letterSpacing, 0, fontSize);

  // Combined path to calculate overall bounding box
  const combined = new opentype.Path();
  combined.commands = [...pathA.commands, ...pathSmallA.commands];

  const bbox = combined.getBoundingBox();
  const glyphWidth = bbox.x2 - bbox.x1;
  const glyphHeight = bbox.y2 - bbox.y1;

  // Exact vertical and horizontal centering inside canvas (size x size)
  const xOffset = Math.round((size - glyphWidth) / 2 - bbox.x1);
  const yOffset = Math.round((size - glyphHeight) / 2 + glyphHeight - bbox.y2 + CONFIG.OPTICAL_Y_OFFSET);

  const centeredPathA = glyphA.getPath(xOffset, yOffset, fontSize);
  const centeredPathSmallA = glyphSmallA.getPath(xOffset + advanceA + letterSpacing, yOffset, fontSize);

  const finalPath = new opentype.Path();
  finalPath.commands = [...centeredPathA.commands, ...centeredPathSmallA.commands];
  const pathData = finalPath.toPathData(2);

  // Pure vector glyphs on transparent canvas (NO background rects, borders or labels)
  const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <path d="${pathData}" fill="${glyphColor}" />
</svg>`;

  // 1. Vector to raw PNG buffer
  const resvg = new Resvg(svgTemplate, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  const rawPng = resvg.render().asPng();

  // 2. High-performance PNG optimizer: 8-bit palette + max compression (~1.5 KB per image)
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

/**
 * Cleans and capitalizes font name for preview text
 */
function getPreviewText(cask) {
  const rawName = cask.name || cask.token.replace(/^font-/, '').replace(/-/g, ' ');
  // Remove text in parentheses (e.g. "Fira Code (v2)" -> "Fira Code")
  const withoutParens = rawName.replace(/\s*\([^)]*\)/g, '').trim();
  // Capitalize words
  return withoutParens
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

/**
 * Renders preview PNG (128px high, dynamic width based on font name text)
 */
async function renderFontPreviewPng(font, previewText, outputPngPath) {
  const height = CONFIG.PREVIEW_HEIGHT; // 128px
  let previewFontSize = CONFIG.PREVIEW_FONT_SIZE; // 64

  // Get path for preview text
  let textPath = font.getPath(previewText, 0, 0, previewFontSize);
  let bbox = textPath.getBoundingBox();
  let glyphHeight = bbox.y2 - bbox.y1;
  let glyphWidth = bbox.x2 - bbox.x1;

  // Scale down if font ascenders/descenders exceed target height (e.g. 92px)
  const maxAllowedHeight = 92;
  if (glyphHeight > maxAllowedHeight) {
    previewFontSize = Math.floor(previewFontSize * (maxAllowedHeight / glyphHeight));
    textPath = font.getPath(previewText, 0, 0, previewFontSize);
    bbox = textPath.getBoundingBox();
    glyphHeight = bbox.y2 - bbox.y1;
    glyphWidth = bbox.x2 - bbox.x1;
  }

  const paddingX = 24;
  const width = Math.max(128, Math.ceil(glyphWidth + paddingX * 2));

  // Center horizontally within padded bounds or left-aligned with paddingX
  const xOffset = Math.round(paddingX - bbox.x1);
  const yOffset = Math.round((height - glyphHeight) / 2 + glyphHeight - bbox.y2);

  const centeredPath = font.getPath(previewText, xOffset, yOffset, previewFontSize);
  const pathData = centeredPath.toPathData(2);

  const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <path d="${pathData}" fill="${glyphColor}" />
</svg>`;

  const resvg = new Resvg(svgTemplate, {
    fitTo: { mode: 'original' },
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
 * Process a single cask: renders both thumbnail and preview PNGs, and enriches fonts.json
 */
async function processCask(cask) {
  const outThumbPng = path.join(THUMBNAILS_DIR, `${cask.token}.png`);
  const failThumbPath = path.join(THUMBNAILS_DIR, `${cask.token}.fail`);
  const outPreviewPng = path.join(PREVIEWS_DIR, `${cask.token}.png`);
  const failPreviewPath = path.join(PREVIEWS_DIR, `${cask.token}.fail`);
  const targetDir = path.join(CACHE_DIR, cask.token);
  const displayName = cask.name || cask.token.replace(/^font-/, '').replace(/-/g, ' ');

  try {
    let fontResult = findLocalFontFile(cask.token, displayName);
    if (!fontResult) {
      fontResult = await downloadAndExtractFont(cask);
    }

    const fontFilePath = typeof fontResult === 'string' ? fontResult : fontResult.primary;
    const allFontFiles = (typeof fontResult === 'object' && fontResult.all) ? fontResult.all : [fontFilePath];

    const font = loadOpentypeFont(fontFilePath);

    // Consolidate rich font metadata into data/fonts.json
    try {
      const metadata = extractFontMetadata(font, cask, allFontFiles, fontFilePath);
      updateFontMetadata(cask.token, metadata);
    } catch (_) { }

    // 1. Render Thumbnail ("Aa" 256x256)
    try {
      await renderFontThumbnailPng(font, outThumbPng);
      if (fs.existsSync(failThumbPath)) {
        try { fs.unlinkSync(failThumbPath); } catch (_) { }
      }
    } catch (err) {
      fs.writeFileSync(failThumbPath, '');
      throw err;
    }

    // 2. Render Preview (Font name 128px high)
    try {
      const previewText = getPreviewText(cask);
      await renderFontPreviewPng(font, previewText, outPreviewPng);
      if (fs.existsSync(failPreviewPath)) {
        try { fs.unlinkSync(failPreviewPath); } catch (_) { }
      }
    } catch (err) {
      fs.writeFileSync(failPreviewPath, '');
      throw err;
    }

    const statThumb = fs.statSync(outThumbPng);
    const statPreview = fs.statSync(outPreviewPng);

    return { ok: true, size: statThumb.size + statPreview.size };
  } catch (err) {
    try {
      if (!fs.existsSync(outThumbPng)) fs.writeFileSync(failThumbPath, '');
      if (!fs.existsSync(outPreviewPng)) fs.writeFileSync(failPreviewPath, '');
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
        console.log(`❌ ${progress.padEnd(14)} ${status.padEnd(20)} → ${current.token.padEnd(30)} --- KB (${durationMs}ms) ⚠️ ${res.error} `);
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

  if (consolidate) {
    console.log(`\n======================================================`);
    console.log(`📚 AppFinder Font Database Consolidator`);
    console.log(`📦 Scanning ${fontCasks.length} font cask(s) to consolidate into data/fonts.json`);
    console.log(`======================================================\n`);

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < fontCasks.length; i++) {
      const cask = fontCasks[i];
      const displayName = cask.name || cask.token.replace(/^font-/, '').replace(/-/g, ' ');
      try {
        let fontResult = findLocalFontFile(cask.token, displayName);
        if (!fontResult) {
          try {
            fontResult = await downloadAndExtractFont(cask);
          } catch (_) { }
        }
        if (fontResult) {
          const fontFilePath = typeof fontResult === 'string' ? fontResult : fontResult.primary;
          const allFontFiles = (typeof fontResult === 'object' && fontResult.all) ? fontResult.all : [fontFilePath];
          const font = loadOpentypeFont(fontFilePath);
          const metadata = extractFontMetadata(font, cask, allFontFiles, fontFilePath);
          updateFontMetadata(cask.token, metadata);
          updated++;
          if (updated % 20 === 0 || i === fontCasks.length - 1) {
            console.log(`✨ Consolidated [${i + 1}/${fontCasks.length}] fonts (${updated} enriched)`);
          }
        }
      } catch (err) {
        failed++;
      } finally {
        const targetDir = path.join(CACHE_DIR, cask.token);
        if (fs.existsSync(targetDir)) {
          try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch (_) { }
        }
      }
    }

    console.log(`\n======================================================`);
    console.log(`🎉 Consolidation complete: ${updated} fonts enriched, saved to ${FONTS_FILE}`);
    console.log(`======================================================\n`);
    return;
  }

  // Count already existing generated thumbnails and previews
  const existingCount = force
    ? 0
    : fontCasks.filter((c) => {
      const thumbDone = fs.existsSync(path.join(THUMBNAILS_DIR, `${c.token}.png`)) || fs.existsSync(path.join(THUMBNAILS_DIR, `${c.token}.fail`));
      const previewDone = fs.existsSync(path.join(PREVIEWS_DIR, `${c.token}.png`)) || fs.existsSync(path.join(PREVIEWS_DIR, `${c.token}.fail`));
      return thumbDone && previewDone;
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
      .filter((c) => fs.existsSync(path.join(THUMBNAILS_DIR, `${c.token}.fail`)) || fs.existsSync(path.join(PREVIEWS_DIR, `${c.token}.fail`)))
      .slice(0, limit);
    initialCompleted = 0;
    progressTotal = targetList.length;
  } else {
    targetList = fontCasks
      .filter((c) => {
        const thumbDone = fs.existsSync(path.join(THUMBNAILS_DIR, `${c.token}.png`)) || fs.existsSync(path.join(THUMBNAILS_DIR, `${c.token}.fail`));
        const previewDone = fs.existsSync(path.join(PREVIEWS_DIR, `${c.token}.png`)) || fs.existsSync(path.join(PREVIEWS_DIR, `${c.token}.fail`));
        return force || !thumbDone || !previewDone;
      })
      .slice(0, limit);
  }

  console.log(`\n======================================================`);
  console.log(`🎨 AppFinder Font Specimen & Preview Generator`);
  if (onlyFailed) {
    console.log(`📦 Target: ${targetList.length} failed font cask(s) to retry (Concurrency: ${concurrency})`);
  } else {
    console.log(`📦 Target: ${targetList.length} font cask(s) (Total fonts: ${totalFonts}, Already done: ${existingCount}, Concurrency: ${concurrency})`);
  }
  console.log(`📁 Thumbnails: ${THUMBNAILS_DIR}`);
  console.log(`📁 Previews:   ${PREVIEWS_DIR}`);
  console.log(`📁 Fonts DB:   ${FONTS_FILE}`);
  console.log(`======================================================\n`);

  const { successful, failed } = await runPool(
    targetList,
    processCask,
    concurrency,
    startTime,
    initialCompleted,
    progressTotal
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgMs = targetList.length > 0 ? ((Date.now() - startTime) / targetList.length).toFixed(0) : 0;

  console.log(`\n======================================================`);
  console.log(`🎉 Complete in ${durationSec}s: ${successful} generated, ${failed} failed.`);
  console.log(`⚡ Speed: ~${avgMs}ms per font`);
  console.log(`======================================================\n`);
}

main().catch(console.error);

