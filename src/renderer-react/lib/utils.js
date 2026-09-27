import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
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

export function getAppName(item) {
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

export function name2initials(name) {
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

export function name2color(name) {
  if (!name) return initialsPalette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % initialsPalette.length;
  return initialsPalette[index];
}

export function formatVersion(v) {
  if (!v) return '?';
  v = String(v).split(',')[0].trim();
  return v.split('-')[0].trim();
}

export function stripAnsi(str) {
  if (!str) return '';
  return str
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

export function formatCountK(count) {
  if (!count || isNaN(count)) return '0';
  const num = Number(count);
  if (num < 1000) return num.toLocaleString();
  if (num < 10000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (num < 1000000) return `${Math.round(num / 1000).toLocaleString()}k`;
  return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function formatDate(dateVal) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const now = new Date();
    const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();
    if (isSameDay(d, now)) return 'Today';
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (isSameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(dateVal);
  }
}

export function getCaskRequirements(appDetails) {
  const macos = appDetails?.depends_on?.macos;
  if (!macos) return null;
  if (typeof macos === 'string') return `macOS ${macos}`;
  if (Array.isArray(macos)) return `macOS ${macos.join(', ')}`;
  if (typeof macos === 'object') {
    const entries = Object.entries(macos);
    if (entries.length === 0) return 'macOS';
    const text = entries
      .map(([op, val]) => {
        const v = Array.isArray(val) ? val.join(', ') : val;
        if (op === '>=' || op === '>= ') return `${v}+`;
        if (op === '<=' || op === '<= ') return `≤ ${v}`;
        if (op === '==' || op === '=') return v;
        return `${op} ${v}`;
      })
      .join(', ');
    return `macOS ${text}`;
  }
  return 'macOS';
}

export function isRequirementMet(appDetails) {
  const macos = appDetails?.depends_on?.macos;
  if (macos === undefined || macos === null) {
    return (window.ipc?.platform || 'darwin') === 'darwin';
  }
  if ((window.ipc?.platform || 'darwin') !== 'darwin') return false;

  const sysVer = window.ipc?.systemVersion;
  if (!sysVer) return true;

  const codeNames = {
    high_sierra: '10.13', mojave: '10.14', catalina: '10.15',
    big_sur: '11', monterey: '12', ventura: '13', sonoma: '14', sequoia: '15', tahoe: '16'
  };

  const parseVer = (v) => {
    if (!v) return [0];
    const clean = String(v).replace(/^[:]/, '').toLowerCase().trim();
    return (codeNames[clean] || clean).split('.').map((n) => parseInt(n, 10) || 0);
  };

  const compareVer = (v1, v2) => {
    const p1 = parseVer(v1), p2 = parseVer(v2);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const a = p1[i] || 0, b = p2[i] || 0;
      if (a !== b) return a > b ? 1 : -1;
    }
    return 0;
  };

  const sysMajor = parseVer(sysVer)[0];
  const rules = [];

  if (typeof macos === 'object' && !Array.isArray(macos)) {
    for (const [op, targets] of Object.entries(macos)) {
      for (const t of (Array.isArray(targets) ? targets : [targets])) {
        rules.push([op, t]);
      }
    }
  } else {
    for (const req of (Array.isArray(macos) ? macos : [macos])) {
      if (typeof req !== 'string') continue;
      const match = req.match(/^(>=|<=|>|<|==|=)?\s*(.*)$/);
      if (match && match[2]) rules.push([match[1] || '>=', match[2]]);
    }
  }

  for (const [op, target] of rules) {
    if (op === '>=' && compareVer(sysVer, target) < 0) return false;
    if (op === '>' && compareVer(sysVer, target) <= 0) return false;
    if (op === '<=' && compareVer(sysVer, target) > 0) return false;
    if (op === '<' && compareVer(sysVer, target) >= 0) return false;
    if (op === '==' || op === '=') {
      const tParts = parseVer(target);
      if (tParts.length === 1 ? sysMajor !== tParts[0] : compareVer(sysVer, target) !== 0) return false;
    }
  }
  return true;
}

export function detectPrompt(text) {
  const clean = stripAnsi(text);
  const isRetry = /sorry, try again|incorrect password|authentication failure/i.test(clean);
  const isPasswordPrompt = /password\s*[:?]|passphrase\s*[:?]|mot de passe\s*[:?]|(?:sudo|admin).*(?:password|passphrase)/i.test(clean);
  const isInteractivePrompt = isPasswordPrompt || /\[y\/n\]/i.test(clean);
  return { isRetry, isPasswordPrompt, isInteractivePrompt };
}

export function extractProgress(text) {
  if (!text) return null;
  const cleanText = stripAnsi(text);
  const isExtractingContext = /extracting/i.test(cleanText);
  const rawLines = cleanText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

  for (let i = rawLines.length - 1; i >= 0; i--) {
    const line = rawLines[i];

    // 0. Ignore past-tense / summary lines like "Already downloaded", "Downloaded to: ...", "✔︎ Cask ... Downloaded ..."
    if (/(?:already\s+)?downloaded/i.test(line) || /[✔✓]/.test(line)) {
      continue;
    }

    // 1. Extracting cask / artifact / archive / sizes
    if (/extracting/i.test(line) || (isExtractingContext && /\d+(?:\.\d+)?\s*(?:[KMGT]?B|bytes?)/i.test(line))) {
      const sizeMatch = line.match(/(\d+(?:\.\d+)?\s*(?:[KMGT]?B|bytes?))/i);
      if (sizeMatch) {
        return { message: `Extracting ${sizeMatch[1]}`, percent: null };
      }
      const match = line.match(/^(?:==>\s*)?Extracting(?:\s+cask|\s+artifact)?:\s*(.*)/i);
      const item = match && match[1] ? match[1].split(/[/\\]/).pop().trim() : '';
      return { message: item ? `Extracting ${item}` : 'Extracting...', percent: null };
    }

    // 2. Download progress with bytes / percentage: e.g. "12.5MB / 50.0MB", "34.2%"
    const percentMatch = line.match(/(?:#+\s*)?(\d{1,3}(?:\.\d+)?%)/);
    const byteRangeMatch = line.match(/(\d+(?:\.\d+)?\s*(?:[KMGT]?B|bytes?))\s*(?:\/|of)\s*(\d+(?:\.\d+)?\s*(?:[KMGT]?B|bytes?))/i);
    if (byteRangeMatch || percentMatch) {
      const parts = [];
      let percentVal = null;
      if (byteRangeMatch) {
        const current = byteRangeMatch[1].replace(/\s+/g, '').toLowerCase();
        const total = byteRangeMatch[2].replace(/\s+/g, '').toLowerCase();
        if (current === total) {
          parts.push(byteRangeMatch[2]);
        } else {
          parts.push(`${byteRangeMatch[1]} / ${byteRangeMatch[2]}`);
        }
      }
      if (percentMatch) {
        parts.push(percentMatch[1]);
        percentVal = parseFloat(percentMatch[1]);
      }
      return { message: `Downloading: ${parts.join(' ')}`, percent: percentVal };
    }

    // 3. Direct downloading URL / source
    if (/^==>\s*Downloading\s+(https?:\/\/|from)/i.test(line) || /^Downloading\s+(https?:\/\/|from)/i.test(line)) {
      return { message: 'Downloading...', percent: null };
    }

    // 4. Verifying checksum
    if (/verifying.*checksum/i.test(line)) {
      return { message: 'Verifying checksum...', percent: null };
    }

    // 5. Moving App / Linking / Backing up
    const moveMatch = line.match(/Moving App '([^']+)'/i) || line.match(/Moving (?:Binary|Artifact) '([^']+)'/i);
    if (moveMatch) {
      return { message: `Installing ${moveMatch[1]}`, percent: null };
    }
    if (/Linking (?:Binary|Artifact)/i.test(line)) {
      return { message: 'Linking binaries...', percent: null };
    }
    if (/Backing App/i.test(line)) {
      return { message: 'Backing up app...', percent: null };
    }

    // 6. Running installer / sudo
    if (/Running.*installer/i.test(line)) {
      return { message: 'Running installer...', percent: null };
    }

    // 7. General ==> brew messages (strip ==> prefix)
    if (line.startsWith('==>')) {
      const clean = line.replace(/^==>\s*/, '').replace(/^==\s*/, '').trim();
      if (clean && clean.length > 2 && !clean.startsWith('Caveats')) {
        return { message: clean, percent: null };
      }
    }

    // 8. Action verbs
    if (/^(Downloading|Extracting|Installing|Updating|Pouring|Fetching|Upgrading|Running|Executing|Cleaning|Purging)\b/i.test(line)) {
      const clean = line.replace(/^==>\s*/, '').trim();
      if (clean && clean.length > 2) {
        return { message: clean, percent: null };
      }
    }
  }
  return null;
}

