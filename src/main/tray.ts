import { app, Tray, Menu, nativeImage, type NativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { DATA_DIR, CONFIG_DIR } from './path';
import { getConfig } from './config';
import i18n from './i18n';
import { getShellWindow, createShellWindow } from './window-shell';
import { createSettingsWindow } from './window-settings';

let tray: Tray | null = null;
let currentCount = 0;
let lastChecked: Date | null = null;

function formatTime(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function updateTrayMenu(): void {
  if (!tray) return;

  const appName = app.getName() || 'AppFinder';
  const updatedLabel = lastChecked
    ? i18n.__('Updated %s', formatTime(lastChecked))
    : i18n.__('Not checked yet');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: updatedLabel,
      enabled: false,
    },
    {
      label: i18n.__('Check updates'),
      click: () => {
        let win = getShellWindow();
        if (!win || win.isDestroyed()) {
          win = createShellWindow();
        } else {
          if (win.isMinimized()) win.restore();
          if (!win.isVisible()) win.show();
          win.focus();
        }
        win.webContents.send('menu:click', { command: 'check-updates' });
      },
    },
    { type: 'separator' },
    {
      label: i18n.__('Settings...'),
      click: () => {
        createSettingsWindow();
      },
    },
    {
      label: i18n.__('Quit %s', appName),
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function updateTray(count?: number, time?: Date): void {
  if (typeof count === 'number') {
    currentCount = count;
  }
  if (time instanceof Date) {
    lastChecked = time;
  }

  if (!tray) return;

  const label = currentCount > 0 ? String(currentCount) : '';
  tray.setTitle(label);
  tray.setToolTip(currentCount > 0 ? `${currentCount} updates available` : 'AppFinder');

  updateTrayMenu();
}

export function createTray(): Tray | null {
  if (tray) return tray;

  const iconPath = path.join(DATA_DIR, 'tray', 'trayTemplate.png');
  let icon: NativeImage;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setIgnoreDoubleClickEvents(true);

  // Read initial cache if available
  try {
    const updatesFile = path.join(CONFIG_DIR, 'updates.json');
    if (fs.existsSync(updatesFile)) {
      const stat = fs.statSync(updatesFile);
      const data = JSON.parse(fs.readFileSync(updatesFile, 'utf8'));
      const count = (data?.casks?.length || 0) + (data?.formulae?.length || 0);
      currentCount = count;
      lastChecked = new Date(stat.mtimeMs);
    }
  } catch (_) { }

  updateTray(currentCount, lastChecked || undefined);

  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export function syncTrayWithConfig(): void {
  const config = getConfig();
  if (config.showUpgradesInMenuBar) {
    if (!tray) {
      createTray();
    } else {
      updateTrayMenu();
    }
  } else {
    if (tray) {
      destroyTray();
    }
  }
}

export function getTray(): Tray | null {
  return tray;
}
