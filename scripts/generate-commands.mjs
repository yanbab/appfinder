#!/usr/bin/env node

/**
 * generate-commands.mjs
 *
 * Detects all Homebrew formulae that provide runnable user commands/executables,
 * extracts rich metadata (commands, primary command, description, version, homepage,
 * license, dependencies, category, install analytics), and generates data/commands.json.
 *
 * Usage:
 *   node scripts/generate-commands.mjs [--save] [--dry-run] [--lookup=<cmd>] [--limit=<N>] [--json]
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'data', 'commands.json');

const FORMULA_API_URL = 'https://formulae.brew.sh/api/formula.json';

// Classification rules for CLI commands into meaningful subcategories
const COMMAND_CATEGORIES = [
  {
    id: 'aiLlm',
    label: 'AI & LLMs',
    match: /\b(llm|gpt|claude|openai|anthropic|ollama|vllm|whisper|llama|langchain|transformer|embedding|vector|ai|copilot)\b/i,
  },
  {
    id: 'developerTools',
    label: 'Developer Tools',
    match: /\b(git|compiler|linter|formatter|debugger|ide|sdk|rust|golang|python|nodejs|deno|bun|ruby|java|clojure|haskell|zig|cmake|meson|ninja|build|test|profiler|decompiler|wasm)\b/i,
  },
  {
    id: 'cloudDevops',
    label: 'Cloud & DevOps',
    match: /\b(docker|kubernetes|k8s|helm|terraform|opentofu|ansible|vagrant|cloud|aws|gcp|azure|cloudflare|vault|consul|nomad|ci|cd|pipeline|iac)\b/i,
  },
  {
    id: 'networkingWeb',
    label: 'Networking & Web',
    match: /\b(curl|wget|http|proxy|ssh|ftp|dns|vpn|wireguard|tailscale|tcp|udp|socket|packet|wireshark|nmap|iperf|ping|traceroute|api|rest|graphql)\b/i,
  },
  {
    id: 'securityCrypto',
    label: 'Security & Crypto',
    match: /\b(crypto|encrypt|decrypt|ssl|tls|pgp|gpg|cert|key|password|hash|sha|aes|signature|auth|yubikey|audit|vulnerability|exploit|malware)\b/i,
  },
  {
    id: 'dataDatabases',
    label: 'Data & Databases',
    match: /\b(sql|sqlite|postgres|mysql|redis|mongodb|json|csv|yaml|toml|jq|parquet|avro|database|etl|analytics|query)\b/i,
  },
  {
    id: 'mediaGraphics',
    label: 'Media & Processing',
    match: /\b(image|video|audio|music|media|photo|ffmpeg|imagemagick|sound|codec|mp3|mp4|png|jpg|svg|font|render|convert|stream)\b/i,
  },
  {
    id: 'systemUtilities',
    label: 'System & Utilities',
    match: /\b(benchmark|monitor|process|terminal|shell|file|disk|archive|compress|zip|tar|backup|search|find|grep|diff|patch|sync|text|editor)\b/i,
  },
];

function classifyCommand(token, desc, executables) {
  const combined = `${token} ${desc || ''} ${executables.join(' ')}`;
  for (const cat of COMMAND_CATEGORIES) {
    if (cat.match.test(combined)) {
      return cat.id;
    }
  }
  return 'systemUtilities';
}

function determinePrimaryCommand(token, executables, aliases = []) {
  if (!executables || executables.length === 0) return token;

  // Exact match with formula name
  if (executables.includes(token)) return token;

  // Exact match with one of formula's aliases
  for (const alias of aliases) {
    if (executables.includes(alias)) return alias;
  }

  // Strip version suffix like @3, @3.11, etc. (e.g. "ffmpeg@7" -> "ffmpeg", "python@3.12" -> "python3")
  const unversioned = token.replace(/@\d+(\.\d+)*$/, '');
  if (executables.includes(unversioned)) return unversioned;

  // Strip common suffixes (e.g. "ai-cli" -> "ai", "ffmpeg-full" -> "ffmpeg")
  const stripped = unversioned.replace(/-(cli|tool|tools|bin|app|full|plus|latest|git|head)$/i, '');
  if (executables.includes(stripped)) return stripped;

  // Case-insensitive match
  const tokenLower = token.toLowerCase();
  const match = executables.find(
    (e) => e.toLowerCase() === tokenLower || e.toLowerCase() === unversioned.toLowerCase() || e.toLowerCase() === stripped.toLowerCase()
  );
  if (match) return match;

  // Return the first executable
  return executables[0];
}

/**
 * 1. Discover local Homebrew cache files (offline & instantaneous)
 */
function findLocalHomebrewCaches() {
  const home = os.homedir();
  const candidates = [
    path.join(home, 'Library/Caches/Homebrew/api/internal'),
    path.join(home, '.cache/Homebrew/api/internal'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

/**
 * Load formula packages payload from local Homebrew cache
 */
function loadLocalPackagesPayload(internalDir) {
  try {
    const files = fs.readdirSync(internalDir).filter((f) => f.startsWith('packages.') && f.endsWith('.payload'));
    if (files.length === 0) return null;

    const payloadPath = path.join(internalDir, files[0]);
    const content = fs.readFileSync(payloadPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('{"metadata":') || line.includes('"formulae":')) {
        const parsed = JSON.parse(line);
        if (parsed.formulae) {
          return parsed.formulae;
        }
      }
    }
  } catch (err) {
    console.warn(`[generate-commands] Could not read local packages payload: ${err.message}`);
  }
  return null;
}

/**
 * Load executables mapping from executables.txt
 */
function loadExecutablesTxt(internalDir) {
  const execTxtPath = path.join(internalDir, 'executables.txt');
  if (!fs.existsSync(execTxtPath)) return null;

  try {
    const content = fs.readFileSync(execTxtPath, 'utf8');
    const map = new Map();
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;
      const formula = trimmed.slice(0, colonIdx).trim();
      const exes = trimmed.slice(colonIdx + 1).trim().split(/\s+/).filter(Boolean);
      if (exes.length > 0) {
        map.set(formula, exes);
      }
    }
    return map;
  } catch (err) {
    console.warn(`[generate-commands] Could not parse executables.txt: ${err.message}`);
  }
  return null;
}

/**
 * Fetch online formula API catalog (optional, for analytics/install numbers)
 */
async function fetchOnlineFormulaCatalog() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(FORMULA_API_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AppFinder-Command-Discovery/1.0' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
}

export async function generateCommandsData(options = {}) {
  const { limit, lookup } = options;
  const internalDir = findLocalHomebrewCaches();

  let localFormulae = null;
  let localExecMap = null;

  if (internalDir) {
    localExecMap = loadExecutablesTxt(internalDir);
    localFormulae = loadLocalPackagesPayload(internalDir);
  }

  // Attempt to fetch online catalog for 30d install analytics if possible
  console.log('[generate-commands] Checking for formula analytics and definitions...');
  let onlineFormulae = null;
  try {
    onlineFormulae = await fetchOnlineFormulaCatalog();
    if (onlineFormulae) {
      console.log(`[generate-commands] Fetched online catalog (${onlineFormulae.length} formulae).`);
    }
  } catch {
    // Graceful offline fallback
  }

  // Build online lookup map by name
  const onlineMap = new Map();
  if (Array.isArray(onlineFormulae)) {
    for (const f of onlineFormulae) {
      onlineMap.set(f.name, f);
    }
  }

  const commandsList = [];
  const processedTokens = new Set();

  // Primary source: localFormulae or onlineMap
  if (localFormulae) {
    for (const [token, f] of Object.entries(localFormulae)) {
      const executables = Array.isArray(f.executables) && f.executables.length > 0
        ? f.executables
        : (localExecMap?.get(token) || []);

      if (executables.length === 0) {
        // This formula does not provide runnable user commands (e.g. pure C/C++ library)
        continue;
      }

      processedTokens.add(token);
      const online = onlineMap.get(token);
      const aliases = f.aliases || online?.aliases || [];
      const primaryCommand = determinePrimaryCommand(token, executables, aliases);
      const count = online?.analytics?.install?.['30d']?.[token] || 0;
      const deps = f.stable_dependencies
        ? f.stable_dependencies.map((d) => (typeof d === 'string' ? d : Object.keys(d)[0]))
        : (online?.dependencies || []);

      commandsList.push({
        token,
        name: token,
        desc: f.desc || online?.desc || '',
        homepage: f.homepage || online?.homepage || '',
        app: `command:${primaryCommand}`,
        version: f.stable_version || online?.versions?.stable || '',
        category: 'commands',
        secondCategory: classifyCommand(token, f.desc || online?.desc, executables),
        commands: executables,
        primaryCommand,
        aliases,
        license: typeof f.license === 'string' ? f.license : (online?.license || 'Other'),
        dependencies: deps,
        count,
        added: null,
      });
    }
  } else if (onlineMap.size > 0 && localExecMap) {
    // If local payload not available, combine executables.txt with online catalog
    for (const [token, executables] of localExecMap.entries()) {
      const online = onlineMap.get(token);
      const aliases = online?.aliases || [];
      const primaryCommand = determinePrimaryCommand(token, executables, aliases);
      const count = online?.analytics?.install?.['30d']?.[token] || 0;

      commandsList.push({
        token,
        name: token,
        desc: online?.desc || '',
        homepage: online?.homepage || '',
        app: `command:${primaryCommand}`,
        version: online?.versions?.stable || '',
        category: 'commands',
        secondCategory: classifyCommand(token, online?.desc, executables),
        commands: executables,
        primaryCommand,
        aliases,
        license: online?.license || 'Other',
        dependencies: online?.dependencies || [],
        count,
        added: null,
      });
    }
  }

  // Sort by popularity (count descending), then alphabetically
  commandsList.sort((a, b) => (b.count || 0) - (a.count || 0) || a.token.localeCompare(b.token));

  let results = commandsList;

  if (lookup) {
    const q = lookup.toLowerCase();
    results = results.filter(
      (c) =>
        c.token.toLowerCase() === q ||
        c.primaryCommand.toLowerCase() === q ||
        c.commands.some((cmd) => cmd.toLowerCase() === q)
    );
  }

  if (typeof limit === 'number' && limit > 0) {
    results = results.slice(0, limit);
  }

  return {
    totalFormulaeWithCommands: commandsList.length,
    totalExecutables: commandsList.reduce((acc, c) => acc + c.commands.length, 0),
    items: results,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const isDryRun = args.includes('--dry-run');
  const lookupArg = args.find((a) => a.startsWith('--lookup='));
  const lookup = lookupArg ? lookupArg.split('=')[1] : null;
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  const { totalFormulaeWithCommands, totalExecutables, items } = await generateCommandsData({ lookup, limit });

  if (isJson) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  console.log(`\n========================================================`);
  console.log(` 🚀 Homebrew Executable Commands Discovery`);
  console.log(`========================================================`);
  console.log(`  • Formulae providing user commands: ${totalFormulaeWithCommands.toLocaleString()}`);
  console.log(`  • Total runnable command binaries : ${totalExecutables.toLocaleString()}`);

  if (lookup) {
    console.log(`\n🔍 Lookup query: "${lookup}"`);
    console.log(`Found ${items.length} matching packages:`);
    for (const item of items) {
      console.log(`  • [${item.token}] -> Primary: "${item.primaryCommand}" | Binaries: ${item.commands.join(', ')}`);
      console.log(`    ${item.desc}`);
    }
    return;
  }

  // Print top popular command packages
  console.log(`\nTop 10 Most Popular Command Packages:`);
  console.log(`--------------------------------------------------------`);
  for (const item of items.slice(0, 10)) {
    const countStr = item.count ? ` (${item.count.toLocaleString()} installs/mo)` : '';
    console.log(`  • ${item.token.padEnd(20)} [${item.primaryCommand.padEnd(14)}] ${item.secondCategory.padEnd(18)}${countStr}`);
    if (item.desc) {
      console.log(`    ↳ ${item.desc.slice(0, 80)}${item.desc.length > 80 ? '...' : ''}`);
    }
  }

  if (!isDryRun) {
    console.log(`\n[generate-commands] Writing data to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2), 'utf8');
    const sizeMb = (fs.statSync(OUTPUT_FILE).size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Saved ${items.length} command packages to ${OUTPUT_FILE} (${sizeMb} MB)`);
  } else {
    console.log(`\n[generate-commands] Dry-run completed. (Did not write to disk)`);
  }
}

// Only execute directly when invoked via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`[generate-commands] Error:`, err);
    process.exit(1);
  });
}
