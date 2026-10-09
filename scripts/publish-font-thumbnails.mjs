#!/usr/bin/env node

/**
 * publish-font-thumbnails.mjs
 *
 * Publishes generated font thumbnails in `docs/font-thumbnails/` directly to the `gh-pages`
 * branch using a clean temporary git worktree.
 *
 * This keeps the `main` branch lightweight (0 binary blobs in git history) while
 * making all 2,000+ font previews immediately available on GitHub Pages CDN.
 *
 * Usage:
 *   node scripts/publish-font-thumbnails.mjs
 *   node scripts/publish-font-thumbnails.mjs --dry-run
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const THUMBNAILS_DIR = path.join(ROOT_DIR, 'docs', 'font-thumbnails');
const WORKTREE_DIR = path.join(os.tmpdir(), `appfinder-gh-pages-${Date.now()}`);

const isDryRun = process.argv.includes('--dry-run');

function run(cmd, cwd = ROOT_DIR) {
  return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function runSafe(cmd, cwd = ROOT_DIR) {
  try {
    return run(cmd, cwd);
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 AppFinder Font Thumbnails Publisher -> gh-pages`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(THUMBNAILS_DIR)) {
    console.error(`❌ Thumbnails directory not found at ${THUMBNAILS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(THUMBNAILS_DIR).filter((f) => f.endsWith('.png'));
  if (files.length === 0) {
    console.log(`⚠️  No PNG thumbnails found in ${THUMBNAILS_DIR}. Nothing to publish.`);
    process.exit(0);
  }

  console.log(`📦 Found ${files.length.toLocaleString()} font thumbnail(s) ready to publish.`);

  if (isDryRun) {
    console.log(`🔍 [Dry Run] Would commit and push ${files.length} thumbnails to gh-pages branch.`);
    process.exit(0);
  }

  // 1. Check git remote
  const remotes = runSafe('git remote') || '';
  const remote = remotes.split('\n')[0]?.trim() || 'origin';

  console.log(`📡 Using git remote: ${remote}`);

  // 2. Fetch gh-pages branch if it exists remotely
  console.log(`🔄 Fetching latest ${remote}/gh-pages branch...`);
  runSafe(`git fetch ${remote} gh-pages:gh-pages`);

  const hasGhPagesBranch = Boolean(runSafe('git show-ref --verify refs/heads/gh-pages'));

  try {
    if (hasGhPagesBranch) {
      console.log(`🌿 Creating temporary worktree for gh-pages...`);
      run(`git worktree add "${WORKTREE_DIR}" gh-pages`);
    } else {
      console.log(`🌿 Initializing orphan gh-pages branch in worktree...`);
      run(`git worktree add --detach "${WORKTREE_DIR}"`);
      run(`git checkout --orphan gh-pages`, WORKTREE_DIR);
      run(`git rm -rf .`, WORKTREE_DIR);
    }

    const targetThumbDir = path.join(WORKTREE_DIR, 'font-thumbnails');
    fs.mkdirSync(targetThumbDir, { recursive: true });

    console.log(`📋 Copying thumbnails to gh-pages worktree...`);
    for (const file of files) {
      const src = path.join(THUMBNAILS_DIR, file);
      const dest = path.join(targetThumbDir, file);
      fs.copyFileSync(src, dest);
    }

    // Check git status inside worktree
    const status = runSafe('git status --porcelain', WORKTREE_DIR);
    if (!status || status.trim() === '') {
      console.log(`✨ All ${files.length.toLocaleString()} thumbnails are already up-to-date on gh-pages.`);
      return;
    }

    console.log(`📝 Staging and committing changes on gh-pages...`);
    run(`git add font-thumbnails`, WORKTREE_DIR);
    run(`git commit -m "Update font thumbnails (${files.length} previews)"`, WORKTREE_DIR);

    console.log(`⬆️  Pushing gh-pages to ${remote}...`);
    try {
      run(`git push ${remote} gh-pages`, WORKTREE_DIR);
      console.log(`\n🎉 Successfully published ${files.length.toLocaleString()} font thumbnails to gh-pages!`);
      console.log(`🌐 Thumbnails CDN URL: https://yanbab.github.io/appfinder/font-thumbnails/<token>.png\n`);
    } catch (pushErr) {
      console.warn(`\n⚠️  Could not push directly (may require authentication or network access):`);
      console.warn(`   ${pushErr.message}`);
      console.log(`💡 Note: The gh-pages local branch is committed and ready to push.\n`);
    }
  } finally {
    console.log(`🧹 Cleaning up temporary worktree...`);
    runSafe(`git worktree remove --force "${WORKTREE_DIR}"`);
    if (fs.existsSync(WORKTREE_DIR)) {
      try { fs.rmSync(WORKTREE_DIR, { recursive: true, force: true }); } catch (_) {}
    }
  }
}

main().catch((err) => {
  console.error(`❌ Publish failed:`, err);
  process.exit(1);
});
