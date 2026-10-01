const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const dconf = require('./dconf');

describe('dconf (gsettings utility)', () => {
  describe('parseGVariant', () => {
    it('should parse booleans correctly', () => {
      assert.equal(dconf.parseGVariant('true'), true);
      assert.equal(dconf.parseGVariant('false'), false);
      assert.equal(dconf.parseGVariant(' true '), true);
    });

    it('should parse numbers correctly', () => {
      assert.equal(dconf.parseGVariant('42'), 42);
      assert.equal(dconf.parseGVariant('-10'), -10);
      assert.equal(dconf.parseGVariant('3.14'), 3.14);
      assert.equal(dconf.parseGVariant('0'), 0);
    });

    it('should strip single and double quotes from strings', () => {
      assert.equal(dconf.parseGVariant("'prefer-dark'"), 'prefer-dark');
      assert.equal(dconf.parseGVariant('"Adwaita"'), 'Adwaita');
      assert.equal(dconf.parseGVariant(" 'default' "), 'default');
    });

    it('should parse string arrays correctly', () => {
      assert.deepEqual(dconf.parseGVariant("['a', 'b', 'c']"), ['a', 'b', 'c']);
      assert.deepEqual(dconf.parseGVariant("[]"), []);
      assert.deepEqual(dconf.parseGVariant("['prefer-dark']"), ['prefer-dark']);
    });

    it('should return unparsed raw value for non-strings or unhandled formats', () => {
      assert.equal(dconf.parseGVariant(123), 123);
      assert.equal(dconf.parseGVariant(null), null);
      assert.equal(dconf.parseGVariant('SomeCustomVariant()'), 'SomeCustomVariant()');
    });
  });

  describe('formatGVariant', () => {
    it('should format booleans into GVariant boolean literals', () => {
      assert.equal(dconf.formatGVariant(true), 'true');
      assert.equal(dconf.formatGVariant(false), 'false');
    });

    it('should format numbers into strings', () => {
      assert.equal(dconf.formatGVariant(42), '42');
      assert.equal(dconf.formatGVariant(3.14), '3.14');
      assert.equal(dconf.formatGVariant(0), '0');
    });

    it('should format strings with single quotes and handle escaping', () => {
      assert.equal(dconf.formatGVariant('prefer-dark'), "'prefer-dark'");
      assert.equal(dconf.formatGVariant("'already-quoted'"), "'already-quoted'");
      assert.equal(dconf.formatGVariant('"double-quoted"'), '"double-quoted"');
      assert.equal(dconf.formatGVariant("it's cool"), "'it\\'s cool'");
    });

    it('should format arrays into GVariant array string', () => {
      assert.equal(dconf.formatGVariant(['a', 'b']), "['a', 'b']");
      assert.equal(dconf.formatGVariant([true, false]), '[true, false]');
    });
  });

  describe('parameter validation', () => {
    it('should reject get without schema or key', async () => {
      await assert.rejects(async () => dconf.get(), /Both schema and key are required/);
      await assert.rejects(async () => dconf.get('org.gnome.desktop'), /Both schema and key are required/);
    });

    it('should reject set without schema or key', async () => {
      await assert.rejects(async () => dconf.set(), /Both schema and key are required/);
      await assert.rejects(async () => dconf.set('org.gnome.desktop'), /Both schema and key are required/);
    });

    it('should reject reset without schema or key', async () => {
      await assert.rejects(async () => dconf.reset(), /Both schema and key are required/);
    });

    it('should throw when subscribing without callback', () => {
      assert.throws(() => dconf.subscribe('org.gnome.desktop.interface'), /Schema and callback function are required/);
    });
  });
});
