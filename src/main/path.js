const path = require('path');
const os = require('os');

const ROOT_DIR = typeof process.versions?.electron !== 'undefined'
  ? (require('electron').app?.getAppPath?.() || process.cwd())
  : process.cwd();

module.exports = {
  CONFIG_DIR: path.join(os.homedir(), '.config', 'appfinder'),
  CACHE_DIR: path.join(os.homedir(), '.cache', 'appfinder'),
  DATA_DIR: path.join(ROOT_DIR, 'data'),
  LOCALES_DIR: path.join(ROOT_DIR, 'locales'),
  RENDERER_PATH: path.join(ROOT_DIR, 'dist/vite-renderer/index.html'),
  PRELOAD_PATH: path.join(__dirname, 'preload.js'),
};
