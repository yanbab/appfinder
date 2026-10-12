const test = require('node:test');
const assert = require('node:assert/strict');
const { getFaviconUrl } = require('../src/renderer/hooks/utils');

test('getFaviconUrl correctly extracts domain and constructs Google favicon URL', () => {
  // Standard full URL with trailing slash
  assert.strictEqual(
    getFaviconUrl('https://nginx.org/'),
    'https://www.google.com/s2/favicons?domain=nginx.org&sz=128'
  );

  // Subdomain with path
  assert.strictEqual(
    getFaviconUrl('https://activemq.apache.org/download'),
    'https://www.google.com/s2/favicons?domain=activemq.apache.org&sz=128'
  );

  // WWW prefix is stripped cleanly
  assert.strictEqual(
    getFaviconUrl('https://www.elastic.co/beats/auditbeat'),
    'https://www.google.com/s2/favicons?domain=elastic.co&sz=128'
  );

  // URL without protocol
  assert.strictEqual(
    getFaviconUrl('redis.io'),
    'https://www.google.com/s2/favicons?domain=redis.io&sz=128'
  );

  // Custom size
  assert.strictEqual(
    getFaviconUrl('https://postgresql.org', 64),
    'https://www.google.com/s2/favicons?domain=postgresql.org&sz=64'
  );

  // Invalid / local addresses return null
  assert.strictEqual(getFaviconUrl('http://localhost:8080'), null);
  assert.strictEqual(getFaviconUrl('http://127.0.0.1:3000'), null);
  assert.strictEqual(getFaviconUrl(null), null);
  assert.strictEqual(getFaviconUrl(undefined), null);
  assert.strictEqual(getFaviconUrl(''), null);
  assert.strictEqual(getFaviconUrl('not a url %%%'), null);
});
