import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { SequencesService, SecuenciaNCF, CreateSequenceDto } from '../../data/sequences.service';

@Component({
  selector: 'app-sequences',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTooltipModule,
    TranslocoPipe,
    EmptyStateComponent,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">

      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div>
          <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {{ 'commercial.sequences.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'commercial.sequences.description' | transloco }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 mt-6 sm:mt-0 sm:ml-4">
          <button (click)="openModal()" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
            <mat-icon svgIcon="plus" class="icon-size-4"></mat-icon>
            {{ 'commercial.sequences.newSequence' | transloco }}
          </button>
        </div>
      </div>

      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">

        <div class="grid">

          <div class="z-10 sticky top-0 grid grid-cols-12 gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div class="col-span-3">{{ 'commercial.sequences.columns.name' | transloco }}</div>
            <div class="col-span-2">{{ 'commercial.sequences.columns.prefix' | transloco }}</div>
            <div class="col-span-2 text-center">{{ 'commercial.sequences.columns.environment' | transloco }}</div>
            <div class="col-span-2 text-right">{{ 'commercial.sequences.columns.nextNumber' | transloco }}</div>
            <div class="col-span-2 text-center">{{ 'commercial.sequences.columns.expiration' | transloco }}</div>
            <div class="col-span-1 text-center">{{ 'commercial.sequences.columns.action' | transloco }}</div>
          </div>

          @if (sequencesService.sequences().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                icon="hash"
                [title]="'commercial.sequences.emptyTitle' | transloco"
                [description]="'commercial.sequences.emptyDescription' | transloco"
                [actionLabel]="'commercial.sequences.newSequence' | transloco"
                actionIcon="plus"
                (action)="openModal()"
              />
            </div>
          } @else {
            @for (seq of sequencesService.sequences(); track seq.id) {
              <div class="grid grid-cols-12 gap-4 py-4 px-6 md:px-8 items-center text-sm border-b border-neutral-100 dark:border-neutral-800/80 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">

                <div class="col-span-3 flex flex-col">
                  <span class="font-bold text-neutral-900 dark:text-white">{{ seq.nombre }}</span>
                  <span class="text-xs text-neutral-400">{{ 'commercial.sequences.range' | transloco }}: 1 - {{ seq.numeroHasta | number }}</span>
                </div>

                <div class="col-span-2 flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {{ seq.prefijo }}
                  </span>
                  <span class="text-xs text-neutral-500">{{ (seq.prefijo.startsWith('E') ? 'commercial.sequences.electronic' : 'commercial.sequences.traditional') | transloco }}</span>
                </div>

                <div class="col-span-2 flex justify-center">
                  @if (seq.ambiente === 'PROD') {
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{{ 'commercial.sequences.environments.prod' | transloco }}</span>
                  } @else if (seq.ambiente === 'CERT') {
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">{{ 'commercial.sequences.environments.cert' | transloco }}</span>
                  } @else {
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">{{ 'commercial.sequences.environments.test' | transloco }}</span>
                  }
                </div>

                <div class="col-span-2 text-right flex flex-col">
                  <span class="font-mono font-bold text-neutral-900 dark:text-white">
                    {{ formatNcfPreview(seq) }}
                  </span>
                  <span class="text-[11px] text-neutral-400">{{ 'commercial.sequences.number' | transloco }}: {{ seq.numeroActual }}</span>
                </div>

                <div class="col-span-2 text-center text-xs text-neutral-500">
                  {{ seq.fechaVencimiento ? (seq.fechaVencimiento | date:'dd/MM/yyyy') : ('commercial.sequences.noExpiration' | transloco) }}
                </div>

                <div class="col-span-1 flex justify-center">
                  <button (click)="deleteSequence(seq)" [matTooltip]="'common.delete' | transloco" class="w-8 h-8 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center cursor-pointer">
                    <mat-icon svgIcon="trash" class="icon-size-4"></mat-icon>
                  </button>
                </div>

              </div>
            }
          }
        </div>

      </div>

      <ng-template #sequenceModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-[85vh]">

          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="hash" class="icon-size-5 text-blue-600"></mat-icon>
              {{ 'commercial.sequences.modal.title' | transloco }}
            </h3>
            <button (click)="closeDialog()" class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="p-6 flex flex-col gap-4 overflow-y-auto">

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.sequences.modal.name' | transloco }}</mat-label>
              <input matInput type="text" [(ngModel)]="newSequence.nombre" [placeholder]="'commercial.sequences.modal.namePlaceholder' | transloco">
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'commercial.sequences.modal.type' | transloco }}</mat-label>
                <mat-select [(ngModel)]="newSequence.tipo" (selectionChange)="onTypeChange($event.value)" placeholder="Seleccionar tipo">
                  <mat-option value="E31">{{ 'commercial.sequences.types.E31' | transloco }}</mat-option>
                  <mat-option value="E32">{{ 'commercial.sequences.types.E32' | transloco }}</mat-option>
                  <mat-option value="E34">{{ 'commercial.sequences.types.E34' | transloco }}</mat-option>
                  <mat-option value="E44">{{ 'commercial.sequences.types.E44' | transloco }}</mat-option>
                  <mat-option value="E45">{{ 'commercial.sequences.types.E45' | transloco }}</mat-option>
                  <mat-option value="B01">{{ 'commercial.sequences.types.B01' | transloco }}</mat-option>
                  <mat-option value="B02">{{ 'commercial.sequences.types.B02' | transloco }}</mat-option>
                  <mat-option value="B04">{{ 'commercial.sequences.types.B04' | transloco }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'commercial.sequences.modal.environment' | transloco }}</mat-label>
                <mat-select [(ngModel)]="newSequence.ambiente" placeholder="Seleccionar ambiente">
                  <mat-option value="TEST">{{ 'commercial.sequences.modal.envOptions.test' | transloco }}</mat-option>
                  <mat-option value="CERT">{{ 'commercial.sequences.modal.envOptions.cert' | transloco }}</mat-option>
                  <mat-option value="PROD">{{ 'commercial.sequences.modal.envOptions.prod' | transloco }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'commercial.sequences.modal.startNumber' | transloco }}</mat-label>
                <input matInput type="number" [(ngModel)]="newSequence.numeroActual" min="1">
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'commercial.sequences.modal.limitNumber' | transloco }}</mat-label>
                <input matInput type="number" [(ngModel)]="newSequence.numeroHasta" min="1">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.sequences.modal.expirationDate' | transloco }}</mat-label>
              <input matInput type="date" [(ngModel)]="newSequence.fechaVencimiento">
            </mat-form-field>

          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
            <button mat-button (click)="closeDialog()" class="rounded-xl">{{ 'common.cancel' | transloco }}</button>
            <button mat-flat-button color="primary" (click)="submitSequence()" class="rounded-xl bg-blue-600 text-white">
              {{ 'commercial.sequences.modal.submit' | transloco }}
            </button>
          </div>

        </div>
      </ng-template>

    </div>
  `,
})
export class SequencesComponent implements OnInit {
  sequencesService = inject(SequencesService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  i18n = inject(TranslocoService);

  @ViewChild('sequenceModalTemplate') sequenceModalTemplate!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

  newSequence: CreateSequenceDto = {
    nombre: '',
    tipo: 'E31',
    prefijo: 'E31',
    numeroActual: 1,
    numeroHasta: 99999999,
    ambiente: 'TEST',
    activa: true,
  };

  ngOnInit() {
    this.sequencesService.findAll().subscribe();
  }

  onTypeChange(tipo: string) {
    this.newSequence.prefijo = tipo;
    if (!this.newSequence.nombre) {
      this.newSequence.nombre = `Secuencia ${tipo}`;
    }
  }

  formatNcfPreview(seq: SecuenciaNCF): string {
    const pad = seq.prefijo.startsWith('E') ? 10 : 8;
    return `${seq.prefijo}${seq.numeroActual.toString().padStart(pad, '0')}`;
  }

  openModal() {
    this.newSequence = {
      nombre: '',
      tipo: 'E31',
      prefijo: 'E31',
      numeroActual: 1,
      numeroHasta: 99999999,
      ambiente: 'TEST',
      activa: true,
    };

    this.dialogRef = this.dialog.open(this.sequenceModalTemplate, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: ['custom-dialog-container'],
    });
  }

  closeDialog() {
    this.dialogRef?.close();
  }

  submitSequence() {
    if (!this.newSequence.nombre || !this.newSequence.tipo || !this.newSequence.prefijo) {
      this.snackBar.open(this.i18n.translate('commercial.sequences.messages.fillRequired'), this.i18n.translate('common.close'), { duration: 3000 });
      return;
    }

    this.sequencesService.create(this.newSequence).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.translate('commercial.sequences.messages.saveSuccess'), this.i18n.translate('common.close'), { duration: 3000 });
        this.closeDialog();
        this.sequencesService.findAll().subscribe();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.i18n.translate('commercial.sequences.messages.saveError'), this.i18n.translate('common.close'), { duration: 4000 });
      }
    });
  }

  deleteSequence(seq: any) {
    const name = seq?.nombre || seq?.prefijo || 'NCF';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.i18n.translate('commercial.sequences.messages.deleteTitle'),
        message: this.i18n.translate('commercial.sequences.messages.deleteConfirm', { name }),
        confirmLabel: this.i18n.translate('common.delete'),
        cancelLabel: this.i18n.translate('common.cancel'),
        destructive: true,
        icon: 'trash',
      } satisfies ConfirmDialogData,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.sequencesService.delete(seq.id || seq).subscribe({
          next: () => {
            this.snackBar.open(this.i18n.translate('commercial.sequences.messages.deleteSuccess'), this.i18n.translate('common.close'), { duration: 2500 });
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || this.i18n.translate('commercial.sequences.messages.deleteError'), this.i18n.translate('common.close'), { duration: 3000 });
          }
        });
      }
    });
  }
}
export default SequencesComponent;
