import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Product, ProductsService } from '@features/catalogs/data/products.service';
import { CategoriesService } from '@features/catalogs/data/categories.service';
import { ClientsService } from '@features/sales/data/clients';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

import { PosService } from './data/pos.service';
import { PosCheckoutDialogComponent } from './dialogs/pos-checkout-dialog.component';
import { PosHeldDialogComponent } from './dialogs/pos-held-dialog.component';
import { PosDiscountDialogComponent } from './dialogs/pos-discount-dialog.component';
import { PosNoteDialogComponent } from './dialogs/pos-note-dialog.component';

@Component({
  selector: 'app-pos',
  standalone: true,
  host: { class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden' },
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslocoPipe,
    SkeletonComponent,
  ],
  template: `
    <div class="relative flex h-full w-full min-w-0 bg-neutral-100/60 dark:bg-neutral-950 overflow-hidden">
      
      <!-- ========================================== -->
      <!-- COLUMNA PRINCIPAL: Catálogo de Productos   -->
      <!-- ========================================== -->
      <div class="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        
        <!-- Cabecera Superior Limpia -->
        <header class="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 gap-3">
          
          <!-- Título y Estado de Caja -->
          <div class="flex items-center gap-3">
            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap">
              {{ 'pos.title' | transloco }}
            </h1>
            <span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              <mat-icon svgIcon="check" class="!w-3.5 !h-3.5 text-emerald-600 dark:text-emerald-400"></mat-icon>
              Caja activa
            </span>
          </div>

          <!-- Buscador Universal y Botón Carrito en Mobile -->
          <div class="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div class="relative w-full">
              <mat-icon svgIcon="search" class="!w-4 !h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none"></mat-icon>
              <input
                #searchInput
                type="text"
                [(ngModel)]="searchTerm"
                (ngModelChange)="onSearchChange($event)"
                (keydown.enter)="onSearchEnter()"
                [placeholder]="'pos.searchPlaceholder' | transloco"
                class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 py-2 pr-8 pl-9 text-xs sm:text-sm text-neutral-900 dark:text-white outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-neutral-900 transition-all placeholder:text-neutral-400"
              />
              @if (searchTerm) {
                <button
                  type="button"
                  (click)="clearSearch()"
                  class="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <mat-icon svgIcon="circle-x" class="!w-4 !h-4"></mat-icon>
                </button>
              }
            </div>

            <!-- Botón Ver Carrito (Sólo en pantallas < lg) -->
            <button
              type="button"
              (click)="toggleMobileCart()"
              class="lg:hidden shrink-0 relative flex items-center justify-center p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              <mat-icon svgIcon="shopping-cart" class="!w-5 !h-5"></mat-icon>
              @if (posService.totalQuantity() > 0) {
                <span class="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                  {{ posService.totalQuantity() }}
                </span>
              }
            </button>
          </div>
        </header>

        <!-- Barra de Categorías en Píldoras Horizontales -->
        <nav class="shrink-0 flex items-center gap-1.5 px-4 sm:px-6 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            (click)="setCategory('ALL')"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
            [ngClass]="selectedCategory === 'ALL'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'"
          >
            {{ 'pos.allCategories' | transloco }}
          </button>
          @for (cat of categories(); track cat.id) {
            <button
              type="button"
              (click)="setCategory(cat.id)"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
              [ngClass]="selectedCategory === cat.id
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'"
            >
              {{ cat.nombre }}
            </button>
          }
        </nav>

        <!-- Grid de Productos (Scrollable) -->
        <main class="flex-auto min-h-0 overflow-y-auto p-4 sm:p-6">
          @if (productsLoading()) {
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              @for (i of [1,2,3,4,5,6,7,8,9,10]; track i) {
                <div class="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
                  <app-skeleton type="rect" height="7.5rem" />
                  <app-skeleton type="text" width="75%" height="1rem" />
                  <app-skeleton type="text" width="40%" height="1.25rem" />
                </div>
              }
            </div>
          } @else if (filteredProducts().length === 0) {
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <mat-icon svgIcon="package" class="!w-12 !h-12 text-neutral-300 dark:text-neutral-700 mb-3"></mat-icon>
              <h2 class="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                {{ 'pos.noProductsFound' | transloco }}
              </h2>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                {{ 'pos.noProductsFoundDesc' | transloco }}
              </p>
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              @for (product of filteredProducts(); track product.id) {
                <article
                  (click)="addProductToCart(product)"
                  class="group relative flex flex-col justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-xs transition-all cursor-pointer select-none active:scale-[0.99]"
                >
                  <!-- Badge de Stock en esquina superior -->
                  <div class="absolute top-2 right-2 z-10">
                    <span
                      class="px-2 py-0.5 rounded-md text-[11px] font-medium"
                      [ngClass]="posService.getProductStock(product) > 0
                        ? 'bg-neutral-900/80 text-white dark:bg-neutral-800 dark:text-neutral-200 backdrop-blur-xs'
                        : 'bg-rose-500 text-white'"
                    >
                      {{ posService.getProductStock(product) > 0 ? (posService.getProductStock(product) + ' un.') : 'Agotado' }}
                    </span>
                  </div>

                  <!-- Imagen o Icono del Producto -->
                  <div class="w-full aspect-square rounded-lg bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-center overflow-hidden mb-2.5 p-3">
                    @if (getProductImage(product)) {
                      <img
                        [src]="getProductImage(product)"
                        [alt]="product.nombre"
                        class="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    } @else {
                      <mat-icon svgIcon="package" class="!w-10 !h-10 text-neutral-300 dark:text-neutral-600 group-hover:scale-110 transition-transform"></mat-icon>
                    }
                  </div>

                  <!-- Información: Nombre y Precio -->
                  <div class="flex flex-col flex-1 justify-between gap-2">
                    <h3 class="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-snug">
                      {{ product.nombre }}
                    </h3>

                    <div class="flex items-baseline justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
                      <div class="text-sm sm:text-base font-bold text-neutral-900 dark:text-white font-mono">
                        RD$ {{ (product.enOferta && product.precioOferta ? product.precioOferta : product.precioVenta) | number:'1.2-2' }}
                      </div>
                      @if (product.enOferta && product.precioOferta) {
                        <span class="text-[10px] line-through text-neutral-400">
                          RD$ {{ product.precioVenta | number:'1.2-2' }}
                        </span>
                      }
                    </div>
                  </div>
                </article>
              }
            </div>
          }
        </main>
      </div>

      <!-- ========================================== -->
      <!-- COLUMNA DERECHA: Carrito Lateral / Drawer  -->
      <!-- ========================================== -->
      
      <!-- Backdrop en pantallas pequeñas cuando el carrito está abierto -->
      @if (mobileCartOpen()) {
        <div
          (click)="mobileCartOpen.set(false)"
          class="lg:hidden fixed inset-0 z-30 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
        ></div>
      }

      <aside
        class="fixed inset-y-0 right-0 z-40 lg:static lg:z-auto w-full max-w-sm sm:max-w-md lg:w-96 xl:w-[410px] shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-full overflow-hidden shadow-xl lg:shadow-none transition-transform duration-200 ease-in-out"
        [ngClass]="mobileCartOpen() ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'"
      >
        
        <!-- Cabecera del Carrito -->
        <div class="shrink-0 p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-neutral-900 dark:text-white">
                {{ 'pos.cart' | transloco }}
              </h2>
              <span class="text-xs text-neutral-400 font-mono">
                ({{ posService.totalQuantity() }})
              </span>
            </div>

            <div class="flex items-center gap-2">
              <!-- Botón Pausadas -->
              @if (posService.heldCarts().length > 0) {
                <button
                  type="button"
                  mat-stroked-button
                  (click)="openHeldDialog()"
                  class="!rounded-lg !text-xs !font-semibold !px-2.5 !h-7 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800"
                >
                  <mat-icon svgIcon="pause" class="!w-3.5 !h-3.5 mr-1"></mat-icon>
                  <span>{{ 'pos.held' | transloco }} ({{ posService.heldCarts().length }})</span>
                </button>
              }

              <!-- Botón Cerrar Drawer (Sólo Mobile) -->
              <button
                type="button"
                (click)="mobileCartOpen.set(false)"
                class="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <mat-icon svgIcon="circle-x" class="!w-5 !h-5"></mat-icon>
              </button>
            </div>
          </div>

          <!-- Selector de Cliente -->
          <div class="w-full">
            <mat-form-field appearance="outline" class="w-full !text-xs !mb-[-1.25rem]">
              <mat-select
                [value]="posService.selectedClient()?.id || ''"
                (selectionChange)="onClientSelected($event.value)"
                [placeholder]="'pos.selectClient' | transloco"
              >
                <mat-option value="">{{ 'pos.generalClient' | transloco }}</mat-option>
                @for (c of clients(); track c.id) {
                  <mat-option [value]="c.id">
                    {{ c.nombreRazonSocial }} {{ c.numeroDocumento ? '(' + c.numeroDocumento + ')' : '' }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <!-- Lista de Artículos del Carrito -->
        <div class="flex-auto min-h-0 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/80 p-3 sm:p-4 space-y-1">
          @if (posService.items().length === 0) {
            <div class="flex flex-col items-center justify-center h-full py-16 text-center text-neutral-400">
              <mat-icon svgIcon="shopping-cart" class="!w-10 !h-10 text-neutral-300 dark:text-neutral-700 mb-2"></mat-icon>
              <p class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {{ 'pos.cartEmpty' | transloco }}
              </p>
              <p class="text-[11px] text-neutral-400 max-w-[200px] mt-0.5">
                {{ 'pos.cartEmptyDesc' | transloco }}
              </p>
            </div>
          } @else {
            @for (item of posService.items(); track item.id) {
              <div class="py-2.5 flex items-center justify-between gap-2.5">
                
                <!-- Miniatura y Nombre -->
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <div class="size-10 shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden p-1">
                    @if (getProductImage(item.product)) {
                      <img [src]="getProductImage(item.product)" [alt]="item.product.nombre" class="w-full h-full object-contain" />
                    } @else {
                      <mat-icon svgIcon="package" class="!w-5 !h-5 text-neutral-400"></mat-icon>
                    }
                  </div>

                  <div class="min-w-0 flex-1">
                    <h4 class="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {{ item.product.nombre }}
                    </h4>
                    <div class="text-[11px] text-neutral-500 font-mono">
                      RD$ {{ item.precioUnitario | number:'1.2-2' }} c/u
                    </div>
                  </div>
                </div>

                <!-- Stepper de Cantidad -->
                <div class="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/80 shrink-0">
                  <button
                    type="button"
                    (click)="posService.decrementQuantity(item.id)"
                    class="size-6 sm:size-7 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  >
                    <mat-icon svgIcon="minus" class="!w-3 !h-3"></mat-icon>
                  </button>
                  <input
                    type="number"
                    min="1"
                    [(ngModel)]="item.cantidad"
                    (ngModelChange)="posService.updateQuantity(item.id, $event)"
                    class="w-7 text-center text-xs font-bold font-mono bg-transparent outline-none text-neutral-900 dark:text-white"
                  />
                  <button
                    type="button"
                    (click)="posService.incrementQuantity(item.id)"
                    class="size-6 sm:size-7 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  >
                    <mat-icon svgIcon="plus" class="!w-3 !h-3"></mat-icon>
                  </button>
                </div>

                <!-- Subtotal y Eliminar -->
                <div class="text-right shrink-0 min-w-[70px]">
                  <div class="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                    RD$ {{ item.subtotal | number:'1.2-2' }}
                  </div>
                  <button
                    type="button"
                    (click)="posService.removeItem(item.id)"
                    class="text-[11px] text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-0.5 mt-0.5"
                  >
                    <mat-icon svgIcon="trash" class="!w-3 !h-3"></mat-icon>
                  </button>
                </div>
              </div>
            }
          }
        </div>

        <!-- Resumen Financiero y Acciones Inferiores -->
        <div class="shrink-0 p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 space-y-3">
          
          <!-- Desglose de Totales -->
          <div class="space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <div class="flex justify-between">
              <span>{{ 'pos.subtotal' | transloco }}:</span>
              <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                RD$ {{ posService.rawSubtotal() | number:'1.2-2' }}
              </span>
            </div>

            @if (posService.discountTotal() > 0) {
              <div class="flex justify-between text-rose-600 dark:text-rose-400">
                <span>{{ 'pos.discount' | transloco }}:</span>
                <span class="font-mono font-medium">
                  - RD$ {{ posService.discountTotal() | number:'1.2-2' }}
                </span>
              </div>
            }

            <div class="flex justify-between">
              <span>{{ 'pos.itbis' | transloco }} (18%):</span>
              <span class="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                RD$ {{ posService.taxTotal() | number:'1.2-2' }}
              </span>
            </div>

            <div class="flex justify-between items-baseline pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <span class="text-sm font-bold text-neutral-900 dark:text-white">{{ 'pos.total' | transloco }}:</span>
              <span class="text-xl font-bold font-mono text-neutral-900 dark:text-white">
                RD$ {{ posService.grandTotal() | number:'1.2-2' }}
              </span>
            </div>
          </div>

          <!-- Botones de Acción Secundaria (Descuento, Nota, Pausa) -->
          <div class="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              mat-stroked-button
              (click)="openDiscountDialog()"
              [disabled]="posService.items().length === 0"
              class="!rounded-lg !text-xs !px-1 !h-8 inline-flex items-center justify-center"
            >
              <mat-icon svgIcon="percent" class="!w-3.5 !h-3.5 mr-1 text-neutral-400 dark:text-neutral-500"></mat-icon>
              <span>{{ 'pos.discount' | transloco }}</span>
            </button>

            <button
              type="button"
              mat-stroked-button
              (click)="openNoteDialog()"
              [disabled]="posService.items().length === 0"
              class="!rounded-lg !text-xs !px-1 !h-8 inline-flex items-center justify-center"
            >
              <mat-icon svgIcon="file-text" class="!w-3.5 !h-3.5 mr-1 text-neutral-400 dark:text-neutral-500"></mat-icon>
              <span>{{ 'pos.note' | transloco }}</span>
            </button>

            <button
              type="button"
              mat-stroked-button
              (click)="pauseSale()"
              [disabled]="posService.items().length === 0"
              class="!rounded-lg !text-xs !px-1 !h-8 inline-flex items-center justify-center"
            >
              <mat-icon svgIcon="pause" class="!w-3.5 !h-3.5 mr-1 text-neutral-400 dark:text-neutral-500"></mat-icon>
              <span>{{ 'pos.holdSale' | transloco }}</span>
            </button>
          </div>

          <!-- Botón Principal: COBRAR -->
          <button
            type="button"
            mat-flat-button
            color="primary"
            (click)="openCheckoutDialog()"
            [disabled]="posService.items().length === 0"
            class="w-full !rounded-xl !py-3 !text-sm !font-bold"
          >
            <span>{{ 'pos.charge' | transloco }} (F4)</span>
          </button>

          <!-- Limpiar Carrito -->
          @if (posService.items().length > 0) {
            <div class="text-center pt-0.5">
              <button
                type="button"
                (click)="posService.clearCart()"
                class="text-xs text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              >
                {{ 'pos.clearCart' | transloco }} (F9)
              </button>
            </div>
          }
        </div>
      </aside>
    </div>
  `,
})
export class PosComponent implements OnInit {
  readonly posService = inject(PosService);
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly clientsService = inject(ClientsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  readonly products = this.productsService.products;
  readonly productsLoading = this.productsService.isLoading;
  readonly categories = this.categoriesService.categories;
  readonly clients = this.clientsService.clients;

  readonly mobileCartOpen = signal(false);
  searchTerm = '';
  selectedCategory = 'ALL';

  // Barcode buffer for hardware USB scanner
  private barcodeBuffer = '';
  private lastKeyTime = 0;

  readonly filteredProducts = computed(() => {
    let list = this.products();
    const cat = this.selectedCategory;
    const term = this.searchTerm.toLowerCase().trim();

    if (cat !== 'ALL') {
      list = list.filter((p) => p.categoriaId === cat);
    }

    if (term) {
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          p.codigo.toLowerCase().includes(term) ||
          (p.codigoBarras && p.codigoBarras.toLowerCase().includes(term))
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.productsService.findAll().subscribe();
    this.categoriesService.findAll().subscribe();
    this.clientsService.findAll().subscribe();
  }

  toggleMobileCart(): void {
    this.mobileCartOpen.update((open) => !open);
  }

  // --- Keyboard Shortcuts & Barcode Scanner ---
  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (event.key === 'F2') {
      event.preventDefault();
      this.searchInput?.nativeElement?.focus();
      return;
    }
    if (event.key === 'F4') {
      event.preventDefault();
      if (this.posService.items().length > 0) {
        this.openCheckoutDialog();
      }
      return;
    }
    if (event.key === 'F8') {
      event.preventDefault();
      this.pauseSale();
      return;
    }
    if (event.key === 'F9') {
      event.preventDefault();
      this.posService.clearCart();
      return;
    }

    // Hardware Barcode Scanner detection
    const currentTime = Date.now();
    if (currentTime - this.lastKeyTime > 80) {
      this.barcodeBuffer = '';
    }
    this.lastKeyTime = currentTime;

    if (event.key === 'Enter' && this.barcodeBuffer.length >= 3) {
      const barcode = this.barcodeBuffer.trim();
      this.barcodeBuffer = '';
      this.matchBarcode(barcode);
    } else if (event.key.length === 1) {
      this.barcodeBuffer += event.key;
    }
  }

  matchBarcode(barcode: string): void {
    const found = this.products().find(
      (p) =>
        (p.codigoBarras && p.codigoBarras.trim() === barcode) ||
        p.codigo.trim() === barcode
    );

    if (found) {
      this.addProductToCart(found);
      this.snackBar.open(`+ ${found.nombre}`, '', {
        duration: 1500,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  }

  addProductToCart(product: Product): void {
    this.posService.addItem(product, 1);
  }

  setCategory(catId: string): void {
    this.selectedCategory = catId;
  }

  onSearchChange(val: string): void {
    this.searchTerm = val;
  }

  onSearchEnter(): void {
    const list = this.filteredProducts();
    if (list.length === 1) {
      this.addProductToCart(list[0]);
      this.searchTerm = '';
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchInput?.nativeElement?.focus();
  }

  onClientSelected(clientId: string): void {
    if (!clientId) {
      this.posService.setClient(null);
    } else {
      const client = this.clients().find((c) => c.id === clientId) || null;
      this.posService.setClient(client);
    }
  }

  getProductImage(product: Product): string | null {
    if (product.imagenes) {
      try {
        const parsed = JSON.parse(product.imagenes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0];
        }
      } catch {
        return product.imagenes;
      }
    }
    return null;
  }

  // --- Dialogs ---
  openCheckoutDialog(): void {
    const dialogRef = this.dialog.open(PosCheckoutDialogComponent, {
      data: {
        items: this.posService.items(),
        client: this.posService.selectedClient(),
        subtotal: this.posService.taxableSubtotal(),
        discount: this.posService.discountTotal(),
        tax: this.posService.taxTotal(),
        total: this.posService.grandTotal(),
        note: this.posService.note(),
      },
      panelClass: 'dialog-no-padding',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe();
  }

  openHeldDialog(): void {
    this.dialog.open(PosHeldDialogComponent, {
      panelClass: 'dialog-no-padding',
    });
  }

  openDiscountDialog(): void {
    const dialogRef = this.dialog.open(PosDiscountDialogComponent, {
      data: {
        subtotal: this.posService.rawSubtotal(),
        currentValue: this.posService.discountValue(),
        currentType: this.posService.discountType(),
      },
      panelClass: 'dialog-no-padding',
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.posService.setDiscount(res.value, res.type);
      }
    });
  }

  openNoteDialog(): void {
    const dialogRef = this.dialog.open(PosNoteDialogComponent, {
      data: this.posService.note(),
      panelClass: 'dialog-no-padding',
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res !== undefined) {
        this.posService.setNote(res);
      }
    });
  }

  pauseSale(): void {
    const held = this.posService.holdCurrentCart();
    if (held) {
      this.snackBar.open(
        this.transloco.translate('pos.saleHeldSuccess'),
        this.transloco.translate('common.close'),
        {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }
      );
    }
  }
}
