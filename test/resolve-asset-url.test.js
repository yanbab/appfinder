const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAssetUrl } = require('../src/renderer/hooks/utils');

test('resolveAssetUrl converts font previews and thumbnails in dev mode', () => {
  const cdnPreview = 'https://yanbab.github.io/appfinder/font-previews/font-0xproto.png';
  const cdnThumb = 'https://yanbab.github.io/appfinder/font-thumbnails/font-0xproto.png';
  const regularIcon = 'https://yanbab.github.io/appfinder/icons/slack.png';

  // In Dev mode (forceDev = true)
  assert.strictEqual(
    resolveAssetUrl(cdnPreview, true),
    '/font-previews/font-0xproto.png'
  );
  assert.strictEqual(
    resolveAssetUrl(cdnThumb, true),
    '/font-thumbnails/font-0xproto.png'
  );
  // Non-font icons are untouched
  assert.strictEqual(
    resolveAssetUrl(regularIcon, true),
    'https://yanbab.github.io/appfinder/icons/slack.png'
  );

  // In Prod mode (forceDev = false)
  assert.strictEqual(
    resolveAssetUrl(cdnPreview, false),
    cdnPreview
  );
  assert.strictEqual(
    resolveAssetUrl(cdnThumb, false),
    cdnThumb
  );
  assert.strictEqual(
    resolveAssetUrl(regularIcon, false),
    regularIcon
  );

  // Null/undefined inputs return null
  assert.strictEqual(resolveAssetUrl(null, true), null);
  assert.strictEqual(resolveAssetUrl(undefined, true), null);
  assert.strictEqual(resolveAssetUrl('', true), null);
});
