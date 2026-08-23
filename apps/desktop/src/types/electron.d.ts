export type DolphinUpdater = {
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateNotAvailable?: (callback: (info: UpdateInfo) => void) => void;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
  onError: (callback: (error: string) => void) => void;
  checkForUpdates: () => void;
  quitAndInstall: () => void;
  getAppVersion: () => Promise<string>;
  removeAllListeners: (channel: string) => void;
};

export type UpdateInfo = {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
  files?: Array<{ url: string; size: number }>;
};

export type DownloadProgress = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    dolphinUpdater: DolphinUpdater;
    dolphinWindow: { openExternal: (url: string) => void };
  }
}
