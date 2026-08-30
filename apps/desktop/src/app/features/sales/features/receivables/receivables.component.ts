import { Component, inject, OnInit, signal } from '@angular/core';
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
  CustomerPaymentsService,
  PagoCliente,
  PendingInvoice,
  FilterCustomerPaymentsDto,
} from '../../data/customer-payments.service';
import { ClientsService } from '../../data/clients';
import { PaymentReceiptDialogComponent } from './payment-receipt-dialog.component';
import { PaymentReceiptPreviewComponent } from './payment-receipt-preview.component';

@Component({
  selector: 'app-receivables',
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
            {{ 'commercial.receivables.title' | transloco }}
          </h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {{ 'commercial.receivables.subtitle' | transloco }}
          </p>
        </div>

        <div class="flex items-center gap-3 mt-4 sm:mt-0 shrink-0">
          <button
            (click)="openReceiptModal()"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
          >
            <mat-icon svgIcon="plus" class="icon-size-4 text-white"></mat-icon>
            {{ 'commercial.receivables.newReceipt' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Scrollable Content -->
      <div class="flex-auto overflow-y-auto px-6 md:px-8 py-6 space-y-6">
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <app-stat-card
            [title]="'commercial.receivables.stats.totalCxC' | transloco"
            [subtitle]="metrics().facturasPendientesCount + ' facturas con saldo pendiente'"
            prefix="RD$ "
            [value]="(metrics().totalPorCobrar | number: '1.2-2') || '0.00'"
            icon="clock"
            curvePreset="asc-sigmoid"
            color="amber"
            (refresh)="refreshAll()"
          />

          <app-stat-card
            [title]="'commercial.receivables.stats.overdueCxC' | transloco"
            [subtitle]="metrics().facturasVencidasCount + ' facturas vencidas en mora'"
            prefix="RD$ "
            [value]="(metrics().totalVencido | number: '1.2-2') || '0.00'"
            icon="alert-circle"
            curvePreset="trough-wave"
            color="rose"
            (refresh)="refreshAll()"
          />

          <app-stat-card
            [title]="'commercial.receivables.stats.monthCollected' | transloco"
            [subtitle]="metrics().cobrosMesCount + ' cobros efectuados este mes'"
            prefix="RD$ "
            [value]="(metrics().cobradoMes | number: '1.2-2') || '0.00'"
            icon="check-circle-2"
            curvePreset="peak-wave"
            color="emerald"
            (refresh)="refreshAll()"
          />

          <app-stat-card
            [title]="'commercial.receivables.stats.clientsWithBalance' | transloco"
            subtitle="Clientes con crédito activo"
            [value]="metrics().clientesConSaldoCount"
            icon="users"
            curvePreset="s-curve"
            color="blue"
            (refresh)="refreshAll()"
          />
        </div>

        <!-- View Switcher Tabs -->
        <div class="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
          <button
            type="button"
            (click)="activeTab = 'PENDING'"
            class="px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
            [ngClass]="{
              'bg-blue-600 text-white shadow-xs': activeTab === 'PENDING',
              'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800': activeTab !== 'PENDING'
            }"
          >
            <span>Facturas Pendientes por Cobrar (CxC)</span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px]"
              [ngClass]="activeTab === 'PENDING' ? 'bg-blue-700 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'"
            >
              {{ pendingInvoices().length }}
            </span>
          </button>

          <button
            type="button"
            (click)="activeTab = 'RECEIPTS'"
            class="px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
            [ngClass]="{
              'bg-blue-600 text-white shadow-xs': activeTab === 'RECEIPTS',
              'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800': activeTab !== 'RECEIPTS'
            }"
          >
            <span>Historial de Recibos de Ingreso</span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px]"
              [ngClass]="activeTab === 'RECEIPTS' ? 'bg-blue-700 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'"
            >
              {{ payments().length }}
            </span>
          </button>
        </div>

        <!-- TAB 1: FACTURAS PENDIENTES (CxC) -->
        @if (activeTab === 'PENDING') {
          <!-- Filter Controls -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="relative w-full sm:w-80">
              <mat-icon svgIcon="search" class="icon-size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"></mat-icon>
              <input
                type="text"
                placeholder="Buscar por Factura, NCF o Cliente..."
                [(ngModel)]="searchPendingQuery"
                class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div class="flex items-center gap-3 w-full sm:w-auto">
              <!-- Cliente Filter -->
              <button
                [matMenuTriggerFor]="clientMenu"
                class="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer max-w-[220px]"
              >
                <span class="truncate">{{ getPendingClientLabel() }}</span>
                <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-500 shrink-0"></mat-icon>
              </button>
              <mat-menu #clientMenu="matMenu">
                <button mat-menu-item (click)="setPendingClient('ALL')">Todos los Clientes</button>
                @for (c of clients(); track c.id) {
                  <button mat-menu-item (click)="setPendingClient(c.id)">{{ c.nombreRazonSocial }}</button>
                }
              </mat-menu>

              <button
                (click)="loadPendingInvoices()"
                matTooltip="Refrescar lista"
                class="w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                <mat-icon svgIcon="rotate-cw" class="icon-size-4"></mat-icon>
              </button>
            </div>
          </div>

          <!-- Pending Invoices Table -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
            @if (isLoading()) {
              <app-table-skeleton [cells]="['80px', '140px', '80px', '70px', '90px', '90px', '60px']"></app-table-skeleton>
            } @else if (filteredPendingInvoices().length === 0) {
              <div class="py-12">
                <app-empty-state
                  illustration="18.svg"
                  [title]="'commercial.receivables.emptyPendingTitle' | transloco"
                  [description]="'commercial.receivables.emptyPendingSubtitle' | transloco"
                ></app-empty-state>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-neutral-50/75 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold border-b border-neutral-200 dark:border-neutral-800">
                    <tr>
                      <th class="py-3.5 px-4">No. Factura / NCF</th>
                      <th class="py-3.5 px-4">Cliente</th>
                      <th class="py-3.5 px-3">Emisión / Venc.</th>
                      <th class="py-3.5 px-3">Estado Mora</th>
                      <th class="py-3.5 px-4 text-right">Total Factura</th>
                      <th class="py-3.5 px-4 text-right">Balance Adeudado</th>
                      <th class="py-3.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    @for (inv of filteredPendingInvoices(); track inv.id) {
                      <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <!-- No. Factura / NCF -->
                        <td class="py-3.5 px-4">
                          <div class="font-bold text-neutral-900 dark:text-white">
                            {{ inv.numeroFactura }}
                          </div>
                          @if (inv.ncf) {
                            <div class="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                              {{ inv.ncf }}
                            </div>
                          }
                        </td>

                        <!-- Cliente -->
                        <td class="py-3.5 px-4">
                          <div class="font-bold text-neutral-900 dark:text-white line-clamp-1">
                            {{ inv.cliente?.nombreRazonSocial || 'Cliente General' }}
                          </div>
                          <div class="text-[11px] text-neutral-500 mt-0.5">
                            RNC: {{ inv.cliente?.numeroDocumento || 'N/D' }}
                          </div>
                        </td>

                        <!-- Fechas -->
                        <td class="py-3.5 px-3">
                          <div class="font-medium text-neutral-800 dark:text-neutral-200">
                            {{ inv.fecha | date: 'dd/MM/yyyy' }}
                          </div>
                          @if (inv.fechaVencimiento) {
                            <div class="text-[11px] text-neutral-500 mt-0.5">
                              Vence: {{ inv.fechaVencimiento | date: 'dd/MM/yyyy' }}
                            </div>
                          }
                        </td>

                        <!-- Estado Mora -->
                        <td class="py-3.5 px-3">
                          @if (inv.enMora) {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20">
                              Mora ({{ inv.diasVencido }}d)
                            </span>
                          } @else {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
                              Al Día
                            </span>
                          }
                        </td>

                        <!-- Total Factura -->
                        <td class="py-3.5 px-4 text-right font-medium text-neutral-700 dark:text-neutral-300">
                          RD$ {{ inv.total | number: '1.2-2' }}
                        </td>

                        <!-- Balance Adeudado -->
                        <td class="py-3.5 px-4 text-right font-extrabold text-amber-600 dark:text-amber-400">
                          RD$ {{ inv.balancePendiente | number: '1.2-2' }}
                        </td>

                        <!-- Acción Cobrar -->
                        <td class="py-3.5 px-4 text-right">
                          <button
                            (click)="openReceiptModal(inv.clienteId || undefined, inv.id)"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <mat-icon svgIcon="credit-card" class="icon-size-3.5"></mat-icon>
                            Cobrar
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- TAB 2: HISTORIAL DE RECIBOS DE INGRESO -->
        @if (activeTab === 'RECEIPTS') {
          <!-- Filter Controls -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="relative w-full sm:w-80">
              <mat-icon svgIcon="search" class="icon-size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"></mat-icon>
              <input
                type="text"
                placeholder="Buscar por No. Recibo, Cliente, Referencia..."
                [value]="searchReceiptsQuery"
                (input)="onSearchReceiptsInput($event)"
                class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <!-- Estado Filter -->
              <button
                [matMenuTriggerFor]="statusMenu"
                class="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
              >
                <span>{{ selectedReceiptStatus === 'ALL' ? 'Todos los Estados' : (selectedReceiptStatus === 'REGISTRADO' ? 'Cobros Efectuados' : 'Anulados') }}</span>
                <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-500"></mat-icon>
              </button>
              <mat-menu #statusMenu="matMenu">
                <button mat-menu-item (click)="setReceiptStatus('ALL')">Todos los Estados</button>
                <button mat-menu-item (click)="setReceiptStatus('REGISTRADO')">Cobros Efectuados</button>
                <button mat-menu-item (click)="setReceiptStatus('ANULADO')">Anulados</button>
              </mat-menu>

              <!-- Método Filter -->
              <button
                [matMenuTriggerFor]="methodMenu"
                class="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
              >
                <span>{{ selectedReceiptMethod === 'ALL' ? 'Todos los Métodos' : selectedReceiptMethod }}</span>
                <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-500"></mat-icon>
              </button>
              <mat-menu #methodMenu="matMenu">
                <button mat-menu-item (click)="setReceiptMethod('ALL')">Todos los Métodos</button>
                <button mat-menu-item (click)="setReceiptMethod('EFECTIVO')">Efectivo</button>
                <button mat-menu-item (click)="setReceiptMethod('TRANSFERENCIA')">Transferencia</button>
                <button mat-menu-item (click)="setReceiptMethod('CHEQUE')">Cheque</button>
                <button mat-menu-item (click)="setReceiptMethod('TARJETA')">Tarjeta</button>
                <button mat-menu-item (click)="setReceiptMethod('DEPOSITO')">Depósito</button>
              </mat-menu>

              <button
                (click)="loadReceipts()"
                matTooltip="Refrescar lista"
                class="w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                <mat-icon svgIcon="rotate-cw" class="icon-size-4"></mat-icon>
              </button>
            </div>
          </div>

          <!-- Receipts Table -->
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
            @if (isLoading()) {
              <app-table-skeleton [cells]="['80px', '140px', '80px', '70px', '90px', '90px', '60px']"></app-table-skeleton>
            } @else if (payments().length === 0) {
              <div class="py-12">
                <app-empty-state
                  illustration="18.svg"
                  [title]="'commercial.receivables.emptyReceiptsTitle' | transloco"
                  [description]="'commercial.receivables.emptyReceiptsSubtitle' | transloco"
                  [actionLabel]="'commercial.receivables.newReceipt' | transloco"
                  (actionClick)="openReceiptModal()"
                ></app-empty-state>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-neutral-50/75 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold border-b border-neutral-200 dark:border-neutral-800">
                    <tr>
                      <th class="py-3.5 px-4">No. Recibo</th>
                      <th class="py-3.5 px-4">Cliente</th>
                      <th class="py-3.5 px-3">Fecha de Cobro</th>
                      <th class="py-3.5 px-3">Método / Ref.</th>
                      <th class="py-3.5 px-3">Estado</th>
                      <th class="py-3.5 px-4 text-right">Monto Recibido</th>
                      <th class="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    @for (p of payments(); track p.id) {
                      <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <!-- No. Recibo -->
                        <td class="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                          {{ p.numeroRecibo || ('REC-' + p.id.substring(0, 8)) }}
                        </td>

                        <!-- Cliente -->
                        <td class="py-3.5 px-4">
                          <div class="font-bold text-neutral-900 dark:text-white line-clamp-1">
                            {{ p.cliente?.nombreRazonSocial || 'Cliente no asignado' }}
                          </div>
                          <div class="text-[11px] text-neutral-500 mt-0.5">
                            RNC: {{ p.cliente?.numeroDocumento || 'N/D' }}
                          </div>
                        </td>

                        <!-- Fecha -->
                        <td class="py-3.5 px-3 text-neutral-700 dark:text-neutral-300">
                          {{ p.fechaPago | date: 'dd/MM/yyyy hh:mm a' }}
                        </td>

                        <!-- Método -->
                        <td class="py-3.5 px-3">
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 uppercase">
                            {{ p.metodo }}
                          </span>
                          @if (p.referencia) {
                            <div class="text-[10px] text-neutral-400 mt-0.5">
                              Ref: {{ p.referencia }}
                            </div>
                          }
                        </td>

                        <!-- Estado -->
                        <td class="py-3.5 px-3">
                          <span
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                            [ngClass]="{
                              'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20':
                                p.estado === 'REGISTRADO',
                              'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20':
                                p.estado === 'ANULADO'
                            }"
                          >
                            {{ p.estado === 'REGISTRADO' ? 'Efectuado' : 'Anulado' }}
                          </span>
                        </td>

                        <!-- Monto Recibido -->
                        <td class="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          RD$ {{ p.monto | number: '1.2-2' }}
                        </td>

                        <!-- Acciones -->
                        <td class="py-3.5 px-4 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <!-- Ver Comprobante -->
                            <button
                              (click)="previewReceipt(p)"
                              matTooltip="Ver / Imprimir Recibo"
                              class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              <mat-icon svgIcon="eye" class="icon-size-4"></mat-icon>
                            </button>

                            <!-- Menú (Anular) -->
                            <button
                              [matMenuTriggerFor]="receiptItemMenu"
                              class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors cursor-pointer"
                            >
                              <mat-icon svgIcon="more-vertical" class="icon-size-4"></mat-icon>
                            </button>
                            <mat-menu #receiptItemMenu="matMenu" class="!rounded-xl !p-1">
                              @if (p.estado !== 'ANULADO') {
                                <button mat-menu-item (click)="cancelReceipt(p)">
                                  <mat-icon svgIcon="circle-x" class="text-rose-500"></mat-icon>
                                  <span class="text-rose-600 font-semibold">Anular Recibo</span>
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
        }
      </div>
    </div>
  `,
})
export class ReceivablesComponent implements OnInit {
  paymentsService = inject(CustomerPaymentsService);
  clientsService = inject(ClientsService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  transloco = inject(TranslocoService);

  activeTab: 'PENDING' | 'RECEIPTS' = 'PENDING';

  payments = this.paymentsService.payments;
  pendingInvoices = this.paymentsService.pendingInvoices;
  metrics = this.paymentsService.metrics;
  isLoading = this.paymentsService.isLoading;
  clients = this.clientsService.clients;

  searchPendingQuery = '';
  selectedPendingClientId = 'ALL';

  searchReceiptsQuery = '';
  selectedReceiptStatus = 'ALL';
  selectedReceiptMethod = 'ALL';

  private searchDebounceTimer?: any;

  ngOnInit() {
    this.clientsService.findAll().subscribe();
    this.refreshAll();
  }

  refreshAll() {
    this.paymentsService.getMetrics().subscribe();
    this.loadPendingInvoices();
    this.loadReceipts();
  }

  loadPendingInvoices() {
    this.paymentsService
      .getPendingInvoices(
        this.selectedPendingClientId !== 'ALL' ? this.selectedPendingClientId : undefined,
      )
      .subscribe();
  }

  loadReceipts() {
    const filter: FilterCustomerPaymentsDto = {
      search: this.searchReceiptsQuery.trim() || undefined,
      estado: this.selectedReceiptStatus !== 'ALL' ? this.selectedReceiptStatus : undefined,
      metodo: this.selectedReceiptMethod !== 'ALL' ? this.selectedReceiptMethod : undefined,
    };
    this.paymentsService.findAll(filter).subscribe();
  }

  filteredPendingInvoices(): PendingInvoice[] {
    const q = this.searchPendingQuery.trim().toLowerCase();
    if (!q) return this.pendingInvoices();
    return this.pendingInvoices().filter((inv) => {
      const numMatch = inv.numeroFactura.toLowerCase().includes(q);
      const ncfMatch = inv.ncf ? inv.ncf.toLowerCase().includes(q) : false;
      const clientMatch = inv.cliente
        ? inv.cliente.nombreRazonSocial.toLowerCase().includes(q) ||
          (inv.cliente.numeroDocumento && inv.cliente.numeroDocumento.includes(q))
        : false;
      return numMatch || ncfMatch || clientMatch;
    });
  }

  setPendingClient(clienteId: string) {
    this.selectedPendingClientId = clienteId;
    this.loadPendingInvoices();
  }

  getPendingClientLabel(): string {
    if (this.selectedPendingClientId === 'ALL') return 'Todos los Clientes';
    const c = this.clients().find((cl) => cl.id === this.selectedPendingClientId);
    return c ? c.nombreRazonSocial : 'Cliente';
  }

  onSearchReceiptsInput(event: any) {
    this.searchReceiptsQuery = event.target.value;
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.loadReceipts();
    }, 300);
  }

  setReceiptStatus(status: string) {
    this.selectedReceiptStatus = status;
    this.loadReceipts();
  }

  setReceiptMethod(method: string) {
    this.selectedReceiptMethod = method;
    this.loadReceipts();
  }

  openReceiptModal(clienteId?: string, facturaId?: string) {
    const dialogRef = this.dialog.open(PaymentReceiptDialogComponent, {
      width: '100%',
      maxWidth: '52rem',
      data: { clienteId, facturaId },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.paymentsService.create(res).subscribe({
          next: (created) => {
            this.snackBar.open('Recibo de cobro registrado exitosamente', 'OK', {
              duration: 3000,
            });
            this.refreshAll();
            if (created) {
              this.previewReceipt(created);
            }
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || 'Error al registrar el cobro',
              'Cerrar',
              { duration: 4500 },
            );
          },
        });
      }
    });
  }

  previewReceipt(payment: PagoCliente) {
    this.dialog.open(PaymentReceiptPreviewComponent, {
      width: '100%',
      maxWidth: '44rem',
      data: { payment },
    });
  }

  cancelReceipt(payment: PagoCliente) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Anular Recibo de Cobro',
        message: `¿Estás seguro de anular el recibo ${payment.numeroRecibo || payment.id}? Los saldos de las facturas saldadas serán restituidos como cuentas por cobrar pendientes.`,
        confirmLabel: 'Anular Recibo',
        cancelLabel: 'Volver',
        destructive: true,
      } satisfies ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.paymentsService.cancel(payment.id).subscribe({
          next: () => {
            this.snackBar.open('Recibo anulado y saldos restituidos en CxC', 'OK', {
              duration: 3000,
            });
            this.refreshAll();
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || 'Error al anular recibo',
              'Cerrar',
              { duration: 4000 },
            );
          },
        });
      }
    });
  }
}
