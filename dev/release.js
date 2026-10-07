#!/usr/bin/env node
//
// Release Manager
//
// Automates releases: bumps version in package.json, updates CHANGELOG.md,
// creates git commit/tag, and triggers GitHub release workflow.
//
// Usage:
//   npm run release               # Bumps patch (e.g. 0.9.3 -> 0.9.4)
//   npm run release minor         # Bumps minor (e.g. 0.9.3 -> 0.10.0)
//   npm run release major         # Bumps major (e.g. 0.9.3 -> 1.0.0)
//   npm run release 0.9.5         # Specific version
//   npm run release patch "Notes" # With custom release notes

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rootDir = path.resolve(__dirname, '../..');
const pkgPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

function run(cmd, options = {}) {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf8', stdio: options.silent ? 'pipe' : 'inherit', ...options });
}

function runOutput(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function bumpVersion(current, type) {
  const parts = current.split('.').map(n => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver version in package.json: ${current}`);
  }

  if (type === 'major') {
    return `${parts[0] + 1}.0.0`;
  } else if (type === 'minor') {
    return `${parts[0]}.${parts[1] + 1}.0`;
  } else if (type === 'patch' || !type) {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  } else if (/^\d+\.\d+\.\d+$/.test(type)) {
    return type;
  } else {
    throw new Error(`Unknown release bump type: "${type}". Use patch, minor, major, or explicit X.Y.Z version.`);
  }
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const bumpType = args[0] || 'patch';
  let message = args.slice(1).join(' ').trim();

  // 1. Read package.json
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldVersion = pkg.version;
  const newVersion = bumpVersion(oldVersion, bumpType);
  const tagName = `v${newVersion}`;

  console.log(`\n🚀 Preparing release: v${oldVersion} -> \x1b[32m${tagName}\x1b[0m\n`);

  // 2. Check for clean working tree (or only uncommitted changes to package/changelog)
  const status = runOutput('git status --porcelain');
  if (status) {
    console.log('📦 Working directory has changes. They will be included in the release commit.');
  }

  // 3. Collect recent commits for changelog if no message was provided
  const latestTag = runOutput('git describe --tags --abbrev=0 2>/dev/null') || '';
  let commitLogs = [];
  if (latestTag) {
    const logOutput = runOutput(`git log "${latestTag}..HEAD" --pretty=format:"- %s" --no-merges`);
    if (logOutput) commitLogs = logOutput.split('\n').filter(Boolean);
  } else {
    const logOutput = runOutput('git log -n 10 --pretty=format:"- %s" --no-merges');
    if (logOutput) commitLogs = logOutput.split('\n').filter(Boolean);
  }

  // Filter out automated release commits from the change summary
  commitLogs = commitLogs.filter(line => !line.startsWith('- chore: release') && !line.startsWith('- chore: bump version'));

  if (!message && process.stdin.isTTY) {
    const input = await prompt(`Enter release notes (leave empty to use recent ${commitLogs.length} commit(s)): `);
    if (input) message = input;
  }

  // 4. Fetch latest cask catalog and update data
  console.log(`🔄 Fetching latest casks and generating catalog data...`);
  run(`npm run fetch`);

  // 5. Update CHANGELOG.md
  if (fs.existsSync(changelogPath)) {
    let changelog = fs.readFileSync(changelogPath, 'utf8');
    const today = new Date().toISOString().split('T')[0];
    const versionHeader = `## [${newVersion}] - ${today}`;

    if (!changelog.includes(`## [${newVersion}]`)) {
      let notesContent = '';
      if (message) {
        notesContent = `### Changes\n- ${message.replace(/\n/g, '\n- ')}`;
      } else if (commitLogs.length > 0) {
        notesContent = `### Changes\n${commitLogs.join('\n')}`;
      } else {
        notesContent = `### Changes\n- Maintenance and performance improvements.`;
      }

      const newEntry = `${versionHeader}\n\n${notesContent}\n\n---\n\n`;

      if (changelog.startsWith('# Changelog')) {
        changelog = changelog.replace(/^# Changelog\s*\n+/, `# Changelog\n\n${newEntry}`);
      } else {
        changelog = `# Changelog\n\n${newEntry}${changelog}`;
      }

      fs.writeFileSync(changelogPath, changelog, 'utf8');
      console.log(`📝 Updated CHANGELOG.md with entry for ${tagName}`);
    } else {
      console.log(`ℹ️  CHANGELOG.md already has an entry for [${newVersion}]`);
    }
  }

  // 6. Update package.json
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`📦 Updated package.json version to ${newVersion}`);

  // 7. Git commit, tag, and push
  const currentBranch = runOutput('git branch --show-current') || 'main';

  console.log(`\n📌 Committing and tagging release...`);
  run(`git add package.json CHANGELOG.md data/`);

  // Commit if anything is staged
  const staged = runOutput('git diff --cached --name-only');
  if (staged) {
    run(`git commit -m "chore: release ${tagName}"`);
  }

  // Delete local tag if it already exists to overwrite, then tag
  const tagExists = runOutput(`git tag -l "${tagName}"`);
  if (tagExists) {
    run(`git tag -d "${tagName}"`, { silent: true });
  }
  run(`git tag -a "${tagName}" -m "Release ${tagName}"`);

  console.log(`\n🚀 Pushing ${currentBranch} and ${tagName} to GitHub...`);
  run(`git push origin ${currentBranch}`);
  run(`git push origin "${tagName}" --force`);

  console.log(`\n\x1b[32m✨ Release ${tagName} successfully triggered!\x1b[0m`);
  console.log(`GitHub Action will build and publish the release binaries at:`);
  console.log(`👉 https://github.com/yanbab/appfinder/releases/tag/${tagName}\n`);
}

main().catch((err) => {
  console.error(`\n\x1b[31m❌ Release failed:\x1b[0m`, err.message);
  process.exit(1);
});
