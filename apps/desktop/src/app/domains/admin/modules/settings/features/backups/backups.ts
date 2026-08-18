import { Component, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { environment } from '@/environments/environment';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';

type Backup = {
  id: string;
  nombreArchivo: string;
  proveedor: string;
  estado: string;
  tamanoBytes?: string | number;
  creadoEn: string;
};

@Component({
  selector: 'app-backups',
  standalone: true,
  host: { class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden' },
  imports: [
    DatePipe,
    NgClass,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslocoPipe,
    EmptyStateComponent,
  ],
  template: `
    <div class="flex h-full w-full min-w-0 flex-col bg-white dark:bg-neutral-900">
      <header
        class="flex shrink-0 flex-col justify-between gap-6 border-b border-neutral-200 px-6 py-8 sm:flex-row sm:items-center md:px-8 dark:border-neutral-800"
      >
        <div>
          <h1
            class="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'backups.title' | transloco }}
          </h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'backups.description' | transloco }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2.5">
          <button
            mat-stroked-button
            type="button"
            class="rounded-xl"
            (click)="connectDrive()"
          >
            <mat-icon svgIcon="google-drive" class="mr-2"></mat-icon>
            {{ 'backups.connectDrive' | transloco }}
          </button>
          <button
            mat-flat-button
            color="primary"
            type="button"
            class="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            [disabled]="busy()"
            (click)="create('LOCAL')"
          >
            <mat-icon svgIcon="plus" class="mr-2"></mat-icon>
            {{ 'backups.createLocal' | transloco }}
          </button>
        </div>
      </header>

      <div class="flex-auto overflow-y-auto p-6 md:p-8">
        @if (backups().length === 0) {
          <app-empty-state
            icon="archive"
            [title]="'backups.emptyTitle' | transloco"
            [description]="'backups.emptyDescription' | transloco"
          />
        } @else {
          <div class="grid gap-3.5 max-w-5xl">
            @for (backup of backups(); track backup.id) {
              <div
                class="flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900/60 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
              >
                <div class="flex items-start gap-4 min-w-0">
                  <div
                    class="size-11 rounded-xl flex items-center justify-center shrink-0 border border-neutral-200/60 dark:border-neutral-700/60"
                    [ngClass]="backup.proveedor === 'GOOGLE_DRIVE' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600'"
                  >
                    <mat-icon
                      [svgIcon]="backup.proveedor === 'GOOGLE_DRIVE' ? 'google-drive' : 'archive'"
                      class="icon-size-5"
                    ></mat-icon>
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2.5 flex-wrap">
                      <span
                        class="font-semibold text-neutral-900 dark:text-white tracking-tight truncate text-base"
                        [title]="backup.nombreArchivo"
                      >
                        {{ formatDisplayName(backup.nombreArchivo) }}
                      </span>

                      <!-- Status Badge -->
                      <span
                        class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        [ngClass]="{
                          'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400': backup.estado === 'COMPLETED',
                          'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400': backup.estado === 'FAILED',
                          'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400': backup.estado === 'PENDING'
                        }"
                      >
                        <span
                          class="size-1.5 rounded-full"
                          [ngClass]="{
                            'bg-emerald-500': backup.estado === 'COMPLETED',
                            'bg-red-500': backup.estado === 'FAILED',
                            'bg-amber-500 animate-pulse': backup.estado === 'PENDING'
                          }"
                        ></span>
                        {{ backup.estado }}
                      </span>
                    </div>

                    <div
                      class="mt-1 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap"
                    >
                      <span class="font-medium text-neutral-700 dark:text-neutral-300">
                        {{ backup.proveedor === 'GOOGLE_DRIVE' ? 'Google Drive' : 'Local' }}
                      </span>
                      <span>·</span>
                      <span>{{ backup.creadoEn | date:'medium' }}</span>
                      @if (backup.tamanoBytes) {
                        <span>·</span>
                        <span class="font-medium">{{ formatBytes(backup.tamanoBytes) }}</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    mat-stroked-button
                    type="button"
                    class="rounded-xl"
                    [disabled]="backup.estado !== 'COMPLETED'"
                    (click)="download(backup)"
                  >
                    <mat-icon svgIcon="download" class="mr-1.5 icon-size-4"></mat-icon>
                    {{ 'backups.download' | transloco }}
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    class="text-neutral-400 hover:text-red-600 transition-colors"
                    [matTooltip]="'backups.delete' | transloco"
                    (click)="remove(backup)"
                  >
                    <mat-icon svgIcon="delete" class="icon-size-4.5"></mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class BackupsComponent {
  private readonly http = inject(HttpClient);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly i18n = inject(TranslocoService);
  readonly backups = signal<Backup[]>([]);
  readonly busy = signal(false);
  private readonly api = `${environment.apiUrl}/backups`;

  constructor() {
    this.load();
  }

  private load() {
    this.http.get<Backup[]>(this.api).subscribe({
      next: (value) => this.backups.set(value),
      error: () => this.notice('backups.loadError'),
    });
  }

  create(proveedor: 'LOCAL' | 'GOOGLE_DRIVE') {
    this.busy.set(true);
    this.http.post<Backup>(this.api, { proveedor }).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.notice('backups.createError');
      },
    });
  }

  connectDrive() {
    this.http.post<{ url: string }>(`${this.api}/google/authorize`, {}).subscribe({
      next: (result) => window.dolphinWindow?.openExternal(result.url),
      error: () => this.notice('backups.driveError'),
    });
  }

  download(backup: Backup) {
    this.http
      .get(`${this.api}/${backup.id}/download`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = this.formatDisplayName(backup.nombreArchivo);
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.notice('backups.downloadError'),
      });
  }

  remove(backup: Backup) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.i18n.translate('backups.deleteTitle'),
        message: this.i18n.translate('backups.confirmDelete'),
        confirmLabel: this.i18n.translate('common.delete'),
        cancelLabel: this.i18n.translate('common.cancel'),
        destructive: true,
        icon: 'trash',
      } satisfies ConfirmDialogData,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.http.delete(`${this.api}/${backup.id}`).subscribe({
          next: () => this.load(),
          error: () => this.notice('backups.deleteError'),
        });
      }
    });
  }

  formatDisplayName(name: string): string {
    if (!name) return 'backup.backup';
    // If it's a legacy long uuid name: dolphin-1f10a2a1-b668-4c04-af55-18737a000b9c-2026-08-18T15-19-38-477Z-2d816a387ab5811a.backup
    const isoMatch = name.match(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, date, hh, mm, ss] = isoMatch;
      return `backup_${date.replace(/-/g, '')}_${hh}${mm}${ss}.backup`;
    }
    return name;
  }

  formatBytes(bytes?: string | number): string {
    if (!bytes) return '';
    const num = Number(bytes);
    if (isNaN(num) || num <= 0) return '';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  }

  private notice(key: string) {
    this.snack.open(this.i18n.translate(key), this.i18n.translate('common.close'), {
      duration: 3500,
    });
  }
}
