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
  CustomerPaymentsService,
  PagoCliente,
  PendingInvoice,
  FilterCustomerPaymentsDto,
} from '../../data/customer-payments.service';
import { ClientsService } from '../../data/clients';
import { PaymentReceiptDialogComponent } from './payment-receipt-dialog.component';
import { PaymentReceiptPreviewComponent } from './payment-receipt-preview.component';
import { CurrencyConfigService } from '@core/currency/currency-config.service';

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
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">
      <!-- Standard Clean Page Header -->
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <div>
          <div
            class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'commercial.receivables.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'commercial.receivables.subtitle' | transloco }}
          </p>
        </div>

        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4 gap-3">
          <button
            mat-flat-button
            (click)="openReceiptModal()"
            class="!rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
            {{ 'commercial.receivables.newReceipt' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Body -->
      <div class="flex min-h-0 flex-auto flex-col overflow-y-auto">
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 md:px-8 lg:grid-cols-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
          <app-stat-card
            [title]="'commercial.receivables.stats.totalCxC' | transloco"
            [subtitle]="metrics().facturasPendientesCount + ' facturas con saldo pendiente'"
            [prefix]="currencyConfig.currencySymbol() + ' '"
            [value]="metrics().totalPorCobrar || 0"
            icon="clock"
            curvePreset="asc-sigmoid"
            color="amber"
            (refresh)="refreshAll()"
          />

          <app-stat-card
            [title]="'commercial.receivables.stats.overdueCxC' | transloco"
            [subtitle]="metrics().facturasVencidasCount + ' facturas vencidas en mora'"
            [prefix]="currencyConfig.currencySymbol() + ' '"
            [value]="metrics().totalVencido || 0"
            icon="alert-circle"
            curvePreset="trough-wave"
            color="rose"
            (refresh)="refreshAll()"
          />

          <app-stat-card
            [title]="'commercial.receivables.stats.monthCollected' | transloco"
            [subtitle]="metrics().cobrosMesCount + ' cobros efectuados este mes'"
            [prefix]="currencyConfig.currencySymbol() + ' '"
            [value]="metrics().cobradoMes || 0"
            icon="check-circle-2"
            curvePreset="peak-wave"
            color="emerald"
            (refresh)="refreshAll()"
          />

          <app-stat-card
            [title]="'commercial.receivables.stats.clientsWithBalance' | transloco"
            [subtitle]="'commercial.receivables.stats.activeCreditClients' | transloco"
            [value]="metrics().clientesConSaldoCount"
            icon="users"
            curvePreset="s-curve"
            color="blue"
            (refresh)="refreshAll()"
          />
        </div>

        <!-- View Switcher Tabs & Filter Bar -->
        <div
          class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <!-- Left: Tab buttons -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="activeTab = 'PENDING'"
              class="px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
              [ngClass]="{
                'bg-blue-600 text-white shadow-xs': activeTab === 'PENDING',
                'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700': activeTab !== 'PENDING'
              }"
            >
              <span>{{ 'commercial.receivables.tabs.pending' | transloco }}</span>
              <span
                class="px-2 py-0.5 rounded-full text-[10px]"
                [ngClass]="activeTab === 'PENDING' ? 'bg-blue-700 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'"
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
                'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700': activeTab !== 'RECEIPTS'
              }"
            >
              <span>{{ 'commercial.receivables.tabs.receipts' | transloco }}</span>
              <span
                class="px-2 py-0.5 rounded-full text-[10px]"
                [ngClass]="activeTab === 'RECEIPTS' ? 'bg-blue-700 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'"
              >
                {{ payments().length }}
              </span>
            </button>
          </div>

          <!-- Right: Search & Filters -->
          @if (activeTab === 'PENDING') {
            <div class="flex flex-1 sm:flex-initial items-center gap-3">
              <div class="relative w-full sm:w-72">
                <mat-icon svgIcon="search" class="icon-size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"></mat-icon>
                <input
                  type="text"
                  [placeholder]="'commercial.receivables.searchPendingPlaceholder' | transloco"
                  [(ngModel)]="searchPendingQuery"
                  class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
                />
              </div>

              <!-- Cliente Filter -->
              <button
                [matMenuTriggerFor]="clientMenu"
                type="button"
                class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50 max-w-[200px]"
              >
                <mat-icon svgIcon="users" class="icon-size-4 text-neutral-500"></mat-icon>
                <span class="truncate">{{ getPendingClientLabel() | transloco }}</span>
              </button>
              <mat-menu #clientMenu="matMenu">
                <button mat-menu-item (click)="setPendingClient('ALL')">{{ 'commercial.receivables.filters.allClients' | transloco }}</button>
                @for (c of clients(); track c.id) {
                  <button mat-menu-item (click)="setPendingClient(c.id)">{{ c.nombreRazonSocial }}</button>
                }
              </mat-menu>

              <button
                (click)="loadPendingInvoices()"
                [matTooltip]="'common.refreshList' | transloco"
                class="w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                <mat-icon svgIcon="rotate-cw" class="icon-size-4"></mat-icon>
              </button>
            </div>
          } @else {
            <div class="flex flex-1 sm:flex-initial flex-wrap items-center gap-3">
              <div class="relative w-full sm:w-64">
                <mat-icon svgIcon="search" class="icon-size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"></mat-icon>
                <input
                  type="text"
                  [placeholder]="'commercial.receivables.searchReceiptsPlaceholder' | transloco"
                  [value]="searchReceiptsQuery"
                  (input)="onSearchReceiptsInput($event)"
                  class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
                />
              </div>

              <!-- Estado Filter -->
              <button
                [matMenuTriggerFor]="statusMenu"
                type="button"
                class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
              >
                <mat-icon svgIcon="sliders-horizontal" class="icon-size-4 text-neutral-500"></mat-icon>
                <span>{{ (selectedReceiptStatus === 'ALL' ? 'commercial.receivables.filters.allStatuses' : (selectedReceiptStatus === 'REGISTRADO' ? 'commercial.receivables.filters.paid' : 'commercial.receivables.filters.cancelled')) | transloco }}</span>
              </button>
              <mat-menu #statusMenu="matMenu">
                <button mat-menu-item (click)="setReceiptStatus('ALL')">{{ 'commercial.receivables.filters.allStatuses' | transloco }}</button>
                <button mat-menu-item (click)="setReceiptStatus('REGISTRADO')">{{ 'commercial.receivables.filters.paid' | transloco }}</button>
                <button mat-menu-item (click)="setReceiptStatus('ANULADO')">{{ 'commercial.receivables.filters.cancelled' | transloco }}</button>
              </mat-menu>

              <!-- Método Filter -->
              <button
                [matMenuTriggerFor]="methodMenu"
                type="button"
                class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
              >
                <mat-icon svgIcon="credit-card" class="icon-size-4 text-neutral-500"></mat-icon>
                <span>{{ (selectedReceiptMethod === 'ALL' ? 'commercial.receivables.filters.allMethods' : selectedReceiptMethod) | transloco }}</span>
              </button>
              <mat-menu #methodMenu="matMenu">
                <button mat-menu-item (click)="setReceiptMethod('ALL')">{{ 'commercial.receivables.filters.allMethods' | transloco }}</button>
                <button mat-menu-item (click)="setReceiptMethod('EFECTIVO')">{{ 'reports.tables.cash' | transloco }}</button>
                <button mat-menu-item (click)="setReceiptMethod('TRANSFERENCIA')">{{ 'common.methods.transfer' | transloco }}</button>
                <button mat-menu-item (click)="setReceiptMethod('CHEQUE')">{{ 'common.methods.cheque' | transloco }}</button>
                <button mat-menu-item (click)="setReceiptMethod('TARJETA')">{{ 'reports.tables.card' | transloco }}</button>
                <button mat-menu-item (click)="setReceiptMethod('DEPOSITO')">{{ 'common.methods.deposit' | transloco }}</button>
              </mat-menu>

              <button
                (click)="loadReceipts()"
                matTooltip="Refrescar lista"
                class="w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                <mat-icon svgIcon="rotate-cw" class="icon-size-4"></mat-icon>
              </button>
            </div>
          }
        </div>

        <!-- TAB 1: FACTURAS PENDIENTES (CxC) -->
        @if (activeTab === 'PENDING') {
          <div class="grid">
            <div
              class="receivables-pending-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
            >
              <div>{{ 'commercial.receivables.table.invoiceNcf' | transloco }}</div>
              <div>{{ 'commercial.receivables.table.client' | transloco }}</div>
              <div class="hidden sm:block">{{ 'commercial.receivables.table.dates' | transloco }}</div>
              <div class="hidden md:block">{{ 'commercial.receivables.table.delinquency' | transloco }}</div>
              <div class="text-right">{{ 'commercial.receivables.table.invoiceTotal' | transloco }}</div>
              <div class="text-right">{{ 'commercial.receivables.table.balanceDue' | transloco }}</div>
              <div class="text-right">{{ 'commercial.receivables.table.action' | transloco }}</div>
            </div>

            @if (isLoading()) {
              <app-table-skeleton [gridClass]="'receivables-pending-grid'" [rows]="6" />
            } @else if (filteredPendingInvoices().length === 0) {
              <div class="flex flex-auto justify-center p-6 sm:p-10">
                <app-empty-state
                  [title]="'commercial.receivables.emptyPendingTitle' | transloco"
                  [description]="'commercial.receivables.emptyPendingSubtitle' | transloco"
                />
              </div>
            } @else {
              @for (inv of filteredPendingInvoices(); track inv.id) {
                <div
                  class="receivables-pending-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
                >
                  <!-- No. Factura / NCF -->
                  <div class="flex flex-col min-w-0">
                    <span class="font-bold text-neutral-900 dark:text-white truncate">
                      {{ inv.numeroFactura }}
                    </span>
                    @if (inv.ncf) {
                      <span class="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        {{ inv.ncf }}
                      </span>
                    }
                  </div>

                  <!-- Cliente -->
                  <div class="flex flex-col min-w-0">
                    <span class="font-bold text-neutral-900 dark:text-white line-clamp-1">
                      {{ inv.cliente?.nombreRazonSocial || 'Cliente General' }}
                    </span>
                    <span class="text-xs text-neutral-400 mt-0.5 font-mono">
                      RNC: {{ inv.cliente?.numeroDocumento || 'N/D' }}
                    </span>
                  </div>

                  <!-- Fechas -->
                  <div class="hidden sm:flex flex-col font-mono text-xs">
                    <span class="text-neutral-800 dark:text-neutral-200">{{ inv.fecha | date: 'dd/MM/yyyy' }}</span>
                    @if (inv.fechaVencimiento) {
                      <span class="text-neutral-400 text-[11px] mt-0.5">
                        Vence: {{ inv.fechaVencimiento | date: 'dd/MM/yyyy' }}
                      </span>
                    }
                  </div>

                  <!-- Estado Mora -->
                  <div class="hidden md:block">
                    @if (inv.enMora) {
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20">
                        Mora ({{ inv.diasVencido }}d)
                      </span>
                    } @else {
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
                        Al Día
                      </span>
                    }
                  </div>

                  <!-- Total Factura -->
                  <div class="text-right font-mono font-medium text-neutral-700 dark:text-neutral-300">
                    {{ getInvoiceCurrencySymbol(inv) }} {{ inv.total | number: '1.2-2' }}
                  </div>

                  <!-- Balance Adeudado -->
                  <div class="text-right font-mono font-extrabold text-amber-600 dark:text-amber-400">
                    {{ getInvoiceCurrencySymbol(inv) }} {{ inv.balancePendiente | number: '1.2-2' }}
                  </div>

                  <!-- Acción Cobrar -->
                  <div class="flex items-center justify-end">
                    <button
                      (click)="openReceiptModal(inv.clienteId || undefined, inv.id)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <mat-icon svgIcon="credit-card" class="icon-size-3.5"></mat-icon>
                      <span>{{ 'commercial.receivables.collect' | transloco }}</span>
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        }

        <!-- TAB 2: HISTORIAL DE RECIBOS DE INGRESO -->
        @if (activeTab === 'RECEIPTS') {
          <div class="grid">
            <div
              class="receivables-receipts-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
            >
              <div>{{ 'commercial.receivables.table.receiptNumber' | transloco }}</div>
              <div>{{ 'commercial.receivables.table.client' | transloco }}</div>
              <div class="hidden sm:block">{{ 'commercial.receivables.table.paymentDate' | transloco }}</div>
              <div class="hidden md:block">{{ 'commercial.receivables.table.methodRef' | transloco }}</div>
              <div>{{ 'commercial.receivables.table.status' | transloco }}</div>
              <div class="text-right">{{ 'commercial.receivables.table.amountReceived' | transloco }}</div>
              <div class="text-right">{{ 'commercial.receivables.table.actions' | transloco }}</div>
            </div>

            @if (isLoading()) {
              <app-table-skeleton [gridClass]="'receivables-receipts-grid'" [rows]="6" />
            } @else if (payments().length === 0) {
              <div class="flex flex-auto justify-center p-6 sm:p-10">
                <app-empty-state
                  [title]="'commercial.receivables.emptyReceiptsTitle' | transloco"
                  [description]="'commercial.receivables.emptyReceiptsSubtitle' | transloco"
                  [actionLabel]="'commercial.receivables.newReceipt' | transloco"
                  actionIcon="plus"
                  (action)="openReceiptModal()"
                />
              </div>
            } @else {
              @for (p of payments(); track p.id) {
                <div
                  class="receivables-receipts-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
                >
                  <!-- No. Recibo -->
                  <div class="font-mono font-bold text-neutral-900 dark:text-white">
                    {{ p.numeroRecibo || ('REC-' + p.id.substring(0, 8)) }}
                  </div>

                  <!-- Cliente -->
                  <div class="flex flex-col min-w-0">
                    <span class="font-bold text-neutral-900 dark:text-white line-clamp-1">
                      {{ p.cliente?.nombreRazonSocial || 'Cliente no asignado' }}
                    </span>
                    <span class="text-xs text-neutral-400 mt-0.5 font-mono">
                      RNC: {{ p.cliente?.numeroDocumento || 'N/D' }}
                    </span>
                  </div>

                  <!-- Fecha -->
                  <div class="hidden sm:flex flex-col font-mono text-xs text-neutral-700 dark:text-neutral-300">
                    {{ p.fechaPago | date: 'dd/MM/yyyy hh:mm a' }}
                  </div>

                  <!-- Método -->
                  <div class="hidden md:flex flex-col">
                    <span class="inline-flex items-center w-fit px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50 uppercase">
                      {{ p.metodo }}
                    </span>
                    @if (p.referencia) {
                      <span class="text-[10px] text-neutral-400 mt-0.5">
                        Ref: {{ p.referencia }}
                      </span>
                    }
                  </div>

                  <!-- Estado -->
                  <div>
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20':
                          p.estado === 'REGISTRADO',
                        'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20':
                          p.estado === 'ANULADO'
                      }"
                    >
                      {{ p.estado === 'REGISTRADO' ? 'Efectuado' : 'Anulado' }}
                    </span>
                  </div>

                  <!-- Monto Recibido -->
                  <div class="text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    {{ currencyConfig.currencySymbol() }} {{ p.monto | number: '1.2-2' }}
                  </div>

                  <!-- Acciones -->
                  <div class="flex items-center justify-end gap-1">
                    <!-- Ver Comprobante -->
                    <button
                      mat-icon-button
                      (click)="previewReceipt(p)"
                      matTooltip="Ver Recibo"
                      class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    >
                      <mat-icon svgIcon="eye" class="icon-size-4.5"></mat-icon>
                    </button>

                    <!-- Menú (Anular) -->
                    <button
                      mat-icon-button
                      [matMenuTriggerFor]="receiptItemMenu"
                      class="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                    >
                      <mat-icon svgIcon="ellipsis-vertical" class="icon-size-4.5"></mat-icon>
                    </button>
                    <mat-menu #receiptItemMenu="matMenu" class="!rounded-xl !p-1">
                      <button mat-menu-item (click)="previewReceipt(p)">
                        <mat-icon svgIcon="eye" class="icon-size-4"></mat-icon>
                        <span>Ver Recibo de Ingreso</span>
                      </button>
                      @if (p.estado !== 'ANULADO') {
                        <button mat-menu-item (click)="cancelReceipt(p)" class="!text-rose-600">
                          <mat-icon svgIcon="trash" class="icon-size-4 text-rose-600"></mat-icon>
                          <span class="text-rose-600">Anular Recibo</span>
                        </button>
                      }
                    </mat-menu>
                  </div>
                </div>
              }
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .receivables-pending-grid {
      grid-template-columns: minmax(130px, 1.2fr) minmax(180px, 2fr) minmax(110px, 1fr) minmax(100px, 0.9fr) minmax(110px, 1.1fr) minmax(120px, 1.2fr) minmax(100px, 0.9fr);
    }
    @media (max-width: 1024px) {
      .receivables-pending-grid {
        grid-template-columns: minmax(130px, 1.2fr) minmax(160px, 2fr) minmax(110px, 1fr) minmax(90px, 0.9fr) minmax(110px, 1.1fr) minmax(90px, 0.8fr);
      }
    }
    @media (max-width: 768px) {
      .receivables-pending-grid {
        grid-template-columns: minmax(120px, 1.2fr) minmax(150px, 2fr) minmax(100px, 1.1fr) minmax(110px, 1.2fr) minmax(90px, 0.8fr);
      }
    }
    @media (max-width: 640px) {
      .receivables-pending-grid {
        grid-template-columns: minmax(120px, 1.5fr) minmax(140px, 2fr) minmax(100px, 1.1fr) minmax(80px, 0.8fr);
      }
    }

    .receivables-receipts-grid {
      grid-template-columns: minmax(130px, 1.2fr) minmax(180px, 2fr) minmax(130px, 1.2fr) minmax(120px, 1fr) minmax(100px, 0.9fr) minmax(120px, 1.2fr) minmax(90px, 0.8fr);
    }
    @media (max-width: 1024px) {
      .receivables-receipts-grid {
        grid-template-columns: minmax(130px, 1.2fr) minmax(160px, 2fr) minmax(120px, 1.2fr) minmax(100px, 0.9fr) minmax(110px, 1.1fr) minmax(80px, 0.8fr);
      }
    }
    @media (max-width: 768px) {
      .receivables-receipts-grid {
        grid-template-columns: minmax(120px, 1.2fr) minmax(150px, 2fr) minmax(100px, 0.9fr) minmax(100px, 1.1fr) minmax(80px, 0.8fr);
      }
    }
    @media (max-width: 640px) {
      .receivables-receipts-grid {
        grid-template-columns: minmax(120px, 1.5fr) minmax(140px, 2fr) minmax(100px, 1.1fr) minmax(70px, 0.8fr);
      }
    }
  `],
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
  currencyConfig = inject(CurrencyConfigService);

  getInvoiceCurrencySymbol(inv?: any): string {
    const c = inv?.moneda || this.currencyConfig.currency();
    return c === 'USD' ? 'USD $' : c === 'EUR' ? '€' : 'RD$';
  }

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
    if (this.selectedPendingClientId === 'ALL') return 'commercial.receivables.filters.allClients';
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
