export interface DolphinUpdater {
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateNotAvailable?: (callback: (info: UpdateInfo) => void) => void;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
  onError: (callback: (error: string) => void) => void;
  checkForUpdates: () => void;
  quitAndInstall: () => void;
  getAppVersion: () => Promise<string>;
  removeAllListeners: (channel: string) => void;
}

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
  files?: Array<{ url: string; size: number }>;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

declare global {
  interface Window {
    dolphinUpdater: DolphinUpdater;
    dolphinWindow: { openExternal: (url: string) => void };
  }
}
