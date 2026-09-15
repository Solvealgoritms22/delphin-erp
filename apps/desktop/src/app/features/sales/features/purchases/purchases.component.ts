import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
import { CurrencyConfigService } from '@core/currency/currency-config.service';
import { PurchaseDialogComponent } from './purchase-dialog.component';
import { SupplierPaymentDialogComponent } from './supplier-payment-dialog.component';
import { PurchasePreviewComponent } from './purchase-preview.component';

@Component({
  selector: 'app-purchases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">
      <!-- Standard Clean Page Header -->
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <div>
          <div
            class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'commercial.purchases.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'commercial.purchases.subtitle' | transloco }}
          </p>
        </div>

        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4 gap-3">
          <button
            mat-flat-button
            (click)="openPurchaseModal()"
            class="!rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
            {{ 'commercial.purchases.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Body -->
      <div class="flex min-h-0 flex-auto flex-col overflow-y-auto">
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 md:px-8 lg:grid-cols-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
          <app-stat-card
            [title]="'commercial.purchases.stats.monthPurchases' | transloco"
            [subtitle]="metrics().cantidadComprasMes + ' compras registradas este mes'"
            [prefix]="currencyConfig.currencySymbol() + ' '"
            [value]="metrics().totalComprasMes || 0"
            icon="shopping-bag"
            curvePreset="asc-sigmoid"
            color="blue"
            (refresh)="loadPurchases()"
          />

          <app-stat-card
            [title]="'commercial.purchases.stats.pendingCxP' | transloco"
            [subtitle]="metrics().facturasPendientesCount + ' facturas con saldo pendiente'"
            [prefix]="currencyConfig.currencySymbol() + ' '"
            [value]="metrics().totalCxPPendiente || 0"
            icon="clock"
            curvePreset="asc-sigmoid"
            color="amber"
            (refresh)="loadPurchases()"
          />

          <app-stat-card
            [title]="'commercial.purchases.stats.overdueCxP' | transloco"
            [subtitle]="metrics().facturasVencidasCount + ' facturas vencidas'"
            [prefix]="currencyConfig.currencySymbol() + ' '"
            [value]="metrics().totalVencido || 0"
            icon="alert-triangle"
            curvePreset="trough-wave"
            color="rose"
            (refresh)="loadPurchases()"
          />

          <app-stat-card
            [title]="'commercial.purchases.stats.suppliersCount' | transloco"
            [subtitle]="'commercial.purchases.stats.suppliersDirectory' | transloco"
            [value]="suppliers().length"
            icon="truck"
            curvePreset="s-curve"
            color="purple"
            (refresh)="loadPurchases()"
          />
        </div>

        <!-- Filter Bar -->
        <div
          class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div class="flex min-w-[260px] flex-1 items-center gap-3">
            <div class="relative w-full max-w-md">
              <mat-icon
                svgIcon="search"
                class="icon-size-4 absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
              ></mat-icon>
              <input
                type="text"
                [placeholder]="'commercial.purchases.search' | transloco"
                [value]="searchQuery"
                (input)="onSearchInput($event)"
                class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
              />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Estado Filter Menu -->
            <button
              [matMenuTriggerFor]="statusMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              <mat-icon svgIcon="sliders-horizontal" class="icon-size-4 text-neutral-500"></mat-icon>
              <span>{{ getStatusLabel() | transloco }}</span>
            </button>
            <mat-menu #statusMenu="matMenu">
              <button mat-menu-item (click)="setEstado('ALL')">{{ 'commercial.purchases.filters.allStatuses' | transloco }}</button>
              <button mat-menu-item (click)="setEstado('REGISTRADA')">{{ 'commercial.purchases.filters.registered' | transloco }}</button>
              <button mat-menu-item (click)="setEstado('PAGADA_PARCIAL')">{{ 'commercial.purchases.filters.partial' | transloco }}</button>
              <button mat-menu-item (click)="setEstado('PAGADA')">{{ 'commercial.purchases.filters.paid' | transloco }}</button>
              <button mat-menu-item (click)="setEstado('ANULADA')">{{ 'commercial.purchases.filters.cancelled' | transloco }}</button>
            </mat-menu>

            <!-- Tipo Pago Filter Menu -->
            <button
              [matMenuTriggerFor]="tipoPagoMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              <mat-icon svgIcon="credit-card" class="icon-size-4 text-neutral-500"></mat-icon>
              <span>{{ getTipoPagoLabel() | transloco }}</span>
            </button>
            <mat-menu #tipoPagoMenu="matMenu">
              <button mat-menu-item (click)="setTipoPago('ALL')">{{ 'commercial.purchases.filters.allTerms' | transloco }}</button>
              <button mat-menu-item (click)="setTipoPago('CONTADO')">{{ 'commercial.purchases.filters.cashOnly' | transloco }}</button>
              <button mat-menu-item (click)="setTipoPago('CREDITO')">{{ 'commercial.purchases.filters.creditOnly' | transloco }}</button>
            </mat-menu>

            <!-- Proveedor Filter Menu -->
            <button
              [matMenuTriggerFor]="supplierMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50 max-w-[200px]"
            >
              <mat-icon svgIcon="truck" class="icon-size-4 text-neutral-500"></mat-icon>
              <span class="truncate">{{ getSupplierLabel() | transloco }}</span>
            </button>
            <mat-menu #supplierMenu="matMenu">
              <button mat-menu-item (click)="setProveedor('ALL')">{{ 'commercial.purchases.filters.allSuppliers' | transloco }}</button>
              @for (sup of suppliers(); track sup.id) {
                <button mat-menu-item (click)="setProveedor(sup.id)">{{ sup.nombreRazonSocial }}</button>
              }
            </mat-menu>
          </div>
        </div>

        <!-- Purchases Table -->
        <div class="grid">
          <div
            class="purchases-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
          >
            <div>{{ 'commercial.purchases.table.numberNcf' | transloco }}</div>
            <div>{{ 'commercial.purchases.table.supplier' | transloco }}</div>
            <div class="hidden sm:block">{{ 'commercial.purchases.table.dateDue' | transloco }}</div>
            <div class="hidden md:block">{{ 'commercial.purchases.table.terms' | transloco }}</div>
            <div>{{ 'common.status' | transloco }}</div>
            <div class="text-right">{{ 'commercial.purchases.table.total' | transloco }}</div>
            <div class="hidden lg:block text-right">{{ 'commercial.purchases.table.pending' | transloco }}</div>
            <div class="text-right">{{ 'common.actions' | transloco }}</div>
          </div>

          @if (isLoading()) {
            <app-table-skeleton [gridClass]="'purchases-grid'" [rows]="6" />
          } @else if (purchases().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                [title]="'commercial.purchases.emptyTitle' | transloco"
                [description]="'commercial.purchases.emptySubtitle' | transloco"
                [actionLabel]="'commercial.purchases.new' | transloco"
                actionIcon="plus"
                (action)="openPurchaseModal()"
              />
            </div>
          } @else {
            @for (p of purchases(); track p.id) {
              <div
                class="purchases-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
              >
                <!-- No. Compra & NCF -->
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-neutral-900 dark:text-white truncate">
                    {{ p.numeroFactura }}
                  </span>
                  @if (p.ncf) {
                    <span class="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                      {{ p.ncf }}
                    </span>
                  }
                </div>

                <!-- Proveedor -->
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {{ p.proveedor?.nombreRazonSocial || 'Proveedor no asignado' }}
                  </span>
                  <span class="text-xs text-neutral-400 mt-0.5 font-mono">
                    RNC: {{ p.proveedor?.numeroDocumento || 'N/D' }}
                  </span>
                </div>

                <!-- Fechas -->
                <div class="hidden sm:flex flex-col font-mono text-xs">
                  <span class="text-neutral-800 dark:text-neutral-200">{{ p.fecha | date: 'dd/MM/yyyy' }}</span>
                  @if (p.fechaVencimiento && p.tipoPago === 'CREDITO') {
                    <span
                      class="text-[11px] mt-0.5 font-semibold"
                      [ngClass]="isOverdue(p) ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-400'"
                    >
                      Vence: {{ p.fechaVencimiento | date: 'dd/MM/yyyy' }}
                    </span>
                  }
                </div>

                <!-- Condición de Pago -->
                <div class="hidden md:flex flex-col">
                  <span
                    class="inline-flex items-center w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                    [ngClass]="p.tipoPago === 'CONTADO' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/20'"
                  >
                    {{ p.tipoPago }}
                  </span>
                  <span class="text-[10px] text-neutral-400 mt-0.5">
                    {{ p.metodoPago }}
                  </span>
                </div>

                <!-- Estado -->
                <div>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
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
                </div>

                <!-- Total Factura -->
                <div class="text-right font-mono font-bold text-neutral-900 dark:text-white">
                  {{ currencyConfig.currencySymbol() }} {{ p.total | number: '1.2-2' }}
                </div>

                <!-- Balance Pendiente -->
                <div class="hidden lg:block text-right font-mono">
                  @if (p.balancePendiente > 0 && p.estado !== 'ANULADA') {
                    <span class="font-bold text-amber-600 dark:text-amber-400">
                      {{ currencyConfig.currencySymbol() }} {{ p.balancePendiente | number: '1.2-2' }}
                    </span>
                  } @else {
                    <span class="text-neutral-400 text-xs">{{ currencyConfig.currencySymbol() }} 0.00</span>
                  }
                </div>

                <!-- Acciones -->
                <div class="flex items-center justify-end gap-1">
                  <!-- Ver Comprobante -->
                  <button
                    mat-icon-button
                    (click)="previewPurchase(p)"
                    matTooltip="Ver Comprobante"
                    class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                  >
                    <mat-icon svgIcon="eye" class="icon-size-4.5"></mat-icon>
                  </button>

                  <!-- Abonar / Pagar si tiene balance -->
                  @if (p.balancePendiente > 0 && p.estado !== 'ANULADA') {
                    <button
                      mat-icon-button
                      (click)="openPaymentModal(p)"
                      matTooltip="Registrar Abono / Pago"
                      class="text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                    >
                      <mat-icon svgIcon="credit-card" class="icon-size-4.5 text-emerald-600 dark:text-emerald-400"></mat-icon>
                    </button>
                  }

                  <!-- Menú Extra (Anular) -->
                  <button
                    mat-icon-button
                    [matMenuTriggerFor]="itemMenu"
                    class="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                  >
                    <mat-icon svgIcon="ellipsis-vertical" class="icon-size-4.5"></mat-icon>
                  </button>
                  <mat-menu #itemMenu="matMenu" class="!rounded-xl !p-1">
                    <button mat-menu-item (click)="previewPurchase(p)">
                      <mat-icon svgIcon="eye" class="icon-size-4"></mat-icon>
                      <span>Ver Detalle de Compra</span>
                    </button>
                    @if (p.balancePendiente > 0 && p.estado !== 'ANULADA') {
                      <button mat-menu-item (click)="openPaymentModal(p)">
                        <mat-icon svgIcon="credit-card" class="icon-size-4 text-emerald-600"></mat-icon>
                        <span class="text-emerald-600 font-bold">Registrar Abono / Pago</span>
                      </button>
                    }
                    @if (p.estado !== 'ANULADA') {
                      <button mat-menu-item (click)="cancelPurchase(p)" class="!text-rose-600">
                        <mat-icon svgIcon="trash" class="icon-size-4 text-rose-600"></mat-icon>
                        <span class="text-rose-600">Anular Compra</span>
                      </button>
                    }
                  </mat-menu>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .purchases-grid {
      grid-template-columns: minmax(130px, 1.2fr) minmax(180px, 2fr) minmax(110px, 1fr) minmax(100px, 0.9fr) minmax(100px, 0.9fr) minmax(110px, 1.1fr) minmax(100px, 1fr) minmax(90px, 0.8fr);
    }
    @media (max-width: 1024px) {
      .purchases-grid {
        grid-template-columns: minmax(130px, 1.2fr) minmax(160px, 2fr) minmax(110px, 1fr) minmax(100px, 0.9fr) minmax(100px, 0.9fr) minmax(110px, 1fr) minmax(80px, 0.8fr);
      }
    }
    @media (max-width: 768px) {
      .purchases-grid {
        grid-template-columns: minmax(120px, 1.2fr) minmax(150px, 2fr) minmax(100px, 1fr) minmax(90px, 0.9fr) minmax(100px, 1.1fr) minmax(80px, 0.8fr);
      }
    }
    @media (max-width: 640px) {
      .purchases-grid {
        grid-template-columns: minmax(120px, 1.5fr) minmax(140px, 2fr) minmax(90px, 0.9fr) minmax(100px, 1.1fr) minmax(70px, 0.8fr);
      }
    }
  `],
})
export class PurchasesComponent implements OnInit {
  purchasesService = inject(PurchasesService);
  suppliersService = inject(SuppliersService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  transloco = inject(TranslocoService);
  currencyConfig = inject(CurrencyConfigService);

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
