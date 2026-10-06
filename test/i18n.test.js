const test = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../src/main/i18n');

test('i18n exports getMessages and getCatalog as alias', () => {
  assert.equal(typeof i18n.getMessages, 'function');
  assert.equal(typeof i18n.getCatalog, 'function');
  
  const msgs = i18n.getMessages('en');
  const cat = i18n.getCatalog('en');

  assert.ok(msgs);
  assert.equal(typeof msgs, 'object');
  assert.deepEqual(msgs, cat);
  assert.equal(msgs._languageName, 'English');
});

test('i18n getLocales returns available languages', () => {
  const locales = i18n.getLocales();
  assert.ok(Array.isArray(locales));
  assert.ok(locales.some(l => l.code === 'en'));
  assert.ok(locales.some(l => l.code === 'fr'));
});

test('i18n translation helper __ replaces placeholders', () => {
  i18n.setLocale('en');
  const formatted = i18n.__('Requires: %s', 'macOS 13+');
  assert.ok(formatted.includes('macOS 13+'));
});
