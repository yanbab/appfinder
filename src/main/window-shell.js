// Shell window

const { BrowserWindow, app } = require('electron');
const path = require('path');

const preloadPath = path.join(__dirname, '../renderer/ipc-renderer.js');
let currentIsReact = process.env.USE_REACT === '1' || process.env.USE_REACT === 'true';

const getRendererPath = (forceReact) => {
    const isReact = typeof forceReact === 'boolean' ? forceReact : currentIsReact;
    return isReact
        ? path.join(__dirname, '../renderer-react/dist/index.html')
        : path.join(__dirname, '../renderer/shell/shell.html');
};

let mainWindow = null;

function createShellWindow(forceReact) {
    if (typeof forceReact === 'boolean') {
        currentIsReact = forceReact;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadFile(getRendererPath(forceReact));
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
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 15, y: 15 },
        backgroundColor: '#00000000',
        vibrancy: 'sidebar',
        show: false,
        windowStatePersistence: true,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            scrollBounce: true
        }
    });
    mainWindow.loadFile(getRendererPath(forceReact));
    mainWindow.on('close', () => {
        app.quit();
    });
    mainWindow.once('ready-to-show', mainWindow.show);
    return mainWindow;
}

function getShellWindow() {
    return mainWindow;
}

function isReactShell() {
    return currentIsReact;
}

module.exports = {
    createShellWindow,
    getShellWindow,
    isReactShell
};