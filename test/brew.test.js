const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const brew = require('../src/main/backend/brew');

test('brew.getApps and brew.getCategories always return catalog datasets', () => {
  const apps = brew.getApps(true);
  assert.ok(Array.isArray(apps));
  assert.ok(apps.length > 0, 'Apps should not be empty');

  const categories = brew.getCategories(true);
  assert.ok(Array.isArray(categories));
  assert.ok(categories.length > 0, 'Categories should not be empty');
});

test('brew gracefully handles corrupted cache files and falls back to bundled data', () => {
  const cacheDir = path.join(process.env.HOME || '', '.cache', 'appfinder');
  const corruptFile = path.join(cacheDir, 'apps.json');
  let existed = false;
  let originalContent = null;

  if (fs.existsSync(corruptFile)) {
    existed = true;
    originalContent = fs.readFileSync(corruptFile, 'utf8');
  } else {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  try {
    // Write corrupted JSON to simulate interrupted download
    fs.writeFileSync(corruptFile, '{ invalid json truncated...', 'utf8');

    // getApps should NOT crash and should recover with valid array from bundled data
    const apps = brew.getApps(true);
    assert.ok(Array.isArray(apps));
    assert.ok(apps.length > 0);
  } finally {
    // Restore or cleanup
    if (existed && originalContent) {
      fs.writeFileSync(corruptFile, originalContent, 'utf8');
    } else {
      try {
        fs.unlinkSync(corruptFile);
      } catch (_) { }
    }
  }
});
