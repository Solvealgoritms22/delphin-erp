import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  PurchasesService,
  FacturaCompra,
  FilterPurchasesDto,
} from '../../data/purchases.service';
import { SuppliersService } from '../../data/suppliers.service';
import { PurchaseDialogComponent } from './purchase-dialog.component';
import { SupplierPaymentDialogComponent } from './supplier-payment-dialog.component';
import { PurchasePreviewComponent } from './purchase-preview.component';

@Component({
  selector: 'app-purchases',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule,
    DecimalPipe,
    DatePipe,
    TranslocoPipe,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatCardComponent,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <!-- Standard Clean Page Header -->
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <div class="min-w-0 flex-1">
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ 'commercial.purchases.title' | transloco }}
          </h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {{ 'commercial.purchases.subtitle' | transloco }}
          </p>
        </div>

        <div class="flex items-center gap-3 mt-4 sm:mt-0 shrink-0">
          <button
            (click)="openPurchaseModal()"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
          >
            <mat-icon svgIcon="plus" class="icon-size-4 text-white"></mat-icon>
            {{ 'commercial.purchases.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Scrollable Content -->
      <div class="flex-auto overflow-y-auto px-6 md:px-8 py-6 space-y-6">
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <app-stat-card
            [title]="'commercial.purchases.stats.monthPurchases' | transloco"
            [subtitle]="metrics().cantidadComprasMes + ' compras registradas este mes'"
            prefix="RD$ "
            [value]="(metrics().totalComprasMes | number: '1.2-2') || '0.00'"
            icon="shopping-bag"
            curvePreset="asc-sigmoid"
            color="blue"
            (refresh)="loadPurchases()"
          />

          <app-stat-card
            [title]="'commercial.purchases.stats.pendingCxP' | transloco"
            [subtitle]="metrics().facturasPendientesCount + ' facturas con saldo pendiente'"
            prefix="RD$ "
            [value]="(metrics().totalCxPPendiente | number: '1.2-2') || '0.00'"
            icon="clock"
            curvePreset="asc-sigmoid"
            color="amber"
            (refresh)="loadPurchases()"
          />

          <app-stat-card
            [title]="'commercial.purchases.stats.overdueCxP' | transloco"
            [subtitle]="metrics().facturasVencidasCount + ' facturas vencidas'"
            prefix="RD$ "
            [value]="(metrics().totalVencido | number: '1.2-2') || '0.00'"
            icon="alert-triangle"
            curvePreset="trough-wave"
            color="rose"
            (refresh)="loadPurchases()"
          />

          <app-stat-card
            [title]="'commercial.purchases.stats.suppliersCount' | transloco"
            subtitle="Proveedores en directorio"
            [value]="suppliers().length"
            icon="truck"
            curvePreset="s-curve"
            color="purple"
            (refresh)="loadPurchases()"
          />
        </div>

        <!-- Filter Controls (Standard MatMenu + Search) -->
        <!-- Filter Controls (Standard MatMenu + Search) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <!-- Search input -->
          <div class="relative flex-1 min-w-[200px] max-w-sm">
            <mat-icon svgIcon="search" class="icon-size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"></mat-icon>
            <input
              type="text"
              [placeholder]="'commercial.purchases.search' | transloco"
              [value]="searchQuery"
              (input)="onSearchInput($event)"
              class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <!-- Dropdown Filter Buttons -->
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <!-- Estado Filter Menu -->
            <button
              [matMenuTriggerFor]="statusMenu"
              class="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer whitespace-nowrap"
            >
              <span>{{ getStatusLabel() }}</span>
              <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-500"></mat-icon>
            </button>
            <mat-menu #statusMenu="matMenu">
              <button mat-menu-item (click)="setEstado('ALL')">Todos los Estados</button>
              <button mat-menu-item (click)="setEstado('REGISTRADA')">Registrada / Pendiente</button>
              <button mat-menu-item (click)="setEstado('PAGADA_PARCIAL')">Pagada Parcial</button>
              <button mat-menu-item (click)="setEstado('PAGADA')">Pagada Total</button>
              <button mat-menu-item (click)="setEstado('ANULADA')">Anulada</button>
            </mat-menu>

            <!-- Tipo Pago Filter Menu -->
            <button
              [matMenuTriggerFor]="tipoPagoMenu"
              class="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer whitespace-nowrap"
            >
              <span>{{ getTipoPagoLabel() }}</span>
              <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-500"></mat-icon>
            </button>
            <mat-menu #tipoPagoMenu="matMenu">
              <button mat-menu-item (click)="setTipoPago('ALL')">Contado y Crédito</button>
              <button mat-menu-item (click)="setTipoPago('CONTADO')">Solo Contado</button>
              <button mat-menu-item (click)="setTipoPago('CREDITO')">Solo Crédito</button>
            </mat-menu>

            <!-- Proveedor Filter Menu -->
            <button
              [matMenuTriggerFor]="supplierMenu"
              class="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer max-w-[180px] whitespace-nowrap"
            >
              <span class="truncate">{{ getSupplierLabel() }}</span>
              <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-500 shrink-0"></mat-icon>
            </button>
            <mat-menu #supplierMenu="matMenu">
              <button mat-menu-item (click)="setProveedor('ALL')">Todos los Proveedores</button>
              @for (sup of suppliers(); track sup.id) {
                <button mat-menu-item (click)="setProveedor(sup.id)">{{ sup.nombreRazonSocial }}</button>
              }
            </mat-menu>
          </div>
        </div>

        <!-- Table Container -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
          @if (isLoading()) {
            <app-table-skeleton
              [cells]="['80px', '140px', '80px', '70px', '60px', '90px', '70px']"
            ></app-table-skeleton>
          } @else if (purchases().length === 0) {
            <div class="py-12">
              <app-empty-state
                illustration="18.svg"
                [title]="'commercial.purchases.emptyTitle' | transloco"
                [description]="'commercial.purchases.emptySubtitle' | transloco"
                [actionLabel]="'commercial.purchases.new' | transloco"
                (actionClick)="openPurchaseModal()"
              ></app-empty-state>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-neutral-50/75 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th class="py-3.5 px-4">No. Compra / NCF</th>
                    <th class="py-3.5 px-4">Proveedor</th>
                    <th class="py-3.5 px-3">Fecha / Venc.</th>
                    <th class="py-3.5 px-3">Condición</th>
                    <th class="py-3.5 px-3">Estado</th>
                    <th class="py-3.5 px-4 text-right">Total Factura</th>
                    <th class="py-3.5 px-4 text-right">Pendiente</th>
                    <th class="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  @for (p of purchases(); track p.id) {
                    <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <!-- No. Compra & NCF -->
                      <td class="py-3.5 px-4">
                        <div class="font-bold text-neutral-900 dark:text-white">
                          {{ p.numeroFactura }}
                        </div>
                        @if (p.ncf) {
                          <div class="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                            {{ p.ncf }}
                          </div>
                        }
                      </td>

                      <!-- Proveedor -->
                      <td class="py-3.5 px-4">
                        <div class="font-bold text-neutral-900 dark:text-white line-clamp-1">
                          {{ p.proveedor?.nombreRazonSocial || 'Proveedor no asignado' }}
                        </div>
                        <div class="text-[11px] text-neutral-500 mt-0.5">
                          RNC: {{ p.proveedor?.numeroDocumento || 'N/D' }}
                        </div>
                      </td>

                      <!-- Fechas -->
                      <td class="py-3.5 px-3">
                        <div class="font-medium text-neutral-800 dark:text-neutral-200">
                          {{ p.fecha | date: 'dd/MM/yyyy' }}
                        </div>
                        @if (p.fechaVencimiento && p.tipoPago === 'CREDITO') {
                          <div
                            class="text-[11px] mt-0.5 font-semibold"
                            [ngClass]="isOverdue(p) ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-500'"
                          >
                            Vence: {{ p.fechaVencimiento | date: 'dd/MM/yyyy' }}
                          </div>
                        }
                      </td>

                      <!-- Condición de Pago -->
                      <td class="py-3.5 px-3">
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          [ngClass]="p.tipoPago === 'CONTADO' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'"
                        >
                          {{ p.tipoPago }}
                        </span>
                        <div class="text-[10px] text-neutral-400 mt-0.5">
                          {{ p.metodoPago }}
                        </div>
                      </td>

                      <!-- Estado -->
                      <td class="py-3.5 px-3">
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                          [ngClass]="{
                            'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20':
                              p.estado === 'PAGADA',
                            'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20':
                              p.estado === 'REGISTRADA' || p.estado === 'PAGADA_PARCIAL',
                            'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20':
                              p.estado === 'ANULADA'
                          }"
                        >
                          {{ p.estado }}
                        </span>
                      </td>

                      <!-- Total Factura -->
                      <td class="py-3.5 px-4 text-right font-bold text-neutral-900 dark:text-white">
                        RD$ {{ p.total | number: '1.2-2' }}
                      </td>

                      <!-- Balance Pendiente -->
                      <td class="py-3.5 px-4 text-right">
                        @if (p.balancePendiente > 0 && p.estado !== 'ANULADA') {
                          <span class="font-extrabold text-amber-600 dark:text-amber-400">
                            RD$ {{ p.balancePendiente | number: '1.2-2' }}
                          </span>
                        } @else {
                          <span class="text-neutral-400 font-medium">RD$ 0.00</span>
                        }
                      </td>

                      <!-- Acciones -->
                      <td class="py-3.5 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <!-- Ver Comprobante -->
                          <button
                            (click)="previewPurchase(p)"
                            matTooltip="Ver / Imprimir"
                            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <mat-icon svgIcon="eye" class="icon-size-4"></mat-icon>
                          </button>

                          <!-- Abonar / Pagar si tiene balance -->
                          @if (p.balancePendiente > 0 && p.estado !== 'ANULADA') {
                            <button
                              (click)="openPaymentModal(p)"
                              matTooltip="Registrar Abono / Pago"
                              class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                            >
                              <mat-icon svgIcon="credit-card" class="icon-size-4"></mat-icon>
                            </button>
                          }

                          <!-- Menú Extra (Anular) -->
                          <button
                            [matMenuTriggerFor]="itemMenu"
                            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors cursor-pointer"
                          >
                            <mat-icon svgIcon="more-vertical" class="icon-size-4"></mat-icon>
                          </button>
                          <mat-menu #itemMenu="matMenu" class="!rounded-xl !p-1">
                            @if (p.estado !== 'ANULADA') {
                              <button mat-menu-item (click)="cancelPurchase(p)">
                                <mat-icon svgIcon="circle-x" class="text-rose-500"></mat-icon>
                                <span class="text-rose-600 font-semibold">Anular Compra</span>
                              </button>
                            }
                          </mat-menu>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PurchasesComponent implements OnInit {
  purchasesService = inject(PurchasesService);
  suppliersService = inject(SuppliersService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  transloco = inject(TranslocoService);

  purchases = this.purchasesService.purchases;
  metrics = this.purchasesService.metrics;
  isLoading = this.purchasesService.isLoading;
  suppliers = this.suppliersService.suppliers;

  searchQuery = '';
  selectedEstado = 'ALL';
  selectedTipoPago = 'ALL';
  selectedProveedorId = 'ALL';

  private searchDebounceTimer?: any;

  ngOnInit() {
    this.suppliersService.findAll().subscribe();
    this.loadPurchases();
  }

  loadPurchases() {
    const filter: FilterPurchasesDto = {
      search: this.searchQuery.trim() || undefined,
      estado: this.selectedEstado !== 'ALL' ? this.selectedEstado : undefined,
      tipoPago: this.selectedTipoPago !== 'ALL' ? this.selectedTipoPago : undefined,
      proveedorId: this.selectedProveedorId !== 'ALL' ? this.selectedProveedorId : undefined,
    };
    this.purchasesService.findAll(filter).subscribe();
  }

  onSearchInput(event: any) {
    this.searchQuery = event.target.value;
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.loadPurchases();
    }, 300);
  }

  setEstado(val: string) {
    this.selectedEstado = val;
    this.loadPurchases();
  }

  setTipoPago(val: string) {
    this.selectedTipoPago = val;
    this.loadPurchases();
  }

  setProveedor(val: string) {
    this.selectedProveedorId = val;
    this.loadPurchases();
  }

  getStatusLabel(): string {
    switch (this.selectedEstado) {
      case 'REGISTRADA':
        return 'Registrada / Pendiente';
      case 'PAGADA_PARCIAL':
        return 'Pagada Parcial';
      case 'PAGADA':
        return 'Pagada Total';
      case 'ANULADA':
        return 'Anulada';
      default:
        return 'Todos los Estados';
    }
  }

  getTipoPagoLabel(): string {
    switch (this.selectedTipoPago) {
      case 'CONTADO':
        return 'Solo Contado';
      case 'CREDITO':
        return 'Solo Crédito';
      default:
        return 'Contado y Crédito';
    }
  }

  getSupplierLabel(): string {
    if (this.selectedProveedorId === 'ALL') {
      return 'Todos los Proveedores';
    }
    const sup = this.suppliers().find((s) => s.id === this.selectedProveedorId);
    return sup ? sup.nombreRazonSocial : 'Proveedor';
  }

  isOverdue(p: FacturaCompra): boolean {
    if (!p.fechaVencimiento || p.balancePendiente <= 0) return false;
    return new Date(p.fechaVencimiento) < new Date();
  }

  openPurchaseModal() {
    const dialogRef = this.dialog.open(PurchaseDialogComponent, {
      width: '100%',
      maxWidth: '56rem',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.purchasesService.create(res).subscribe({
          next: () => {
            this.snackBar.open('Factura de compra registrada exitosamente', 'OK', {
              duration: 3000,
            });
            this.loadPurchases();
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || 'Error al registrar la compra',
              'Cerrar',
              { duration: 4500 },
            );
          },
        });
      }
    });
  }

  openPaymentModal(purchase: FacturaCompra) {
    const dialogRef = this.dialog.open(SupplierPaymentDialogComponent, {
      width: '100%',
      maxWidth: '32rem',
      data: { purchase },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.purchasesService.registerPayment(purchase.id, res).subscribe({
          next: () => {
            this.snackBar.open('Pago a proveedor registrado exitosamente', 'OK', {
              duration: 3000,
            });
            this.loadPurchases();
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || 'Error al registrar el pago',
              'Cerrar',
              { duration: 4500 },
            );
          },
        });
      }
    });
  }

  previewPurchase(purchase: FacturaCompra) {
    this.dialog.open(PurchasePreviewComponent, {
      width: '100%',
      maxWidth: '48rem',
      data: { purchase },
    });
  }

  cancelPurchase(purchase: FacturaCompra) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Anular Factura de Compra',
        message: `¿Estás seguro de anular la compra ${purchase.numeroFactura}? El inventario ingresado será devuelto y revertido en el Kardex.`,
        confirmLabel: 'Anular Compra',
        cancelLabel: 'Volver',
        destructive: true,
      } satisfies ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.purchasesService.cancel(purchase.id).subscribe({
          next: () => {
            this.snackBar.open('Compra anulada e inventario revertido', 'OK', {
              duration: 3000,
            });
            this.loadPurchases();
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || 'Error al anular compra',
              'Cerrar',
              { duration: 4000 },
            );
          },
        });
      }
    });
  }
}
