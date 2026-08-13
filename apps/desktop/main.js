const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

log.transports.file.level = 'info';
autoUpdater.logger = log;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Dolphin ERP',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
  });

  const isDev = process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:3873');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'dist/desktop/browser/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('dolphin:update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto updater error:', err);
    if (mainWindow) {
      mainWindow.webContents.send('dolphin:update-error', err.message);
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('dolphin:download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    if (mainWindow) {
      mainWindow.webContents.send('dolphin:update-downloaded', info);
    }
  });

  ipcMain.handle('dolphin:get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.on('dolphin:check-for-updates', () => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Manual check failed:', err);
    });
  });

  ipcMain.on('dolphin:quit-and-install', () => {
    autoUpdater.quitAndInstall();
  });
}

app.on('ready', () => {
  createWindow();
  setupAutoUpdater();

  if (!process.argv.includes('--dev')) {
    autoUpdater.checkForUpdates();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});