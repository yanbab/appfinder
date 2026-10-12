#!/usr/bin/env node

/**
 * generate-font-thumbnails.mjs
 *
 * Generates authentic font thumbnails ("Aa") and case-adaptive name previews
 * for Homebrew font casks using the native macOS CoreText renderer (scripts/bin/render-font).
 *
 * Outputs:
 *   - docs/font-thumbnails/<token>.png (256x256 "Aa" specimen, ~1.5-2 KB)
 *   - docs/font-previews/<token>.png   (Case-adaptive name preview, ~2-4 KB)
 *   - data/apps.json                  (screenshotUrl mapping)
 *
 * Usage:
 *   # Process a single font cask:
 *   node scripts/generate-font-thumbnails.mjs --cask=font-fira-code
 *   node scripts/generate-font-thumbnails.mjs --cask=font-bowlby-one-sc --force
 *
 *   # Batch generate missing fonts (default: 10 fonts, 6 workers):
 *   npm run fonts:generate
 *   node scripts/generate-font-thumbnails.mjs --limit=50 --concurrency=8
 *
 *   # Retry only previously failed fonts:
 *   node scripts/generate-font-thumbnails.mjs --failed
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const APPS_FILE = path.join(ROOT_DIR, 'data', 'apps.json');
const THUMBNAILS_DIR = path.join(ROOT_DIR, 'docs', 'font-thumbnails');
const PREVIEWS_DIR = path.join(ROOT_DIR, 'docs', 'font-previews');
const CACHE_DIR = path.join(ROOT_DIR, 'cache', 'fonts');
const NATIVE_RENDERER = path.join(ROOT_DIR, 'scripts', 'bin', 'render-font');
const SWIFT_SOURCE = path.join(ROOT_DIR, 'scripts', 'render-font.swift');

// CLI Arguments
const args = process.argv.slice(2);
const targetCask = args.find((a) => a.startsWith('--cask='))?.split('=')[1]?.trim();
const onlyFailed = args.includes('--failed');
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg, 10) : (targetCask ? 1 : (onlyFailed ? Infinity : 10));
const force = args.includes('--force');
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))?.split('=')[1];
const concurrency = concurrencyArg ? parseInt(concurrencyArg, 10) : 6;
const size = parseInt(args.find((a) => a.startsWith('--size='))?.split('=')[1] || '256', 10);
const fontSize = parseInt(args.find((a) => a.startsWith('--font-size='))?.split('=')[1] || '155', 10);
const glyphColor = args.find((a) => a.startsWith('--color='))?.split('=')[1] || '#000000';

fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * Ensures the native CoreText renderer binary exists.
 */
function ensureRenderer() {
  if (fs.existsSync(NATIVE_RENDERER)) return true;
  if (process.platform !== 'darwin') {
    throw new Error('Native CoreText renderer requires macOS.');
  }
  console.log('Compiling native Swift CoreText renderer...');
  fs.mkdirSync(path.dirname(NATIVE_RENDERER), { recursive: true });
  const moduleCache = path.join(ROOT_DIR, 'cache', 'swift-modules');
  fs.mkdirSync(moduleCache, { recursive: true });
  execSync(`swiftc -module-cache-path "${moduleCache}" -O "${SWIFT_SOURCE}" -o "${NATIVE_RENDERER}"`, { stdio: 'inherit' });
  return fs.existsSync(NATIVE_RENDERER);
}


/**
 * Renders font using the native CoreText helper.
 */
function renderWithNative({ fontPath, text, outPath, mode = 'thumbnail', ptSize = fontSize }) {
  const cliArgs = [
    `--font=${fontPath}`,
    `--text=${text || 'Aa'}`,
    `--out=${outPath}`,
    `--mode=${mode}`,
    `--size=${size}`,
    `--font-size=${ptSize}`,
    `--color=${glyphColor}`
  ];

  const result = spawnSync(NATIVE_RENDERER, cliArgs, { encoding: 'utf8' });
  if (result.status !== 0) {
    const err = result.stderr?.trim() || `render-font exited with code ${result.status}`;
    throw new Error(err);
  }

  if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
    throw new Error(`Output file was not created: ${outPath}`);
  }

  return true;
}

let allAppsData = null;

function loadAppsData() {
  if (!allAppsData && fs.existsSync(APPS_FILE)) {
    try {
      allAppsData = JSON.parse(fs.readFileSync(APPS_FILE, 'utf-8'));
    } catch (_) {
      allAppsData = [];
    }
  }
  return allAppsData || [];
}

function updateAppScreenshotUrl(token, screenshotUrl) {
  const apps = loadAppsData();
  const entry = apps.find((a) => a.token === token);
  if (entry && entry.screenshotUrl !== screenshotUrl) {
    entry.screenshotUrl = screenshotUrl;
    try {
      fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2) + '\n', 'utf-8');
    } catch (_) { }
  }
}

/**
 * Loads font casks from data/apps.json.
 */
function loadFontCasks() {
  const apps = loadAppsData();
  return apps.filter((item) => item.category === 'font' || item.token.startsWith('font-'));
}

/**
 * Looks for font file in Caskroom or macOS installed font directories.
 */
function findLocalFontFile(token, name) {
  // Caskroom directories
  const caskDirs = [
    path.join('/opt/homebrew/Caskroom', token),
    path.join('/usr/local/Caskroom', token),
  ];
  for (const dir of caskDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir, { recursive: true });
      const fontFiles = files
        .map((f) => (path.isAbsolute(String(f)) ? String(f) : path.join(dir, String(f))))
        .filter((f) => /\.(ttf|otf|ttc|otc)$/i.test(path.basename(f)) && fs.existsSync(f) && fs.statSync(f).isFile());
      if (fontFiles.length > 0) {
        const preferred = fontFiles.find((f) => {
          const s = path.basename(f).toLowerCase();
          return !s.includes('italic') && !s.includes('oblique') && !s.includes('bold');
        }) || fontFiles[0];
        return preferred;
      }
    } catch (_) { }
  }

  // System/User font directories
  const cleanToken = token.replace(/^font-/, '').toLowerCase();
  const normalizedToken = cleanToken.replace(/[^a-z0-9]/g, '');
  const normalizedName = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const userFontDirs = [
    path.join(os.homedir(), 'Library', 'Fonts'),
    '/Library/Fonts',
  ];

  for (const dir of userFontDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      const fontFiles = files
        .map((f) => path.join(dir, f))
        .filter((f) => {
          const s = path.basename(f).toLowerCase();
          const norm = s.replace(/[^a-z0-9]/g, '');
          const isMatch = norm.startsWith(normalizedToken) || (normalizedName && norm.startsWith(normalizedName));
          return isMatch && /\.(ttf|otf|ttc|otc)$/i.test(s) && fs.existsSync(f) && fs.statSync(f).isFile();
        });

      if (fontFiles.length > 0) {
        const preferred = fontFiles.find((f) => {
          const s = path.basename(f).toLowerCase();
          return !s.includes('italic') && !s.includes('oblique') && !s.includes('bold') && !s.includes('light') && !s.includes('thin');
        }) || fontFiles[0];
        return preferred;
      }
    } catch (_) { }
  }

  return null;
}

const KNOWN_MIRRORS = {
  'font-pt-sans': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptsans/PT_Sans-Web-Regular.ttf',
  'font-pt-serif': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptserif/PT_Serif-Web-Regular.ttf',
  'font-pt-mono': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptmono/PT_Mono-Web-Regular.ttf',
  'font-pt-root-ui': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptsans/PT_Sans-Web-Regular.ttf',
  'font-pt-astra-sans': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptsans/PT_Sans-Web-Regular.ttf',
  'font-pt-astra-serif': 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptserif/PT_Serif-Web-Regular.ttf',
  'font-gandhi-sans': 'https://raw.githubusercontent.com/ThaUnknown/jassub/master/demo/fonts/GandhiSans-Regular.ttf',
  'font-code2002': 'https://raw.githubusercontent.com/reclaimed/paleofonts/master/CODE2002.TTF',
  'font-kanjistrokeorders': 'https://raw.githubusercontent.com/deepin-community/fonts-kanjistrokeorders/master/KanjiStrokeOrders_v4.004.ttf',
  'font-david-clm': 'https://raw.githubusercontent.com/Culmus/hebrew-fonts/master/DavidCLM-Medium.ttf',
  'font-opendyslexic': 'https://raw.githubusercontent.com/antijingoist/opendyslexic/master/compiled/OpenDyslexic-Regular.otf',
  'font-profontx': 'https://raw.githubusercontent.com/google/fonts/main/ofl/profont/ProFont-Regular.ttf',
  'font-golos-ui': 'https://raw.githubusercontent.com/google/fonts/main/ofl/golostext/GolosText%5Bwght%5D.ttf',
};

/**
 * Downloads and extracts font file to cache directory.
 */
async function downloadAndExtractFont(cask) {
  const caskToken = cask.token;
  const targetDir = path.join(CACHE_DIR, caskToken);
  fs.mkdirSync(targetDir, { recursive: true });

  const existingFiles = fs.readdirSync(targetDir);
  const cachedFont = existingFiles.find((f) => /\.(ttf|otf|ttc|otc)$/i.test(f) && !f.includes('italic') && !f.includes('bold'))
    || existingFiles.find((f) => /\.(ttf|otf|ttc|otc)$/i.test(f));

  if (cachedFont) {
    return path.join(targetDir, cachedFont);
  }

  let downloadUrl = cask.url;
  let fontTarget = null;
  let info = null;

  if (KNOWN_MIRRORS[caskToken]) {
    downloadUrl = KNOWN_MIRRORS[caskToken];
  } else {
    try {
      const res = await fetch(`https://formulae.brew.sh/api/cask/${caskToken}.json`);
      if (res.ok) info = await res.json();
    } catch (_) { }

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
    headers: { 'User-Agent': 'AppFinder/1.0' },
    redirect: 'follow',
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} from ${downloadUrl}`);
  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(archivePath, Buffer.from(arrayBuffer));

  const cleanUrl = downloadUrl.split('?')[0];
  const isDirectFont = /\.(ttf|otf|ttc|otc)$/i.test(cleanUrl);

  if (isDirectFont) {
    const ext = path.extname(cleanUrl) || '.ttf';
    const baseName = path.basename(cleanUrl) || `${caskToken}${ext}`;
    const fontOut = path.join(targetDir, baseName);
    fs.renameSync(archivePath, fontOut);
    return fontOut;
  }

  try { execSync(`unzip -q -o "${archivePath}" -d "${targetDir}" 2>/dev/null`); } catch (_) { }
  try { execSync(`tar -xf "${archivePath}" -C "${targetDir}" 2>/dev/null`); } catch (_) { }

  const extractedFiles = fs.readdirSync(targetDir, { recursive: true });
  const fontFile = extractedFiles
    .map((f) => (path.isAbsolute(String(f)) ? String(f) : path.join(targetDir, String(f))))
    .filter((f) => /\.(ttf|otf|ttc|otc)$/i.test(path.basename(f)) && fs.existsSync(f) && fs.statSync(f).isFile())
    .find((f) => !f.toLowerCase().includes('italic') && !f.toLowerCase().includes('bold'))
    || extractedFiles.map((f) => path.join(targetDir, String(f))).find((f) => /\.(ttf|otf|ttc|otc)$/i.test(f));

  if (!fontFile) {
    throw new Error(`No valid font file extracted from archive for ${caskToken}`);
  }

  return fontFile;
}

/**
 * Gets clean preview text (font name).
 */
function getPreviewText(cask) {
  const rawName = cask.name || cask.token.replace(/^font-/, '').replace(/-/g, ' ');
  return rawName.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Gets script-appropriate specimen character for thumbnail (e.g. אב for Hebrew, أب for Arabic, 永 for CJK, 😀 for emoji).
 */
function getScriptSpecimenCharacter(cask) {
  const token = (cask.token || '').toLowerCase();
  const name = (cask.name || '').toLowerCase();
  const c2 = (cask.secondCategory || '').toLowerCase();
  const c3 = (cask.thirdCategory || '').toLowerCase();
  const desc = (cask.desc || '').toLowerCase();

  // Emoji / Symbols
  if (c2.includes('emoji') || c3.includes('emoji') || token.includes('emoji') || name.includes('emoji') || desc.includes('emoji')) {
    return '😀';
  }

  // Hebrew
  if (c3.includes('hebrew') || token.includes('hebrew') || name.includes('hebrew')) {
    return 'אב';
  }

  // Arabic
  if (c3.includes('arabic') || token.includes('arabic') || name.includes('arabic')) {
    return 'أب';
  }

  // CJK / Chinese / Japanese / Korean
  if (c3.includes('cjk') || token.includes('cjk') || name.includes('cjk') || token.includes('chinese') || name.includes('chinese')) {
    return '永';
  }
  if (c3.includes('japanese') || token.includes('japanese') || name.includes('japanese') || token.includes('kana')) {
    return 'あ';
  }
  if (c3.includes('korean') || token.includes('korean') || name.includes('korean') || token.includes('hangul')) {
    return '가';
  }

  // Thai
  if (c3.includes('thai') || token.includes('thai') || name.includes('thai')) {
    return 'ก';
  }

  // Devanagari / Indic
  if (c3.includes('devanagari') || token.includes('devanagari') || name.includes('devanagari')) {
    return 'अ';
  }
  if (c3.includes('bengali') || token.includes('bengali')) return 'অ';
  if (c3.includes('tamil') || token.includes('tamil')) return 'அ';
  if (c3.includes('telugu') || token.includes('telugu')) return 'అ';
  if (c3.includes('gujarati') || token.includes('gujarati')) return 'અ';
  if (c3.includes('kannada') || token.includes('kannada')) return 'ಅ';
  if (c3.includes('malayalam') || token.includes('malayalam')) return 'അ';

  // Armenian / Georgian
  if (c3.includes('armenian') || token.includes('armenian')) return 'Աա';
  if (c3.includes('georgian') || token.includes('georgian')) return 'Ⴀა';

  // Greek / Cyrillic
  if (c3.includes('greek') || token.includes('greek') || name.includes('greek')) return 'Αα';
  if (c3.includes('cyrillic') || token.includes('cyrillic') || name.includes('cyrillic')) return 'Аа';

  // Symbols / Nerd Font
  if (c2.includes('symbols') || token.includes('nerd-font')) return '⌘';

  return 'Aa';
}

/**
 * Processes a single font cask: renders thumbnail & preview banner.
 */
async function processCask(cask) {
  const outThumbPng = path.join(THUMBNAILS_DIR, `${cask.token}.png`);
  const failThumbPath = path.join(THUMBNAILS_DIR, `${cask.token}.fail`);
  const outPreviewPng = path.join(PREVIEWS_DIR, `${cask.token}.png`);
  const failPreviewPath = path.join(PREVIEWS_DIR, `${cask.token}.fail`);
  const targetDir = path.join(CACHE_DIR, cask.token);
  const displayName = cask.name || cask.token.replace(/^font-/, '').replace(/-/g, ' ');

  try {
    let fontPath = findLocalFontFile(cask.token, displayName);
    if (!fontPath) {
      fontPath = await downloadAndExtractFont(cask);
    }

    const previewText = getPreviewText(cask);
    const specimenText = getScriptSpecimenCharacter(cask);

    // 1. Render Thumbnail (256x256 authentic specimen)
    renderWithNative({
      fontPath,
      text: specimenText,
      outPath: outThumbPng,
      mode: 'thumbnail',
      ptSize: fontSize
    });

    if (fs.existsSync(failThumbPath)) {
      try { fs.unlinkSync(failThumbPath); } catch (_) { }
    }

    // 2. Render Name Preview banner
    renderWithNative({
      fontPath,
      text: previewText,
      outPath: outPreviewPng,
      mode: 'preview',
      ptSize: 64
    });
    if (fs.existsSync(failPreviewPath)) {
      try { fs.unlinkSync(failPreviewPath); } catch (_) { }
    }

    // Update screenshotUrl in apps.json
    const screenshotUrl = `https://yanbab.github.io/appfinder/font-previews/${cask.token}.png`;
    updateAppScreenshotUrl(cask.token, screenshotUrl);

    const sizeTotal = fs.statSync(outThumbPng).size + fs.statSync(outPreviewPng).size;
    return { ok: true, size: sizeTotal };
  } catch (err) {
    if (!fs.existsSync(outThumbPng)) fs.writeFileSync(failThumbPath, '');
    if (!fs.existsSync(outPreviewPng)) fs.writeFileSync(failPreviewPath, '');
    return { ok: false, error: err.message };
  } finally {
    if (fs.existsSync(targetDir)) {
      try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch (_) { }
    }
  }
}

function formatEta(remainingMs) {
  if (remainingMs <= 0) return '0 sec. left';
  const sec = Math.round(remainingMs / 1000);
  if (sec < 60) return `${sec} sec. left`;
  const mins = Math.floor(sec / 60);
  return `${mins}m ${sec % 60}s left`;
}

function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Worker pool for parallel processing.
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
        console.log(`❌ ${progress.padEnd(14)} ${status.padEnd(20)} → ${current.token.padEnd(30)} ⚠️  ${res.error} (${durationMs}ms)`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxWorkers, items.length) }, () => worker());
  await Promise.all(workers);
  return { successful, failed };
}

/**
 * Main execution.
 */
async function main() {
  ensureRenderer();

  const startTime = Date.now();
  const fontCasks = loadFontCasks();
  const totalFonts = fontCasks.length;

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
      console.error(`Font cask "${targetCask}" not found.`);
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
  console.log(`🎨 AppFinder Font Specimen & Preview Generator (Native CoreText)`);
  console.log(`📦 Target: ${targetList.length} font cask(s) (Total: ${totalFonts}, Done: ${existingCount}, Workers: ${concurrency})`);
  console.log(`📁 Thumbnails: ${THUMBNAILS_DIR}`);
  console.log(`📁 Previews:   ${PREVIEWS_DIR}`);
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
  console.log(`\n======================================================`);
  console.log(`🎉 Complete in ${durationSec}s: ${successful} generated, ${failed} failed.`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
