import { Component, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { environment } from '@/environments/environment';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

type Backup = {
  id: string;
  nombreArchivo: string;
  proveedor: string;
  estado: string;
  tamanoBytes?: string | number;
  creadoEn: string;
};

type BackupSettings = {
  backupAutoEnabled: boolean;
  backupFrecuencia: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  backupHora: string;
  backupDestino: 'LOCAL' | 'GOOGLE_DRIVE';
  backupRetencionDias: number;
  ultimoBackupAuto: string | null;
  googleDriveConnected?: boolean;
  googleEmail?: string;
};

@Component({
  selector: 'app-backups',
  standalone: true,
  host: { class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden' },
  imports: [
    DatePipe,
    NgClass,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    TranslocoPipe,
    EmptyStateComponent,
  ],
  template: `
    <div class="flex h-full w-full min-w-0 flex-col bg-neutral-50/50 dark:bg-neutral-950 overflow-y-auto">
      
      <!-- Top Header -->
      <header
        class="flex shrink-0 flex-col justify-between gap-6 border-b border-neutral-200 px-6 py-8 sm:flex-row sm:items-center md:px-8 bg-white dark:bg-neutral-900 dark:border-neutral-800"
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
            <img
              src="/images/google-drive.png"
              alt="Google Drive"
              class="w-5 h-5 mr-2 object-contain inline-block shrink-0"
            />
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

      <!-- Main Body Container -->
      <div class="flex-auto p-6 md:p-8 space-y-8 max-w-5xl">

        <!-- Card: Copias de Seguridad Automáticas -->
        <div class="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm transition-all">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
            <div class="flex items-start gap-3.5">
              <div>
                <div class="flex items-center gap-2.5">
                  <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
                    {{ 'backups.autoTitle' | transloco }}
                  </h2>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    [class.bg-emerald-100]="settings.backupAutoEnabled"
                    [class.text-emerald-800]="settings.backupAutoEnabled"
                    [class.dark:bg-emerald-500/10]="settings.backupAutoEnabled"
                    [class.dark:text-emerald-400]="settings.backupAutoEnabled"
                    [class.bg-neutral-100]="!settings.backupAutoEnabled"
                    [class.text-neutral-600]="!settings.backupAutoEnabled"
                    [class.dark:bg-neutral-800]="!settings.backupAutoEnabled"
                    [class.dark:text-neutral-400]="!settings.backupAutoEnabled"
                  >
                    {{ settings.backupAutoEnabled ? 'Activo' : 'Desactivado' }}
                  </span>
                </div>
                <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {{ 'backups.autoDesc' | transloco }}
                </p>
              </div>
            </div>

            <!-- Slide Toggle -->
            <div class="flex items-center gap-3 self-end sm:self-center">
              <mat-slide-toggle
                [(ngModel)]="settings.backupAutoEnabled"
                color="primary"
              >
                <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {{ 'backups.enableAuto' | transloco }}
                </span>
              </mat-slide-toggle>
            </div>
          </div>

          <!-- Configuration Fields (Visible when enabled or always visible for setup) -->
          @if (settings.backupAutoEnabled) {
            <div class="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              
              <!-- Frecuencia -->
              <mat-form-field class="w-full" subscriptSizing="dynamic">
                <mat-label>{{ 'backups.frequency' | transloco }}</mat-label>
                <mat-select [(ngModel)]="settings.backupFrecuencia">
                  <mat-option value="DAILY">{{ 'backups.freqDaily' | transloco }}</mat-option>
                  <mat-option value="WEEKLY">{{ 'backups.freqWeekly' | transloco }}</mat-option>
                  <mat-option value="MONTHLY">{{ 'backups.freqMonthly' | transloco }}</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Hora de Ejecución -->
              <mat-form-field class="w-full" subscriptSizing="dynamic">
                <mat-label>{{ 'backups.time' | transloco }}</mat-label>
                <mat-select [(ngModel)]="settings.backupHora">
                  @for (hour of hourOptions; track hour.value) {
                    <mat-option [value]="hour.value">{{ hour.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <!-- Destino -->
              <mat-form-field class="w-full" subscriptSizing="dynamic">
                <mat-label>{{ 'backups.destination' | transloco }}</mat-label>
                <mat-select [(ngModel)]="settings.backupDestino">
                  <mat-option value="LOCAL">{{ 'backups.destLocal' | transloco }}</mat-option>
                  <mat-option value="GOOGLE_DRIVE">
                    {{ 'backups.destDrive' | transloco }}
                    @if (settings.googleDriveConnected) {
                      (Conectado)
                    } @else {
                      (Requiere conexión)
                    }
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Días de Retención -->
              <mat-form-field class="w-full" subscriptSizing="dynamic">
                <mat-label>{{ 'backups.retentionDays' | transloco }}</mat-label>
                <input
                  matInput
                  type="number"
                  min="0"
                  max="365"
                  step="1"
                  [(ngModel)]="settings.backupRetencionDias"
                  placeholder="7"
                />
              </mat-form-field>

            </div>

            <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              * {{ 'backups.retentionHint' | transloco }}
            </p>

            <div class="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="text-xs text-neutral-500 flex items-center gap-1.5">
                <mat-icon svgIcon="history" class="icon-size-4 text-neutral-400"></mat-icon>
                <span>{{ 'backups.lastRun' | transloco }}:</span>
                <strong class="text-neutral-800 dark:text-neutral-200">
                  {{ settings.ultimoBackupAuto ? (settings.ultimoBackupAuto | date:'medium') : ('backups.neverRun' | transloco) }}
                </strong>
              </div>

              <button
                mat-flat-button
                color="primary"
                type="button"
                [disabled]="isSavingSettings()"
                (click)="saveSettings()"
                class="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold !px-6"
              >
                <mat-icon svgIcon="check" class="mr-1.5 icon-size-4"></mat-icon>
                {{ 'backups.saveConfig' | transloco }}
              </button>
            </div>
          }
        </div>

        <!-- Section: Historial de Copias de Seguridad -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
              Historial de Copias de Seguridad
            </h2>
            <span class="text-xs font-semibold text-neutral-500">
              Total: {{ backups().length }}
            </span>
          </div>

          @if (backups().length === 0) {
            <app-empty-state
              icon="archive"
              [title]="'backups.emptyTitle' | transloco"
              [description]="'backups.emptyDescription' | transloco"
            />
          } @else {
            <div class="grid gap-3.5">
              @for (backup of backups(); track backup.id) {
                <div
                  class="flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
                >
                  <div class="flex items-start gap-4 min-w-0">
                    <div
                      class="size-11 rounded-xl flex items-center justify-center shrink-0 border border-neutral-200/60 dark:border-neutral-700/60"
                      [ngClass]="backup.proveedor === 'GOOGLE_DRIVE' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600'"
                    >
                      @if (backup.proveedor === 'GOOGLE_DRIVE') {
                        <img src="/images/google-drive.png" alt="Google Drive" class="size-5 object-contain" />
                      } @else {
                        <mat-icon svgIcon="archive" class="icon-size-5"></mat-icon>
                      }
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2.5 flex-wrap">
                        <span
                          class="font-semibold text-neutral-900 dark:text-white tracking-tight truncate text-base"
                          [title]="backup.nombreArchivo"
                        >
                          {{ formatDisplayName(backup.nombreArchivo) }}
                        </span>

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
                      <mat-icon svgIcon="trash" class="icon-size-4.5"></mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

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
  readonly isSavingSettings = signal(false);

  settings: BackupSettings = {
    backupAutoEnabled: false,
    backupFrecuencia: 'DAILY',
    backupHora: '02:00',
    backupDestino: 'LOCAL',
    backupRetencionDias: 7,
    ultimoBackupAuto: null,
    googleDriveConnected: false,
  };

  readonly hourOptions = [
    { value: '00:00', label: '12:00 AM (Medianoche)' },
    { value: '01:00', label: '01:00 AM' },
    { value: '02:00', label: '02:00 AM (Recomendado)' },
    { value: '03:00', label: '03:00 AM' },
    { value: '04:00', label: '04:00 AM' },
    { value: '05:00', label: '05:00 AM' },
    { value: '06:00', label: '06:00 AM' },
    { value: '07:00', label: '07:00 AM' },
    { value: '08:00', label: '08:00 AM' },
    { value: '09:00', label: '09:00 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '12:00', label: '12:00 PM (Mediodía)' },
    { value: '13:00', label: '01:00 PM' },
    { value: '14:00', label: '02:00 PM' },
    { value: '15:00', label: '03:00 PM' },
    { value: '16:00', label: '04:00 PM' },
    { value: '17:00', label: '05:00 PM' },
    { value: '18:00', label: '06:00 PM' },
    { value: '19:00', label: '07:00 PM' },
    { value: '20:00', label: '08:00 PM' },
    { value: '21:00', label: '09:00 PM' },
    { value: '22:00', label: '10:00 PM' },
    { value: '23:00', label: '11:00 PM' },
  ];

  private readonly api = `${environment.apiUrl}/backups`;

  constructor() {
    this.load();
    this.loadSettings();
  }

  private load() {
    this.http.get<Backup[]>(this.api).subscribe({
      next: (value) => this.backups.set(value),
      error: () => this.notice('backups.loadError'),
    });
  }

  private loadSettings() {
    this.http.get<BackupSettings>(`${this.api}/settings`).subscribe({
      next: (data) => {
        this.settings = { ...this.settings, ...data };
      },
      error: () => { },
    });
  }

  saveSettings() {
    this.isSavingSettings.set(true);
    this.http.patch<BackupSettings>(`${this.api}/settings`, this.settings).subscribe({
      next: (updated) => {
        this.isSavingSettings.set(false);
        this.settings = { ...this.settings, ...updated };
        this.notice('backups.configSaved');
      },
      error: (err) => {
        this.isSavingSettings.set(false);
        const msg = err?.error?.message || this.i18n.translate('backups.configError');
        this.snack.open(msg, this.i18n.translate('common.close'), { duration: 4000 });
      },
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
