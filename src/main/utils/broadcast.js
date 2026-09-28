const { BrowserWindow } = require('electron');

/**
 * Safely broadcasts an IPC message to all non-destroyed windows.
 * @param {string} channel
 * @param  {...any} args
 */
function broadcast(channel, ...args) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed() && !win.webContents?.isDestroyed?.()) {
      win.webContents.send(channel, ...args);
    }
  }
}

module.exports = {
  broadcast
};
