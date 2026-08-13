import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
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
  imports: [CommonModule, MatIconModule, TranslocoPipe],
  template: `
    <div class="w-full max-w-[440px] select-none p-1">
      <div class="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/95 dark:shadow-neutral-950/70">
        
        <div class="flex items-start gap-3.5 p-5">
          <!-- Icon badge -->
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors"
            [ngClass]="{
              'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400': status() === 'available' || status() === 'downloading',
              'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400': status() === 'ready',
              'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400': status() === 'error',
              'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400': status() === 'checking'
            }"
          >
            <mat-icon
              [svgIcon]="icon()"
              class="icon-size-5"
              [class.animate-spin]="status() === 'checking' || status() === 'downloading'"
            />
          </div>

          <!-- Text body & Progress -->
          <div class="flex min-w-0 flex-auto flex-col">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">
                {{ title() }}
              </span>
              <button
                type="button"
                (click)="dismiss()"
                class="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                [attr.aria-label]="'common.close' | transloco"
              >
                <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
              </button>
            </div>

            <p class="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              {{ message() }}
            </p>

            @if (status() === 'downloading' && downloadProgress()) {
              <div class="mt-3.5 flex flex-col gap-1.5">
                <div class="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                    [style.width.%]="roundedPercent()"
                  ></div>
                </div>
                <div class="flex items-center justify-between text-[11px] font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                  <span class="font-bold text-neutral-900 dark:text-white">{{ roundedPercent() }}%</span>
                  <span>{{ formatBytes(downloadProgress()!.transferred) }} / {{ formatBytes(downloadProgress()!.total) }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        @if (showActions()) {
          <div class="flex items-center justify-end gap-2.5 border-t border-neutral-100 bg-neutral-50/70 px-5 py-3 dark:border-neutral-800/80 dark:bg-neutral-950/40">
            @if (status() === 'available') {
              <button
                type="button"
                (click)="dismiss()"
                class="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {{ 'updater.later' | transloco }}
              </button>
              <button
                type="button"
                (click)="downloadAndInstall()"
                class="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 cursor-pointer"
              >
                <mat-icon svgIcon="download" class="icon-size-3.5"></mat-icon>
                {{ 'updater.installNow' | transloco }}
              </button>
            }

            @if (status() === 'downloading') {
              <button
                type="button"
                (click)="dismiss()"
                class="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {{ 'updater.later' | transloco }}
              </button>
            }

            @if (status() === 'ready') {
              <button
                type="button"
                (click)="installAndRestart()"
                class="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
              >
                <mat-icon svgIcon="rotate-cw" class="icon-size-3.5"></mat-icon>
                {{ 'updater.restart' | transloco }}
              </button>
            }

            @if (status() === 'error') {
              <button
                type="button"
                (click)="dismiss()"
                class="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {{ 'updater.later' | transloco }}
              </button>
              <button
                type="button"
                (click)="retry()"
                class="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 cursor-pointer"
              >
                <mat-icon svgIcon="refresh-cw" class="icon-size-3.5"></mat-icon>
                {{ 'updater.retry' | transloco }}
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
  private snackBarRef = inject(MatSnackBarRef<UpdateNotificationComponent>);
  public data = inject<SnackBarData>(MAT_SNACK_BAR_DATA);

  protected status = computed(() => this.data.service.status());
  protected updateInfo = computed(() => this.data.service.updateInfo());
  protected downloadProgress = computed(() => this.data.service.downloadProgress());
  protected error = computed(() => this.data.service.error());

  protected roundedPercent = computed(() => Math.round(this.downloadProgress()?.percent ?? 0));

  protected icon = computed(() => {
    switch (this.status()) {
      case 'available':
        return 'sparkles';
      case 'downloading':
        return 'loader-circle';
      case 'ready':
        return 'circle-check-big';
      case 'error':
        return 'circle-alert';
      case 'checking':
        return 'loader-circle';
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