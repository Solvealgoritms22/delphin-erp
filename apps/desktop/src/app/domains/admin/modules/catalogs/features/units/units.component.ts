import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UnitsService } from '../../data/units.service';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@/app/shared/components/table-skeleton/table-skeleton.component';
import { UnitDialogComponent } from './unit-dialog.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlusIcon, PencilIcon } from 'ng-animated-icons';

@Component({
  selector: 'app-units',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [MatButtonModule, MatIconModule, EmptyStateComponent, MatDialogModule, TableSkeletonComponent, TranslocoPipe, PlusIcon, PencilIcon],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">
      <!-- Header -->
      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
         <div>
           <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'catalogs.units.title' | transloco }}</div>
           <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'catalogs.units.description' | transloco }}</p>
         </div>
        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4">
          <button mat-flat-button (click)="openDialog()" class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            <i-plus [size]="18" class="mr-2" />
             {{ 'catalogs.units.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main -->
      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        <div class="grid">
            <!-- Header -->
            <div class="inventory-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
               <div>{{ 'common.name' | transloco }}</div>
               <div>{{ 'catalogs.units.abbreviation' | transloco }}</div>
               <div>{{ 'common.status' | transloco }}</div>
               <div>{{ 'common.actions' | transloco }}</div>
            </div>
            
            <!-- Rows -->
            @if (unitsService.isLoading()) {
              <app-table-skeleton [gridClass]="'inventory-grid'" [rows]="6" [cells]="cells4" />
            } @else if (unitsService.units().length === 0) {
              <div class="flex flex-auto justify-center p-6 sm:p-10">
                <app-empty-state
                  type="no-data"
                   [title]="'catalogs.units.emptyTitle' | transloco"
                   [description]="'catalogs.units.emptyDescription' | transloco"
                   [actionLabel]="'catalogs.units.create' | transloco"
                  actionIcon="plus"
                  (action)="openDialog()"
                />
              </div>
            } @else {
              @for (unidad of unitsService.units(); track unidad.id) {
                <div class="inventory-grid grid items-center gap-4 py-3 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800">
                  <div class="font-medium text-neutral-900 dark:text-white truncate">{{ unidad.nombre }}</div>
                  <div class="text-sm text-neutral-500">{{ unidad.abreviatura }}</div>
                  <div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {{ unidad.estado }}
                    </span>
                  </div>
                  <div>
                    <button mat-icon-button (click)="openDialog(unidad)" class="text-neutral-500 hover:text-neutral-700">
                       <i-pencil [size]="18" />
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
    .inventory-grid {
      grid-template-columns: auto 120px 100px 96px;
    }
  `]
})
export default class UnitsComponent implements OnInit {
  unitsService = inject(UnitsService);
  dialog = inject(MatDialog);

  cells4 = ['90%', '70%', '40%', '50%'];

  ngOnInit() {
    this.unitsService.findAll().subscribe();
  }

  openDialog(unit?: any) {
    const dialogRef = this.dialog.open(UnitDialogComponent, {
      data: { unit },
      width: '100%',
      maxWidth: '30rem',
      panelClass: 'dialog-panel-no-padding'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'create') {
        this.unitsService.create(result.data).subscribe();
      } else if (result?.action === 'update') {
        this.unitsService.update(unit.id, result.data).subscribe();
      }
    });
  }
}
