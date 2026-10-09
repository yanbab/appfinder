// Context Menu 

import { Menu, ipcMain, BrowserWindow, shell, clipboard, MenuItemConstructorOptions } from 'electron';
import { getConfig } from './config';
import { __ } from './i18n';

export function setupContextMenu(): void {
  ipcMain.on('context-menu:show', (event, { type, appInfo, linkUrl, selectedText, x, y }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;

    const config = getConfig();
    const isDebug = !!config.debug;

    const template: MenuItemConstructorOptions[] = [];

    if (type === 'search') {
      template.push(
        { role: 'cut', label: __('Cut') },
        { role: 'copy', label: __('Copy') },
        { role: 'paste', label: __('Paste') }
      );
    } else if (type === 'link') {
      if (selectedText) {
        template.push({
          label: __('Copy'),
          accelerator: 'CmdOrCtrl+C',
          click: () => clipboard.writeText(selectedText)
        });
      }
      if (linkUrl) {
        template.push({
          label: __('Copy Link'),
          click: () => clipboard.writeText(linkUrl)
        });
        if (process.platform === 'darwin') {
          template.push({
            role: 'shareMenu',
            sharingItem: {
              urls: [linkUrl]
            }
          } as MenuItemConstructorOptions);
        }
      }
    } else if (type === 'text') {
      template.push({
        label: __('Copy'),
        accelerator: 'CmdOrCtrl+C',
        click: () => {
          if (selectedText) {
            clipboard.writeText(selectedText);
          } else if (win && !win.isDestroyed()) {
            win.webContents.copy();
          }
        }
      });
    } else if (type === 'app' && appInfo) {
      const { token, app, homepage, isInstalled, isOutdated, isRunning, name } = appInfo;

      if (isRunning) {
        const actionVerb = appInfo.runningAction
          ? (appInfo.runningAction === 'install' ? __('Installing...')
            : appInfo.runningAction === 'uninstall' ? __('Removing...')
            : appInfo.runningAction === 'upgrade' ? __('Upgrading...')
            : appInfo.runningAction === 'refresh' || appInfo.runningAction === 'fetch' ? __('Updating...')
            : __('Working...'))
          : __('Working...');
        template.push({
          label: actionVerb,
          enabled: false
        });
      } else {
        if (isInstalled && (app || token)) {
          template.push({
            label: __('Open'),
            click: () => win.webContents.send('context-menu:action', { action: 'open', token })
          });
          template.push({ type: 'separator' });
        }

        if (!isInstalled) {
          template.push({
            label: __('Install'),
            click: () => win.webContents.send('context-menu:action', { action: 'install', token })
          });
        } else {
          if (isOutdated) {
            template.push({
              label: __('Upgrade'),
              click: () => win.webContents.send('context-menu:action', { action: 'upgrade', token })
            });
          }
          template.push({
            label: __('Delete'),
            click: () => win.webContents.send('context-menu:action', { action: 'uninstall', token })
          });
        }

        if (homepage) {
          template.push({ type: 'separator' });
          template.push({
            label: __('Website'),
            click: () => shell.openExternal(homepage)
          });
          if (process.platform === 'darwin') {
            template.push({
              role: 'shareMenu',
              sharingItem: {
                urls: [homepage],
                texts: [name || app || token]
              }
            } as MenuItemConstructorOptions);
          }
        }
      }
    } else {
      if (!isDebug) {
        return;
      }
    }

    if (isDebug) {
      if (template.length > 0) {
        template.push({ type: 'separator' });
      }
      template.push({
        label: __('Inspect'),
        click: () => {
          win.webContents.inspectElement(Math.round(x), Math.round(y));
          if (!win.webContents.isDevToolsOpened()) {
            win.webContents.openDevTools({ mode: 'detach' });
          }
        }
      });
    }

    if (template.length === 0) return;

    const menu = Menu.buildFromTemplate(template);
    menu.popup({
      window: win,
      x: Math.round(x),
      y: Math.round(y)
    });
  });
}



