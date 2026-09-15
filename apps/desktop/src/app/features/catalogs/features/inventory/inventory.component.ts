import { Component, inject, OnInit, TemplateRef, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { InventoryService, TransferStockDto, AdjustStockDto, StockItem, KardexMovement } from '../../data/inventory.service';
import { ProductsService } from '../../data/products.service';

@Component({
  selector: 'app-inventory',
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
    MatMenuModule,
    MatTooltipModule,
    EmptyStateComponent,
    TableSkeletonComponent,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden bg-white dark:bg-neutral-900">

      <!-- Header Principal -->
      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div>
          <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {{ 'catalogs.inventory.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'catalogs.inventory.description' | transloco }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 mt-6 sm:mt-0 sm:ml-4">
          <button
            (click)="openWarehouseModal()"
            class="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <mat-icon svgIcon="plus" class="icon-size-4"></mat-icon>
            {{ 'catalogs.inventory.newWarehouse' | transloco }}
          </button>
          <button
            (click)="openAdjustmentModal()"
            class="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <mat-icon svgIcon="sliders-horizontal" class="icon-size-4"></mat-icon>
            {{ 'catalogs.inventory.stockAdjustment' | transloco }}
          </button>
          <button
            (click)="openTransferModal()"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <mat-icon svgIcon="arrow-right-left" class="icon-size-4"></mat-icon>
            {{ 'catalogs.inventory.newTransfer' | transloco }}
          </button>
        </div>
      </div>

      <!-- Barra de Navegación por Pestañas -->
      <div class="flex items-center gap-6 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0 text-sm font-bold">
        <button
          (click)="activeTab = 'stocks'"
          [class.border-blue-600]="activeTab === 'stocks'"
          [class.text-blue-600]="activeTab === 'stocks'"
          [class.dark:text-blue-400]="activeTab === 'stocks'"
          [class.border-transparent]="activeTab !== 'stocks'"
          [class.text-neutral-500]="activeTab !== 'stocks'"
          class="py-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2"
        >
          <mat-icon svgIcon="package" class="icon-size-4"></mat-icon>
          {{ 'catalogs.inventory.tabs.stocks' | transloco }} ({{ inventoryService.stocks().length }})
        </button>
        <button
          (click)="activeTab = 'warehouses'"
          [class.border-blue-600]="activeTab === 'warehouses'"
          [class.text-blue-600]="activeTab === 'warehouses'"
          [class.dark:text-blue-400]="activeTab === 'warehouses'"
          [class.border-transparent]="activeTab !== 'warehouses'"
          [class.text-neutral-500]="activeTab !== 'warehouses'"
          class="py-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2"
        >
          <mat-icon svgIcon="store" class="icon-size-4"></mat-icon>
          {{ 'catalogs.inventory.tabs.warehouses' | transloco }} ({{ inventoryService.warehouses().length }})
        </button>
        <button
          (click)="activeTab = 'kardex'"
          [class.border-blue-600]="activeTab === 'kardex'"
          [class.text-blue-600]="activeTab === 'kardex'"
          [class.dark:text-blue-400]="activeTab === 'kardex'"
          [class.border-transparent]="activeTab !== 'kardex'"
          [class.text-neutral-500]="activeTab !== 'kardex'"
          class="py-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2"
        >
          <mat-icon svgIcon="history" class="icon-size-4"></mat-icon>
          {{ 'catalogs.inventory.tabs.kardex' | transloco }}
        </button>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 1: CONTROL DE EXISTENCIAS (STOCKS)                                   -->
      <!-- ========================================================================= -->
      @if (activeTab === 'stocks') {
        <div class="flex flex-col flex-auto min-h-0 overflow-hidden">
          <!-- Filter Bar -->
          <div
            class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <!-- Buscador -->
            <div class="flex min-w-[260px] flex-1 items-center gap-3">
              <div class="relative w-full max-w-md">
                <mat-icon
                  svgIcon="search"
                  class="icon-size-4 absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
                ></mat-icon>
                <input
                  type="text"
                  [(ngModel)]="stockSearch"
                  (ngModelChange)="filterStocks()"
                  [placeholder]="'catalogs.inventory.searchPlaceholder' | transloco"
                  class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-10 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
                />
                @if (stockSearch) {
                  <button
                    type="button"
                    (click)="stockSearch = ''; filterStocks()"
                    class="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <mat-icon svgIcon="x" class="icon-size-3.5"></mat-icon>
                  </button>
                }
              </div>
            </div>

            <!-- Filtro por Almacén -->
            <div class="flex flex-wrap items-center gap-3">
              <button
                [matMenuTriggerFor]="warehouseFilterMenu"
                type="button"
                class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
                [class.border-blue-500]="selectedWarehouseFilter !== 'ALL'"
                [class.text-blue-600]="selectedWarehouseFilter !== 'ALL'"
                [class.dark:text-blue-400]="selectedWarehouseFilter !== 'ALL'"
              >
                <mat-icon svgIcon="store" class="icon-size-4 text-neutral-500"></mat-icon>
                <span>{{ getSelectedWarehouseFilterName() }}</span>
                <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
              </button>
              <mat-menu #warehouseFilterMenu="matMenu" class="!rounded-xl !p-1">
                <button mat-menu-item (click)="setWarehouseFilter('ALL')">
                  <span>{{ 'catalogs.inventory.allWarehouses' | transloco }}</span>
                </button>
                @for (w of inventoryService.warehouses(); track w.id) {
                  <button mat-menu-item (click)="setWarehouseFilter(w.id)">
                    <span>{{ w.nombre }} ({{ w.sucursal?.nombre || ('catalogs.inventory.warehouses.central' | transloco) }})</span>
                  </button>
                }
              </mat-menu>
            </div>
          </div>

          <!-- Tabla de Existencias -->
          <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
            <div class="grid">
              <!-- Header de la Tabla -->
              <div
                class="stocks-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
              >
                <div>{{ 'catalogs.inventory.columns.product' | transloco }}</div>
                <div>{{ 'catalogs.inventory.columns.warehouse' | transloco }}</div>
                <div class="text-right">{{ 'catalogs.inventory.columns.currentStock' | transloco }}</div>
                <div class="text-right hidden sm:block">{{ 'catalogs.inventory.columns.minStock' | transloco }}</div>
                <div class="text-center">{{ 'catalogs.inventory.columns.status' | transloco }}</div>
                <div class="text-right">{{ 'common.actions' | transloco }}</div>
              </div>

              <!-- Skeletons / Empty / Rows -->
              @if (inventoryService.isLoading()) {
                <app-table-skeleton
                  [gridClass]="'stocks-grid'"
                  [rows]="6"
                  [cells]="cells6"
                />
              } @else if (inventoryService.stocks().length === 0) {
                <div class="flex flex-auto justify-center p-6 sm:p-10">
                  <app-empty-state
                    type="no-data"
                    [title]="'catalogs.inventory.empty.stocksTitle' | transloco"
                    [description]="'catalogs.inventory.empty.stocksDesc' | transloco"
                    [actionLabel]="'catalogs.inventory.stockAdjustment' | transloco"
                    actionIcon="sliders-horizontal"
                    (action)="openAdjustmentModal()"
                  />
                </div>
              } @else {
                @for (item of inventoryService.stocks(); track item.id) {
                  <div
                    class="stocks-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
                  >
                    <!-- Producto -->
                    <div class="flex flex-col min-w-0 pr-2">
                      <span class="font-bold text-neutral-900 dark:text-white truncate">
                        {{ item.productoNombre }}
                      </span>
                      <span class="text-xs text-neutral-400 truncate mt-0.5 font-mono">
                        SKU: {{ item.productoCodigo }} · {{ item.categoria }}
                      </span>
                    </div>

                    <!-- Almacén y Sucursal -->
                    <div class="flex flex-col min-w-0">
                      <span class="font-semibold text-neutral-800 dark:text-neutral-200 truncate flex items-center gap-1.5">
                        <mat-icon svgIcon="store" class="icon-size-3.5 text-neutral-400"></mat-icon>
                        {{ item.almacenNombre }}
                      </span>
                      <span class="text-xs text-neutral-400 truncate mt-0.5">
                        {{ item.sucursalNombre || ('catalogs.inventory.warehouses.central' | transloco) }}
                      </span>
                    </div>

                    <!-- Existencia Actual -->
                    <div class="text-right font-mono font-bold text-neutral-900 dark:text-white">
                      {{ item.cantidad | number:'1.0-2' }}
                      <span class="text-xs font-normal text-neutral-400 ml-1">{{ item.unidad }}</span>
                    </div>

                    <!-- Stock Mínimo -->
                    <div class="text-right font-mono text-neutral-500 dark:text-neutral-400 hidden sm:block">
                      {{ item.stockMinimo | number:'1.0-2' }}
                    </div>

                    <!-- Estado Badge -->
                    <div class="flex justify-center">
                      @if (item.cantidad <= 0) {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                          {{ 'catalogs.inventory.stockStatus.outOfStock' | transloco }}
                        </span>
                      } @else if (item.cantidad <= item.stockMinimo) {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                          {{ 'catalogs.inventory.stockStatus.low' | transloco }}
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                          {{ 'catalogs.inventory.stockStatus.optimal' | transloco }}
                        </span>
                      }
                    </div>

                    <!-- Acciones -->
                    <div class="flex items-center justify-end gap-1">
                      <button
                        mat-icon-button
                        (click)="openTransferModal(item.almacenId, item.productoId)"
                        class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        [matTooltip]="'catalogs.inventory.newTransfer' | transloco"
                      >
                        <mat-icon svgIcon="arrow-right-left" class="icon-size-4"></mat-icon>
                      </button>
                      <button
                        mat-icon-button
                        (click)="openAdjustmentModal(item.almacenId, item.productoId)"
                        class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        [matTooltip]="'catalogs.inventory.stockAdjustment' | transloco"
                      >
                        <mat-icon svgIcon="sliders-horizontal" class="icon-size-4"></mat-icon>
                      </button>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- TAB 2: ALMACENES Y BODEGAS (WAREHOUSES)                                  -->
      <!-- ========================================================================= -->
      @if (activeTab === 'warehouses') {
        <div class="flex flex-col flex-auto min-h-0 overflow-y-auto p-6 md:p-8">
          @if (inventoryService.warehouses().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                type="no-data"
                [title]="'catalogs.inventory.warehouses.emptyTitle' | transloco"
                [description]="'catalogs.inventory.warehouses.emptyDescription' | transloco"
                [actionLabel]="'catalogs.inventory.warehouses.newWarehouse' | transloco"
                actionIcon="plus"
                (action)="openWarehouseModal()"
              />
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (w of inventoryService.warehouses(); track w.id) {
                <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-shadow relative overflow-hidden">
                  @if (w.esPrincipal) {
                    <div class="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider shadow-xs">
                      {{ 'catalogs.inventory.warehouses.mainBadge' | transloco }}
                    </div>
                  }

                  <div>
                    <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-2xs">
                      <mat-icon svgIcon="store" class="icon-size-6"></mat-icon>
                    </div>
                    <h3 class="text-lg font-bold text-neutral-900 dark:text-white">{{ w.nombre }}</h3>
                    <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {{ 'catalogs.inventory.warehouses.type' | transloco }}: <span class="font-bold text-neutral-700 dark:text-neutral-300">{{ w.tipo }}</span> ·
                      {{ 'catalogs.inventory.warehouses.branch' | transloco }}: <span class="font-bold text-neutral-700 dark:text-neutral-300">{{ w.sucursal?.nombre || ('catalogs.inventory.warehouses.central' | transloco) }}</span>
                    </p>
                    @if (w.codigo) {
                      <p class="text-xs font-mono text-neutral-400 mt-1">Cód: {{ w.codigo }}</p>
                    }
                  </div>

                  <div class="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                      {{ w.tipo }}
                    </span>
                    <button
                      (click)="openTransferModal(w.id)"
                      class="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer flex items-center gap-1.5"
                    >
                      {{ 'catalogs.inventory.warehouses.transferFromHere' | transloco }}
                      <mat-icon svgIcon="arrow-right" class="icon-size-3.5"></mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ========================================================================= -->
      <!-- TAB 3: KARDEX DE MOVIMIENTOS (KARDEX)                                   -->
      <!-- ========================================================================= -->
      @if (activeTab === 'kardex') {
        <div class="flex flex-col flex-auto min-h-0 overflow-hidden">
          <!-- Filter Bar -->
          <div
            class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <!-- Buscador -->
            <div class="flex min-w-[260px] flex-1 items-center gap-3">
              <div class="relative w-full max-w-md">
                <mat-icon
                  svgIcon="search"
                  class="icon-size-4 absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
                ></mat-icon>
                <input
                  type="text"
                  [(ngModel)]="kardexSearch"
                  [placeholder]="'catalogs.inventory.searchPlaceholder' | transloco"
                  class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-10 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
                />
                @if (kardexSearch) {
                  <button
                    type="button"
                    (click)="kardexSearch = ''"
                    class="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <mat-icon svgIcon="x" class="icon-size-3.5"></mat-icon>
                  </button>
                }
              </div>
            </div>

            <!-- Filtro por Tipo de Movimiento -->
            <div class="flex flex-wrap items-center gap-3">
              <button
                [matMenuTriggerFor]="kardexTypeMenu"
                type="button"
                class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
                [class.border-blue-500]="kardexTypeFilter !== 'ALL'"
                [class.text-blue-600]="kardexTypeFilter !== 'ALL'"
                [class.dark:text-blue-400]="kardexTypeFilter !== 'ALL'"
              >
                <mat-icon svgIcon="sliders-horizontal" class="icon-size-4 text-neutral-500"></mat-icon>
                <span>{{ getKardexTypeFilterLabel() }}</span>
                <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
              </button>
              <mat-menu #kardexTypeMenu="matMenu" class="!rounded-xl !p-1">
                <button mat-menu-item (click)="kardexTypeFilter = 'ALL'">
                  <span>{{ 'common.all' | transloco }}</span>
                </button>
                <button mat-menu-item (click)="kardexTypeFilter = 'TRANSFERENCIA'">
                  <span>{{ 'catalogs.inventory.movementTypes.TRANSFERENCIA' | transloco }}</span>
                </button>
                <button mat-menu-item (click)="kardexTypeFilter = 'COMPRA'">
                  <span>{{ 'catalogs.inventory.movementTypes.COMPRA' | transloco }}</span>
                </button>
                <button mat-menu-item (click)="kardexTypeFilter = 'VENTA'">
                  <span>{{ 'catalogs.inventory.movementTypes.VENTA' | transloco }}</span>
                </button>
                <button mat-menu-item (click)="kardexTypeFilter = 'AJUSTE_POSITIVO'">
                  <span>{{ 'catalogs.inventory.movementTypes.AJUSTE_POSITIVO' | transloco }}</span>
                </button>
                <button mat-menu-item (click)="kardexTypeFilter = 'AJUSTE_NEGATIVO'">
                  <span>{{ 'catalogs.inventory.movementTypes.AJUSTE_NEGATIVO' | transloco }}</span>
                </button>
              </mat-menu>
            </div>
          </div>

          <!-- Tabla de Kardex -->
          <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
            <div class="grid">
              <!-- Header de la Tabla -->
              <div
                class="kardex-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
              >
                <div>{{ 'catalogs.inventory.columns.dateTime' | transloco }}</div>
                <div>{{ 'catalogs.inventory.columns.movementType' | transloco }}</div>
                <div>{{ 'catalogs.inventory.columns.product' | transloco }}</div>
                <div class="hidden sm:block">{{ 'catalogs.inventory.columns.originDestination' | transloco }}</div>
                <div class="text-right">{{ 'catalogs.inventory.columns.quantity' | transloco }}</div>
              </div>

              <!-- Skeletons / Empty / Rows -->
              @if (inventoryService.isLoading()) {
                <app-table-skeleton
                  [gridClass]="'kardex-grid'"
                  [rows]="6"
                  [cells]="cells5"
                />
              } @else if (filteredKardex().length === 0) {
                <div class="flex flex-auto justify-center p-6 sm:p-10">
                  <app-empty-state
                    type="no-data"
                    [title]="'catalogs.inventory.empty.kardexTitle' | transloco"
                    [description]="'catalogs.inventory.empty.kardexDesc' | transloco"
                  />
                </div>
              } @else {
                @for (m of filteredKardex(); track m.id) {
                  <div
                    class="kardex-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
                  >
                    <!-- Fecha / Hora -->
                    <div class="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                      {{ m.creadoEn | date:'dd/MM/yyyy HH:mm' }}
                    </div>

                    <!-- Tipo de Movimiento -->
                    <div>
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        [ngClass]="getMovementClass(m.tipo)"
                      >
                        {{ ('catalogs.inventory.movementTypes.' + m.tipo) | transloco }}
                      </span>
                    </div>

                    <!-- Producto -->
                    <div class="flex flex-col min-w-0 pr-2">
                      <span class="font-bold text-neutral-900 dark:text-white truncate">
                        {{ m.productoNombre }}
                      </span>
                      <span class="text-xs text-neutral-400 font-mono truncate mt-0.5">
                        Ref: {{ m.referenciaDoc || '-' }}
                      </span>
                    </div>

                    <!-- Origen / Destino / Motivo -->
                    <div class="text-xs text-neutral-600 dark:text-neutral-400 min-w-0 hidden sm:flex flex-col">
                      @if (m.tipo === 'TRANSFERENCIA') {
                        <span class="font-medium text-neutral-800 dark:text-neutral-200 truncate flex items-center gap-1">
                          {{ m.almacenOrigen }}
                          <mat-icon svgIcon="arrow-right" class="icon-size-3 inline shrink-0"></mat-icon>
                          {{ m.almacenDestino }}
                        </span>
                      } @else {
                        <span class="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                          {{ m.almacenDestino || m.almacenOrigen || ('catalogs.inventory.kardex.general' | transloco) }}
                        </span>
                      }
                      @if (m.motivo) {
                        <span class="text-[11px] text-neutral-400 truncate mt-0.5">{{ m.motivo }}</span>
                      }
                    </div>

                    <!-- Cantidad -->
                    <div
                      class="text-right font-mono font-bold"
                      [ngClass]="m.tipo === 'VENTA' || m.tipo === 'AJUSTE_NEGATIVO' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
                    >
                      {{ (m.tipo === 'VENTA' || m.tipo === 'AJUSTE_NEGATIVO' ? '-' : '+') }}{{ m.cantidad | number:'1.0-2' }}
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- MODAL: TRANSFERENCIA ENTRE ALMACENES                                     -->
      <!-- ========================================================================= -->
      <ng-template #transferModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-[85vh]">
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="arrow-right-left" class="icon-size-5 text-blue-600"></mat-icon>
              {{ 'catalogs.inventory.modals.transfer.title' | transloco }}
            </h3>
            <button (click)="closeDialog()" class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="p-6 flex flex-col gap-4 overflow-y-auto">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'catalogs.inventory.modals.transfer.product' | transloco }}</mat-label>
              <mat-select [(ngModel)]="transferData.productoId" [placeholder]="'catalogs.inventory.modals.transfer.productPlaceholder' | transloco">
                @for (p of productsService.products(); track p.id) {
                  <mat-option [value]="p.id">{{ p.codigo }} - {{ p.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'catalogs.inventory.modals.transfer.originWarehouse' | transloco }}</mat-label>
                <mat-select [(ngModel)]="transferData.almacenOrigenId" [placeholder]="'catalogs.inventory.modals.transfer.originPlaceholder' | transloco">
                  @for (w of inventoryService.warehouses(); track w.id) {
                    <mat-option [value]="w.id">{{ w.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'catalogs.inventory.modals.transfer.destWarehouse' | transloco }}</mat-label>
                <mat-select [(ngModel)]="transferData.almacenDestinoId" [placeholder]="'catalogs.inventory.modals.transfer.destPlaceholder' | transloco">
                  @for (w of inventoryService.warehouses(); track w.id) {
                    <mat-option [value]="w.id">{{ w.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'catalogs.inventory.modals.transfer.quantity' | transloco }}</mat-label>
              <input matInput type="number" [(ngModel)]="transferData.cantidad" min="1" placeholder="10">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'catalogs.inventory.modals.transfer.reason' | transloco }}</mat-label>
              <input matInput type="text" [(ngModel)]="transferData.motivo" [placeholder]="'catalogs.inventory.modals.transfer.reasonPlaceholder' | transloco">
            </mat-form-field>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
            <button mat-button (click)="closeDialog()" class="rounded-xl">{{ 'common.cancel' | transloco }}</button>
            <button mat-flat-button color="primary" (click)="submitTransfer()" class="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <mat-icon svgIcon="save" class="icon-size-4 mr-1.5"></mat-icon>
              {{ 'catalogs.inventory.modals.transfer.submit' | transloco }}
            </button>
          </div>
        </div>
      </ng-template>

      <!-- ========================================================================= -->
      <!-- MODAL: AJUSTE DE STOCK                                                   -->
      <!-- ========================================================================= -->
      <ng-template #adjustmentModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-[85vh]">
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="sliders-horizontal" class="icon-size-5 text-blue-600"></mat-icon>
              {{ 'catalogs.inventory.modals.adjustment.title' | transloco }}
            </h3>
            <button (click)="closeDialog()" class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="p-6 flex flex-col gap-4 overflow-y-auto">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'catalogs.inventory.modals.adjustment.product' | transloco }}</mat-label>
              <mat-select [(ngModel)]="adjustData.productoId" [placeholder]="'catalogs.inventory.modals.adjustment.productPlaceholder' | transloco">
                @for (p of productsService.products(); track p.id) {
                  <mat-option [value]="p.id">{{ p.codigo }} - {{ p.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'catalogs.inventory.modals.adjustment.warehouse' | transloco }}</mat-label>
                <mat-select [(ngModel)]="adjustData.almacenId" [placeholder]="'catalogs.inventory.modals.adjustment.warehousePlaceholder' | transloco">
                  @for (w of inventoryService.warehouses(); track w.id) {
                    <mat-option [value]="w.id">{{ w.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'catalogs.inventory.modals.adjustment.type' | transloco }}</mat-label>
                <mat-select [(ngModel)]="adjustData.tipo">
                  <mat-option value="AJUSTE_POSITIVO">{{ 'catalogs.inventory.modals.adjustment.positive' | transloco }}</mat-option>
                  <mat-option value="AJUSTE_NEGATIVO">{{ 'catalogs.inventory.modals.adjustment.negative' | transloco }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'catalogs.inventory.modals.adjustment.quantity' | transloco }}</mat-label>
              <input matInput type="number" [(ngModel)]="adjustData.cantidad" min="1" placeholder="5">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'catalogs.inventory.modals.adjustment.reason' | transloco }}</mat-label>
              <input matInput type="text" [(ngModel)]="adjustData.motivo" [placeholder]="'catalogs.inventory.modals.adjustment.reasonPlaceholder' | transloco">
            </mat-form-field>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
            <button mat-button (click)="closeDialog()" class="rounded-xl">{{ 'common.cancel' | transloco }}</button>
            <button mat-flat-button color="primary" (click)="submitAdjustment()" class="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <mat-icon svgIcon="save" class="icon-size-4 mr-1.5"></mat-icon>
              {{ 'catalogs.inventory.modals.adjustment.submit' | transloco }}
            </button>
          </div>
        </div>
      </ng-template>

      <!-- ========================================================================= -->
      <!-- MODAL: NUEVO ALMACÉN                                                     -->
      <!-- ========================================================================= -->
      <ng-template #warehouseModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-[85vh]">
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="store" class="icon-size-5 text-blue-600"></mat-icon>
              {{ 'catalogs.inventory.modals.warehouse.title' | transloco }}
            </h3>
            <button (click)="closeDialog()" class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="p-6 flex flex-col gap-4 overflow-y-auto">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'catalogs.inventory.modals.warehouse.name' | transloco }}</mat-label>
              <input matInput type="text" [(ngModel)]="warehouseData.nombre" [placeholder]="'catalogs.inventory.modals.warehouse.namePlaceholder' | transloco">
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'catalogs.inventory.modals.warehouse.type' | transloco }}</mat-label>
                <mat-select [(ngModel)]="warehouseData.tipo">
                  <mat-option value="VENTA">{{ 'catalogs.inventory.modals.warehouse.types.salesFloor' | transloco }}</mat-option>
                  <mat-option value="CENTRAL">{{ 'catalogs.inventory.modals.warehouse.types.distributionCenter' | transloco }}</mat-option>
                  <mat-option value="MERMAS">{{ 'catalogs.inventory.modals.warehouse.types.waste' | transloco }}</mat-option>
                  <mat-option value="TRANSITO">{{ 'catalogs.inventory.modals.warehouse.types.transit' | transloco }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'catalogs.inventory.modals.warehouse.code' | transloco }}</mat-label>
                <input matInput type="text" [(ngModel)]="warehouseData.codigo" [placeholder]="'catalogs.inventory.modals.warehouse.codePlaceholder' | transloco">
              </mat-form-field>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
            <button mat-button (click)="closeDialog()" class="rounded-xl">{{ 'common.cancel' | transloco }}</button>
            <button mat-flat-button color="primary" (click)="submitWarehouse()" class="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <mat-icon svgIcon="save" class="icon-size-4 mr-1.5"></mat-icon>
              {{ 'catalogs.inventory.modals.warehouse.submit' | transloco }}
            </button>
          </div>
        </div>
      </ng-template>

    </div>
  `,
  styles: [
    `
      .stocks-grid {
        grid-template-columns: minmax(200px, 2.2fr) minmax(160px, 1.8fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(120px, 1fr) minmax(90px, 0.8fr);
      }
      @media (max-width: 1024px) {
        .stocks-grid {
          grid-template-columns: minmax(180px, 2fr) minmax(140px, 1.5fr) minmax(120px, 1.2fr) minmax(100px, 1fr) minmax(110px, 1fr) minmax(80px, 0.8fr);
        }
      }
      @media (max-width: 768px) {
        .stocks-grid {
          grid-template-columns: minmax(160px, 2fr) minmax(130px, 1.5fr) minmax(100px, 1.2fr) minmax(90px, 1fr) minmax(70px, 0.8fr);
        }
      }
      @media (max-width: 640px) {
        .stocks-grid {
          grid-template-columns: minmax(150px, 2fr) minmax(120px, 1.5fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(60px, 0.8fr);
        }
      }

      .kardex-grid {
        grid-template-columns: minmax(140px, 1.2fr) minmax(140px, 1.2fr) minmax(200px, 2fr) minmax(220px, 2fr) minmax(110px, 1fr);
      }
      @media (max-width: 1024px) {
        .kardex-grid {
          grid-template-columns: minmax(130px, 1.2fr) minmax(130px, 1.2fr) minmax(180px, 2fr) minmax(180px, 1.8fr) minmax(100px, 1fr);
        }
      }
      @media (max-width: 768px) {
        .kardex-grid {
          grid-template-columns: minmax(120px, 1.2fr) minmax(120px, 1.2fr) minmax(160px, 2fr) minmax(90px, 1fr);
        }
      }
      @media (max-width: 640px) {
        .kardex-grid {
          grid-template-columns: minmax(110px, 1.2fr) minmax(110px, 1.2fr) minmax(140px, 2fr) minmax(80px, 1fr);
        }
      }
    `,
  ],
})
export default class InventoryComponent implements OnInit {
  inventoryService = inject(InventoryService);
  productsService = inject(ProductsService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  i18n = inject(TranslocoService);

  @ViewChild('transferModalTemplate') transferModalTemplate!: TemplateRef<any>;
  @ViewChild('adjustmentModalTemplate') adjustmentModalTemplate!: TemplateRef<any>;
  @ViewChild('warehouseModalTemplate') warehouseModalTemplate!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

  activeTab: 'stocks' | 'warehouses' | 'kardex' = 'stocks';
  stockSearch = '';
  selectedWarehouseFilter = 'ALL';

  kardexSearch = '';
  kardexTypeFilter = 'ALL';

  readonly cells6 = Array(6).fill(null);
  readonly cells5 = Array(5).fill(null);

  transferData: TransferStockDto = {
    productoId: '',
    almacenOrigenId: '',
    almacenDestinoId: '',
    cantidad: 1,
    motivo: '',
  };

  adjustData: AdjustStockDto = {
    productoId: '',
    almacenId: '',
    tipo: 'AJUSTE_POSITIVO',
    cantidad: 1,
    motivo: '',
  };

  warehouseData = {
    nombre: '',
    tipo: 'VENTA',
    codigo: '',
    sucursalId: '',
  };

  ngOnInit() {
    this.inventoryService.getWarehouses().subscribe();
    this.inventoryService.getStocks().subscribe();
    this.inventoryService.getKardex().subscribe();
    this.productsService.findAll().subscribe();
  }

  getSelectedWarehouseFilterName(): string {
    if (this.selectedWarehouseFilter === 'ALL') {
      return this.i18n.translate('catalogs.inventory.allWarehouses');
    }
    const found = this.inventoryService.warehouses().find(w => w.id === this.selectedWarehouseFilter);
    return found ? `${found.nombre} (${found.sucursal?.nombre || this.i18n.translate('catalogs.inventory.warehouses.central')})` : this.i18n.translate('catalogs.inventory.allWarehouses');
  }

  setWarehouseFilter(warehouseId: string) {
    this.selectedWarehouseFilter = warehouseId;
    this.filterStocks();
  }

  filterStocks() {
    this.inventoryService.getStocks({
      search: this.stockSearch,
      almacenId: this.selectedWarehouseFilter !== 'ALL' ? this.selectedWarehouseFilter : undefined,
    }).subscribe();
  }

  getKardexTypeFilterLabel(): string {
    if (this.kardexTypeFilter === 'ALL') {
      return this.i18n.translate('common.all');
    }
    return this.i18n.translate(`catalogs.inventory.movementTypes.${this.kardexTypeFilter}`);
  }

  filteredKardex(): KardexMovement[] {
    let list = this.inventoryService.kardex();
    if (this.kardexTypeFilter !== 'ALL') {
      list = list.filter(m => m.tipo === this.kardexTypeFilter);
    }
    if (this.kardexSearch.trim()) {
      const q = this.kardexSearch.toLowerCase();
      list = list.filter(m =>
        m.productoNombre?.toLowerCase().includes(q) ||
        m.productoCodigo?.toLowerCase().includes(q) ||
        m.referenciaDoc?.toLowerCase().includes(q) ||
        m.motivo?.toLowerCase().includes(q) ||
        m.almacenOrigen?.toLowerCase().includes(q) ||
        m.almacenDestino?.toLowerCase().includes(q)
      );
    }
    return list;
  }

  openTransferModal(originWarehouseId?: string, productId?: string) {
    this.transferData = {
      productoId: productId || '',
      almacenOrigenId: originWarehouseId || '',
      almacenDestinoId: '',
      cantidad: 1,
      motivo: '',
    };
    this.dialogRef = this.dialog.open(this.transferModalTemplate, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: ['custom-dialog-container'],
    });
  }

  openAdjustmentModal(warehouseId?: string, productId?: string) {
    this.adjustData = {
      productoId: productId || '',
      almacenId: warehouseId || '',
      tipo: 'AJUSTE_POSITIVO',
      cantidad: 1,
      motivo: '',
    };
    this.dialogRef = this.dialog.open(this.adjustmentModalTemplate, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: ['custom-dialog-container'],
    });
  }

  openWarehouseModal() {
    this.warehouseData = {
      nombre: '',
      tipo: 'VENTA',
      codigo: '',
      sucursalId: '',
    };
    this.dialogRef = this.dialog.open(this.warehouseModalTemplate, {
      width: '520px',
      maxWidth: '95vw',
      panelClass: ['custom-dialog-container'],
    });
  }

  closeDialog() {
    this.dialogRef?.close();
  }

  submitTransfer() {
    if (!this.transferData.productoId || !this.transferData.almacenOrigenId || !this.transferData.almacenDestinoId || this.transferData.cantidad <= 0) {
      this.snackBar.open(this.i18n.translate('catalogs.inventory.messages.fillRequired'), this.i18n.translate('common.close'), { duration: 3000 });
      return;
    }

    this.inventoryService.createTransfer(this.transferData).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.translate('catalogs.inventory.messages.transferSuccess'), this.i18n.translate('common.close'), { duration: 3000 });
        this.closeDialog();
        this.inventoryService.getStocks().subscribe();
        this.inventoryService.getKardex().subscribe();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.i18n.translate('catalogs.inventory.messages.transferError'), this.i18n.translate('common.close'), { duration: 4000 });
      }
    });
  }

  submitAdjustment() {
    if (!this.adjustData.productoId || !this.adjustData.almacenId || this.adjustData.cantidad <= 0) {
      this.snackBar.open(this.i18n.translate('catalogs.inventory.messages.fillRequired'), this.i18n.translate('common.close'), { duration: 3000 });
      return;
    }

    this.inventoryService.createAdjustment(this.adjustData).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.translate('catalogs.inventory.messages.adjustmentSuccess'), this.i18n.translate('common.close'), { duration: 3000 });
        this.closeDialog();
        this.inventoryService.getStocks().subscribe();
        this.inventoryService.getKardex().subscribe();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.i18n.translate('catalogs.inventory.messages.adjustmentError'), this.i18n.translate('common.close'), { duration: 4000 });
      }
    });
  }

  submitWarehouse() {
    if (!this.warehouseData.nombre) {
      this.snackBar.open(this.i18n.translate('catalogs.inventory.messages.nameRequired'), this.i18n.translate('common.close'), { duration: 3000 });
      return;
    }

    this.inventoryService.createWarehouse(this.warehouseData).subscribe({
      next: () => {
        this.snackBar.open(this.i18n.translate('catalogs.inventory.messages.warehouseSuccess'), this.i18n.translate('common.close'), { duration: 3000 });
        this.closeDialog();
        this.inventoryService.getWarehouses().subscribe();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.i18n.translate('catalogs.inventory.messages.warehouseError'), this.i18n.translate('common.close'), { duration: 4000 });
      }
    });
  }

  getMovementClass(tipo: string): string {
    switch (tipo) {
      case 'TRANSFERENCIA':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'COMPRA':
      case 'AJUSTE_POSITIVO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'VENTA':
      case 'AJUSTE_NEGATIVO':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
    }
  }
}
