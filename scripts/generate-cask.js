#!/usr/bin/env node
//
// Homebrew Cask Generator & Validator for AppFinder
//

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const HEX_SHA256_REGEX = /^[a-f0-9]{64}$/i;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

/**
 * Computes sha256 checksum for a given file.
 * @param {string} filePath
 * @returns {string}
 */
function computeSha256(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Binary file not found for checksum calculation: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    throw new Error(`Binary file is empty (0 bytes): ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Generates the Homebrew Cask Ruby definition string for AppFinder.
 * @param {Object} options
 * @param {string} options.version - e.g. "0.9.6"
 * @param {string} options.armSha - 64-char sha256 hex string for Apple Silicon DMG
 * @param {string} options.intelSha - 64-char sha256 hex string for Intel DMG
 * @returns {string} Ruby code
 */
function generateCask({ version, armSha, intelSha }) {
  const v = String(version || '').trim().replace(/^v/, '');
  if (!SEMVER_REGEX.test(v)) {
    throw new Error(`Invalid version format: "${version}". Must be semantic version (e.g. 0.9.6).`);
  }

  const arm = String(armSha || '').trim().toLowerCase();
  const intel = String(intelSha || '').trim().toLowerCase();

  if (!HEX_SHA256_REGEX.test(arm)) {
    throw new Error(`Invalid ARM64 SHA256 checksum: "${armSha}". Must be a 64-character hex string.`);
  }

  if (!HEX_SHA256_REGEX.test(intel)) {
    throw new Error(`Invalid Intel SHA256 checksum: "${intelSha}". Must be a 64-character hex string.`);
  }

  const lines = [
    'cask "appfinder" do',
    '  arch arm: "arm64", intel: ""',
    '',
    `  version "${v}"`,
    `  sha256 arm:   "${arm}",`,
    `         intel: "${intel}"`,
    '',
    '  url "https://github.com/yanbab/appfinder/releases/download/v#{version}/AppFinder-#{version}#{arch.empty? ? "" : "-#{arch}"}.dmg"',
    '  name "AppFinder"',
    '  desc "App store for the Homebrew package manager"',
    '  homepage "https://github.com/yanbab/appfinder"',
    '',
    '  auto_updates true',
    '  depends_on macos: :ventura',
    '',
    '  app "AppFinder.app"',
    '',
    '  postflight_steps do',
    '    system_command "xattr",',
    '                   args: ["-cr", "#{appdir}/AppFinder.app"]',
    '  end',
    '',
    '  zap trash: [',
    '    "~/.config/appfinder",',
    '    "~/Library/Application Support/AppFinder",',
    '    "~/Library/Preferences/org.yanbab.appfinder.plist",',
    '    "~/Library/Saved Application State/org.yanbab.appfinder.savedState",',
    '  ]',
    'end',
    ''
  ];

  return lines.join('\n');
}

/**
 * Validates syntax of generated Ruby cask code.
 * Performs both structural checks and `ruby -c` check when available.
 * @param {string} rubyCode
 * @returns {{ valid: boolean, error?: string }}
 */
function validateCaskRuby(rubyCode) {
  if (typeof rubyCode !== 'string' || !rubyCode.trim()) {
    return { valid: false, error: 'Cask content is empty or not a string' };
  }

  // Structural sanity checks
  const requiredElements = [
    'cask "appfinder" do',
    'arch arm: "arm64", intel: ""',
    'version "',
    'sha256 arm:   "',
    'intel: "',
    'url "https://github.com/yanbab/appfinder/releases/download/v#{version}/AppFinder-#{version}#{arch.empty? ? "" : "-#{arch}"}.dmg"',
    'name "AppFinder"',
    'desc "App store for the Homebrew package manager"',
    'homepage "https://github.com/yanbab/appfinder"',
    'auto_updates true',
    'depends_on macos: :ventura',
    'app "AppFinder.app"',
    'postflight_steps do',
    'system_command "xattr"',
    'zap trash: [',
    'end'
  ];

  for (const elem of requiredElements) {
    if (!rubyCode.includes(elem)) {
      return { valid: false, error: `Missing required element in cask: ${elem}` };
    }
  }

  // Check quotes matching
  const doubleQuotesCount = (rubyCode.match(/"/g) || []).length;
  if (doubleQuotesCount % 2 !== 0) {
    return { valid: false, error: `Unmatched double quotes count (${doubleQuotesCount}) in cask Ruby code` };
  }

  // Check do ... end blocks
  const doCount = (rubyCode.match(/\bdo\b/g) || []).length;
  const endCount = (rubyCode.match(/\bend\b/g) || []).length;
  if (doCount !== endCount) {
    return { valid: false, error: `Mismatched 'do' (${doCount}) and 'end' (${endCount}) blocks` };
  }

  // If ruby binary is available, test with ruby -c
  try {
    const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cask-test-'));
    const tmpFile = path.join(tmpDir, 'appfinder.rb');
    fs.writeFileSync(tmpFile, rubyCode, 'utf8');
    try {
      execSync(`ruby -c "${tmpFile}"`, { stdio: 'pipe', encoding: 'utf8' });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    // If ruby execution failed due to syntax error
    if (err.status !== undefined && err.status !== 0) {
      return { valid: false, error: `Ruby syntax validation failed: ${err.stderr || err.message}` };
    }
  }

  return { valid: true };
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  let version = '';
  let armDmg = '';
  let intelDmg = '';
  let armSha = '';
  let intelSha = '';
  let outFile = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--version' && args[i + 1]) {
      version = args[++i];
    } else if (arg === '--arm-dmg' && args[i + 1]) {
      armDmg = args[++i];
    } else if (arg === '--intel-dmg' && args[i + 1]) {
      intelDmg = args[++i];
    } else if (arg === '--arm-sha' && args[i + 1]) {
      armSha = args[++i];
    } else if (arg === '--intel-sha' && args[i + 1]) {
      intelSha = args[++i];
    } else if (arg === '--out' && args[i + 1]) {
      outFile = args[++i];
    }
  }

  if (armDmg) {
    armSha = computeSha256(armDmg);
  }
  if (intelDmg) {
    intelSha = computeSha256(intelDmg);
  }

  try {
    const caskContent = generateCask({ version, armSha, intelSha });
    const validation = validateCaskRuby(caskContent);
    if (!validation.valid) {
      console.error(`❌ Generated Cask failed syntax validation:`, validation.error);
      process.exit(1);
    }

    if (outFile) {
      const dir = path.dirname(outFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outFile, caskContent, 'utf8');
      console.log(`✅ Cask successfully generated and verified at: ${outFile}`);
    } else {
      process.stdout.write(caskContent);
    }
  } catch (err) {
    console.error(`❌ Failed to generate Homebrew cask:`, err.message);
    process.exit(1);
  }
}

module.exports = {
  generateCask,
  validateCaskRuby,
  computeSha256
};
