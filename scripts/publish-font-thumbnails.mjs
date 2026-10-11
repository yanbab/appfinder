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

  // 0. Ensure .nojekyll exists in docs/ to disable Jekyll processing
  const nojekyllPath = path.join(ROOT_DIR, 'docs', '.nojekyll');
  if (!fs.existsSync(nojekyllPath)) {
    fs.writeFileSync(nojekyllPath, '# Disable Jekyll processing on GitHub Pages\n');
  }

  // 1. Stage and commit catalog data to current working branch (code branch)
  console.log(`📦 Staging catalog updates on ${branch}...`);
  run('git add data/fonts.json data/apps.json docs/.nojekyll');

  const staged = runOutput('git diff --cached --name-only');
  if (!staged) {
    console.log('ℹ️  No catalog changes to commit on working branch.');
  } else {
    console.log('📝 Creating commit on working branch...');
    run('git commit -m "chore(catalog): update font metadata and screenshot URLs [skip ci]"');
  }

  // 2. Push to current branch (main or next)
  console.log(`\n🚀 Pushing ${branch} to origin...`);
  try {
    run(`git push origin ${branch}`);
  } catch (err) {
    console.error(`⚠️  Failed to push to origin ${branch}:`, err.message);
  }

  // 3. Update gh-pages branch using an isolated index (force-includes all docs/ images without polluting working branch)
  console.log('\n📄 Updating gh-pages branch with font assets...');
  const tempIndex = path.join(ROOT_DIR, '.git', 'temp-gh-pages-index');
  try {
    if (fs.existsSync(tempIndex)) fs.unlinkSync(tempIndex);

    // Force add all docs/ files (including thumbnails and previews) into temporary index
    run('git add -f docs/', { env: { ...process.env, GIT_INDEX_FILE: tempIndex } });

    const treeSha = runOutput('git write-tree', { env: { ...process.env, GIT_INDEX_FILE: tempIndex } });
    if (treeSha) {
      const commitSha = runOutput(`git commit-tree ${treeSha} -m "chore: deploy font thumbnails and previews to gh-pages [skip ci]"`);
      if (commitSha) {
        run(`git push origin ${commitSha}:refs/heads/gh-pages --force`);
        console.log('✅ gh-pages branch updated with all font assets.');
      }
    }
  } catch (err) {
    console.warn('⚠️  Failed to push to gh-pages branch:', err.message);
  } finally {
    if (fs.existsSync(tempIndex)) {
      try { fs.unlinkSync(tempIndex); } catch (_) { }
    }
  }

  console.log('\n======================================================');
  console.log('🎉 Published successfully!');
  console.log('⏳ Note: GitHub Pages CDN typically takes 30-90 seconds to propagate.');
  console.log('🌐 URLs:');
  console.log('   https://yanbab.github.io/appfinder/font-thumbnails/<token>.png');
  console.log('   https://yanbab.github.io/appfinder/font-previews/<token>.png');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Publish failed:', err.message);
  process.exit(1);
});
