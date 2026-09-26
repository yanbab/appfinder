const { getConfig } = require('./config');
const Tray = require('./tray');
const { app, BrowserWindow } = require('electron');

let autoCheckTimer = null;
const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

function updateBadges(count) {
  const config = getConfig();

  // Dock Badge
  if (app?.dock?.setBadge) {
    const showDock = config.showDockBadge !== false;
    app.dock.setBadge(showDock && count > 0 ? String(count) : '');
  }

  // Tray Count
  Tray.syncTrayWithConfig(count);
}

async function runCheck(force = false) {
  const config = getConfig();
  if (!force && config.autoCheckUpdates === false) return;

  try {
    const Brew = require('./brew');
    const res = await Brew.getUpdates(force);
    const count = res?.casks?.length || 0;
    updateBadges(count);

    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('cask:updates-refreshed', res);
      }
    });
  } catch (err) {
    console.error('Auto update check failed:', err);
  }
}

function startAutoCheck() {
  if (autoCheckTimer) clearInterval(autoCheckTimer);

  setTimeout(() => {
    runCheck(false);
  }, 3000);

  autoCheckTimer = setInterval(() => {
    runCheck(true);
  }, CHECK_INTERVAL);
}

function stopAutoCheck() {
  if (autoCheckTimer) {
    clearInterval(autoCheckTimer);
    autoCheckTimer = null;
  }
}

function syncAutoCheckWithConfig() {
  const config = getConfig();
  if (config.autoCheckUpdates !== false) {
    if (!autoCheckTimer) startAutoCheck();
  } else {
    stopAutoCheck();
  }
  updateBadges(0);
}

module.exports = {
  startAutoCheck,
  stopAutoCheck,
  syncAutoCheckWithConfig,
  updateBadges,
  runCheck
};
