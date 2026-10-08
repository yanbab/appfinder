import { app } from 'electron';

export async function initDevTools(): Promise<void> {
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    try {
      const installer = require('electron-devtools-installer');
      const installExtension = installer.default || installer;
      const { REACT_DEVELOPER_TOOLS } = installer;
      const name = await installExtension(REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: { allowFileAccess: true },
      });
      console.log(`[DevTools] Added Extension: ${name?.name || name}`);
    } catch (err) {
      console.warn('[DevTools] Failed to install React DevTools:', err);
    }
  }
}
