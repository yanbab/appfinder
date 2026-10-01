const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

/**
 * Parses a single .desktop file's [Desktop Entry] section.
 */
function parseDesktopEntry(content) {
  const lines = content.split('\n');
  const entry = {};
  let inDesktopEntry = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('[')) {
      if (line === '[Desktop Entry]') {
        inDesktopEntry = true;
      } else if (inDesktopEntry) {
        break;
      }
      continue;
    }

    if (inDesktopEntry) {
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim();
        entry[key] = value;
      }
    }
  }

  return entry;
}

/**
 * Checks if the application should be shown in GNOME.
 */
function isVisibleInGnome(entry) {
  if (entry.Type !== 'Application') return false;
  if (entry.NoDisplay === 'true' || entry.Hidden === 'true') return false;

  if (entry.OnlyShowIn) {
    const environments = entry.OnlyShowIn.split(';').filter(Boolean);
    if (!environments.includes('GNOME')) return false;
  }

  if (entry.NotShowIn) {
    const environments = entry.NotShowIn.split(';').filter(Boolean);
    if (environments.includes('GNOME')) return false;
  }

  return true;
}

/**
 * Retrieves all installed graphical apps available in GNOME.
 */
async function getInstalledGnomeApps() {
  const home = os.homedir();

  const dataHome = process.env.XDG_DATA_HOME || path.join(home, '.local/share');
  const dataDirs = (process.env.XDG_DATA_DIRS || '/usr/local/share:/usr/share').split(':');

  const appDirectories = [
    path.join(dataHome, 'applications'),
    ...dataDirs.map((dir) => path.join(dir, 'applications')),
    '/var/lib/flatpak/exports/share/applications',
    path.join(dataHome, 'flatpak/exports/share/applications'),
    '/var/lib/snapd/desktop/applications',
  ];

  const apps = new Map();

  for (const dir of appDirectories) {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        if (!file.endsWith('.desktop')) continue;
        if (apps.has(file)) continue;

        const fullPath = path.join(dir, file);
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const entry = parseDesktopEntry(content);

          if (isVisibleInGnome(entry) && entry.Name) {
            apps.set(file, {
              id: file,
              name: entry.Name,
              comment: entry.Comment || '',
              exec: entry.Exec ? entry.Exec.replace(/%[a-zA-Z]/g, '').trim() : '',
              icon: entry.Icon || '',
              categories: entry.Categories ? entry.Categories.split(';').filter(Boolean) : [],
              terminal: entry.Terminal === 'true',
              desktopFilePath: fullPath,
            });
          }
        } catch (_) { }
      }
    } catch (_) { }
  }

  return Array.from(apps.values()).sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  getInstalledGnomeApps,
  parseDesktopEntry,
  isVisibleInGnome
};
