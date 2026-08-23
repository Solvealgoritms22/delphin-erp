const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dolphinUpdater', {
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('dolphin:update-available', (_event, info) => callback(info));
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('dolphin:update-not-available', (_event, info) => callback(info));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('dolphin:download-progress', (_event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('dolphin:update-downloaded', (_event, info) => callback(info));
  },
  onError: (callback) => {
    ipcRenderer.on('dolphin:update-error', (_event, error) => callback(error));
  },
  checkForUpdates: () => {
    ipcRenderer.send('dolphin:check-for-updates');
  },
  quitAndInstall: () => {
    ipcRenderer.send('dolphin:quit-and-install');
  },
  getAppVersion: () => {
    return ipcRenderer.invoke('dolphin:get-app-version');
  },
  removeAllListeners: () => {
    ['dolphin:update-available', 'dolphin:update-not-available', 'dolphin:download-progress', 'dolphin:update-downloaded', 'dolphin:update-error'].forEach((channel) => ipcRenderer.removeAllListeners(channel));
  }
});

// Window control bridge (used by frameless window custom titlebar)
contextBridge.exposeInMainWorld('dolphinWindow', {
  minimize: () => ipcRenderer.send('dolphin:window-minimize'),
  maximize: () => ipcRenderer.send('dolphin:window-maximize'),
  close:    () => ipcRenderer.send('dolphin:window-close'),
  openExternal: (url) => ipcRenderer.send('dolphin:open-external', url),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('dolphin:window-maximized', (_e, isMaximized) => callback(isMaximized));
  },
});
