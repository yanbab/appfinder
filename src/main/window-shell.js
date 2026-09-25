// Shell window

const { BrowserWindow, app } = require('electron');
const path = require('path');

const preloadPath = path.join(__dirname, '../renderer/ipc-renderer.js');
const rendererPath = path.join(__dirname, '../renderer/shell/shell.html');

let mainWindow = null;

function createShellWindow() {
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
    mainWindow.loadFile(rendererPath);
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