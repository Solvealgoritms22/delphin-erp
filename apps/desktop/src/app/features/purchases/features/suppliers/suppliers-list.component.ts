import { Component, inject, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SuppliersService } from '../../data/suppliers';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PlusIcon, PencilIcon, TrashIcon } from 'ng-animated-icons';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [NgClass, RouterLink, MatButtonModule, MatIconModule, MatDialogModule, EmptyStateComponent, TableSkeletonComponent, TranslocoPipe, PlusIcon, PencilIcon, TrashIcon],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">

      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
         <div>
            <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'commercial.suppliers.title' | transloco }}</div>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'commercial.suppliers.description' | transloco }}</p>
         </div>
        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4">
          <button mat-flat-button class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" [routerLink]="['new']">
            <i-plus [size]="18" class="mr-2" />
            {{ 'commercial.suppliers.new' | transloco }}
          </button>
        </div>
      </div>

      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        <div class="grid">

            <div class="suppliers-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <div class="hidden sm:block">{{ 'common.docType' | transloco }}</div>
              <div>{{ 'common.document' | transloco }}</div>
              <div>{{ 'common.name' | transloco }}</div>
              <div class="hidden sm:block">{{ 'common.contact' | transloco }}</div>
              <div class="hidden sm:block">{{ 'common.status' | transloco }}</div>
              <div>{{ 'common.actions' | transloco }}</div>
            </div>

            @if (suppliersService.isLoading()) {
              <app-table-skeleton [gridClass]="'suppliers-grid'" [rows]="6" [cells]="cells5" />
            } @else if (suppliersService.suppliers().length === 0) {
              <div class="flex flex-auto justify-center p-6 sm:p-10">
                <app-empty-state
                  type="no-data"
                  [title]="'commercial.suppliers.emptyTitle' | transloco"
                  [description]="'commercial.suppliers.emptyDescription' | transloco"
                  [actionLabel]="'commercial.suppliers.new' | transloco"
                  actionIcon="plus"
                  (action)="router.navigate(['admin', 'commercial', 'suppliers', 'new'])"
                />
              </div>
            } @else {
              @for (supplier of suppliersService.suppliers(); track supplier.id) {
                <div class="suppliers-grid grid items-center gap-4 py-3 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800">
                  <!-- Tipo Documento -->
                  <div class="hidden sm:block">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide"
                      [ngClass]="{
                        'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20': supplier.tipoDocumento === 'CEDULA' || supplier.tipoDocumento === 'CÉDULA',
                        'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20': supplier.tipoDocumento === 'RNC',
                        'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50': supplier.tipoDocumento !== 'CEDULA' && supplier.tipoDocumento !== 'CÉDULA' && supplier.tipoDocumento !== 'RNC'
                      }">
                      {{ supplier.tipoDocumento || '—' }}
                    </span>
                  </div>
                  <!-- Solo número de documento -->
                  <div class="text-sm font-mono font-medium text-neutral-700 dark:text-neutral-300">{{ supplier.numeroDocumento || '—' }}</div>
                  <div class="font-medium text-neutral-900 dark:text-white truncate">{{ supplier.nombreRazonSocial }}</div>
                  <div class="hidden sm:block text-sm text-neutral-500">
                    <div>{{ supplier.email || '-' }}</div>
                    <div>{{ supplier.telefono || '-' }}</div>
                  </div>
                  <div class="hidden sm:block">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                      [ngClass]="supplier.estado === 'ACTIVO'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20'">
                      {{ supplier.estado }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button mat-icon-button [routerLink]="[supplier.id]" class="text-neutral-500 hover:text-neutral-700">
                       <i-pencil [size]="18" />
                    </button>
                    <button mat-icon-button class="text-red-500 hover:text-red-700" (click)="deleteSupplier(supplier)">
                      <i-trash [size]="18" />
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>
  `,
  styles: [`
    .suppliers-grid {
      grid-template-columns: 90px 130px auto 180px 100px 96px;
    }
    @media (max-width: 640px) {
      .suppliers-grid {
        grid-template-columns: 120px auto 96px;
      }
    }
  `]
})
export class Suppliers implements OnInit {
  suppliersService = inject(SuppliersService);
  dialog = inject(MatDialog);
  router = inject(Router);
  transloco = inject(TranslocoService);

  cells5 = ['90%', '80%', '70%', '60%', '40%', '50%'];

  ngOnInit() {
    this.suppliersService.findAll().subscribe();
  }

  deleteSupplier(supplier: any) {
    const name = supplier?.nombreRazonSocial || '';
    const message = name
      ? `¿Estás seguro de que deseas eliminar al proveedor <strong>${name}</strong>?`
      : String(this.transloco.translate('commercial.suppliers.deleteConfirm'));

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('commercial.suppliers.deleteTitle') || 'Eliminar proveedor',
        message,
        confirmLabel: this.transloco.translate('common.delete'),
        cancelLabel: this.transloco.translate('common.cancel'),
        destructive: true,
      } satisfies ConfirmDialogData,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.suppliersService.remove(supplier.id || supplier).subscribe();
      }
    });
  }
}
