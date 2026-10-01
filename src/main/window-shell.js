// Shell window

const { BrowserWindow, app } = require('electron');
const path = require('path');

const preloadPath = path.join(__dirname, './ipc-renderer.js');
const rendererPath = path.join(__dirname, '../../dist/vite/index.html');

let mainWindow = null;

function loadContent(win) {
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(rendererPath);
    }
}

function createShellWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        loadContent(mainWindow);
        if (!mainWindow.isVisible()) mainWindow.show();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        return mainWindow;
    }

    mainWindow = new BrowserWindow({
        title: 'AppFinder',
        name: 'shell',
        width: 800,
        height: 750,
        minWidth: 360,
        minHeight: 260,
        acceptFirstMouse: true,
        autoHideMenuBar: true,
        backgroundColor: '#00000000',
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 15, y: 15 },
        vibrancy: 'sidebar',
        show: false,
        frame: false,
        windowStatePersistence: true,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            scrollBounce: true
        }
    });
    loadContent(mainWindow);
    mainWindow.on('close', () => {
        app.quit();
    });
    mainWindow.once('ready-to-show', mainWindow.show);
    return mainWindow;
}

function getShellWindow() {
    return mainWindow;
}

module.exports = {
    createShellWindow,
    getShellWindow
};