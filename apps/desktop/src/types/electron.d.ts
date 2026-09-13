export type DolphinUpdater = {
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateNotAvailable?: (callback: (info: UpdateInfo) => void) => void;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
  onError: (callback: (error: string) => void) => void;
  checkForUpdates: () => void;
  quitAndInstall: () => void;
  getReleaseNotes?: (version: string) => Promise<string>;
  getAppVersion: () => Promise<string>;
  getUpdateState?: () => Promise<{
    status:
      | 'idle'
      | 'checking'
      | 'available'
      | 'downloading'
      | 'ready'
      | 'error'
      | 'up-to-date';
    info: UpdateInfo | null;
    progress: DownloadProgress | null;
    checkedAt: string | null;
  }>;
  removeAllListeners: (channel: string) => void;
};

export type UpdateInfo = {
  version: string;
  releaseNotes?: string | Array<{ version: string; note: string }>;
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
    dolphinGoogle?: { open(url: string): Promise<void>; close(): Promise<void>; isClosed(): Promise<boolean> };
    dolphinWindow: { openExternal: (url: string) => void };
  }
}
