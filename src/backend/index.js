// Backend Dispatcher

const common = require('./common');
const brewBackend = require('./brew');
const mockBackend = require('./mock');

// Default to brew on macOS, mock on other platforms or testing
const activeBackendName = process.platform === 'darwin' ? 'brew' : 'mock';
const backend = activeBackendName === 'brew' ? brewBackend : mockBackend;

module.exports = {
  // Global data (apps.json and categories.json)
  getApps: common.getApps,
  getCategories: common.getCategories,

  // Active backend identifier
  name: activeBackendName,

  // Backend operations
  getInstalled: (...args) => backend.getInstalled(...args),
  getUpdates: (...args) => backend.getUpdates(...args),
  getCaskInfo: (...args) => backend.getCaskInfo(...args),
  getCaskSizesByToken: (...args) => backend.getCaskSizesByToken(...args),
  openApp: (...args) => backend.openApp(...args),
  findInstalledAppPath: (...args) => backend.findInstalledAppPath(...args),
  runAction: (...args) => backend.runAction(...args),
  cancelAction: (...args) => backend.cancelAction(...args),
  writePtyInput: (...args) => backend.writePtyInput(...args),
  cleanCache: (...args) => backend.cleanCache(...args),

  // Direct backend access
  backends: {
    brew: brewBackend,
    mock: mockBackend
  }
};
