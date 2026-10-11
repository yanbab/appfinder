// Context Menu 

import { Menu, ipcMain, BrowserWindow, shell, clipboard, MenuItemConstructorOptions } from 'electron';
import { getConfig } from './config';
import { __ } from './i18n';

function addSeparator(template: MenuItemConstructorOptions[]): void {
  if (template.length > 0 && template[template.length - 1].type !== 'separator') {
    template.push({ type: 'separator' });
  }
}

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
      const {
        token,
        app,
        homepage,
        isInstalled,
        isOutdated,
        isRunning,
        runningAction,
        isService,
        isServiceRunning,
        isFont,
        canOpen,
        name
      } = appInfo;

      if (isRunning) {
        const actionVerb = runningAction === 'install' ? __('Installing...')
          : runningAction === 'uninstall' ? __('Deleting...')
          : runningAction === 'upgrade' ? __('Updating...')
          : runningAction === 'reinstall' ? __('Reinstalling...')
          : runningAction === 'refresh' || runningAction === 'fetch' ? __('Updating...')
          : __('Working...');
        template.push({
          label: actionVerb,
          enabled: false
        });
        template.push({
          label: __('Cancel'),
          click: () => win.webContents.send('context-menu:action', { action: 'cancel', token })
        });
        addSeparator(template);
        if (homepage) {
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
          addSeparator(template);
        }
        template.push({
          label: __('Copy Token'),
          click: () => clipboard.writeText(token)
        });
      } else if (!isInstalled) {
        template.push({
          label: __('Install'),
          click: () => win.webContents.send('context-menu:action', { action: 'install', token })
        });
        addSeparator(template);
        template.push({
          label: __('Get Info'),
          click: () => win.webContents.send('context-menu:action', { action: 'info', token })
        });
        if (homepage) {
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
        addSeparator(template);
        template.push({
          label: __('Copy Token'),
          click: () => clipboard.writeText(token)
        });
      } else {
        // Installed
        if (isOutdated) {
          template.push({
            label: __('Upgrade'),
            click: () => win.webContents.send('context-menu:action', { action: 'upgrade', token })
          });
          addSeparator(template);
        }

        if (isService) {
          if (isServiceRunning) {
            template.push({
              label: __('Stop Service'),
              click: () => win.webContents.send('context-menu:action', { action: 'service-stop', token })
            });
            template.push({
              label: __('Restart Service'),
              click: () => win.webContents.send('context-menu:action', { action: 'service-restart', token })
            });
          } else {
            template.push({
              label: __('Start Service'),
              click: () => win.webContents.send('context-menu:action', { action: 'service-start', token })
            });
          }
        } else if (isFont) {
          template.push({
            label: __('Open in Font Book'),
            click: () => win.webContents.send('context-menu:action', { action: 'open', token })
          });
          template.push({
            label: __('Show in Finder'),
            click: () => win.webContents.send('context-menu:action', { action: 'reveal', token })
          });
        } else {
          if (canOpen) {
            template.push({
              label: __('Open'),
              click: () => win.webContents.send('context-menu:action', { action: 'open', token })
            });
          }
          template.push({
            label: __('Show in Finder'),
            click: () => win.webContents.send('context-menu:action', { action: 'reveal', token })
          });
        }

        addSeparator(template);

        template.push({
          label: __('Reinstall'),
          click: () => win.webContents.send('context-menu:action', { action: 'reinstall', token })
        });
        template.push({
          label: __('Delete'),
          click: () => win.webContents.send('context-menu:action', { action: 'uninstall', token })
        });

        addSeparator(template);

        template.push({
          label: __('Get Info'),
          click: () => win.webContents.send('context-menu:action', { action: 'info', token })
        });

        if (homepage) {
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

        addSeparator(template);

        template.push({
          label: __('Copy Token'),
          click: () => clipboard.writeText(token)
        });
      }
    } else {
      if (!isDebug) {
        return;
      }
    }

    if (isDebug) {
      addSeparator(template);
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

    while (template.length > 0 && template[template.length - 1].type === 'separator') {
      template.pop();
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



