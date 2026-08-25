import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { Product } from '../../data/products.service';

@Component({
  selector: 'app-product-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    CurrencyPipe,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col max-h-[88vh] w-full bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/80 dark:border-neutral-800">
      
      <!-- Modal Header -->
      <div class="relative shrink-0 flex items-center justify-between px-6 sm:px-8 py-5 border-b border-neutral-100 dark:border-neutral-800">
        <div class="min-w-0 pr-4">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white truncate">
              {{ product.nombre }}
            </h2>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
              [class.bg-emerald-100]="product.estado === 'ACTIVO'"
              [class.text-emerald-800]="product.estado === 'ACTIVO'"
              [class.dark:bg-emerald-500/10]="product.estado === 'ACTIVO'"
              [class.dark:text-emerald-400]="product.estado === 'ACTIVO'"
              [class.bg-neutral-100]="product.estado !== 'ACTIVO'"
              [class.text-neutral-700]="product.estado !== 'ACTIVO'"
            >
              {{ product.estado }}
            </span>
          </div>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2 flex-wrap">
            <span>SKU: <strong class="font-mono text-neutral-800 dark:text-neutral-200">{{ product.codigo }}</strong></span>
            <span>·</span>
            <span class="capitalize font-medium">{{ product.tipo === 'SERVICIO' ? 'Servicio Intangible' : 'Producto Físico' }}</span>
            @if (product.categoria?.nombre) {
              <span>·</span>
              <span class="text-neutral-600 dark:text-neutral-300 font-medium">{{ product.categoria?.nombre }}</span>
            }
          </p>
        </div>

        <button
          mat-icon-button
          type="button"
          (click)="dialogRef.close()"
          class="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors shrink-0"
        >
          <mat-icon svgIcon="x" class="icon-size-5"></mat-icon>
        </button>
      </div>

      <!-- Scrollable Body Content -->
      <div class="flex-auto overflow-y-auto p-6 sm:p-8 space-y-6">
        
        @if (images().length > 0) {
          <!-- Layout WITH images: 2 Columns on md+ -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            <!-- Left: Photo Gallery Preview -->
            <div class="md:col-span-5 flex flex-col gap-3">
              <div class="relative w-full aspect-square rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-center shadow-xs">
                <img
                  [src]="selectedImage()"
                  [alt]="product.nombre"
                  class="w-full h-full object-cover transition-all duration-200"
                />
              </div>

              @if (images().length > 1) {
                <div class="flex items-center gap-2 overflow-x-auto pb-1">
                  @for (img of images(); track $index) {
                    <button
                      type="button"
                      (click)="selectedImage.set(img)"
                      class="relative size-14 shrink-0 rounded-xl overflow-hidden border transition-all cursor-pointer"
                      [class.ring-2]="selectedImage() === img"
                      [class.ring-blue-600]="selectedImage() === img"
                      [class.border-transparent]="selectedImage() === img"
                      [class.border-neutral-200]="selectedImage() !== img"
                      [class.dark:border-neutral-700]="selectedImage() !== img"
                    >
                      <img [src]="img" alt="Miniatura" class="w-full h-full object-cover" />
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Right: Financials & Specs -->
            <div class="md:col-span-7 flex flex-col gap-5">
              <!-- Precios e Indicadores -->
              <div class="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                <div>
                  <span class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Precio Venta</span>
                  <div class="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                    {{ product.precioVenta | currency }}
                  </div>
                </div>
                <div>
                  <span class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    {{ product.tipo === 'SERVICIO' ? 'Costo Base' : 'Costo' }}
                  </span>
                  <div class="text-lg font-bold text-neutral-700 dark:text-neutral-300 mt-0.5">
                    {{ (product.costo !== null && product.costo !== undefined) ? (product.costo | currency) : '-' }}
                  </div>
                </div>
                <div>
                  <span class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Margen</span>
                  <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {{ marginPercent() !== null ? '+' + marginPercent() + '%' : '-' }}
                  </div>
                </div>
              </div>

              <!-- Ficha Técnica -->
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                  <span class="text-xs text-neutral-500 font-medium block">Categoría</span>
                  <span class="font-semibold text-neutral-900 dark:text-white mt-0.5 block truncate">
                    {{ product.categoria?.nombre || 'Sin categoría' }}
                  </span>
                </div>

                @if (product.tipo !== 'SERVICIO') {
                  <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                    <span class="text-xs text-neutral-500 font-medium block">Marca</span>
                    <span class="font-semibold text-neutral-900 dark:text-white mt-0.5 block truncate">
                      {{ product.marca?.nombre || 'Sin marca' }}
                    </span>
                  </div>
                }

                <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                  <span class="text-xs text-neutral-500 font-medium block">Unidad de Medida</span>
                  <span class="font-semibold text-neutral-900 dark:text-white mt-0.5 block truncate">
                    {{ product.unidadMedida ? product.unidadMedida.nombre + ' (' + product.unidadMedida.abreviatura + ')' : 'Ninguna / Unidad' }}
                  </span>
                </div>

                @if (product.tipo !== 'SERVICIO') {
                  <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                    <span class="text-xs text-neutral-500 font-medium block">Código de Barras</span>
                    <span class="font-mono font-medium text-neutral-900 dark:text-white mt-0.5 block truncate">
                      {{ product.codigoBarras || '-' }}
                    </span>
                  </div>
                }
              </div>

              <!-- Existencias en Inventario (Solo productos físicos) -->
              @if (product.tipo !== 'SERVICIO') {
                <div class="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      Existencias en Inventario
                    </span>
                    <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      Total: {{ totalStock() }} {{ product.unidadMedida?.abreviatura || 'UND' }}
                    </span>
                  </div>

                  @if (product.stocks && product.stocks.length > 0) {
                    <div class="space-y-2">
                      @for (stk of product.stocks; track stk.id) {
                        <div class="flex items-center justify-between gap-3 p-2.5 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                          <div class="flex items-center gap-2 min-w-0 flex-1">
                            <mat-icon svgIcon="archive" class="icon-size-4 text-neutral-400 shrink-0"></mat-icon>
                            <span class="font-medium text-neutral-800 dark:text-neutral-200 truncate text-xs sm:text-sm">
                              {{ stk.almacen?.nombre || 'Almacén' }}
                            </span>
                            @if (stk.almacen?.esPrincipal) {
                              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 shrink-0">
                                Principal
                              </span>
                            }
                          </div>
                          <span class="font-bold font-mono text-neutral-900 dark:text-white shrink-0 text-sm">
                            {{ stk.cantidad }} {{ product.unidadMedida?.abreviatura || 'UND' }}
                          </span>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="text-xs text-neutral-400 mt-1">
                      No registra existencias en almacenes actualmente.
                    </p>
                  }
                </div>
              }

              <!-- Insumos y Receta (Servicios) -->
              @if (product.tipo === 'SERVICIO' && product.insumos && product.insumos.length > 0) {
                <div class="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <mat-icon svgIcon="layers" class="icon-size-4 text-blue-600 dark:text-blue-400"></mat-icon>
                      Insumos / Materiales Requeridos
                    </span>
                    <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      {{ product.insumos.length }} materiales
                    </span>
                  </div>

                  <div class="space-y-2">
                    @for (item of product.insumos; track item.id || $index) {
                      <div class="flex items-center justify-between gap-3 p-2.5 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                          <mat-icon svgIcon="package" class="icon-size-4 text-neutral-400 dark:text-neutral-500 shrink-0"></mat-icon>
                          <div class="min-w-0">
                            <div class="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-xs sm:text-sm">
                              {{ item.insumoProducto?.nombre || 'Insumo' }}
                            </div>
                            <div class="text-[11px] text-neutral-400 font-mono">
                              {{ item.insumoProducto?.codigo }}
                            </div>
                          </div>
                        </div>
                        <div class="text-right shrink-0">
                          <div class="font-bold font-mono text-neutral-900 dark:text-white text-xs sm:text-sm">
                            {{ item.cantidad }} {{ item.insumoProducto?.unidadMedida?.abreviatura || 'UND' }}
                          </div>
                          @if (item.costoUnitario) {
                            <div class="text-[10px] text-neutral-400">
                              {{ item.costoUnitario | currency }} c/u
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

            </div>
          </div>
        } @else {
          <!-- Layout WITHOUT images -->
          
          <!-- Precios e Indicadores Financieros -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
            <div>
              <span class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Precio Venta</span>
              <div class="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                {{ product.precioVenta | currency }}
              </div>
            </div>
            <div>
              <span class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                {{ product.tipo === 'SERVICIO' ? 'Costo Base' : 'Costo Unitario' }}
              </span>
              <div class="text-xl font-bold text-neutral-700 dark:text-neutral-300 mt-0.5">
                {{ (product.costo !== null && product.costo !== undefined) ? (product.costo | currency) : '-' }}
              </div>
            </div>
            <div>
              <span class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Margen de Ganancia</span>
              <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {{ marginPercent() !== null ? '+' + marginPercent() + '%' : '-' }}
              </div>
            </div>
          </div>

          <!-- Ficha Técnica -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
              <span class="text-xs text-neutral-500 font-medium block">Categoría</span>
              <span class="font-semibold text-neutral-900 dark:text-white mt-0.5 block truncate">
                {{ product.categoria?.nombre || 'Sin categoría' }}
              </span>
            </div>

            @if (product.tipo !== 'SERVICIO') {
              <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                <span class="text-xs text-neutral-500 font-medium block">Marca</span>
                <span class="font-semibold text-neutral-900 dark:text-white mt-0.5 block truncate">
                  {{ product.marca?.nombre || 'Sin marca' }}
                </span>
              </div>
            }

            <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
              <span class="text-xs text-neutral-500 font-medium block">Unidad de Medida</span>
              <span class="font-semibold text-neutral-900 dark:text-white mt-0.5 block truncate">
                {{ product.unidadMedida ? product.unidadMedida.nombre + ' (' + product.unidadMedida.abreviatura + ')' : 'Ninguna / Unidad' }}
              </span>
            </div>

            @if (product.tipo !== 'SERVICIO') {
              <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                <span class="text-xs text-neutral-500 font-medium block">Código de Barras</span>
                <span class="font-mono font-medium text-neutral-900 dark:text-white mt-0.5 block truncate">
                  {{ product.codigoBarras || '-' }}
                </span>
              </div>
            }
          </div>

          <!-- Existencias en Inventario por Almacén (Productos físicos) -->
          @if (product.tipo !== 'SERVICIO') {
            <div class="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
              <div class="flex items-center justify-between mb-3.5">
                <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Existencias en Inventario
                </span>
                <span class="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  Total en Stock: {{ totalStock() }} {{ product.unidadMedida?.abreviatura || 'UND' }}
                </span>
              </div>

              @if (product.stocks && product.stocks.length > 0) {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  @for (stk of product.stocks; track stk.id) {
                    <div class="flex items-center justify-between gap-3 p-3 px-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                      <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="size-8 rounded-lg bg-white dark:bg-neutral-700/60 border border-neutral-200/60 dark:border-neutral-600/60 flex items-center justify-center shrink-0 text-neutral-500 dark:text-neutral-300">
                          <mat-icon svgIcon="archive" class="icon-size-4"></mat-icon>
                        </div>
                        <div class="min-w-0 flex items-center gap-2 flex-wrap">
                          <span class="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-sm">
                            {{ stk.almacen?.nombre || 'Almacén Principal' }}
                          </span>
                          @if (stk.almacen?.esPrincipal) {
                            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                              Principal
                            </span>
                          }
                        </div>
                      </div>
                      <span class="font-bold font-mono text-neutral-900 dark:text-white shrink-0 text-sm">
                        {{ stk.cantidad }} {{ product.unidadMedida?.abreviatura || 'UND' }}
                      </span>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-xs text-neutral-500 mt-1">
                  No registra existencias en almacenes. Puedes registrar stock en el módulo de Inventario y Almacenes.
                </p>
              }
            </div>
          }

          <!-- Insumos y Receta (Servicios) -->
          @if (product.tipo === 'SERVICIO' && product.insumos && product.insumos.length > 0) {
            <div class="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
              <div class="flex items-center justify-between mb-3.5">
                <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  <mat-icon svgIcon="layers" class="icon-size-4 text-blue-600 dark:text-blue-400"></mat-icon>
                  Insumos / Materiales Requeridos
                </span>
                <span class="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {{ product.insumos.length }} materiales vinculados
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                @for (item of product.insumos; track item.id || $index) {
                  <div class="flex items-center justify-between gap-3 p-3 px-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                      <div class="size-8 rounded-lg bg-white dark:bg-neutral-700/60 border border-neutral-200/60 dark:border-neutral-600/60 flex items-center justify-center shrink-0 text-neutral-500 dark:text-neutral-300">
                        <mat-icon svgIcon="package" class="icon-size-4"></mat-icon>
                      </div>
                      <div class="min-w-0">
                        <div class="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-sm">
                          {{ item.insumoProducto?.nombre || 'Insumo' }}
                        </div>
                        <div class="text-[11px] text-neutral-400 font-mono">
                          {{ item.insumoProducto?.codigo }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="font-bold font-mono text-neutral-900 dark:text-white shrink-0 text-sm block">
                        {{ item.cantidad }} {{ item.insumoProducto?.unidadMedida?.abreviatura || 'UND' }}
                      </span>
                      @if (item.costoUnitario) {
                        <span class="text-[11px] text-neutral-400">
                          {{ item.costoUnitario | currency }} c/u
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

        }

        <!-- Descripción -->
        @if (product.descripcion) {
          <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
            <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
              Descripción
            </span>
            <p class="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
              {{ product.descripcion }}
            </p>
          </div>
        }

        <!-- Tags -->
        @if (tagsList().length > 0) {
          <div>
            <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-2">
              Etiquetas
            </span>
            <div class="flex flex-wrap gap-1.5">
              @for (tag of tagsList(); track tag) {
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                  #{{ tag }}
                </span>
              }
            </div>
          </div>
        }

      </div>

      <!-- Modal Footer -->
      <div class="shrink-0 flex items-center justify-end gap-3 px-6 sm:px-8 py-4 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800">
        <button
          mat-stroked-button
          type="button"
          (click)="dialogRef.close()"
          class="!rounded-xl !px-5 cursor-pointer"
        >
          {{ 'common.close' | transloco }}
        </button>
        <button
          mat-flat-button
          type="button"
          color="primary"
          (click)="editProduct()"
          class="bg-blue-600 hover:bg-blue-700 text-white !rounded-xl !px-6 font-semibold cursor-pointer"
        >
          <mat-icon svgIcon="pencil" class="icon-size-4 mr-1.5"></mat-icon>
          {{ 'catalogs.products.edit' | transloco }}
        </button>
      </div>

    </div>
  `,
})
export class ProductDetailDialogComponent implements OnInit {
  product = inject<Product>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ProductDetailDialogComponent>);

  images = signal<string[]>([]);
  selectedImage = signal<string>('');
  tagsList = signal<string[]>([]);
  marginPercent = signal<string | null>(null);
  totalStock = signal<number>(0);

  constructor() {
    const rawImages = this.product.imagenes;
    if (rawImages) {
      try {
        const parsed = typeof rawImages === 'string' ? JSON.parse(rawImages) : rawImages;
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.images.set(parsed);
          this.selectedImage.set(parsed[0]);
        } else if (typeof parsed === 'string' && parsed.trim() !== '') {
          this.images.set([parsed]);
          this.selectedImage.set(parsed);
        }
      } catch {
        if (typeof rawImages === 'string' && rawImages.trim() !== '') {
          this.images.set([rawImages]);
          this.selectedImage.set(rawImages);
        }
      }
    }
  }

  ngOnInit() {
    if (this.product.tags) {
      const tags = this.product.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      this.tagsList.set(tags);
    }

    if (
      this.product.precioVenta > 0 &&
      this.product.costo !== null &&
      this.product.costo !== undefined &&
      this.product.costo > 0
    ) {
      const margin =
        ((Number(this.product.precioVenta) - Number(this.product.costo)) /
          Number(this.product.costo)) *
        100;
      this.marginPercent.set(margin.toFixed(1));
    }

    if (this.product.stocks && Array.isArray(this.product.stocks)) {
      const total = this.product.stocks.reduce(
        (acc, s) => acc + Number(s.cantidad || 0),
        0,
      );
      this.totalStock.set(total);
    }
  }

  editProduct() {
    this.dialogRef.close({ action: 'edit', id: this.product.id });
  }
}
