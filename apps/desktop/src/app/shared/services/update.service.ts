import { Injectable, inject, signal, computed } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { UpdateNotificationComponent } from '../components/update-notification/update-notification.component';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'up-to-date';

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

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transloco = inject(TranslocoService);
  private readonly snackBar = inject(MatSnackBar);

  private snackbarRef: MatSnackBarRef<UpdateNotificationComponent> | null = null;

  readonly status = signal<UpdateStatus>('idle');
  readonly updateInfo = signal<UpdateInfo | null>(null);
  readonly downloadProgress = signal<DownloadProgress | null>(null);
  readonly error = signal<string | null>(null);
  readonly currentVersion = signal<string>('');

  readonly isElectron = computed(() => {
    if (!isPlatformBrowser(this.platformId)) return false;
    return typeof window !== 'undefined' && !!window.dolphinUpdater;
  });

  readonly canCheckUpdates = computed(() => this.isElectron() && this.status() !== 'checking' && this.status() !== 'downloading');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initElectronListeners();
      this.fetchCurrentVersion();
    }
  }

  private fetchCurrentVersion(): void {
    if (this.isElectron()) {
      window.dolphinUpdater.getAppVersion().then((version) => {
        this.currentVersion.set(version);
      }).catch(() => {
        this.currentVersion.set('unknown');
      });
    }
  }

  private initElectronListeners(): void {
    if (!this.isElectron()) return;

    const updater = window.dolphinUpdater;

    updater.onUpdateAvailable((info: UpdateInfo) => {
      this.updateInfo.set(info);
      this.status.set('available');
      this.showNotification();
    });

    updater.onDownloadProgress((progress: DownloadProgress) => {
      this.downloadProgress.set(progress);
      this.status.set('downloading');
    });

    updater.onUpdateDownloaded((info: UpdateInfo) => {
      this.updateInfo.set(info);
      this.status.set('ready');
      this.error.set(null);
    });

    updater.onError((error: string) => {
      this.error.set(error);
      this.status.set('error');
    });
  }

  checkForUpdates(): void {
    if (!this.isElectron()) {
      this.error.set(this.transloco.translate('updater.notElectron'));
      return;
    }

    this.status.set('checking');
    this.error.set(null);
    this.updateInfo.set(null);
    this.downloadProgress.set(null);

    window.dolphinUpdater.checkForUpdates();
  }

  installAndRestart(): void {
    if (!this.isElectron()) return;
    window.dolphinUpdater.quitAndInstall();
  }

  dismissNotification(): void {
    if (this.snackbarRef) {
      this.snackbarRef.dismiss();
      this.snackbarRef = null;
    }
    this.status.set('idle');
  }

  private showNotification(): void {
    if (this.snackbarRef) return;

    this.snackbarRef = this.snackBar.openFromComponent(UpdateNotificationComponent, {
      data: {
        service: this,
        updateInfo: this.updateInfo(),
        downloadProgress: this.downloadProgress(),
        status: this.status(),
        error: this.error(),
      },
      duration: 0,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['update-snackbar', '!p-0', '!bg-transparent', '!shadow-none'],
    });

    this.snackbarRef.afterDismissed().subscribe(() => {
      this.snackbarRef = null;
      if (this.status() === 'available' || this.status() === 'downloading') {
        this.status.set('idle');
      }
    });
  }
}