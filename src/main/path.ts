import path from 'path';
import os from 'os';

const electron = typeof process.versions?.electron !== 'undefined'
  ? (() => {
      try {
        return require('electron');
      } catch {
        return null;
      }
    })()
  : null;

const ROOT_DIR: string = electron?.app?.getAppPath?.() || process.cwd();

export const CONFIG_DIR: string = path.join(os.homedir(), '.config', 'appfinder');
export const CACHE_DIR: string = path.join(os.homedir(), '.cache', 'appfinder');
export const DATA_DIR: string = path.join(ROOT_DIR, 'data');
export const LOCALES_DIR: string = path.join(ROOT_DIR, 'locales');
export const RENDERER_PATH: string = path.join(ROOT_DIR, 'dist/vite-renderer/index.html');
export const PRELOAD_PATH: string = path.join(__dirname, 'preload.js');


