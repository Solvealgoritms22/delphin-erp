import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
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

interface Backup { id: string; nombreArchivo: string; proveedor: string; estado: string; tamanoBytes?: string | number; creadoEn: string; }

@Component({
  selector: 'app-backups',
  standalone: true,
  host: { class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden' },
  imports: [
    DatePipe,
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
      <header class="flex shrink-0 flex-col justify-between gap-6 border-b border-neutral-200 px-6 py-8 sm:flex-row sm:items-center md:px-8 dark:border-neutral-700">
        <div><h1 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'backups.title' | transloco }}</h1><p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'backups.description' | transloco }}</p></div>
        <div class="flex flex-wrap gap-2">
          <button mat-stroked-button type="button" (click)="connectDrive()"><mat-icon svgIcon="google-drive" class="mr-2"></mat-icon>{{ 'backups.connectDrive' | transloco }}</button>
          <button mat-flat-button color="primary" type="button" [disabled]="busy()" (click)="create('LOCAL')"><mat-icon svgIcon="plus" class="mr-2"></mat-icon>{{ 'backups.createLocal' | transloco }}</button>
        </div>
      </header>
      <div class="flex-auto overflow-y-auto p-6 md:p-8">
        @if (backups().length === 0) { <app-empty-state icon="archive" [title]="'backups.emptyTitle' | transloco" [description]="'backups.emptyDescription' | transloco" /> }
        @else { <div class="grid gap-3">@for (backup of backups(); track backup.id) { <div class="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700"><div><div class="font-semibold text-neutral-900 dark:text-white">{{ backup.nombreArchivo }}</div><div class="text-sm text-neutral-500 dark:text-neutral-400">{{ backup.proveedor }} · {{ backup.estado }} · {{ backup.creadoEn | date:'medium' }}</div></div><div class="flex gap-2"><button mat-stroked-button type="button" (click)="download(backup)"><mat-icon svgIcon="download" class="mr-2"></mat-icon>{{ 'backups.download' | transloco }}</button><button mat-icon-button type="button" [matTooltip]="'backups.delete' | transloco" (click)="remove(backup)"><mat-icon svgIcon="delete"></mat-icon></button></div></div> }</div> }
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

  constructor() { this.load(); }
  private load() { this.http.get<Backup[]>(this.api).subscribe({ next: value => this.backups.set(value), error: () => this.notice('backups.loadError') }); }
  create(proveedor: 'LOCAL' | 'GOOGLE_DRIVE') { this.busy.set(true); this.http.post<Backup>(this.api, { proveedor }).subscribe({ next: () => { this.busy.set(false); this.load(); }, error: () => { this.busy.set(false); this.notice('backups.createError'); } }); }
  connectDrive() { this.http.post<{ url: string }>(`${this.api}/google/authorize`, {}).subscribe({ next: result => window.dolphinWindow?.openExternal(result.url), error: () => this.notice('backups.driveError') }); }
  download(backup: Backup) { this.http.get(`${this.api}/${backup.id}/download`, { responseType: 'blob' }).subscribe({ next: blob => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = backup.nombreArchivo; anchor.click(); URL.revokeObjectURL(url); }, error: () => this.notice('backups.downloadError') }); }
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
  private notice(key: string) { this.snack.open(this.i18n.translate(key), this.i18n.translate('common.close'), { duration: 3500 }); }
}
