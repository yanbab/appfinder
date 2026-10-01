/**
 * Mock Backend Skeleton
 * Software package management skeleton for testing / alternative platforms
 */

async function getInstalled(onLog) {
  return { tokens: [], versions: {} };
}

async function getUpdates(force = false) {
  return { casks: [] };
}

async function getCaskInfo(token) {
  return null;
}

async function getCaskSizesByToken(token) {
  return {
    downloadSize: null,
    installedSize: null,
    dataSize: null
  };
}

async function openApp(token, appName) {
  return { success: false, error: 'Mock backend not implemented' };
}

function findInstalledAppPath(token, appName) {
  return null;
}

function runAction(data, callbacks = {}) {
  const cbs = typeof callbacks === 'function' ? { onComplete: callbacks } : callbacks;
  if (typeof cbs.onComplete === 'function') {
    cbs.onComplete({ taskId: data?.taskId, code: 0 });
  }
}

function cancelAction(taskId, onComplete) {
  if (typeof onComplete === 'function') {
    onComplete({ taskId, code: -1, cancelled: true });
  }
}

function writePtyInput(taskId, text) {}

async function cleanCache() {
  return { success: true, stdout: '' };
}

module.exports = {
  getInstalled,
  getUpdates,
  getCaskInfo,
  getCaskSizesByToken,
  openApp,
  findInstalledAppPath,
  runAction,
  cancelAction,
  writePtyInput,
  cleanCache
};
