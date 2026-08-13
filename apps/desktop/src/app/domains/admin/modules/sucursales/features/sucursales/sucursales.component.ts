import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SucursalesService } from '../../data/sucursales.service';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@/app/shared/components/table-skeleton/table-skeleton.component';
import { SucursalDialogComponent } from './sucursal-dialog.component';

@Component({
  selector: 'app-sucursales',
  standalone: true,
   imports: [MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule, TranslocoPipe, EmptyStateComponent, TableSkeletonComponent],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 overflow-hidden">
      <!-- Header -->
      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
         <div>
           <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'branches.title' | transloco }}</div>
           <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'branches.description' | transloco }}</p>
         </div>
        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4">
          <button mat-flat-button (click)="openDialog()" class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
             {{ 'branches.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main -->
      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        <div class="grid">
            <!-- Header -->
            <div class="sucursales-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
               <div>{{ 'branches.name' | transloco }}</div>
               <div class="hidden sm:block">{{ 'branches.location' | transloco }}</div>
               <div class="hidden md:block">{{ 'branches.contact' | transloco }}</div>
               <div>{{ 'common.status' | transloco }}</div>
               <div>{{ 'common.actions' | transloco }}</div>
            </div>

            <!-- Rows -->
            @if (sucursalesService.isLoading()) {
              <app-table-skeleton [gridClass]="'sucursales-grid'" [rows]="6" [cells]="cells5" />
            } @else if (sucursalesService.sucursales().length === 0) {
              <div class="flex flex-auto justify-center p-6 sm:p-10">
                <app-empty-state
                  type="no-data"
                   [title]="'branches.emptyTitle' | transloco"
                   [description]="'branches.emptyDescription' | transloco"
                   [actionLabel]="'branches.create' | transloco"
                  actionIcon="plus"
                  (action)="openDialog()"
                />
              </div>
            } @else {
              @for (sucursal of sucursalesService.sucursales(); track sucursal.id) {
                <div class="sucursales-grid grid items-center gap-4 py-3 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <div class="font-medium text-neutral-900 dark:text-white truncate">{{ sucursal.nombre }}</div>
                    <div class="text-xs text-neutral-400 sm:hidden">{{ sucursal.ciudad || sucursal.direccion || '-' }}</div>
                  </div>
                  <div class="hidden sm:block text-sm text-neutral-500 truncate">
                    @if (sucursal.ciudad && sucursal.direccion) {
                      {{ sucursal.ciudad }} · {{ sucursal.direccion }}
                    } @else {
                      {{ sucursal.ciudad || sucursal.direccion || '-' }}
                    }
                  </div>
                  <div class="hidden md:block text-sm text-neutral-500 truncate">
                    {{ sucursal.email || sucursal.telefono || '-' }}
                  </div>
                  <div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {{ sucursal.estado }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                     <button mat-icon-button (click)="openDialog(sucursal)" class="text-neutral-500" [matTooltip]="'branches.edit' | transloco">
                       <mat-icon svgIcon="pencil" class="icon-size-5"></mat-icon>
                    </button>
                     <button mat-icon-button (click)="deleteSucursal(sucursal)" class="text-red-500" [matTooltip]="'branches.delete' | transloco">
                      <mat-icon svgIcon="trash" class="icon-size-5"></mat-icon>
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
    .sucursales-grid {
      grid-template-columns: auto 40% 180px 100px 120px;
    }
    @media (max-width: 768px) {
      .sucursales-grid {
        grid-template-columns: auto 180px 100px 120px;
      }
    }
    @media (max-width: 640px) {
      .sucursales-grid {
        grid-template-columns: auto 100px 120px;
      }
    }
  `]
})
export default class SucursalesComponent implements OnInit {
  sucursalesService = inject(SucursalesService);
  dialog = inject(MatDialog);
  transloco = inject(TranslocoService);

  cells5 = ['90%', '70%', '50%', '40%', '50%'];

  ngOnInit() {
    this.sucursalesService.findAll().subscribe();
  }

  openDialog(sucursal?: any) {
    const dialogRef = this.dialog.open(SucursalDialogComponent, {
      data: { sucursal },
      width: '100%',
      maxWidth: '34rem',
      panelClass: 'dialog-panel-no-padding'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'create') {
        this.sucursalesService.create(result.data).subscribe();
      } else if (result?.action === 'update') {
        this.sucursalesService.update(sucursal.id, result.data).subscribe();
      }
    });
  }

  deleteSucursal(sucursal: any) {
    if (confirm(this.transloco.translate('branches.deleteConfirm', { name: sucursal.nombre }))) {
      this.sucursalesService.remove(sucursal.id).subscribe();
    }
  }
}
