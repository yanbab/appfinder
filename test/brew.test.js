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

test('fetcher.processAppsData transforms raw casks and metadata correctly', () => {
  const { processAppsData } = require('../src/main/backend/fetcher');

  const mockCasks = [
    {
      token: 'test-app',
      name: ['Test Application'],
      desc: 'A test application',
      homepage: 'https://testapp.com',
      version: '1.2.3',
      artifacts: [{ app: ['Test App.app'] }]
    },
    {
      token: 'font-test',
      name: ['Test Font'],
      homepage: 'https://font.com',
      version: '2.0.0'
    }
  ];

  const mockCategories = {
    tokenToCategory: {
      'test-app': { primary: 'developerTools', secondary: ['utilities', 'productivity'] }
    },
    iconTokens: ['test-app']
  };

  const mockDownloads = {
    formulae: {
      'test-app': [{ count: '1,234' }]
    }
  };

  const mockAdded = {
    tokenAddedDates: {
      'test-app': '2025-01-01'
    }
  };

  const result = processAppsData(mockCasks, mockCategories, mockDownloads, mockAdded);
  assert.equal(result.length, 2);

  const app1 = result.find(c => c.token === 'test-app');
  assert.equal(app1.name, 'Test Application');
  assert.equal(app1.category, 'developerTools');
  assert.equal(app1.secondCategory, 'utilities');
  assert.equal(app1.thirdCategory, 'productivity');
  assert.equal(app1.count, 1234);
  assert.equal(app1.added, '2025-01-01');
  assert.ok(app1.iconUrl.includes('test-app.png'));
  assert.equal(app1.url, undefined);
  assert.equal(app1.icon, undefined);

  const font = result.find(c => c.token === 'font-test');
  assert.equal(font.category, 'font');
  assert.equal(font.desc, 'Font');
});
