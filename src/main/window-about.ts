// Context Menu 

import { Menu, ipcMain, BrowserWindow, shell, clipboard, MenuItemConstructorOptions } from 'electron';
import { getConfig } from './config';
import { __ } from './i18n';

export function setupAboutWindow(): void {

  app.setAboutPanelOptions({
    applicationName: 'AppFinder',
    applicationVersion: '0.9.12',
    copyright: 'Copyright © 2026 Yan Bab',
    version: '0.9.12',
    credits: 'Made with 🍺 by YanBab',
  })

}


