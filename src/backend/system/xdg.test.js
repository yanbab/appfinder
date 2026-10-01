const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseDesktopEntry, isVisibleInGnome, getInstalledGnomeApps } = require('./xdg');

describe('xdg (Linux desktop entry utility)', () => {
  describe('parseDesktopEntry', () => {
    it('should parse basic key-value pairs under [Desktop Entry]', () => {
      const sample = `
[Desktop Entry]
Name=Firefox Web Browser
Type=Application
Exec=firefox %u
Icon=firefox
Categories=Network;WebBrowser;
Terminal=false
`;
      const result = parseDesktopEntry(sample);
      assert.equal(result.Name, 'Firefox Web Browser');
      assert.equal(result.Type, 'Application');
      assert.equal(result.Exec, 'firefox %u');
      assert.equal(result.Icon, 'firefox');
      assert.equal(result.Categories, 'Network;WebBrowser;');
      assert.equal(result.Terminal, 'false');
    });

    it('should ignore comments and empty lines', () => {
      const sample = `
# This is a comment
# Another comment

[Desktop Entry]
# Name comment
Name=VLC media player
Type=Application
`;
      const result = parseDesktopEntry(sample);
      assert.equal(result.Name, 'VLC media player');
      assert.equal(result.Type, 'Application');
      assert.equal(Object.keys(result).length, 2);
    });

    it('should handle values containing equals signs', () => {
      const sample = `
[Desktop Entry]
Name=Custom App
Exec=env FOO=BAR app --arg=val
Type=Application
`;
      const result = parseDesktopEntry(sample);
      assert.equal(result.Exec, 'env FOO=BAR app --arg=val');
    });

    it('should only parse the primary [Desktop Entry] section and ignore subsequent sections', () => {
      const sample = `
[Desktop Entry]
Name=GIMP
Type=Application

[Desktop Action NewWindow]
Name=Open New Window
Exec=gimp --new-instance
`;
      const result = parseDesktopEntry(sample);
      assert.equal(result.Name, 'GIMP');
      assert.equal(result['Name[Desktop Action NewWindow]'], undefined);
    });
  });

  describe('isVisibleInGnome', () => {
    it('should return true for normal GUI application', () => {
      assert.equal(isVisibleInGnome({ Type: 'Application', Name: 'App' }), true);
    });

    it('should return false if Type is not Application', () => {
      assert.equal(isVisibleInGnome({ Type: 'Link', Name: 'Link' }), false);
      assert.equal(isVisibleInGnome({ Type: 'Directory', Name: 'Dir' }), false);
    });

    it('should return false if NoDisplay or Hidden is true', () => {
      assert.equal(isVisibleInGnome({ Type: 'Application', NoDisplay: 'true' }), false);
      assert.equal(isVisibleInGnome({ Type: 'Application', Hidden: 'true' }), false);
    });

    it('should respect OnlyShowIn', () => {
      assert.equal(isVisibleInGnome({ Type: 'Application', OnlyShowIn: 'GNOME;XFCE;' }), true);
      assert.equal(isVisibleInGnome({ Type: 'Application', OnlyShowIn: 'KDE;XFCE;' }), false);
    });

    it('should respect NotShowIn', () => {
      assert.equal(isVisibleInGnome({ Type: 'Application', NotShowIn: 'KDE;' }), true);
      assert.equal(isVisibleInGnome({ Type: 'Application', NotShowIn: 'GNOME;KDE;' }), false);
    });
  });

  describe('getInstalledGnomeApps', () => {
    it('should return an array and parse desktop apps without crashing', async () => {
      const apps = await getInstalledGnomeApps();
      assert.ok(Array.isArray(apps));
      for (const app of apps) {
        assert.ok(typeof app.name === 'string');
        assert.ok(typeof app.id === 'string');
        assert.ok(Array.isArray(app.categories));
        assert.ok(typeof app.desktopFilePath === 'string');
      }
    });

    it('should correctly strip desktop exec field codes (%u, %F, etc.)', () => {
      const sample = `
[Desktop Entry]
Name=Text Editor
Type=Application
Exec=gedit --new-window %U
Icon=org.gnome.gedit
`;
      const entry = parseDesktopEntry(sample);
      const cleanExec = entry.Exec ? entry.Exec.replace(/%[a-zA-Z]/g, '').trim() : '';
      assert.equal(cleanExec, 'gedit --new-window');
    });
  });
});
