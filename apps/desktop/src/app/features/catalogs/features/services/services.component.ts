import { Component, inject, OnInit, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductsService, Product } from '../../data/products.service';
import { ProductDetailDialogComponent } from '../products/product-detail-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-services',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    CurrencyPipe,
    EmptyStateComponent,
    TableSkeletonComponent,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">
      <!-- Header -->
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <div>
          <div
            class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3"
          >
            {{ 'catalogs.services.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'catalogs.services.description' | transloco }}
          </p>
        </div>

        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4">
          <button
            mat-flat-button
            (click)="openForm()"
            class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
          >
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
            {{ 'catalogs.services.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Table Container -->
      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        <div class="grid">
          <!-- Table Header -->
          <div
            class="services-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
          >
            <div class="text-center">Portada</div>
            <div>{{ 'common.code' | transloco }}</div>
            <div>{{ 'common.name' | transloco }}</div>
            <div class="hidden sm:block">
              {{ 'common.category' | transloco }}
            </div>
            <div class="hidden md:block">
              {{ 'catalogs.services.materialsConsumed' | transloco }}
            </div>
            <div class="hidden lg:block text-right">
              {{ 'catalogs.services.totalCost' | transloco }}
            </div>
            <div class="hidden lg:block text-right">
              {{ 'common.price' | transloco }}
            </div>
            <div>{{ 'common.actions' | transloco }}</div>
          </div>

          @if (productsService.isLoading()) {
            <app-table-skeleton
              [gridClass]="'services-grid'"
              [rows]="6"
              [cells]="cells8"
            />
          } @else if (servicesList().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                type="no-data"
                [title]="'catalogs.services.emptyTitle' | transloco"
                [description]="'catalogs.services.emptyDescription' | transloco"
                [actionLabel]="'catalogs.services.new' | transloco"
                actionIcon="plus"
                (action)="openForm()"
              />
            </div>
          } @else {
            @for (service of servicesList(); track service.id) {
              <div
                class="services-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
              >
                <!-- Foto / Portada -->
                <div class="flex items-center justify-center">
                  <div
                    (click)="openDetail(service)"
                    class="w-11 h-11 rounded-xl shrink-0 overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-600/50 transition-all shadow-sm"
                    [matTooltip]="'catalogs.products.viewDetail' | transloco"
                  >
                    @if (getServiceImage(service)) {
                      <img
                        [src]="getServiceImage(service)"
                        [alt]="service.nombre"
                        class="w-full h-full object-fill"
                      />
                    } @else {
                      <mat-icon
                        svgIcon="wrench"
                        class="icon-size-5 text-neutral-400 dark:text-neutral-500"
                      ></mat-icon>
                    }
                  </div>
                </div>

                <!-- Código SRV -->
                <div class="text-sm font-semibold font-mono text-neutral-700 dark:text-neutral-300">
                  {{ service.codigo }}
                </div>

                <!-- Nombre del Servicio -->
                <div class="flex flex-col min-w-0 pr-2">
                  <div
                    (click)="openDetail(service)"
                    class="font-semibold text-neutral-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    [matTooltip]="'catalogs.products.viewDetail' | transloco"
                  >
                    {{ service.nombre }}
                  </div>
                  @if (service.descripcion) {
                    <span class="text-xs text-neutral-400 truncate mt-0.5">{{ service.descripcion }}</span>
                  }
                </div>

                <!-- Categoría -->
                <div class="hidden sm:block text-sm text-neutral-600 dark:text-neutral-300 truncate">
                  {{ service.categoria?.nombre || '-' }}
                </div>

                <!-- Insumos / Materiales Vinculados -->
                <div class="hidden md:block">
                  @if (service.insumos && service.insumos.length > 0) {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50">
                      <mat-icon svgIcon="layers" class="icon-size-3.5"></mat-icon>
                      {{ service.insumos.length }} {{ service.insumos.length === 1 ? 'insumo' : 'insumos' }}
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800">
                      {{ 'catalogs.services.noMaterials' | transloco }}
                    </span>
                  }
                </div>

                <!-- Costo Total Calculado -->
                <div class="hidden lg:block text-right font-medium text-neutral-600 dark:text-neutral-400">
                  {{ calculateTotalCost(service) | currency }}
                </div>

                <!-- Precio de Venta -->
                <div class="hidden lg:block text-right font-bold text-neutral-900 dark:text-white">
                  {{ service.precioVenta | currency }}
                </div>

                <!-- Acciones -->
                <div class="flex items-center gap-1">
                  <button
                    mat-icon-button
                    (click)="openDetail(service)"
                    class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    [matTooltip]="'catalogs.products.viewDetail' | transloco"
                  >
                    <mat-icon svgIcon="eye" class="icon-size-5"></mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    (click)="openForm(service.id)"
                    class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    [matTooltip]="'common.edit' | transloco"
                  >
                    <mat-icon svgIcon="pencil" class="icon-size-5"></mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    (click)="deleteService(service)"
                    class="text-red-500 hover:text-red-700 dark:hover:text-red-400 cursor-pointer"
                    [matTooltip]="'common.delete' | transloco"
                  >
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
  styles: [
    `
      .services-grid {
        grid-template-columns: 56px 110px auto 130px 140px 110px 110px 120px;
      }
      @media (max-width: 1024px) {
        .services-grid {
          grid-template-columns: 56px 110px auto 130px 140px 120px;
        }
      }
      @media (max-width: 768px) {
        .services-grid {
          grid-template-columns: 56px 100px auto 120px 120px;
        }
      }
      @media (max-width: 640px) {
        .services-grid {
          grid-template-columns: 56px auto 100px;
        }
      }
    `,
  ],
})
export default class ServicesComponent implements OnInit {
  protected productsService = inject(ProductsService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  cells8 = ['50px', '70%', '90%', '60%', '40%', '40%', '40%', '40%'];

  servicesList = computed(() => {
    return this.productsService.products().filter((p) => p.tipo === 'SERVICIO');
  });

  ngOnInit() {
    this.productsService.findAll().subscribe();
    this.productsService.loadCatalogs();
  }

  getServiceImage(service: Product): string | null {
    if (!service.imagenes) return null;
    try {
      const parsed =
        typeof service.imagenes === 'string'
          ? JSON.parse(service.imagenes)
          : service.imagenes;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
      if (typeof parsed === 'string' && parsed.trim() !== '') {
        return parsed;
      }
    } catch {
      if (typeof service.imagenes === 'string' && service.imagenes.trim() !== '') {
        return service.imagenes;
      }
    }
    return null;
  }

  calculateTotalCost(service: Product): number {
    const laborCost = Number(service.costo) || 0;
    const materialsCost = (service.insumos || []).reduce((acc, item) => {
      return acc + (Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0);
    }, 0);
    return laborCost + materialsCost;
  }

  openDetail(service: Product) {
    const dialogRef = this.dialog.open(ProductDetailDialogComponent, {
      data: service,
      autoFocus: false,
      width: '740px',
      maxWidth: '95vw',
      panelClass: 'product-detail-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res?.action === 'edit' && res.id) {
        this.openForm(res.id);
      }
    });
  }

  openForm(id?: string) {
    if (id) {
      this.router.navigate(['/admin/catalogs/services', id]);
    } else {
      this.router.navigate(['/admin/catalogs/services/new']);
    }
  }

  deleteService(service: Product) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('common.confirm'),
        message: '¿Estás seguro de que deseas eliminar el servicio "' + service.nombre + '"?',
        confirmText: this.transloco.translate('common.delete'),
        cancelText: this.transloco.translate('common.cancel'),
        isDestructive: true,
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.productsService.delete(service.id).subscribe({
          next: () => {
            this.snackBar.open(
              'Servicio eliminado correctamente',
              this.transloco.translate('common.close') || 'Cerrar',
              { duration: 3000 }
            );
          },
          error: (_err: any) => {
            this.snackBar.open(
              'No se pudo eliminar el servicio',
              this.transloco.translate('common.close') || 'Cerrar',
              { duration: 3000 }
            );
          },
        });
      }
    });
  }
}
