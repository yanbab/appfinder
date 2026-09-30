/**
 * Mock Backend Skeleton
 * Software package management skeleton for testing / alternative platforms
 */

/**
 * Get list of installed applications and their versions
 * @param {Function} [onLog] - Optional logger callback
 * @returns {Promise<{ tokens: string[], versions: Record<string, string> }>}
 */
async function getInstalled(onLog) {
  return { tokens: [], versions: {} };
}

/**
 * Fetch available updates for installed applications
 * @param {boolean} [force=false]
 * @returns {Promise<{ casks: any[] }>}
 */
async function getUpdates(force = false) {
  return { casks: [] };
}

/**
 * Get detailed metadata for a specific app
 * @param {string} token - Application identifier
 * @returns {Promise<object|null>}
 */
async function getCaskInfo(token) {
  return null;
}

/**
 * Calculate download and installed sizes for an app
 * @param {string} token - Application identifier
 * @returns {Promise<{ downloadSize: string|null, installedSize: string|null, dataSize: string|null }>}
 */
async function getCaskSizesByToken(token) {
  return {
    downloadSize: null,
    installedSize: null,
    dataSize: null
  };
}

/**
 * Launch an installed application
 * @param {string} token - Application identifier
 * @param {string} [appName] - Optional display name
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function openApp(token, appName) {
  return { success: false, error: 'Mock backend not implemented' };
}

/**
 * Find local installation path for an application
 * @param {string} token
 * @param {string} [appName]
 * @returns {string|null}
 */
function findInstalledAppPath(token, appName) {
  // Skeleton: Check /var/lib/flatpak/app or ~/.local/share/flatpak/app
  return null;
}

/**
 * Execute a package action (install, update/upgrade, uninstall, refresh, cleanup)
 * @param {{ taskId: string, action: string, token: string, zap?: boolean }} data
 * @param {{ onLog?: Function, onComplete?: Function, onRefreshUpdates?: Function } | Function} [callbacks]
 */
function runAction(data, callbacks = {}) {
  const cbs = typeof callbacks === 'function' ? { onComplete: callbacks } : callbacks;
  // Skeleton: Spawn `flatpak install/update/uninstall` in a PTY/process
  if (typeof cbs.onComplete === 'function') {
    cbs.onComplete({ taskId: data?.taskId, code: 0 });
  }
}

/**
 * Cancel an ongoing background task
 * @param {string} taskId
 * @param {Function} [onComplete]
 */
function cancelAction(taskId, onComplete) {
  // Skeleton: Terminate active process for taskId
  if (typeof onComplete === 'function') {
    onComplete({ taskId, code: -1, cancelled: true });
  }
}

/**
 * Write user input to the active PTY (e.g. interactive confirmations)
 * @param {string} taskId
 * @param {string} text
 */
function writePtyInput(taskId, text) {
  // Skeleton: Forward text to task stdin
}

/**
 * Clean package manager caches and unused runtimes
 * @returns {Promise<{ success: boolean, stdout?: string, error?: string }>}
 */
async function cleanCache() {
  // Skeleton: Run `flatpak uninstall --unused`
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
