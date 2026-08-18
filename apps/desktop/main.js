const { app, BrowserWindow, ipcMain, protocol, net, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

log.transports.file.level = 'info';
autoUpdater.logger = log;

// Register 'app' as a privileged scheme BEFORE app is ready.
// This allows Angular's HttpClient and fetch() to work on this scheme,
// fixing issues with transloco i18n files and other XHR requests.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // Remove native titlebar — the Angular app renders its own controls
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
  });

  const isDev = process.argv.includes('--dev');

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log.error(`Failed to load ${validatedURL}: [${errorCode}] ${errorDescription}`);
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://') && !url.startsWith('http://localhost:3873')) event.preventDefault();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3873');
    mainWindow.webContents.openDevTools();
  } else {
    // Use the custom 'app://' scheme so that all requests (images, i18n JSON,
    // fonts, etc.) are served through our protocol handler, just like a real
    // web server.  This avoids the limitations of the raw file:// protocol.
    mainWindow.loadURL('app://localhost/index.html');
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
    if (mainWindow) {
      mainWindow.webContents.send('dolphin:update-not-available', info);
    }
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
      if (mainWindow) {
        mainWindow.webContents.send('dolphin:update-error', err.message || 'Error checking for updates');
      }
    });
  });

  ipcMain.on('dolphin:quit-and-install', () => {
    autoUpdater.quitAndInstall();
  });

  // Custom frameless window controls
  ipcMain.on('dolphin:window-minimize', () => mainWindow?.minimize());
  ipcMain.on('dolphin:window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('dolphin:window-close', () => mainWindow?.close());
  ipcMain.on('dolphin:open-external', (_event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:') shell.openExternal(parsed.toString());
    } catch {
      log.warn('Rejected invalid external URL');
    }
  });

  // Notify renderer when maximize state changes
  mainWindow?.on('maximize',   () => mainWindow?.webContents.send('dolphin:window-maximized', true));
  mainWindow?.on('unmaximize', () => mainWindow?.webContents.send('dolphin:window-maximized', false));
}

app.on('ready', () => {
  // Register the custom 'app://' protocol handler.
  // Every request to app://localhost/<path> is mapped to the Angular
  // build output directory: dist/desktop/browser/<path>
  const appRoot = path.join(__dirname, 'dist', 'desktop', 'browser');

  protocol.handle('app', (request) => {
    // Strip the scheme + hostname to get just the file path
    const urlPath = request.url.replace(/^app:\/\/localhost\/?/, '');
    // Decode URI components (spaces, special chars)
    let decoded;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      return new Response('Invalid resource path', { status: 400 });
    }
    // Resolve to an absolute file path inside the build output
    const filePath = path.resolve(appRoot, decoded);
    const root = path.resolve(appRoot);
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      return new Response('Forbidden', { status: 403 });
    }

    log.info(`[app://] ${request.url} → ${filePath}`);
    return net.fetch('file://' + filePath);
  });

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
