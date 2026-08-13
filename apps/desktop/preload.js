const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dolphinUpdater', {
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('dolphin:update-available', (_event, info) => callback(info));
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
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});