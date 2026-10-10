import { app, Menu, MenuItem, MenuItemConstructorOptions, shell, BrowserWindow } from 'electron';
import { __ } from './i18n';
import { getConfig, updateConfig } from './config';
import { createSettingsWindow } from './window-settings';
import { getShellWindow } from './window-shell';

const websiteUrl = 'https://yanbab.github.io/appfinder';
const issuesUrl = 'https://github.com/yanbab/appfinder/issues';

function sendToShell(channel: string, ...args: any[]): void {
  const win = getShellWindow();
  if (win && !win.isDestroyed()) {
    if (!win.isVisible()) {
      win.show();
    }
    if (win.isMinimized()) {
      win.restore();
    }
    win.focus();
    win.webContents.send(channel, ...args);
  }
}

let isSidebarVisible = true;
let isStatusbarVisible = false;
let isTerminalVisible = false;

export function updateSidebarChecked(visible: boolean): void {
  isSidebarVisible = visible;
  const menu = Menu.getApplicationMenu();
  if (menu) {
    const item = menu.getMenuItemById('show-sidebar');
    if (item) {
      item.checked = visible;
    }
  }
}

export function updateStatusbarChecked(visible: boolean): void {
  isStatusbarVisible = visible;
  const menu = Menu.getApplicationMenu();
  if (menu) {
    const item = menu.getMenuItemById('show-statusbar');
    if (item) {
      item.checked = visible;
    }
  }
}

export function updateTerminalChecked(visible: boolean): void {
  isTerminalVisible = visible;
  const menu = Menu.getApplicationMenu();
  if (menu) {
    const item = menu.getMenuItemById('show-terminal');
    if (item) {
      item.checked = visible;
    }
  }
}

export function updateMenuItem(id: string, status: { checked?: boolean; enabled?: boolean }): void {
  const menu = Menu.getApplicationMenu();
  if (menu) {
    const item = menu.getMenuItemById(id);
    if (item) {
      if (typeof status.checked === 'boolean') {
        item.checked = status.checked;
      }
      if (typeof status.enabled === 'boolean') {
        item.enabled = status.enabled;
      }
    }
  }
}

export function setupApplicationMenu(): void {
  const config = getConfig();
  isStatusbarVisible = !!config.alwaysShowStatusBar;

  const template: (MenuItemConstructorOptions | MenuItem)[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: __('About %s', app.name) },
        { type: 'separator' },
        {
          label: __('Settings...'),
          accelerator: 'CmdOrCtrl+,',
          click: () => createSettingsWindow()
        },
        { type: 'separator' },
        { role: 'services', label: __('Services') },
        { type: 'separator' },
        { role: 'hide', label: __('Hide %s', app.name) },
        { role: 'hideOthers', label: __('Hide Others') },
        { role: 'unhide', label: __('Show All') },
        { type: 'separator' },
        { role: 'quit', label: __('Quit %s', app.name) }
      ]
    },
    {
      role: 'fileMenu',
      label: __('File'),
      submenu: [
        {
          label: __('Check for New Applications...'),
          accelerator: 'Option+Cmd+N',
          click: () => sendToShell('menu:click', { command: 'fetch-apps' })
        },
        {
          label: __('Check for Updates...'),
          accelerator: 'Option+Cmd+U',
          click: () => sendToShell('menu:click', { command: 'check-updates' })
        },
        { type: 'separator' },
        {
          label: __('Clear Downloaded Files...'),
          click: () => sendToShell('menu:click', { command: 'clear-cache' })
        },
        { type: 'separator' },
        { role: 'close', label: __('Close Window') }
      ]
    },
    {
      role: 'editMenu',
      label: __('Edit'),
      submenu: [
        { role: 'undo', label: __('Undo') },
        { role: 'redo', label: __('Redo') },
        { type: 'separator' },
        { role: 'cut', label: __('Cut') },
        { role: 'copy', label: __('Copy') },
        { role: 'paste', label: __('Paste') },
        { role: 'pasteAndMatchStyle', label: __('Paste and match style') },
        { role: 'delete', label: __('Delete') },
        { role: 'selectAll', label: __('Select All') },
        { type: 'separator' },
        {
          label: __('Search'),
          accelerator: 'CmdOrCtrl+F',
          click: () => sendToShell('menu:click', { command: 'focus-search' })
        }
      ]
    },
    {
      role: 'viewMenu',
      label: __('View'),
      submenu: [
        {
          label: __('Explore'),
          accelerator: 'CmdOrCtrl+1',
          click: () => sendToShell('menu:click', { command: 'select-tab', value: 'discover' })
        },
        {
          label: __('All Apps'),
          accelerator: 'CmdOrCtrl+2',
          click: () => sendToShell('menu:click', { command: 'select-tab', value: 'all-apps' })
        },
        {
          label: __('Installed'),
          accelerator: 'CmdOrCtrl+3',
          click: () => sendToShell('menu:click', { command: 'select-tab', value: 'installed' })
        },
        {
          label: __('Updates'),
          accelerator: 'CmdOrCtrl+4',
          click: () => sendToShell('menu:click', { command: 'select-tab', value: 'updates' })
        },
        { type: 'separator' },
        {
          id: 'view-as-icons',
          label: __('View as grid'),
          enabled: false,
          click: () => sendToShell('menu:click', { command: 'set-view-mode', value: 'grid' })
        },
        {
          id: 'view-as-list',
          label: __('View as list'),
          enabled: false,
          click: () => sendToShell('menu:click', { command: 'set-view-mode', value: 'list' })
        },
        {
          id: 'view-order-by',
          label: __('Order By'),
          enabled: false,
          submenu: [
            {
              label: __('Popular'),
              click: () => sendToShell('menu:click', { command: 'set-order', value: 'popularity' }),
              accelerator: 'Control+Option+1'
            },
            {
              label: __('Recent'),
              click: () => sendToShell('menu:click', { command: 'set-order', value: 'date' }),
              accelerator: 'Control+Option+2'
            },
            {
              label: __('A-Z'),
              click: () => sendToShell('menu:click', { command: 'set-order', value: 'name' }),
              accelerator: 'Control+Option+3'
            }
          ]
        },
        { type: 'separator' },
        {
          id: 'show-sidebar',
          label: __('Show Sidebar'),
          type: 'checkbox',
          checked: isSidebarVisible,
          accelerator: 'Option+Cmd+S',
          click: (menuItem) => {
            isSidebarVisible = menuItem.checked;
            sendToShell('menu:click', { command: 'toggle-sidebar', value: menuItem.checked });
          }
        },
        {
          id: 'show-statusbar',
          label: __('Show Status Bar'),
          type: 'checkbox',
          checked: isStatusbarVisible,
          accelerator: 'CmdOrCtrl+/',
          click: (menuItem) => {
            isStatusbarVisible = menuItem.checked;
            const updated = updateConfig({ alwaysShowStatusBar: menuItem.checked });
            BrowserWindow.getAllWindows().forEach((win) => {
              if (!win.isDestroyed()) {
                win.webContents.send('config:updated', updated);
              }
            });
          }
        },
        { type: 'separator' },
        { role: 'reload', label: __('Reload') },
        { role: 'forceReload', label: __('Force Reload') },
        { role: 'toggleDevTools', label: __('Toggle Developer Tools') }
      ]
    },
    { role: 'windowMenu', label: __('Window') },
    {
      role: 'help',
      label: __('Help'),
      submenu: [{
        label: __('%s website', app.name),
        click: async () => shell.openExternal(websiteUrl)
      }, {
        label: __('Report an issue'),
        click: async () => shell.openExternal(issuesUrl)
      }]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}


