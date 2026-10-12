import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const initialsPalette = [
  '#4a82d2', // Soft Blue
  '#6860b8', // Soft Purple
  '#d65773', // Soft Rose
  '#d95b50', // Soft Coral / Red
  '#dc7c38', // Soft Amber / Orange
  '#2e9e8f', // Soft Teal
  '#3ca860', // Soft Green
  '#748294', // Slate
  '#111111',
  '#555555',
  '#888888',
];

export function getAppName(item: any): string {
  if (!item) return "";
  const name = item.name || item.token || "";
  if (item.token && item.token.includes("@")) {
    const version = item.token.split("@")[1];
    if (version && !name.toLowerCase().endsWith(`@${version.toLowerCase()}`)) {
      return `${name} @${version}`;
    }
  }
  return name;
}

export function name2initials(name: string): string {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0].replace(/[^a-zA-Z0-9]/g, '')[0] || words[0][0] || '';
    const second = words[1].replace(/[^a-zA-Z0-9]/g, '')[0] || words[1][0] || '';
    return (first + second).toUpperCase();
  }
  const clean = (words[0] || name.trim()).replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length <= 1) return clean.toUpperCase();
  return clean[0].toUpperCase() + clean[1].toLowerCase();
}

export function name2color(name: string): string {
  if (!name) return initialsPalette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % initialsPalette.length;
  return initialsPalette[index];
}

export function formatVersion(v: any): string {
  if (!v) return '?';
  const str = String(v).split(',')[0].trim();
  return str.split('-')[0].trim();
}

export function stripAnsi(str: string): string {
  if (!str) return '';
  return str
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

export function formatCountK(count: any): string {
  if (!count || isNaN(count)) return '0';
  const num = Number(count);
  if (num < 1000) return num.toLocaleString();
  if (num < 10000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')} K`;
  if (num < 1000000) return `${Math.round(num / 1000).toLocaleString()} K`;
  return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')} M`;
}

export function formatDate(dateVal: any, __?: (key: string) => string): string {
  if (!dateVal) return '—';
  try {
    let d: Date;
    let hasTime = true;
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
      const [y, m, day] = dateVal.trim().split('-').map(Number);
      d = new Date(y, m - 1, day);
      hasTime = false;
    } else {
      d = new Date(typeof dateVal === 'number' ? (dateVal > 1e11 ? dateVal : dateVal * 1000) : dateVal);
    }
    if (isNaN(d.getTime())) return String(dateVal);

    const now = new Date();
    const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
    const translate = typeof __ === 'function' ? __ : ((s: string) => s);

    if (isSameDay(d, now)) {
      return hasTime
        ? translate('Today at %s').replace('%s', d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))
        : translate('Today');
    }

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (isSameDay(d, yesterday)) {
      return hasTime
        ? translate('Yesterday at %s').replace('%s', d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))
        : translate('Yesterday');
    }

    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(dateVal);
  }
}

export function formatReason(reason: string, __?: (key: string) => string): string {
  if (!reason) return '';
  const translate = typeof __ === 'function' ? __ : ((s: string) => s);
  const map: Record<string, string> = {
    fails_gatekeeper_check: translate('Fails Gatekeeper check'),
    discontinued: translate('Discontinued'),
    no_longer_maintained: translate('No longer maintained'),
    unmaintained: translate('Unmaintained'),
    moved_to_mas: translate('Moved to Mac App Store'),
    unsigned: translate('Unsigned binary')
  };
  return map[reason] || reason.replace(/_/g, ' ');
}

export async function getIconDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

export function extractTaskError(
  logText: string,
  action?: string,
  appName: string = 'Task',
  catalog?: Record<string, string>,
  __?: (key: string) => string
): { title: string; details: string; isFullDiskAccess: boolean } {
  const translate = typeof __ === 'function' ? __ : ((s: string) => s);
  const actionKeys: Record<string, string> = {
    install: '%s installation failed',
    uninstall: '%s removal failed',
    cleanup: '%s cleanup failed',
    upgrade: '%s update failed'
  };

  const failedTitleKey = (action && actionKeys[action]) || '%s failed';
  const rawFailedTitle = translate(failedTitleKey) || failedTitleKey;
  const title = rawFailedTitle.includes('%s') ? rawFailedTitle.replace('%s', appName) : `${appName} failed`;

  const cleanLogs = stripAnsi(logText);

  const isFullDiskAccess = /Full Disk Access|Unable to remove some files/i.test(cleanLogs);
  if (isFullDiskAccess) {
    return {
      title: translate('Full Disk Access Required'),
      details: translate('Homebrew requires Full Disk Access to delete protected settings and files in ~/Library. You can grant Full Disk Access in System Settings, or delete the app without selecting "Delete settings and data".'),
      isFullDiskAccess: true
    };
  }

  const lines = cleanLogs.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const defaultError = translate('No error details recorded.');

  const errorLines = lines.filter(l => !l.startsWith('==>') && (
    /error/i.test(l) || /permission denied/i.test(l) || /operation not permitted/i.test(l) ||
    /access/i.test(l) || /sudo/i.test(l) || /failed/i.test(l)
  )).map(l => {
    return l.replace(/^(Error:\s*)([a-zA-Z0-9_-]+):\s*\2:\s*/i, '$1$2: ');
  });

  const uniqueErrorLines = errorLines.filter((line, index, self) => self.indexOf(line) === index);

  const nonProgressLines = lines.filter(l => !l.startsWith('==>'));
  let rawError = uniqueErrorLines.length > 0 ? uniqueErrorLines.slice(-3).join('\n')
    : nonProgressLines.length > 0 ? nonProgressLines[nonProgressLines.length - 1]
      : lines.length > 0 ? lines[lines.length - 1] : defaultError;

  let matchedKey: string | null = null;
  if (catalog) {
    for (const key of Object.keys(catalog)) {
      if (key && key.length > 5 && rawError.includes(key)) {
        matchedKey = key;
        break;
      }
    }
  }
  return { title, details: matchedKey ? translate(matchedKey) : translate(rawError), isFullDiskAccess: false };
}

const STATUS_KEYWORDS = ['Downloading', 'Downloaded', 'Verifying', 'Verified', 'Extracting'];

export function formatStatusBarMessage(rawLine: string): string | null {
  if (!rawLine || typeof rawLine !== 'string') return null;

  const clean = stripAnsi(rawLine).trim();
  if (!clean) return null;

  for (const kw of STATUS_KEYWORDS) {
    const idx = clean.indexOf(kw);
    if (idx !== -1) {
      const rest = clean.slice(idx).trim();
      return rest.replace(/\s{2,}/g, ' ');
    }
  }

  if (clean.startsWith('==>')) {
    const textAfter = clean.replace(/^==>\s*/, '').trim();
    return textAfter || null;
  }

  return null;
}

/**
 * Resolves font thumbnail or preview URL.
 * When in development mode (`import.meta.env.DEV`), replaces remote GitHub Pages URLs
 * for font thumbnails and font previews with local dev server URLs.
 */
export function resolveAssetUrl(url?: string | null, forceDev?: boolean): string | null {
  if (!url || typeof url !== 'string') return null;
  const isDev = forceDev !== undefined
    ? forceDev
    : Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);

  if (isDev) {
    if (url.includes('/font-previews/')) {
      const filename = url.split('/font-previews/').pop();
      return filename ? `/font-previews/${filename}` : url;
    }
    if (url.includes('/font-thumbnails/')) {
      const filename = url.split('/font-thumbnails/').pop();
      return filename ? `/font-thumbnails/${filename}` : url;
    }
  }
  return url;
}

/**
 * Extracts a favicon URL for a given homepage domain using Google's Favicon service.
 * Handles protocol prefixes, subdomains, and returns null for invalid or local addresses.
 */
export function getFaviconUrl(homepage?: string | null, size: number = 128): string | null {
  if (!homepage || typeof homepage !== 'string') return null;
  try {
    const raw = homepage.trim();
    if (!raw) return null;
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProto);
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`;
  } catch {
    return null;
  }
}

/**
 * Returns a script-accurate specimen character for font fallbacks.
 */
export function getFontSpecimenCharacter(
  item?: any
): string {
  if (!item) return 'Aa';
  const token = (item.token || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const c2 = (item.secondCategory || '').toLowerCase();
  const c3 = (item.thirdCategory || '').toLowerCase();
  const desc = (item.desc || '').toLowerCase();

  // 1. Emoji / Color fonts
  if (
    c2.includes('emoji') ||
    c3.includes('emoji') ||
    token.includes('emoji') ||
    name.includes('emoji') ||
    desc.includes('emoji') ||
    Boolean(item.isColorFont)
  ) {
    return '😀';
  }

  // 2. Hebrew
  if (c3.includes('hebrew') || token.includes('hebrew') || name.includes('hebrew')) {
    return 'אב';
  }

  // 3. Arabic
  if (c3.includes('arabic') || token.includes('arabic') || name.includes('arabic')) {
    return 'أب';
  }

  // 4. CJK (Chinese / Japanese / Korean)
  if (c3.includes('cjk') || token.includes('cjk') || name.includes('cjk') || token.includes('chinese') || name.includes('chinese')) {
    return '永';
  }
  if (c3.includes('japanese') || token.includes('japanese') || name.includes('japanese') || token.includes('kana')) {
    return 'あ';
  }
  if (c3.includes('korean') || token.includes('korean') || name.includes('korean') || token.includes('hangul')) {
    return '가';
  }

  // 5. Thai
  if (c3.includes('thai') || token.includes('thai') || name.includes('thai')) {
    return 'ก';
  }

  // 6. Devanagari / Indic
  if (c3.includes('devanagari') || token.includes('devanagari') || name.includes('devanagari')) {
    return 'अ';
  }
  if (c3.includes('bengali') || token.includes('bengali')) return 'অ';
  if (c3.includes('tamil') || token.includes('tamil')) return 'அ';
  if (c3.includes('telugu') || token.includes('telugu')) return 'అ';
  if (c3.includes('gujarati') || token.includes('gujarati')) return 'અ';
  if (c3.includes('kannada') || token.includes('kannada')) return 'ಅ';
  if (c3.includes('malayalam') || token.includes('malayalam')) return 'അ';

  // 7. Armenian / Georgian
  if (c3.includes('armenian') || token.includes('armenian')) return 'Աա';
  if (c3.includes('georgian') || token.includes('georgian')) return 'Ⴀა';

  // 8. Greek / Cyrillic
  if (c3.includes('greek') || token.includes('greek') || name.includes('greek')) return 'Αα';
  if (c3.includes('cyrillic') || token.includes('cyrillic') || name.includes('cyrillic')) return 'Аа';

  // 9. Symbols / Nerd Font
  if (c2.includes('symbols') || token.includes('nerd-font')) return '⌘';

  // Default: Latin
  return 'Aa';
}
