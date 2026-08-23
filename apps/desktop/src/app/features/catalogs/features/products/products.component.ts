import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductsService, Product } from '../../data/products.service';
import { ProductDetailDialogComponent } from './product-detail-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-products',
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
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <div>
          <div
            class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'catalogs.products.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'catalogs.products.description' | transloco }}
          </p>
        </div>

        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4">
          <button
            mat-flat-button
            (click)="openForm()"
            class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
            {{ 'catalogs.products.new' | transloco }}
          </button>
        </div>
      </div>

      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        <div class="grid">
          <div
            class="inventory-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
          >
            <div class="text-center">Foto</div>
            <div>{{ 'common.code' | transloco }}</div>
            <div>{{ 'common.name' | transloco }}</div>
            <div class="hidden sm:block">
              {{ 'common.category' | transloco }}
            </div>
            <div class="hidden md:block">Unidad</div>
            <div class="hidden lg:block text-right">
              {{ 'common.price' | transloco }}
            </div>
            <div class="hidden lg:block text-right">
              {{ 'common.cost' | transloco }}
            </div>
            <div>{{ 'common.actions' | transloco }}</div>
          </div>

          @if (productsService.isLoading()) {
            <app-table-skeleton
              [gridClass]="'inventory-grid'"
              [rows]="6"
              [cells]="cells8"
            />
          } @else if (productsService.products().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                type="no-data"
                [title]="'catalogs.products.emptyTitle' | transloco"
                [description]="'catalogs.products.emptyDescription' | transloco"
                [actionLabel]="'catalogs.products.new' | transloco"
                actionIcon="plus"
                (action)="openForm()"
              />
            </div>
          } @else {
            @for (product of productsService.products(); track product.id) {
              <div
                class="inventory-grid grid items-center gap-4 py-3 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
              >
                <!-- Foto Thumbnail -->
                <div class="flex items-center justify-center">
                  <div
                    (click)="openDetail(product)"
                    class="w-11 h-11 rounded-xl shrink-0 overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-600/50 transition-all shadow-sm"
                    [matTooltip]="'catalogs.products.viewDetail' | transloco"
                  >
                    @if (getProductMainImage(product)) {
                      <img
                        [src]="getProductMainImage(product)"
                        [alt]="product.nombre"
                        class="w-full h-full object-cover"
                      />
                    } @else {
                      <mat-icon
                        svgIcon="package"
                        class="icon-size-5 text-neutral-400 dark:text-neutral-500"
                      ></mat-icon>
                    }
                  </div>
                </div>

                <!-- Código -->
                <div class="text-sm font-semibold font-mono text-neutral-700 dark:text-neutral-300">
                  {{ product.codigo }}
                </div>

                <!-- Nombre -->
                <div
                  (click)="openDetail(product)"
                  class="font-medium text-neutral-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  [matTooltip]="'catalogs.products.viewDetail' | transloco"
                >
                  {{ product.nombre }}
                </div>

                <!-- Categoría -->
                <div class="hidden sm:block text-sm text-neutral-500">
                  {{ product.categoria?.nombre || '-' }}
                </div>

                <!-- Unidad -->
                <div class="hidden md:block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  <span class="inline-flex items-center px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                    {{ product.unidadMedida?.abreviatura || product.unidadMedida?.nombre || '-' }}
                  </span>
                </div>

                <!-- Precio -->
                <div class="hidden lg:block text-right font-medium">
                  {{ product.precioVenta | currency }}
                </div>

                <!-- Costo -->
                <div class="hidden lg:block text-right font-medium text-neutral-500">
                  {{ (product.costo !== null && product.costo !== undefined) ? (product.costo | currency) : '-' }}
                </div>

                <!-- Acciones -->
                <div class="flex items-center gap-1">
                  <button
                    mat-icon-button
                    (click)="openDetail(product)"
                    class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400"
                    [matTooltip]="'catalogs.products.viewDetail' | transloco"
                  >
                    <mat-icon svgIcon="eye" class="icon-size-5"></mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    (click)="openForm(product.id)"
                    class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400"
                    [matTooltip]="'common.edit' | transloco"
                  >
                    <mat-icon svgIcon="pencil" class="icon-size-5"></mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    (click)="deleteProduct(product)"
                    class="text-red-500 hover:text-red-700 dark:hover:text-red-400"
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
      .inventory-grid {
        grid-template-columns: 56px 110px auto 120px 80px 100px 100px 120px;
      }
      @media (max-width: 1024px) {
        .inventory-grid {
          grid-template-columns: 56px 110px auto 120px 80px 120px;
        }
      }
      @media (max-width: 768px) {
        .inventory-grid {
          grid-template-columns: 56px 100px auto 120px 120px;
        }
      }
      @media (max-width: 640px) {
        .inventory-grid {
          grid-template-columns: 56px auto 100px;
        }
      }
    `,
  ],
})
export default class ProductsComponent implements OnInit {
  protected productsService = inject(ProductsService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  cells8 = ['50px', '70%', '90%', '60%', '40%', '40%', '40%', '40%'];

  ngOnInit() {
    this.productsService.findAll().subscribe();
    this.productsService.loadCatalogs();
  }

  getProductMainImage(product: Product): string | null {
    if (!product.imagenes) return null;
    try {
      const parsed =
        typeof product.imagenes === 'string'
          ? JSON.parse(product.imagenes)
          : product.imagenes;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
      if (typeof parsed === 'string' && parsed.trim() !== '') {
        return parsed;
      }
    } catch {
      if (typeof product.imagenes === 'string' && product.imagenes.trim() !== '') {
        return product.imagenes;
      }
    }
    return null;
  }

  openDetail(product: Product) {
    const dialogRef = this.dialog.open(ProductDetailDialogComponent, {
      data: product,
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
      this.router.navigate(['/admin/catalogs/products', id]);
    } else {
      this.router.navigate(['/admin/catalogs/products/new']);
    }
  }

  deleteProduct(product: Product) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar producto',
        message: `¿Estás seguro de que deseas eliminar el producto "${product.nombre}"? Esta acción no se puede deshacer.`,
        confirmLabel: this.transloco.translate('common.delete') || 'Eliminar',
        cancelLabel: this.transloco.translate('common.cancel') || 'Cancelar',
        destructive: true,
        icon: 'trash',
      } satisfies ConfirmDialogData,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.productsService.remove(product.id).subscribe({
          next: () => {
            this.snackBar.open(
              'Producto eliminado con éxito',
              this.transloco.translate('common.close') || 'Cerrar',
              { duration: 3000 },
            );
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || 'No se pudo eliminar el producto',
              this.transloco.translate('common.close') || 'Cerrar',
              { duration: 4000 },
            );
          },
        });
      }
    });
  }
}

