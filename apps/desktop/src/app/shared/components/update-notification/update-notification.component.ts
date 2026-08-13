import { Component, Inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule } from '@jsverse/transloco';
import { UpdateService, UpdateStatus, UpdateInfo, DownloadProgress } from '../../services/update.service';

interface SnackBarData {
  service: UpdateService;
  updateInfo: UpdateInfo | null;
  downloadProgress: DownloadProgress | null;
  status: UpdateStatus;
  error: string | null;
}

@Component({
  selector: 'app-update-notification',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule, TranslocoModule],
  template: `
    <div class="w-full max-w-md">
      <div
        class="rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden"
        [ngClass]="{
          'bg-blue-50 dark:bg-blue-900/30': status() === 'available' || status() === 'downloading',
          'bg-emerald-50 dark:bg-emerald-900/30': status() === 'ready',
          'bg-red-50 dark:bg-red-900/30': status() === 'error',
          'bg-amber-50 dark:bg-amber-900/30': status() === 'checking'
        }"
      >
        <div class="flex items-start gap-4 p-4">
          <mat-icon
            class="mt-1 shrink-0 text-xl"
            [svgIcon]="icon()"
            [ngClass]="{
              'text-blue-600 dark:text-blue-400': status() === 'available' || status() === 'downloading',
              'text-emerald-600 dark:text-emerald-400': status() === 'ready',
              'text-red-600 dark:text-red-400': status() === 'error',
              'text-amber-600 dark:text-amber-400 animate-spin': status() === 'checking'
            }"
          />

          <div class="flex-auto min-w-0">
            <div class="font-semibold text-neutral-900 dark:text-white">
              {{ title() }}
            </div>
            <div class="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
              {{ message() }}
            </div>

            @if (status() === 'downloading' && downloadProgress()) {
              <div class="mt-3">
                <mat-progress-bar
                  mode="determinate"
                  [value]="downloadProgress()!.percent"
                  class="h-1.5 rounded-full"
                  color="primary"
                />
                <div class="mt-1 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>{{ downloadProgress()!.percent }}%</span>
                  <span>{{ formatBytes(downloadProgress()!.transferred) }} / {{ formatBytes(downloadProgress()!.total) }}</span>
                </div>
              </div>
            }
          </div>

          <button
            mat-icon-button
            class="-m-2 shrink-0"
            (click)="dismiss()"
            [matTooltip]="'common.close' | transloco"
          >
            <mat-icon svgIcon="x" class="size-5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" />
          </button>
        </div>

        @if (showActions()) {
          <div class="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-end gap-2">
            @if (status() === 'available') {
              <button
                mat-stroked-button
                (click)="dismiss()"
                class="text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {{ 'updater.later' | transloco }}
              </button>
              <button
                mat-flat-button
                color="primary"
                (click)="downloadAndInstall()"
                class="text-white"
              >
                <mat-icon svgIcon="download" class="icon-size-4 mr-2"></mat-icon>
                {{ 'updater.installNow' | transloco }}
              </button>
            }

            @if (status() === 'downloading') {
              <button
                mat-stroked-button
                (click)="dismiss()"
                class="text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {{ 'updater.later' | transloco }}
              </button>
            }

            @if (status() === 'ready') {
              <button
                mat-flat-button
                color="primary"
                (click)="installAndRestart()"
                class="text-white"
              >
                <mat-icon svgIcon="rotate-cw" class="icon-size-4 mr-2"></mat-icon>
                {{ 'updater.restart' | transloco }}
              </button>
            }

            @if (status() === 'error') {
              <button
                mat-flat-button
                color="primary"
                (click)="retry()"
                class="text-white"
              >
                <mat-icon svgIcon="refresh-cw" class="icon-size-4 mr-2"></mat-icon>
                {{ 'updater.retry' | transloco }}
              </button>
              <button
                mat-stroked-button
                (click)="dismiss()"
                class="text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {{ 'updater.later' | transloco }}
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  host: {
    class: 'block',
  },
})
export class UpdateNotificationComponent {
  constructor(
    private snackBarRef: MatSnackBarRef<UpdateNotificationComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackBarData
  ) {}

  protected status = computed(() => this.data.service.status());
  protected updateInfo = computed(() => this.data.service.updateInfo());
  protected downloadProgress = computed(() => this.data.service.downloadProgress());
  protected error = computed(() => this.data.service.error());

  protected icon = computed(() => {
    switch (this.status()) {
      case 'available':
      case 'downloading':
        return 'package';
      case 'ready':
        return 'circle-check-big';
      case 'error':
        return 'alert-circle';
      case 'checking':
        return 'refresh-cw';
      default:
        return 'info';
    }
  });

  protected title = computed(() => {
    switch (this.status()) {
      case 'available':
        return 'Nueva versión disponible';
      case 'downloading':
        return 'Descargando actualización...';
      case 'ready':
        return 'Actualización lista';
      case 'error':
        return 'Error al actualizar';
      case 'checking':
        return 'Buscando actualizaciones...';
      default:
        return '';
    }
  });

  protected message = computed(() => {
    const info = this.updateInfo();
    switch (this.status()) {
      case 'available':
        return info ? `Versión ${info.version} disponible para instalar.` : 'Hay una nueva versión disponible.';
      case 'downloading':
        return 'La actualización se está descargando en segundo plano.';
      case 'ready':
        return info ? `Versión ${info.version} descargada. Reinicia para aplicar.` : 'La actualización se ha descargado. Reinicia la aplicación para aplicarla.';
      case 'error':
        return this.error() || 'Ocurrió un error al buscar actualizaciones.';
      case 'checking':
        return 'Comprobando si hay nuevas versiones...';
      default:
        return '';
    }
  });

  protected showActions = computed(() => {
    const s = this.status();
    return s === 'available' || s === 'downloading' || s === 'ready' || s === 'error';
  });

  public updateProgress(percent: number): void {
    const current = this.data.service.downloadProgress();
    if (current) {
      this.data.service.downloadProgress.set({ ...current, percent });
    }
  }

  public setReady(ready: boolean): void {
    if (ready) {
      this.data.service.status.set('ready');
    }
  }

  public setError(error: string): void {
    this.data.service.error.set(error);
    this.data.service.status.set('error');
  }

  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  protected dismiss(): void {
    this.snackBarRef.dismiss();
  }

  protected downloadAndInstall(): void {
    this.data.service.checkForUpdates();
    this.snackBarRef.dismiss();
  }

  protected installAndRestart(): void {
    this.data.service.installAndRestart();
    this.snackBarRef.dismiss();
  }

  protected retry(): void {
    this.data.service.checkForUpdates();
  }
}