import {
  Injectable,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { UpdateNotificationComponent } from '../components/update-notification/update-notification.component';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'up-to-date';
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

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transloco = inject(TranslocoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private snackbarRef: MatSnackBarRef<UpdateNotificationComponent> | null =
    null;
  private checkingTimeout: ReturnType<typeof setTimeout> | null = null;
  private confirmingRestart = false;
  readonly status = signal<UpdateStatus>('idle');
  readonly updateInfo = signal<UpdateInfo | null>(null);
  readonly downloadProgress = signal<DownloadProgress | null>(null);
  readonly error = signal<string | null>(null);
  readonly currentVersion = signal('');
  readonly lastChecked = signal<Date | null>(null);
  readonly isElectron = computed(
    () =>
      isPlatformBrowser(this.platformId) &&
      typeof window !== 'undefined' &&
      !!window.dolphinUpdater
  );
  readonly canCheckUpdates = computed(
    () =>
      this.isElectron() &&
      ['idle', 'error', 'up-to-date'].includes(this.status())
  );

  constructor() {
    if (!this.isElectron()) return;
    const updater = window.dolphinUpdater;
    let receivedEvent = false;
    const received = () => {
      receivedEvent = true;
      this.clearCheckingTimeout();
      this.error.set(null);
    };
    updater.onUpdateAvailable((info) => {
      received();
      this.updateInfo.set(info);
      this.status.set('available');
      this.lastChecked.set(new Date());
      this.showNotification();
    });
    updater.onUpdateNotAvailable?.(() => {
      received();
      this.status.set('up-to-date');
      this.lastChecked.set(new Date());
    });
    updater.onDownloadProgress((progress) => {
      received();
      this.downloadProgress.set(progress);
      this.status.set('downloading');
    });
    updater.onUpdateDownloaded((info) => {
      received();
      this.updateInfo.set(info);
      this.status.set('ready');
      this.showNotification();
    });
    updater.onError(() => {
      received();
      this.status.set('error');
      this.error.set(this.transloco.translate('updater.errorHelp'));
      this.showNotification();
    });
    updater
      .getAppVersion()
      .then((version) => this.currentVersion.set(version))
      .catch(() => this.currentVersion.set(''));
    updater
      .getUpdateState?.()
      .then((state) => {
        if (receivedEvent || this.status() !== 'idle') return;
        this.status.set(state.status);
        this.updateInfo.set(state.info);
        this.downloadProgress.set(state.progress);
        if (state.checkedAt) this.lastChecked.set(new Date(state.checkedAt));
        if (state.status === 'error')
          this.error.set(this.transloco.translate('updater.errorHelp'));
        if (
          ['available', 'downloading', 'ready', 'error'].includes(state.status)
        )
          this.showNotification();
      })
      .catch(() => {
        /* Live events and manual checks remain available. */
      });
  }

  private clearCheckingTimeout(): void {
    if (this.checkingTimeout) clearTimeout(this.checkingTimeout);
    this.checkingTimeout = null;
  }

  checkForUpdates(): void {
    if (!this.canCheckUpdates()) return;
    this.status.set('checking');
    this.error.set(null);
    this.updateInfo.set(null);
    this.downloadProgress.set(null);
    this.clearCheckingTimeout();
    this.checkingTimeout = setTimeout(() => {
      if (this.status() !== 'checking') return;
      this.status.set('error');
      this.error.set(this.transloco.translate('updater.errorHelp'));
      this.checkingTimeout = null;
      this.showNotification();
    }, 30000);
    window.dolphinUpdater.checkForUpdates();
  }

  installAndRestart(): void {
    if (
      !this.isElectron() ||
      this.status() !== 'ready' ||
      this.confirmingRestart
    )
      return;
    this.confirmingRestart = true;
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: this.transloco.translate('updater.restart'),
          message: this.transloco.translate('updater.restartHelp'),
          confirmLabel: this.transloco.translate('updater.restart'),
          cancelLabel: this.transloco.translate('updater.later'),
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        this.confirmingRestart = false;
        if (confirmed && this.status() === 'ready')
          window.dolphinUpdater.quitAndInstall();
      });
  }

  dismissNotification(): void {
    this.snackbarRef?.dismiss();
  }

  private showNotification(): void {
    if (this.snackbarRef) return;
    const ref = this.snackBar.openFromComponent(UpdateNotificationComponent, {
      data: { service: this },
      duration: 0,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['update-snackbar'],
    });
    this.snackbarRef = ref;
    ref.afterDismissed().subscribe(() => {
      if (this.snackbarRef === ref) this.snackbarRef = null;
    });
  }
}
