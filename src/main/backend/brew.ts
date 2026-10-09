import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as taskRunner from './task-runner';
import { fetchCatalog } from './fetcher';
import { CONFIG_DIR, CACHE_DIR, DATA_DIR } from '../path';
import type { CaskItem, CategoryItem } from '../../types/cask';

const execFileAsync = promisify(execFile);

// Cache definitions
const memoryCache = new Map<string, any>();
const caskInfoCache = new Map<string, any>();
const activeFetches = new Map<string, AbortController>();
const UPDATES_CACHE_FILE = path.join(CONFIG_DIR, 'updates.json');
const UPDATES_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const CODE_NAMES: Record<string, string> = {
  high_sierra: '10.13', mojave: '10.14', catalina: '10.15',
  big_sur: '11', monterey: '12', ventura: '13', sonoma: '14', sequoia: '15', tahoe: '16'
};

export interface SystemInfo {
  platform: string;
  arch: string;
  systemVersion: string;
}

export function getSystemInfo(): SystemInfo {
  let sysVer = '';
  try {
    sysVer = typeof (process as any).getSystemVersion === 'function' ? (process as any).getSystemVersion() : '';
    if (!sysVer && process.platform === 'darwin') {
      const dMajor = parseInt(os.release().split('.')[0], 10);
      sysVer = dMajor >= 20 ? String(dMajor - 9) : (dMajor >= 5 ? `10.${dMajor - 4}` : '15');
    }
  } catch (_) { }
  return {
    platform: process.platform,
    arch: process.arch || 'arm64',
    systemVersion: sysVer || '15'
  };
}

export function parseVer(v: string): number[] {
  const s = String(v || '').replace(/^[:]/, '').toLowerCase().trim();
  const resolved = CODE_NAMES[s] || s;
  return String(resolved).split('.').map(n => parseInt(n, 10) || 0);
}

export function compareVer(v1: string, v2: string): number {
  const [a1, b1 = 0] = parseVer(v1);
  const [a2, b2 = 0] = parseVer(v2);
  return a1 !== a2 ? a1 - a2 : b1 - b2;
}

export function getCaskRequirements(cask: any): string | null {
  const macos = cask?.depends_on?.macos;
  if (!macos) return null;
  if (typeof macos === 'string') return `macOS ${macos}`;
  if (Array.isArray(macos)) return `macOS ${macos.join(', ')}`;
  if (typeof macos === 'object') {
    const text = Object.entries(macos)
      .map(([op, val]) => `${op === '>=' ? '' : op + ' '}${Array.isArray(val) ? val.join(', ') : val}${op === '>=' ? '+' : ''}`)
      .join(', ');
    return text ? `macOS ${text}` : 'macOS';
  }
  return 'macOS';
}

export function isRequirementMet(cask: any, sysInfo?: SystemInfo | string): boolean {
  const info = typeof sysInfo === 'string' ? { systemVersion: sysInfo, platform: 'darwin', arch: 'arm64' } : (sysInfo || getSystemInfo());
  if ((info.platform || 'darwin') !== 'darwin') return false;
  const macos = cask?.depends_on?.macos;
  if (!macos || !info.systemVersion) return true;

  const pairs = typeof macos === 'object' && !Array.isArray(macos)
    ? Object.entries(macos).flatMap(([op, val]) => (Array.isArray(val) ? val : [val]).map(v => [op, v]))
    : (Array.isArray(macos) ? macos : [macos]).map(req => {
      const m = String(req).match(/^(>=|<=|>|<|==|=)?\s*(.*)$/);
      return [m?.[1] || '>=', m?.[2] || ''];
    });

  return pairs.every(([op, target]) => {
    const diff = compareVer(info.systemVersion, target);
    if (op === '>=' || op === '>= ') return diff >= 0;
    if (op === '<=' || op === '<= ') return diff <= 0;
    if (op === '>') return diff > 0;
    if (op === '<') return diff < 0;
    if (op === '==' || op === '=') return diff === 0;
    return true;
  });
}

export function getCaskArchCompatibility(cask: any, sysInfo?: SystemInfo | string): {
  requiredArch: string | null;
  isSupported: boolean;
  status: string;
  label: string;
} {
  const info = typeof sysInfo === 'string' ? { arch: sysInfo, platform: 'darwin', systemVersion: '15' } : (sysInfo || getSystemInfo());
  const currentArch = info.arch === 'x64' ? 'x64' : 'arm64';
  const archField = JSON.stringify(cask?.depends_on?.arch || '').toLowerCase();

  let requiredArch: string | null = null;
  if (archField.includes('arm')) requiredArch = 'arm64';
  else if (archField.includes('intel') || archField.includes('x86_64') || archField.includes('x64')) requiredArch = 'x64';

  const rosetta = Boolean(cask?.caveats_rosetta) || /rosetta\s*2/i.test(cask?.caveats || '');

  if (requiredArch === 'arm64') {
    return currentArch === 'arm64'
      ? { requiredArch: 'arm64', isSupported: true, status: 'native', label: 'Apple Silicon' }
      : { requiredArch: 'arm64', isSupported: false, status: 'incompatible', label: 'Apple Silicon only' };
  }
  if (requiredArch === 'x64' || rosetta) {
    return currentArch === 'x64'
      ? { requiredArch: 'x64', isSupported: true, status: 'native', label: 'Intel 64-bit' }
      : { requiredArch: 'x64', isSupported: true, status: 'rosetta', label: 'Intel (Rosetta 2)' };
  }
  return { requiredArch: null, isSupported: true, status: 'universal', label: 'Universal' };
}

export function getCaskDependencies(cask: any): { casks: string[]; formulae: string[] } {
  const toArr = (v: any) => Array.isArray(v) ? v : (v ? [v] : []);
  return {
    casks: toArr(cask?.depends_on?.cask),
    formulae: toArr(cask?.depends_on?.formula)
  };
}

export function getCaskStatus(cask: any): {
  isDisabled: boolean;
  disableReason: string | null;
  disableReplacement: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
  deprecationReplacement: string | null;
} {
  return {
    isDisabled: Boolean(cask?.disabled),
    disableReason: cask?.disable_reason || cask?.disable_args?.because || null,
    disableReplacement: cask?.disable_replacement_cask || cask?.disable_args?.replacement_cask || null,
    isDeprecated: Boolean(cask?.deprecated),
    deprecationReason: cask?.deprecation_reason || cask?.deprecate_args?.because || null,
    deprecationReplacement: cask?.deprecation_replacement_cask || cask?.deprecate_args?.replacement_cask || null
  };
}

export function normalizeCaskInfo(cask: any, sysInfo?: SystemInfo): any {
  if (!cask) return null;
  const info = sysInfo || getSystemInfo();
  return {
    ...cask,
    reqText: getCaskRequirements(cask),
    reqMet: isRequirementMet(cask, info),
    archCompat: getCaskArchCompatibility(cask, info),
    dependencies: getCaskDependencies(cask),
    status: getCaskStatus(cask)
  };
}

export function getBrewPath(): string {
  const brewPaths = [
    '/opt/homebrew/bin/brew',
    '/usr/local/bin/brew',
    '/usr/bin/brew',
    '/bin/brew'
  ];
  return brewPaths.find(p => fs.existsSync(p)) || 'brew';
}

export function getEnvWithBrew(): NodeJS.ProcessEnv {
  const defaultPath = '/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
  return {
    ...process.env,
    PATH: process.env.PATH ? `${process.env.PATH}:${defaultPath}` : defaultPath,
    HOMEBREW_NO_AUTO_UPDATE: '1'
  };
}

export async function runBrew(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(getBrewPath(), args, {
      env: getEnvWithBrew(),
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout as string;
  } catch (error) {
    console.error(`Brew command failed: brew ${args.join(' ')}`, error);
    return null;
  }
}

function readJsonSafely(filePath: string): any {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  if (stat.size === 0) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function getData(file: string, forceReload: boolean = false): any {
  if (!forceReload && memoryCache.has(file)) return memoryCache.get(file);

  const cachedFile = path.join(CACHE_DIR, file);
  const bundledFile = path.join(DATA_DIR, file);

  // 1. Try reading from user cache (~/.cache/appfinder)
  if (fs.existsSync(cachedFile)) {
    try {
      const data = readJsonSafely(cachedFile);
      if (Array.isArray(data) && data.length > 0) {
        memoryCache.set(file, data);
        return data;
      }
    } catch (err: any) {
      console.warn(`[BREW] Corrupted cache file detected at "${cachedFile}": ${err.message}. Removing corrupted cache file.`);
      try {
        fs.unlinkSync(cachedFile);
      } catch (_) { }
    }
  }

  // 2. Fallback to bundled data file
  try {
    const bundledData = readJsonSafely(bundledFile);
    if (bundledData) {
      memoryCache.set(file, bundledData);
      return bundledData;
    }
  } catch (err: any) {
    console.error(`[BREW] Failed to read bundled data file "${bundledFile}":`, err.message);
  }

  return [];
}

export function getApps(forceReload: boolean = false): CaskItem[] {
  const casks = getData('apps.json', forceReload) || [];
  const services = getData('services.json', forceReload) || [];
  if (Array.isArray(services) && services.length > 0) {
    return [...casks, ...services];
  }
  return casks;
}

export function getCategories(forceReload: boolean = false): CategoryItem[] {
  const cats: CategoryItem[] = getData('categories.json', forceReload) || [];
  if (!cats.some((c) => c.name === 'services')) {
    return [
      ...cats,
      {
        name: 'services',
        displayName: 'Services',
        symbolName: 'server.rack',
      },
    ];
  }
  return cats;
}

export async function getInstalled(onLog?: (msg: string) => void): Promise<{ tokens: string[]; versions: Record<string, string> }> {
  try {
    onLog?.('Checking installed packages...');
    const [caskStdout, formulaStdout] = await Promise.all([
      runBrew(['list', '--cask', '--versions']).catch(() => ''),
      runBrew(['list', '--formula', '--versions']).catch(() => ''),
    ]);

    const tokens: string[] = [];
    const versions: Record<string, string> = {};

    const parseLines = (text: string) => {
      if (!text) return;
      for (const line of text.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts[0]) {
          tokens.push(parts[0]);
          if (parts.length > 1) {
            versions[parts[0]] = parts.slice(1).join(' ');
          }
        }
      }
    };

    if (caskStdout) parseLines(caskStdout);
    if (formulaStdout) parseLines(formulaStdout);

    return { tokens, versions };
  } catch (e) {
    console.error('Error fetching installed packages:', e);
    return { tokens: [], versions: {} };
  }
}

export async function getUpdates(force: boolean = false): Promise<{ casks: any[]; formulae?: any[] }> {
  if (!force) {
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
    } catch (_) { }
  }

  let casks: any[] = [];
  let formulae: any[] = [];
  try {
    const stdout = await runBrew(['outdated', '--json=v2']);
    if (stdout) {
      const parsed = JSON.parse(stdout);
      casks = parsed.casks || [];
      formulae = parsed.formulae || [];
    }
  } catch (e) {
    console.error('Error fetching outdated packages:', e);
  }

  const fresh = { casks, formulae };
  memoryCache.set('updates', { data: fresh, timestamp: Date.now() });
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(UPDATES_CACHE_FILE, JSON.stringify(fresh));
  } catch (_) { }

  return fresh;
}

export async function getInfo(tokenOrCask: any, sysInfo?: SystemInfo): Promise<any> {
  if (!tokenOrCask) return null;
  const info = sysInfo || getSystemInfo();

  if (typeof tokenOrCask === 'object') {
    return normalizeCaskInfo(tokenOrCask, info);
  }

  if (typeof tokenOrCask !== 'string') return null;
  const token = tokenOrCask.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!token) return null;

  let cask = caskInfoCache.get(token);
  if (!cask) {
    try {
      const stdout = await runBrew(['info', '--json=v2', token]);
      if (stdout) {
        const data = JSON.parse(stdout);
        const raw = (data.casks && data.casks[0]) || (data.formulae && data.formulae[0]) || null;
        if (raw) {
          cask = normalizeCaskInfo(raw, info);
          caskInfoCache.set(token, cask);
        }
      }
    } catch (e) {
      console.error(`Error fetching package info for ${token}:`, e);
    }
  }
  return cask || null;
}

export async function getServicesStatus(): Promise<Record<string, { status: string; pid?: number; user?: string }>> {
  try {
    const stdout = await runBrew(['services', 'list', '--json']);
    if (!stdout) return {};
    const parsed = JSON.parse(stdout);
    const result: Record<string, { status: string; pid?: number; user?: string }> = {};
    if (Array.isArray(parsed)) {
      for (const s of parsed) {
        if (s.name) {
          result[s.name] = {
            status: s.status || 'unknown',
            pid: s.pid || undefined,
            user: s.user || undefined,
          };
        }
      }
    }
    return result;
  } catch (err: any) {
    return {};
  }
}

export async function isServiceRunning(serviceName: string): Promise<boolean> {
  try {
    const statuses = await getServicesStatus();
    return statuses[serviceName]?.status === 'started';
  } catch {
    return false;
  }
}

async function openFontInFontBook(fontNameOrPath: string, token?: string): Promise<void> {
  // Derive clean font family name for Font Book search
  let searchName = '';
  if (fontNameOrPath && !fontNameOrPath.startsWith('/') && !fontNameOrPath.includes('.')) {
    searchName = fontNameOrPath.replace(/\s*\([^)]*\)/g, '').trim();
  } else if (fontNameOrPath && (fontNameOrPath.startsWith('/') || fontNameOrPath.includes('.'))) {
    const base = path.basename(fontNameOrPath).replace(/\.[^.]+$/, '');
    searchName = base
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b(Regular|Bold|Italic|Light|Medium|Semibold|Black|Propo|Mono|NerdFont)\b/gi, '')
      .trim();
  }

  if (!searchName && token) {
    searchName = token.replace(/^font-/, '').replace(/[-_]/g, ' ').trim();
  }

  if (searchName) {
    const escaped = searchName.replace(/["\\]/g, '\\$&');
    const appleScript = [
      'tell application "Font Book"',
      '  activate',
      'end tell',
      'tell application "System Events"',
      '  tell process "Font Book"',
      '    set frontmost to true',
      '    delay 0.15',
      '    keystroke "f" using {command down}',
      '    delay 0.05',
      `    keystroke "${escaped}"`,
      '    key code 36',
      '  end tell',
      'end tell'
    ].join('\n');

    try {
      console.log(`[LAUNCH COMMAND]: osascript -e 'tell application "Font Book" to search "${searchName}"'`);
      await execFileAsync('/usr/bin/osascript', ['-e', appleScript]);
      return;
    } catch (err: any) {
      console.warn(`[LAUNCH FONT BOOK]: AppleScript UI search failed (${err.message}), falling back to open -a 'Font Book'`);
    }
  }

  console.log("[LAUNCH COMMAND]: /usr/bin/open -a 'Font Book'");
  await execFileAsync('/usr/bin/open', ['-a', 'Font Book']);
}

export async function reveal(appName: string, token?: string): Promise<{ success: boolean; error?: string }> {
  try {
    let target = (appName || '').trim();
    const tokenStr = (token || '').trim();
    if (target.startsWith('~')) {
      target = path.join(os.homedir(), target.slice(1));
    }
    if (target.startsWith('/') && fs.existsSync(target)) {
      await execFileAsync('/usr/bin/open', ['-R', target]);
      return { success: true };
    }
    const caskInfo = await getInfo(tokenStr || target);
    const installedPath = caskInfo?.installedPath || caskInfo?.fontInfo?.installedPath;
    if (installedPath && fs.existsSync(installedPath)) {
      await execFileAsync('/usr/bin/open', ['-R', installedPath]);
      return { success: true };
    }
    const appCandidates = [
      `/Applications/${target}.app`,
      `/Applications/${tokenStr}.app`,
      path.join(os.homedir(), `Applications/${target}.app`),
      path.join(os.homedir(), `Applications/${tokenStr}.app`),
    ];
    for (const p of appCandidates) {
      if (fs.existsSync(p)) {
        await execFileAsync('/usr/bin/open', ['-R', p]);
        return { success: true };
      }
    }
    return { success: false, error: 'Item not found' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function launch(appName: string, token?: string): Promise<{ success: boolean; error?: string }> {
  try {
    let target = (appName || '').trim();
    const tokenStr = (token || '').trim();

    // 1. Service start/stop toggle
    if (target.startsWith('service:') || tokenStr.startsWith('service:')) {
      const serviceName = (target.startsWith('service:') ? target : tokenStr).replace(/^service:/, '');
      const running = await isServiceRunning(serviceName);
      const action = running ? 'stop' : 'start';
      console.log(`[LAUNCH COMMAND]: brew services ${action} ${serviceName}`);
      await runBrew(['services', action, serviceName]);
      return { success: true };
    }

    // Expand ~
    if (target.startsWith('~')) {
      target = path.join(os.homedir(), target.slice(1));
    }

    // 2. Fonts: open Font Book with font selected
    const isFont = Boolean(
      tokenStr.startsWith('font-') ||
      /\.(ttf|otf|ttc|otc|dfont)$/i.test(target) ||
      target.includes('/Library/Fonts/')
    );

    if (isFont) {
      await openFontInFontBook(appName || target, tokenStr);
      return { success: true };
    }

    // 3. Absolute path / file target
    if (target.startsWith('/') && fs.existsSync(target)) {
      console.log('[LAUNCH COMMAND]: /usr/bin/open ' + (target.includes(' ') ? `"${target}"` : target));
      await execFileAsync('/usr/bin/open', [target]);
    } else {
      // 4. App by name
      const appToOpen = target || tokenStr;
      console.log('[LAUNCH COMMAND]: /usr/bin/open -a ' + (appToOpen.includes(' ') ? `"${appToOpen}"` : appToOpen));
      await execFileAsync('/usr/bin/open', ['-a', appToOpen]);
    }
    return { success: true };
  } catch (err: any) {
    console.error(`Failed to launch app "${appName}":`, err.message);
    return { success: false, error: err.message };
  }
}

const ACTION_ARGS: Record<string, (t: string, zap?: boolean) => { command: string; args: string[]; cwd?: string }> = {
  install: (t) => ({
    command: getBrewPath(),
    args: ['install', t]
  }),
  upgrade: (t) => ({
    command: getBrewPath(),
    args: ['upgrade', t]
  }),
  uninstall: (t, zap) => ({
    command: getBrewPath(),
    args: zap ? ['uninstall', '--zap', t] : ['uninstall', t]
  }),
  refresh: () => ({ command: getBrewPath(), args: ['update'] }),
  cleanup: () => ({ command: getBrewPath(), args: ['cleanup', '--prune=all'] })
};

export function runAction(data: any, callbacks: any = {}): void {
  const cbs = typeof callbacks === 'function' ? { onComplete: callbacks } : (callbacks || {});
  const { onLog, onComplete, onPrompt, onRefreshUpdates, onRefreshData } = cbs;
  const { taskId, action, token, zap } = data || {};

  // Native catalog fetch without shell subprocesses
  if (action === 'fetch') {
    const controller = new AbortController();
    activeFetches.set(taskId, controller);

    fetchCatalog({
      onLog: (text) => onLog?.({ taskId, type: 'stdout', text, line: text, raw: text, plainText: text }),
      signal: controller.signal
    }).then(() => {
      activeFetches.delete(taskId);
      memoryCache.delete('apps.json');
      memoryCache.delete('categories.json');
      if (typeof onRefreshData === 'function') {
        onRefreshData().catch(() => { });
      }
      onComplete?.({ taskId, code: 0, error: null, cancelled: false });
    }).catch((err) => {
      activeFetches.delete(taskId);
      const isCancelled = controller.signal.aborted;
      onComplete?.({ taskId, code: isCancelled ? 130 : 1, error: err.message, cancelled: isCancelled });
    });
    return;
  }

  if (['install', 'upgrade', 'uninstall'].includes(action)) {
    if (!token || typeof token !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_\-\.\@\/]*$/.test(token)) {
      onComplete?.({ taskId, code: 1, error: 'Invalid cask token format' });
      return;
    }
  }

  const getArgs = ACTION_ARGS[action];
  const config = getArgs ? getArgs(token, zap) : null;
  if (!config) {
    onComplete?.({ taskId, code: 1, error: 'Invalid action' });
    return;
  }

  taskRunner.runTask(
    {
      taskId,
      command: config.command,
      args: config.args,
      cwd: config.cwd,
      env: getEnvWithBrew()
    },
    {
      onLog,
      onPrompt,
      onComplete: ({ taskId: tid, code, error, cancelled }) => {
        if (code === 0) {
          if (action === 'refresh') {
            if (typeof onRefreshUpdates === 'function') {
              onRefreshUpdates().catch(() => { });
            } else {
              getUpdates(true).catch(() => { });
            }
          }
        }
        onComplete?.({ taskId: tid, code, error, cancelled });
      }
    }
  );
}

export function cancelAction(taskId: string, onComplete?: (res: any) => void): void {
  if (activeFetches.has(taskId)) {
    const controller = activeFetches.get(taskId);
    controller?.abort();
    activeFetches.delete(taskId);
    onComplete?.({ taskId, code: -1, cancelled: true });
    return;
  }
  taskRunner.cancelTask(taskId, onComplete);
}

export function writePtyInput(taskId: string, text: string): void {
  taskRunner.writeTaskInput(taskId, text);
}


