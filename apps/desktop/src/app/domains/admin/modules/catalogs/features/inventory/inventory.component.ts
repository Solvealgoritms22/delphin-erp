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
import { MatMenuModule } from '@angular/material/menu';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { InventoryService, TransferStockDto, AdjustStockDto } from '../../data/inventory.service';
import { ProductsService } from '../../data/products.service';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-inventory',
  standalone: true,
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
    EmptyStateComponent,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">
      
      <!-- Header -->
      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <!-- Title -->
        <div>
          <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {{ 'catalogs.inventory.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'catalogs.inventory.description' | transloco }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-3 mt-6 sm:mt-0 sm:ml-4">
          <button (click)="openWarehouseModal()" class="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex items-center gap-2">
            <mat-icon svgIcon="plus" class="icon-size-4"></mat-icon>
            {{ 'catalogs.inventory.newWarehouse' | transloco }}
          </button>
          <button (click)="openAdjustmentModal()" class="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex items-center gap-2">
            <mat-icon svgIcon="sliders-horizontal" class="icon-size-4"></mat-icon>
            {{ 'catalogs.inventory.stockAdjustment' | transloco }}
          </button>
          <button (click)="openTransferModal()" class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2">
            <mat-icon svgIcon="arrow-right-left" class="icon-size-4"></mat-icon>
            {{ 'catalogs.inventory.newTransfer' | transloco }}
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-6 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0 text-sm font-bold">
        <button (click)="activeTab = 'stocks'" [class.border-blue-600]="activeTab === 'stocks'" [class.text-blue-600]="activeTab === 'stocks'" [class.dark:text-blue-400]="activeTab === 'stocks'" [class.border-transparent]="activeTab !== 'stocks'" [class.text-neutral-500]="activeTab !== 'stocks'" class="py-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2">
          <mat-icon svgIcon="package" class="icon-size-4"></mat-icon>
          Existencias por Ubicación
        </button>
        <button (click)="activeTab = 'warehouses'" [class.border-blue-600]="activeTab === 'warehouses'" [class.text-blue-600]="activeTab === 'warehouses'" [class.dark:text-blue-400]="activeTab === 'warehouses'" [class.border-transparent]="activeTab !== 'warehouses'" [class.text-neutral-500]="activeTab !== 'warehouses'" class="py-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2">
          <mat-icon svgIcon="store" class="icon-size-4"></mat-icon>
          Almacenes y Bodegas ({{ inventoryService.warehouses().length }})
        </button>
        <button (click)="activeTab = 'kardex'" [class.border-blue-600]="activeTab === 'kardex'" [class.text-blue-600]="activeTab === 'kardex'" [class.dark:text-blue-400]="activeTab === 'kardex'" [class.border-transparent]="activeTab !== 'kardex'" [class.text-neutral-500]="activeTab !== 'kardex'" class="py-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2">
          <mat-icon svgIcon="history" class="icon-size-4"></mat-icon>
          Kardex de Movimientos
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-6 md:p-8">
        
        <!-- ================= TAB 1: STOCKS ================= -->
        @if (activeTab === 'stocks') {
          <div class="flex flex-col gap-6">
            
            <!-- Filters Bar -->
            <div class="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div class="flex items-center gap-3 flex-1 min-w-[240px]">
                <div class="relative w-full max-w-md">
                  <mat-icon svgIcon="search" class="icon-size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"></mat-icon>
                  <input type="text" [(ngModel)]="stockSearch" (ngModelChange)="filterStocks()" placeholder="Buscar por producto, código o SKU..." class="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-10 pr-4 py-2 text-sm font-medium text-neutral-900 dark:text-white outline-none focus:border-blue-500">
                </div>
              </div>
              
              <!-- Warehouse Filter Menu Button -->
              <div class="flex items-center gap-3">
                <button [matMenuTriggerFor]="warehouseFilterMenu" type="button"
                  class="flex items-center gap-2 h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors text-sm font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap shrink-0 cursor-pointer">
                  <mat-icon svgIcon="store" class="icon-size-4 text-neutral-500"></mat-icon>
                  <span>{{ getSelectedWarehouseFilterName() }}</span>
                  <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
                </button>
                <mat-menu #warehouseFilterMenu="matMenu" class="!rounded-xl !p-1">
                  <button mat-menu-item (click)="setWarehouseFilter('ALL')">
                    <span>Todos los Almacenes</span>
                  </button>
                  @for (w of inventoryService.warehouses(); track w.id) {
                    <button mat-menu-item (click)="setWarehouseFilter(w.id)">
                      <span>{{ w.nombre }} ({{ w.sucursal?.nombre || 'Central' }})</span>
                    </button>
                  }
                </mat-menu>
              </div>
            </div>

            <!-- Stocks Table -->
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
              <div class="grid grid-cols-12 gap-4 py-3.5 px-6 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800/40">
                <div class="col-span-4">Producto</div>
                <div class="col-span-3">Almacén / Sucursal</div>
                <div class="col-span-2 text-right">Existencia Actual</div>
                <div class="col-span-2 text-right">Stock Mínimo</div>
                <div class="col-span-1 text-center">Estado</div>
              </div>

              @if (inventoryService.stocks().length === 0) {
                <app-empty-state
                  icon="package"
                  title="Sin existencias registradas"
                  description="Realiza un ajuste de stock inicial o transfiere productos para registrar existencias."
                  actionLabel="Ajuste de Stock"
                  actionIcon="sliders-horizontal"
                  (action)="openAdjustmentModal()"
                />
              } @else {
                <div class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  @for (item of inventoryService.stocks(); track item.id) {
                    <div class="grid grid-cols-12 gap-4 py-4 px-6 items-center text-sm hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <div class="col-span-4 flex flex-col">
                        <span class="font-bold text-neutral-900 dark:text-white">{{ item.productoNombre }}</span>
                        <span class="text-xs text-neutral-400">SKU: {{ item.productoCodigo }} · {{ item.categoria }}</span>
                      </div>
                      <div class="col-span-3 flex flex-col">
                        <span class="font-semibold text-neutral-700 dark:text-neutral-300">{{ item.almacenNombre }}</span>
                        <span class="text-xs text-neutral-400">{{ item.sucursalNombre }}</span>
                      </div>
                      <div class="col-span-2 text-right font-mono font-bold text-neutral-900 dark:text-white">
                        {{ item.cantidad | number:'1.0-2' }} <span class="text-xs text-neutral-400">{{ item.unidad }}</span>
                      </div>
                      <div class="col-span-2 text-right font-mono text-neutral-500">
                        {{ item.stockMinimo | number:'1.0-2' }}
                      </div>
                      <div class="col-span-1 flex justify-center">
                        @if (item.cantidad <= 0) {
                          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">Agotado</span>
                        } @else if (item.cantidad <= item.stockMinimo) {
                          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Bajo</span>
                        } @else {
                          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Óptimo</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

          </div>
        }

        <!-- ================= TAB 2: WAREHOUSES ================= -->
        @if (activeTab === 'warehouses') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (w of inventoryService.warehouses(); track w.id) {
              <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                @if (w.esPrincipal) {
                  <div class="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    Principal / CEDI
                  </div>
                }

                <div>
                  <div class="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                    <mat-icon svgIcon="store" class="icon-size-6"></mat-icon>
                  </div>
                  <h3 class="text-lg font-bold text-neutral-900 dark:text-white">{{ w.nombre }}</h3>
                  <p class="text-xs text-neutral-500 mt-1">
                    Tipo: <span class="font-bold text-neutral-700 dark:text-neutral-300">{{ w.tipo }}</span> · 
                    Sucursal: <span class="font-bold text-neutral-700 dark:text-neutral-300">{{ w.sucursal?.nombre || 'Almacén Central' }}</span>
                  </p>
                </div>

                <div class="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {{ w.tipo }}
                  </span>
                  <button (click)="openTransferModal(w.id)" class="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer flex items-center gap-1">
                    Transferir desde aquí <mat-icon svgIcon="arrow-right" class="icon-size-3.5"></mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- ================= TAB 3: KARDEX ================= -->
        @if (activeTab === 'kardex') {
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div class="grid grid-cols-12 gap-4 py-3.5 px-6 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800/40">
              <div class="col-span-2">Fecha / Hora</div>
              <div class="col-span-2">Tipo Movimiento</div>
              <div class="col-span-3">Producto</div>
              <div class="col-span-3">Origen / Destino</div>
              <div class="col-span-2 text-right">Cantidad</div>
            </div>

            @if (inventoryService.kardex().length === 0) {
              <app-empty-state
                icon="history"
                title="Sin movimientos en Kardex"
                description="Todas las compras, ventas, traslados y ajustes quedarán registrados aquí de forma inmutable."
              />
            } @else {
              <div class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                @for (m of inventoryService.kardex(); track m.id) {
                  <div class="grid grid-cols-12 gap-4 py-3.5 px-6 items-center text-sm">
                    <div class="col-span-2 text-xs text-neutral-500">
                      {{ m.creadoEn | date:'dd/MM/yyyy HH:mm' }}
                    </div>
                    <div class="col-span-2">
                      <span [ngClass]="getMovementClass(m.tipo)" class="px-2.5 py-1 rounded-full text-xs font-bold">
                        {{ m.tipo }}
                      </span>
                    </div>
                    <div class="col-span-3 flex flex-col">
                      <span class="font-bold text-neutral-900 dark:text-white">{{ m.productoNombre }}</span>
                      <span class="text-xs text-neutral-400">Ref: {{ m.referenciaDoc || '-' }}</span>
                    </div>
                    <div class="col-span-3 text-xs text-neutral-600 dark:text-neutral-400">
                      @if (m.tipo === 'TRANSFERENCIA') {
                        {{ m.almacenOrigen }} <mat-icon svgIcon="arrow-right" class="icon-size-3 inline"></mat-icon> {{ m.almacenDestino }}
                      } @else {
                        {{ m.almacenDestino || m.almacenOrigen || 'General' }}
                      }
                      @if (m.motivo) {
                        <p class="text-[11px] text-neutral-400 truncate">{{ m.motivo }}</p>
                      }
                    </div>
                    <div class="col-span-2 text-right font-mono font-bold text-neutral-900 dark:text-white">
                      {{ m.cantidad | number:'1.0-2' }}
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

      </div>

      <!-- ================= MODALS ================= -->

      <!-- Transfer Modal Template -->
      <ng-template #transferModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-[85vh]">
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="arrow-right-left" class="icon-size-5 text-blue-600"></mat-icon>
              Transferencia de Stock entre Almacenes
            </h3>
            <button (click)="closeDialog()" class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="p-6 flex flex-col gap-4 overflow-y-auto">
            <!-- Producto -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Producto a Transferir</mat-label>
              <mat-select [(ngModel)]="transferData.productoId" placeholder="Selecciona un producto">
                @for (p of productsService.products(); track p.id) {
                  <mat-option [value]="p.id">{{ p.codigo }} - {{ p.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Almacén Origen -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Almacén Origen</mat-label>
                <mat-select [(ngModel)]="transferData.almacenOrigenId" placeholder="Selecciona origen">
                  @for (w of inventoryService.warehouses(); track w.id) {
                    <mat-option [value]="w.id">{{ w.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <!-- Almacén Destino -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Almacén Destino</mat-label>
                <mat-select [(ngModel)]="transferData.almacenDestinoId" placeholder="Selecciona destino">
                  @for (w of inventoryService.warehouses(); track w.id) {
                    <mat-option [value]="w.id">{{ w.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Cantidad -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Cantidad a Transferir</mat-label>
              <input matInput type="number" [(ngModel)]="transferData.cantidad" min="1" placeholder="10">
            </mat-form-field>

            <!-- Motivo -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Motivo / Documento de Referencia</mat-label>
              <input matInput type="text" [(ngModel)]="transferData.motivo" placeholder="Reabastecimiento de tienda, Solicitud #TR-102">
            </mat-form-field>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
            <button mat-button (click)="closeDialog()" class="rounded-xl">Cancelar</button>
            <button mat-flat-button color="primary" (click)="submitTransfer()" class="rounded-xl bg-blue-600 text-white">Ejecutar Transferencia</button>
          </div>
        </div>
      </ng-template>

      <!-- Adjustment Modal Template -->
      <ng-template #adjustmentModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-[85vh]">
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="sliders-horizontal" class="icon-size-5 text-blue-600"></mat-icon>
              Ajuste Directo de Inventario
            </h3>
            <button (click)="closeDialog()" class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="p-6 flex flex-col gap-4 overflow-y-auto">
            <!-- Producto -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Producto</mat-label>
              <mat-select [(ngModel)]="adjustData.productoId" placeholder="Selecciona un producto">
                @for (p of productsService.products(); track p.id) {
                  <mat-option [value]="p.id">{{ p.codigo }} - {{ p.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Almacén -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Almacén</mat-label>
                <mat-select [(ngModel)]="adjustData.almacenId" placeholder="Selecciona almacén">
                  @for (w of inventoryService.warehouses(); track w.id) {
                    <mat-option [value]="w.id">{{ w.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <!-- Tipo de Ajuste -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Tipo de Ajuste</mat-label>
                <mat-select [(ngModel)]="adjustData.tipo">
                  <mat-option value="AJUSTE_POSITIVO">Ajuste Positivo (+ Entrada)</mat-option>
                  <mat-option value="AJUSTE_NEGATIVO">Ajuste Negativo (- Salida / Merma)</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Cantidad -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Cantidad</mat-label>
              <input matInput type="number" [(ngModel)]="adjustData.cantidad" min="1" placeholder="5">
            </mat-form-field>

            <!-- Motivo -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Motivo / Explicación del Ajuste</mat-label>
              <input matInput type="text" [(ngModel)]="adjustData.motivo" placeholder="Conteo físico mensual, producto dañado, etc.">
            </mat-form-field>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
            <button mat-button (click)="closeDialog()" class="rounded-xl">Cancelar</button>
            <button mat-flat-button color="primary" (click)="submitAdjustment()" class="rounded-xl bg-blue-600 text-white">Aplicar Ajuste</button>
          </div>
        </div>
      </ng-template>

      <!-- Warehouse Modal Template -->
      <ng-template #warehouseModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-[85vh]">
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="store" class="icon-size-5 text-blue-600"></mat-icon>
              Nuevo Almacén o Bodega
            </h3>
            <button (click)="closeDialog()" class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="p-6 flex flex-col gap-4 overflow-y-auto">
            <!-- Nombre -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Nombre del Almacén</mat-label>
              <input matInput type="text" [(ngModel)]="warehouseData.nombre" placeholder="Bodega Central, Piso de Venta Piantini">
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Tipo -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Tipo de Almacén</mat-label>
                <mat-select [(ngModel)]="warehouseData.tipo">
                  <mat-option value="VENTA">Piso de Venta</mat-option>
                  <mat-option value="CENTRAL">Centro de Distribución (CEDI)</mat-option>
                  <mat-option value="MERMAS">Almacén de Mermas / Averías</mat-option>
                  <mat-option value="TRANSITO">En Tránsito</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Código -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Código</mat-label>
                <input matInput type="text" [(ngModel)]="warehouseData.codigo" placeholder="ALM-01">
              </mat-form-field>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
            <button mat-button (click)="closeDialog()" class="rounded-xl">Cancelar</button>
            <button mat-flat-button color="primary" (click)="submitWarehouse()" class="rounded-xl bg-blue-600 text-white">Guardar Almacén</button>
          </div>
        </div>
      </ng-template>

    </div>
  `
})
export default class InventoryComponent implements OnInit {
  inventoryService = inject(InventoryService);
  productsService = inject(ProductsService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);

  @ViewChild('transferModalTemplate') transferModalTemplate!: TemplateRef<any>;
  @ViewChild('adjustmentModalTemplate') adjustmentModalTemplate!: TemplateRef<any>;
  @ViewChild('warehouseModalTemplate') warehouseModalTemplate!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

  activeTab: 'stocks' | 'warehouses' | 'kardex' = 'stocks';
  stockSearch = '';
  selectedWarehouseFilter = 'ALL';

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
      return 'Todos los Almacenes';
    }
    const found = this.inventoryService.warehouses().find(w => w.id === this.selectedWarehouseFilter);
    return found ? `${found.nombre} (${found.sucursal?.nombre || 'Central'})` : 'Todos los Almacenes';
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

  openTransferModal(originWarehouseId?: string) {
    this.transferData = {
      productoId: '',
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

  openAdjustmentModal() {
    this.adjustData = {
      productoId: '',
      almacenId: '',
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
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.inventoryService.createTransfer(this.transferData).subscribe({
      next: () => {
        this.snackBar.open('Transferencia ejecutada exitosamente', 'Cerrar', { duration: 3000 });
        this.closeDialog();
        this.inventoryService.getStocks().subscribe();
        this.inventoryService.getKardex().subscribe();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al transferir stock', 'Cerrar', { duration: 4000 });
      }
    });
  }

  submitAdjustment() {
    if (!this.adjustData.productoId || !this.adjustData.almacenId || this.adjustData.cantidad <= 0) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.inventoryService.createAdjustment(this.adjustData).subscribe({
      next: () => {
        this.snackBar.open('Ajuste de inventario aplicado', 'Cerrar', { duration: 3000 });
        this.closeDialog();
        this.inventoryService.getStocks().subscribe();
        this.inventoryService.getKardex().subscribe();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al aplicar ajuste', 'Cerrar', { duration: 4000 });
      }
    });
  }

  submitWarehouse() {
    if (!this.warehouseData.nombre) {
      this.snackBar.open('El nombre del almacén es obligatorio', 'Cerrar', { duration: 3000 });
      return;
    }

    this.inventoryService.createWarehouse(this.warehouseData).subscribe({
      next: () => {
        this.snackBar.open('Almacén creado exitosamente', 'Cerrar', { duration: 3000 });
        this.closeDialog();
        this.inventoryService.getWarehouses().subscribe();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al crear almacén', 'Cerrar', { duration: 4000 });
      }
    });
  }

  getMovementClass(tipo: string): string {
    switch (tipo) {
      case 'TRANSFERENCIA':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
      case 'COMPRA':
      case 'AJUSTE_POSITIVO':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'VENTA':
      case 'AJUSTE_NEGATIVO':
        return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
    }
  }
}
