const { findAppBundle, getAppDates, launchApp } = require('./macos');

function findInstalledAppPath(token, appName) {
  if (!token && !appName) return null;
  const candidates = [appName, token].filter(Boolean);
  return findAppBundle(candidates);
}

async function openApp(token, appName) {
  const candidates = [appName, token].filter(Boolean);
  return launchApp(candidates);
}

async function getAppFileDates(appPath, token) {
  const targetPath = appPath || findInstalledAppPath(token);
  return getAppDates(targetPath);
}

module.exports = {
  findInstalledAppPath,
  openApp,
  getAppFileDates
};
