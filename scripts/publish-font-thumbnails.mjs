#!/usr/bin/env node

/**
 * publish-font-thumbnails.mjs
 *
 * Publishes font thumbnails, name previews, and updated catalog data
 * to GitHub repository and GitHub Pages.
 *
 * Usage:
 *   npm run fonts:publish
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function run(cmd, options = {}) {
  return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf8', stdio: options.silent ? 'pipe' : 'inherit', ...options });
}

function runOutput(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('🚀 Publishing Font Thumbnails & Previews to GitHub');
  console.log('======================================================\n');

  const branch = runOutput('git branch --show-current') || 'main';

  // 1. Stage docs and data
  console.log('📦 Staging docs/ and data/...');
  run('git add docs/ data/fonts.json data/apps.json');

  const staged = runOutput('git diff --cached --name-only');
  if (!staged) {
    console.log('ℹ️  No changes to commit in docs/ or data/. Everything is up to date.');
  } else {
    console.log('📝 Creating commit...');
    run('git commit -m "chore: publish font thumbnails and previews [skip ci]"');
  }

  // 2. Push to current branch
  console.log(`\n🚀 Pushing to origin ${branch}...`);
  try {
    run(`git push origin ${branch}`);
  } catch (err) {
    console.error(`⚠️  Failed to push to origin ${branch}:`, err.message);
  }

  // 3. Also update gh-pages branch if subtree / branch is configured
  try {
    console.log('\n📄 Updating gh-pages branch from docs/...');
    run('git push origin `git subtree split --prefix docs HEAD`:gh-pages --force');
    console.log('✅ gh-pages branch updated.');
  } catch (err) {
    console.log('ℹ️  GitHub Pages will serve directly from the repository.');
  }

  console.log('\n======================================================');
  console.log('🎉 Published successfully!');
  console.log('🌐 URLs:');
  console.log('   https://yanbab.github.io/appfinder/font-thumbnails/<token>.png');
  console.log('   https://yanbab.github.io/appfinder/font-previews/<token>.png');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Publish failed:', err.message);
  process.exit(1);
});
