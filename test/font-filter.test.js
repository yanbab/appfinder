const test = require('node:test');
const assert = require('node:assert/strict');
const { matchFontFilter } = require('../src/renderer/components/category-views/fonts/FontFilter');

test('matchFontFilter handles all filter options accurately', () => {
  const firaCode = {
    token: 'font-fira-code',
    name: 'Fira Code',
    secondCategory: 'monospace',
    thirdCategory: 'latin',
    desc: 'Monospace • 7 styles',
    isMonospace: true,
  };

  const inter = {
    token: 'font-inter',
    name: 'Inter',
    secondCategory: 'sans-serif',
    thirdCategory: 'latin, cyrillic, greek',
    desc: 'Sans-Serif',
  };

  const merriweather = {
    token: 'font-merriweather',
    name: 'Merriweather',
    secondCategory: 'serif',
    thirdCategory: 'latin, cyrillic',
    desc: 'Serif',
  };

  const notoSansHebrew = {
    token: 'font-noto-sans-hebrew',
    name: 'Noto Sans Hebrew',
    secondCategory: 'sans-serif',
    thirdCategory: 'latin, hebrew',
    desc: 'Hebrew',
  };

  const notoEmoji = {
    token: 'font-noto-color-emoji',
    name: 'Noto Color Emoji',
    secondCategory: 'emoji',
    thirdCategory: 'latin',
    desc: 'Emoji & Symbols',
  };

  // 'all'
  assert.strictEqual(matchFontFilter(firaCode, 'all'), true);
  assert.strictEqual(matchFontFilter(inter, 'all'), true);

  // 'monospace'
  assert.strictEqual(matchFontFilter(firaCode, 'monospace'), true);
  assert.strictEqual(matchFontFilter(inter, 'monospace'), false);

  // 'serif' must NOT match sans-serif
  assert.strictEqual(matchFontFilter(merriweather, 'serif'), true);
  assert.strictEqual(matchFontFilter(inter, 'serif'), false);

  // 'sans-serif'
  assert.strictEqual(matchFontFilter(inter, 'sans-serif'), true);
  assert.strictEqual(matchFontFilter(merriweather, 'sans-serif'), false);

  // 'hebrew'
  assert.strictEqual(matchFontFilter(notoSansHebrew, 'hebrew'), true);
  assert.strictEqual(matchFontFilter(firaCode, 'hebrew'), false);

  // 'symbols' matches emoji
  assert.strictEqual(matchFontFilter(notoEmoji, 'symbols'), true);
  assert.strictEqual(matchFontFilter(firaCode, 'symbols'), false);

  // 'installed'
  const installedSet = new Set(['font-fira-code']);
  assert.strictEqual(matchFontFilter(firaCode, 'installed', installedSet), true);
  assert.strictEqual(matchFontFilter(inter, 'installed', installedSet), false);
});
