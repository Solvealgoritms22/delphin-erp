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
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
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
    EmptyStateComponent,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">
      
      <!-- Header -->
      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div>
          <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Comprobantes Fiscales (NCF)
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Administración de secuencias NCF tradicionales y e-CF electrónicos autorizados por la DGII.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap items-center gap-3 mt-6 sm:mt-0 sm:ml-4">
          <button (click)="openModal()" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
            <mat-icon svgIcon="plus" class="icon-size-4"></mat-icon>
            Nueva Secuencia NCF
          </button>
        </div>
      </div>

      <!-- Main Scrollable Content -->
      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        
        <!-- Table Grid -->
        <div class="grid">
          <!-- Sticky Table Header -->
          <div class="z-10 sticky top-0 grid grid-cols-12 gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div class="col-span-3">Tipo / Nombre</div>
            <div class="col-span-2">Prefijo / Tipo</div>
            <div class="col-span-2 text-center">Ambiente</div>
            <div class="col-span-2 text-right">Próximo a Emitir</div>
            <div class="col-span-2 text-center">Vencimiento</div>
            <div class="col-span-1 text-center">Acción</div>
          </div>

          @if (sequencesService.sequences().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                icon="hash"
                title="Sin secuencias NCF registradas"
                description="Configura las secuencias autorizadas por la DGII para emitir comprobantes fiscales."
                actionLabel="Nueva Secuencia"
                actionIcon="plus"
                (action)="openModal()"
              />
            </div>
          } @else {
            @for (seq of sequencesService.sequences(); track seq.id) {
              <div class="grid grid-cols-12 gap-4 py-4 px-6 md:px-8 items-center text-sm border-b border-neutral-100 dark:border-neutral-800/80 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                
                <!-- Tipo / Nombre -->
                <div class="col-span-3 flex flex-col">
                  <span class="font-bold text-neutral-900 dark:text-white">{{ seq.nombre }}</span>
                  <span class="text-xs text-neutral-400">Rango: 1 - {{ seq.numeroHasta | number }}</span>
                </div>

                <!-- Prefijo -->
                <div class="col-span-2 flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {{ seq.prefijo }}
                  </span>
                  <span class="text-xs text-neutral-500">{{ seq.prefijo.startsWith('E') ? 'Electrónico' : 'Tradicional' }}</span>
                </div>

                <!-- Ambiente -->
                <div class="col-span-2 flex justify-center">
                  @if (seq.ambiente === 'PROD') {
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">PRODUCCIÓN</span>
                  } @else if (seq.ambiente === 'CERT') {
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">CERTIFICACIÓN</span>
                  } @else {
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">PRUEBAS (TEST)</span>
                  }
                </div>

                <!-- Próximo a Emitir -->
                <div class="col-span-2 text-right flex flex-col">
                  <span class="font-mono font-bold text-neutral-900 dark:text-white">
                    {{ formatNcfPreview(seq) }}
                  </span>
                  <span class="text-[11px] text-neutral-400">Número: {{ seq.numeroActual }}</span>
                </div>

                <!-- Vencimiento -->
                <div class="col-span-2 text-center text-xs text-neutral-500">
                  {{ seq.fechaVencimiento ? (seq.fechaVencimiento | date:'dd/MM/yyyy') : 'Sin Vencimiento' }}
                </div>

                <!-- Acción -->
                <div class="col-span-1 flex justify-center">
                  <button (click)="deleteSequence(seq)" class="w-8 h-8 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center cursor-pointer">
                    <mat-icon svgIcon="trash" class="icon-size-4"></mat-icon>
                  </button>
                </div>

              </div>
            }
          }
        </div>

      </div>

      <!-- ================= MODAL: NUEVA SECUENCIA ================= -->
      <ng-template #sequenceModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-[85vh]">
          
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="hash" class="icon-size-5 text-blue-600"></mat-icon>
              Nueva Secuencia NCF / e-CF
            </h3>
            <button (click)="closeDialog()" class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="p-6 flex flex-col gap-4 overflow-y-auto">
            
            <!-- Nombre descriptivo -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Nombre Descriptivo</mat-label>
              <input matInput type="text" [(ngModel)]="newSequence.nombre" placeholder="Crédito Fiscal Electrónico (Ventas Principales)">
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Tipo de Comprobante -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Tipo de Comprobante</mat-label>
                <mat-select [(ngModel)]="newSequence.tipo" (selectionChange)="onTypeChange($event.value)">
                  <mat-option value="E31">E31 - Crédito Fiscal Electrónico</mat-option>
                  <mat-option value="E32">E32 - Consumo Electrónico</mat-option>
                  <mat-option value="E34">E34 - Nota de Crédito Electrónica</mat-option>
                  <mat-option value="E44">E44 - Régimen Especial Electrónico</mat-option>
                  <mat-option value="E45">E45 - Gubernamental Electrónico</mat-option>
                  <mat-option value="B01">B01 - Factura de Crédito Fiscal Tradicional</mat-option>
                  <mat-option value="B02">B02 - Factura de Consumo Tradicional</mat-option>
                  <mat-option value="B04">B04 - Nota de Crédito Tradicional</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Ambiente -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Ambiente</mat-label>
                <mat-select [(ngModel)]="newSequence.ambiente">
                  <mat-option value="TEST">TEST (Pruebas / Sandbox)</mat-option>
                  <mat-option value="CERT">CERT (Certificación DGII)</mat-option>
                  <mat-option value="PROD">PROD (Producción en Vivo)</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Número Inicial -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Número Inicial (Desde)</mat-label>
                <input matInput type="number" [(ngModel)]="newSequence.numeroActual" min="1">
              </mat-form-field>

              <!-- Número Límite -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Límite Autorizado (Hasta)</mat-label>
                <input matInput type="number" [(ngModel)]="newSequence.numeroHasta" min="1">
              </mat-form-field>
            </div>

            <!-- Fecha de Vencimiento -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Fecha de Vencimiento DGII (Opcional)</mat-label>
              <input matInput type="date" [(ngModel)]="newSequence.fechaVencimiento">
            </mat-form-field>

          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
            <button mat-button (click)="closeDialog()" class="rounded-xl">Cancelar</button>
            <button mat-flat-button color="primary" (click)="submitSequence()" class="rounded-xl bg-blue-600 text-white">
              Guardar Secuencia
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
      nombre: 'Facturas de Crédito Fiscal Electrónicas',
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
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.sequencesService.create(this.newSequence).subscribe({
      next: () => {
        this.snackBar.open('Secuencia NCF guardada exitosamente', 'Cerrar', { duration: 3000 });
        this.closeDialog();
        this.sequencesService.findAll().subscribe();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al guardar secuencia', 'Cerrar', { duration: 4000 });
      }
    });
  }

  deleteSequence(seq: any) {
    const name = seq?.nombre || seq?.prefijo || 'esta secuencia NCF';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar secuencia NCF',
        message: `¿Estás seguro de que deseas eliminar la secuencia <strong>${name}</strong>?`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        destructive: true,
      } satisfies ConfirmDialogData,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.sequencesService.delete(seq.id || seq).subscribe({
          next: () => {
            this.snackBar.open('Secuencia eliminada', 'Cerrar', { duration: 2500 });
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Error al eliminar secuencia', 'Cerrar', { duration: 3000 });
          }
        });
      }
    });
  }
}
export default SequencesComponent;
