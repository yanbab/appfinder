const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { getConfig } = require('./config');
const { getShellWindow } = require('./window-shell');
const { createSettingsWindow } = require('./window-settings');
const i18n = require('./i18n');

let tray = null;
let lastCount = 0;

function __ (key, ...args) {
  return i18n.__(key, ...args);
}

function getTrayIcon() {
  const png2x = path.join(__dirname, '..', '..', 'data', 'trayTemplate@2x.png');
  const png1x = path.join(__dirname, '..', '..', 'data', 'trayTemplate.png');
  if (fs.existsSync(png2x)) {
    const img = nativeImage.createFromPath(png2x).resize({ width: 18, height: 18 });
    img.setTemplateImage(true);
    return img;
  }
  if (fs.existsSync(png1x)) {
    const img = nativeImage.createFromPath(png1x);
    img.setTemplateImage(true);
    return img;
  }
  return nativeImage.createEmpty();
}

function buildMenu(count) {
  const showShell = () => {
    const win = getShellWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  };

  const template = [
    {
      label: 'AppFinder',
      click: showShell
    },
    { type: 'separator' },
    {
      label: count > 0 ? __('%d updates available', count) : __('Up to date'),
      enabled: count > 0,
      click: () => {
        showShell();
        const win = getShellWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('shell:select-tab', 'updates');
        }
      }
    },
    {
      label: __('Check for Updates...'),
      click: () => {
        showShell();
        const win = getShellWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('shell:check-updates');
        }
      }
    },
    { type: 'separator' },
    {
      label: __('Settings...'),
      click: () => createSettingsWindow()
    },
    {
      label: __('Quit %s', 'AppFinder'),
      click: () => app.quit()
    }
  ];

  return Menu.buildFromTemplate(template);
}

function updateTrayCount(count) {
  lastCount = typeof count === 'number' ? count : lastCount;
  if (!tray) return;

  tray.setTitle(lastCount > 0 ? ` ${lastCount}` : '');
  tray.setToolTip(lastCount > 0 ? `AppFinder - ${lastCount} update(s) available` : 'AppFinder - Up to date');
  tray.setContextMenu(buildMenu(lastCount));
}

function setupTray(count = 0) {
  if (tray) {
    updateTrayCount(count);
    return tray;
  }

  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setIgnoreDoubleClickEvents(true);
  tray.on('click', () => {
    const win = getShellWindow();
    if (win) {
      if (win.isVisible() && win.isFocused()) {
        win.hide();
      } else {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    }
  });

  updateTrayCount(count);
  return tray;
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

function syncTrayWithConfig(count) {
  const config = getConfig();
  if (config.showTrayIcon) {
    setupTray(count !== undefined ? count : lastCount);
  } else {
    destroyTray();
  }
}

module.exports = {
  setupTray,
  updateTrayCount,
  destroyTray,
  syncTrayWithConfig
};
