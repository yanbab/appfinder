// Application menu

const { app, Menu, shell } = require('electron');
const { __ } = require('./i18n');
const { getConfig } = require('./config');
const { createSettingsWindow } = require('./window-settings');
const { getShellWindow } = require('./window-shell');

const websiteUrl = 'https://yanbab.github.io/appfinder';
const githubUrl = 'https://github.com/yanbab/appfinder';

function sendToShell(channel, ...args) {
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

function updateSidebarChecked(visible) {
  isSidebarVisible = visible;
  const menu = Menu.getApplicationMenu();
  if (menu) {
    const item = menu.getMenuItemById('show-sidebar');
    if (item) {
      item.checked = visible;
    }
  }
}

function setupApplicationMenu() {
  const isDebug = !!getConfig().debug;

  const template = [
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
      role: 'fileMenu', label: __("File"),
      submenu: [
        { role: 'close', label: __('Close Window') }
      ]
    },
    {
      label: __('Edit'),
      submenu: [
        { role: 'undo', label: __('Undo') },
        { role: 'redo', label: __('Redo') },
        { type: 'separator' },
        { role: 'cut', label: __('Cut') },
        { role: 'copy', label: __('Copy') },
        { role: 'paste', label: __('Paste') },
        { type: 'separator' },
        { role: 'selectAll', label: __('Select All') },
      ]
    },
    {
      label: __('View'),

      submenu: [
        {
          label: __('Search'),
          accelerator: 'CmdOrCtrl+F',
          click: () => sendToShell('shell:focus-search')
        },
        { type: 'separator' },
        {
          label: __('Explore'),
          accelerator: 'Cmd+1',
          click: () => sendToShell('shell:select-tab', 'discover')
        },
        {
          label: __('All Apps'),
          accelerator: 'CmdOrCtrl+2',
          click: () => sendToShell('shell:select-tab', 'all-apps')
        },
        {
          label: __('Installed'),
          accelerator: 'CmdOrCtrl+3',
          click: () => sendToShell('shell:select-tab', 'installed')
        },
        {
          label: __('Updates'),
          accelerator: 'CmdOrCtrl+4',
          click: () => sendToShell('shell:select-tab', 'updates')
        },
        { type: 'separator' },
        {
          label: __('Order By'),
          submenu: [
            {
              label: __('Popular'),
              click: () => sendToShell('shell:set-order', 'popularity'),
              accelerator: 'Option+CmdOrCtrl+1'
            },
            {
              label: __('Recent'),
              click: () => sendToShell('shell:set-order', 'date'),
              accelerator: 'Option+CmdOrCtrl+2'
            },
            {
              label: __('A-Z'),
              click: () => sendToShell('shell:set-order', 'name'),
              accelerator: 'Option+CmdOrCtrl+3'
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
            sendToShell('shell:toggle-sidebar', menuItem.checked);
          }
        },
        { type: 'separator' },
        {
          label: __('Check for Updates...'),
          accelerator: 'Option+Cmd+U',
          click: () => sendToShell('shell:check-updates')
        },
        ...(isDebug ? [
          { type: 'separator' },
          { role: 'reload' },
          { role: 'toggleDevTools' }
        ] : [])
      ]
    },
    { role: 'windowMenu', label: __("Window") },
    {
      role: 'help',
      label: __('Help'),
      submenu: [{
        label: __('%s Website', app.name),
        click: async () => shell.openExternal(websiteUrl)
      }, {
        label: __('%s GitHub Repository', app.name),
        click: async () => shell.openExternal(githubUrl)
      }]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = {
  setupApplicationMenu,
  updateSidebarChecked
};
