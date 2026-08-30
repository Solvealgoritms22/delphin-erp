import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ReportsService,
  SalesReportResponse,
  TopProductsReportResponse,
  ReceivablesReportResponse,
  InventoryReportResponse,
  SalesByClientResponse,
  Report606Response,
  Report607Response,
  Report608Response,
  ReportIt1Response,
} from './data/reports.service';

import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { AuthState } from '@core/auth/auth.state';

export type ReportTab =
  | 'sales'
  | 'top-products'
  | 'receivables'
  | 'inventory'
  | 'clients'
  | 'tax-dgii';

@Component({
  selector: 'app-reports',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSnackBarModule,
    TranslocoPipe,
    StatCardComponent,
    DecimalPipe,
    NgApexchartsModule,
  ],
  template: `
    <div class="no-print flex flex-col flex-auto min-w-0 h-full overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">

      <!-- Header -->
      <div
        class="relative flex flex-0 shrink-0 flex-col border-b border-neutral-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            {{ 'reports.title' | transloco }}
          </h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'reports.subtitle' | transloco }}
          </p>
        </div>

        <!-- Global Action Buttons -->
        <div class="mt-4 flex flex-wrap items-center gap-2 sm:mt-0">
          <button
            (click)="exportCurrentReportCsv()"
            class="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-700 shadow-xs transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
          >
            <mat-icon svgIcon="download" class="icon-size-4"></mat-icon>
            {{ 'reports.exportCsv' | transloco }}
          </button>
          <button
            (click)="printReport()"
            class="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700"
          >
            <mat-icon svgIcon="printer" class="icon-size-4"></mat-icon>
            {{ 'reports.printPdf' | transloco }}
          </button>
        </div>
      </div>

      <!-- Navigation Tabs & Date Filter Bar -->
      <div class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white px-6 py-3 md:px-8 dark:border-neutral-800 dark:bg-neutral-900">
        <!-- Navigation Tabs -->
        <div class="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            *ngFor="let tab of tabs"
            (click)="setTab(tab.key)"
            class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            [class]="activeTab() === tab.key
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'"
          >
            <mat-icon [svgIcon]="tab.icon" class="icon-size-4"></mat-icon>
            {{ tab.label | transloco }}
          </button>
        </div>

        <!-- Date Range Controls (for time-sensitive tabs) -->
        <div *ngIf="activeTab() !== 'inventory' && activeTab() !== 'receivables' && activeTab() !== 'tax-dgii'" class="flex items-center gap-2">
          <button
            type="button"
            [matMenuTriggerFor]="datePresetMenu"
            class="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors shadow-2xs cursor-pointer"
          >
            <mat-icon svgIcon="calendar" class="!h-4 !w-4 !text-[16px] text-neutral-400"></mat-icon>
            <span>{{ getPresetLabel(selectedDatePreset) | transloco }}</span>
            <mat-icon svgIcon="chevron-down" class="!h-3.5 !w-3.5 !text-[14px] text-neutral-400"></mat-icon>
          </button>
          <mat-menu #datePresetMenu="matMenu">
            @for (preset of datePresets; track preset.value) {
              <button
                mat-menu-item
                (click)="onPresetChange(preset.value)"
                class="flex items-center justify-between !h-10 text-xs"
                [class.font-bold]="preset.value === selectedDatePreset"
              >
                <span>{{ preset.label | transloco }}</span>
                @if (preset.value === selectedDatePreset) {
                  <mat-icon svgIcon="check" class="!h-4 !w-4 !text-[16px] text-blue-600 dark:text-blue-400 ml-4"></mat-icon>
                }
              </button>
            }
          </mat-menu>

          <div *ngIf="selectedDatePreset === 'custom'" class="flex items-center gap-1.5 animate-fadeIn">
            <input
              type="date"
              [(ngModel)]="dateFrom"
              class="h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium text-neutral-800 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <span class="text-xs text-neutral-400 font-semibold">-</span>
            <input
              type="date"
              [(ngModel)]="dateTo"
              class="h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium text-neutral-800 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <button
              type="button"
              (click)="loadActiveReport()"
              class="h-9 rounded-xl bg-blue-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-auto min-h-0 overflow-y-auto p-6 md:p-8">

        <!-- Loading Skeleton -->
        <div *ngIf="reportsService.loading()" class="flex flex-col gap-6 animate-pulse select-none" aria-hidden="true">
          <!-- 4 Metric Cards Skeleton -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="h-44 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800"></div>
            }
          </div>

          <!-- Main Chart / Table Card Skeleton -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="lg:col-span-2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <div class="flex items-center justify-between mb-6">
                <div class="h-4 w-36 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                <div class="h-3 w-16 rounded bg-neutral-100 dark:bg-neutral-800"></div>
              </div>
              <div class="h-64 flex items-end gap-3 pt-6 pb-2">
                @for (h of [40, 65, 30, 85, 50, 90, 70, 45, 60, 80, 55, 75]; track $index) {
                  <div class="flex-1 rounded-t-lg bg-neutral-200 dark:bg-neutral-800" [style.height.%]="h"></div>
                }
              </div>
            </div>

            <!-- Side Breakdown Card Skeleton -->
            <div class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <div class="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-800 mb-6"></div>
              <div class="flex flex-col gap-5">
                @for (i of [1, 2, 3, 4]; track i) {
                  <div class="flex flex-col gap-2">
                    <div class="flex justify-between">
                      <div class="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                      <div class="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                    </div>
                    <div class="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="!reportsService.loading()">

          <!-- ================= TAB 1: VENTAS ================= -->
          <div *ngIf="activeTab() === 'sales'" class="flex flex-col gap-6">

            <!-- Summary KPI Cards -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <app-stat-card
                [title]="'reports.sales.totalRevenue' | transloco"
                [subtitle]="(salesData().summary.totalFacturas || 0) + ' ' + ('reports.sales.invoicesCount' | transloco)"
                prefix="RD$ "
                [value]="((salesData().summary.totalVentas || 0) | number:'1.2-2') || '0.00'"
                icon="dollar-sign"
                curvePreset="asc-sigmoid"
                color="blue"
                (refresh)="loadActiveReport()"
              />

              <app-stat-card
                [title]="'reports.sales.itbisCollected' | transloco"
                [subtitle]="'reports.sales.taxDeducted' | transloco"
                prefix="RD$ "
                [value]="((salesData().summary.totalItbis || 0) | number:'1.2-2') || '0.00'"
                icon="percent"
                curvePreset="peak-wave"
                color="emerald"
                (refresh)="loadActiveReport()"
              />

              <app-stat-card
                [title]="'reports.sales.avgTicket' | transloco"
                [subtitle]="'reports.sales.perInvoice' | transloco"
                prefix="RD$ "
                [value]="((salesData().summary.promedioTicket || 0) | number:'1.2-2') || '0.00'"
                icon="shopping-cart"
                curvePreset="s-curve"
                color="purple"
                (refresh)="loadActiveReport()"
              />

              <app-stat-card
                [title]="'reports.sales.discounts' | transloco"
                [subtitle]="'reports.sales.discountsGiven' | transloco"
                prefix="RD$ "
                [value]="((salesData().summary.totalDescuento || 0) | number:'1.2-2') || '0.00'"
                icon="tag"
                curvePreset="trough-wave"
                color="amber"
                (refresh)="loadActiveReport()"
              />
            </div>

            <!-- Time-Series Chart & Payment Methods Breakdown -->
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">

              <!-- Sales Timeline Chart -->
              <div class="lg:col-span-2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <h3 class="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center justify-between">
                  <span>{{ 'reports.sales.timeline' | transloco }}</span>
                  <span class="text-xs font-normal text-neutral-400">{{ salesData().timeSeries.length || 0 }} {{ 'reports.sales.dataPoints' | transloco }}</span>
                </h3>

                <div *ngIf="salesData().timeSeries.length === 0" class="flex flex-col items-center justify-center py-10 px-4 text-center min-h-[220px]">
                  <img
                    class="max-h-[110px] w-auto select-none pointer-events-none drop-shadow-2xs mb-3 opacity-90"
                    src="illustrations/20.svg"
                    alt="Sin ventas"
                  />
                  <div class="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    Sin ventas en este período
                  </div>
                  <p class="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
                    No se encontraron transacciones en el rango de fechas seleccionado.
                  </p>
                </div>

                <!-- ApexChart Smooth Area Timeline -->
                <div *ngIf="salesData().timeSeries.length > 0" class="w-full h-64 -ml-2">
                  <apx-chart
                    [series]="salesChartOptions().series"
                    [chart]="salesChartOptions().chart"
                    [colors]="salesChartOptions().colors"
                    [stroke]="salesChartOptions().stroke"
                    [fill]="salesChartOptions().fill"
                    [grid]="salesChartOptions().grid"
                    [xaxis]="salesChartOptions().xaxis"
                    [yaxis]="salesChartOptions().yaxis"
                    [tooltip]="salesChartOptions().tooltip"
                    [dataLabels]="salesChartOptions().dataLabels"
                    [markers]="salesChartOptions().markers"
                  ></apx-chart>
                </div>
              </div>

              <!-- Payment Methods Breakdown -->
              <div class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <h3 class="text-base font-bold text-neutral-900 dark:text-white mb-4">
                  {{ 'reports.sales.byPaymentMethod' | transloco }}
                </h3>

                <div *ngIf="salesData().paymentMethods.length === 0" class="flex flex-col items-center justify-center py-10 px-4 text-center min-h-[220px]">
                  <img
                    class="max-h-[110px] w-auto select-none pointer-events-none drop-shadow-2xs mb-3 opacity-90"
                    src="illustrations/24.svg"
                    alt="Sin métodos de pago"
                  />
                  <div class="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    Sin transacciones registradas
                  </div>
                  <p class="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
                    No hay métodos de pago registrados en el período actual.
                  </p>
                </div>

                <div *ngIf="salesData().paymentMethods.length > 0" class="flex flex-col gap-4">
                  <div *ngFor="let pm of salesData().paymentMethods" class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between text-xs font-bold">
                      <span class="text-neutral-700 dark:text-neutral-300">{{ pm.metodo }}</span>
                      <span class="text-neutral-900 dark:text-white">RD$ {{ pm.total | number:'1.2-2' }}</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        class="h-full rounded-full bg-blue-600"
                        [style.width.%]="salesData().summary.totalVentas ? (pm.total / salesData().summary.totalVentas) * 100 : 0"
                      ></div>
                    </div>
                    <span class="text-[10px] text-neutral-400 text-right">{{ pm.count }} transacciones</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          <!-- ================= TAB 2: TOP PRODUCTOS ================= -->
          <div *ngIf="activeTab() === 'top-products'" class="flex flex-col gap-6">

            <div class="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
              <div class="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
                  {{ 'reports.topProducts.ranking' | transloco }}
                </h3>
                <span class="text-xs text-neutral-500">{{ topProductsData().topProducts.length || 0 }} productos analizados</span>
              </div>

              <div *ngIf="topProductsData().topProducts.length === 0" class="flex flex-col items-center justify-center py-16 px-6 text-center">
                <img
                  class="max-h-[130px] w-auto select-none pointer-events-none drop-shadow-2xs mb-4"
                  src="illustrations/4.svg"
                  alt="Sin productos"
                />
                <div class="text-base font-bold text-neutral-800 dark:text-neutral-200">
                  Sin productos vendidos
                </div>
                <p class="mt-1.5 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                  No se registran ventas de artículos ni servicios para las fechas seleccionadas.
                </p>
              </div>

              <div *ngIf="topProductsData().topProducts.length > 0" class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                    <tr>
                      <th class="py-3 px-6">#</th>
                      <th class="py-3 px-6">{{ 'common.code' | transloco }}</th>
                      <th class="py-3 px-6">{{ 'common.name' | transloco }}</th>
                      <th class="py-3 px-6">{{ 'common.category' | transloco }}</th>
                      <th class="py-3 px-6 text-right">{{ 'reports.topProducts.unitsSold' | transloco }}</th>
                      <th class="py-3 px-6 text-right">{{ 'reports.topProducts.totalRevenue' | transloco }}</th>
                      <th class="py-3 px-6 text-right">{{ 'reports.topProducts.estimatedMargin' | transloco }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <tr *ngFor="let p of topProductsData().topProducts; let i = index" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td class="py-4 px-6 font-bold text-neutral-400">{{ i + 1 }}</td>
                      <td class="py-4 px-6 font-mono font-semibold text-neutral-600 dark:text-neutral-300">{{ p.codigo }}</td>
                      <td class="py-4 px-6 font-bold text-neutral-900 dark:text-white">{{ p.nombre }}</td>
                      <td class="py-4 px-6 text-neutral-500">{{ p.categoria }}</td>
                      <td class="py-4 px-6 text-right font-bold text-blue-600 dark:text-blue-400">{{ p.cantidadVendida | number }}</td>
                      <td class="py-4 px-6 text-right font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ p.totalIngresos | number:'1.2-2' }}</td>
                      <td class="py-4 px-6 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">RD$ {{ p.margenEstimado | number:'1.2-2' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- ================= TAB 3: CUENTAS POR COBRAR ================= -->
          <div *ngIf="activeTab() === 'receivables'" class="flex flex-col gap-6">

            <!-- Aging Summary Cards -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <app-stat-card
                title="0 - 30 Días"
                subtitle="Corriente al día"
                prefix="RD$ "
                [value]="((receivablesData().summary.aging.corriente || 0) | number:'1.2-2') || '0.00'"
                icon="calendar"
                curvePreset="asc-sigmoid"
                color="emerald"
                (refresh)="loadActiveReport()"
              />

              <app-stat-card
                title="31 - 60 Días"
                subtitle="Vencimiento reciente"
                prefix="RD$ "
                [value]="((receivablesData().summary.aging.de31a60 || 0) | number:'1.2-2') || '0.00'"
                icon="clock"
                curvePreset="peak-wave"
                color="amber"
                (refresh)="loadActiveReport()"
              />

              <app-stat-card
                title="61 - 90 Días"
                subtitle="Mora intermedia"
                prefix="RD$ "
                [value]="((receivablesData().summary.aging.de61a90 || 0) | number:'1.2-2') || '0.00'"
                icon="alert-circle"
                curvePreset="s-curve"
                color="rose"
                (refresh)="loadActiveReport()"
              />

              <app-stat-card
                title="Más de 90 Días"
                subtitle="Mora crítica"
                prefix="RD$ "
                [value]="((receivablesData().summary.aging.masDe90 || 0) | number:'1.2-2') || '0.00'"
                icon="alert-triangle"
                curvePreset="trough-wave"
                color="rose"
                (refresh)="loadActiveReport()"
              />
            </div>

            <!-- Debtor Ranking -->
            <div class="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
              <div class="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
                  {{ 'reports.receivables.debtorClients' | transloco }}
                </h3>
                <span class="text-xs font-bold text-rose-600">
                  Total Pendiente: RD$ {{ (receivablesData().summary.totalPendiente || 0) | number:'1.2-2' }}
                </span>
              </div>

              <div *ngIf="receivablesData().topDebtors.length === 0" class="flex flex-col items-center justify-center py-16 px-6 text-center">
                <img
                  class="max-h-[130px] w-auto select-none pointer-events-none drop-shadow-2xs mb-4"
                  src="illustrations/28.svg"
                  alt="Cartera al día"
                />
                <div class="text-base font-bold text-emerald-700 dark:text-emerald-400">
                  ¡Cartera 100% al día!
                </div>
                <p class="mt-1.5 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                  No hay clientes con facturas vencidas ni balances pendientes de cobro.
                </p>
              </div>

              <div *ngIf="receivablesData().topDebtors.length > 0" class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                    <tr>
                      <th class="py-3 px-6">Cliente</th>
                      <th class="py-3 px-6">RNC / Cédula</th>
                      <th class="py-3 px-6">Contacto</th>
                      <th class="py-3 px-6 text-center">Facturas Pendientes</th>
                      <th class="py-3 px-6 text-right">Saldo Pendiente</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <tr *ngFor="let d of receivablesData().topDebtors" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td class="py-4 px-6 font-bold text-neutral-900 dark:text-white">{{ d.nombre }}</td>
                      <td class="py-4 px-6 font-mono text-neutral-600 dark:text-neutral-400">{{ d.documento }}</td>
                      <td class="py-4 px-6 text-xs text-neutral-500">{{ d.telefono || d.email || '-' }}</td>
                      <td class="py-4 px-6 text-center font-bold text-neutral-700 dark:text-neutral-300">{{ d.facturasPendientes }}</td>
                      <td class="py-4 px-6 text-right font-mono font-bold text-rose-600">RD$ {{ d.totalDeuda | number:'1.2-2' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- ================= TAB 4: INVENTARIO ================= -->
          <div *ngIf="activeTab() === 'inventory'" class="flex flex-col gap-6">

            <!-- Summary KPI Cards -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <app-stat-card
                [title]="'reports.inventory.totalCostValue' | transloco"
                subtitle="Costo de adquisición"
                prefix="RD$ "
                [value]="((inventoryData().summary.totalValorCosto || 0) | number:'1.2-2') || '0.00'"
                icon="package"
                curvePreset="asc-sigmoid"
                color="blue"
                (refresh)="loadActiveReport()"
              />

              <app-stat-card
                [title]="'reports.inventory.totalRetailValue' | transloco"
                subtitle="Precio de catálogo"
                prefix="RD$ "
                [value]="((inventoryData().summary.totalValorVenta || 0) | number:'1.2-2') || '0.00'"
                icon="tag"
                curvePreset="peak-wave"
                color="purple"
                (refresh)="loadActiveReport()"
              />

              <app-stat-card
                [title]="'reports.inventory.potentialProfit' | transloco"
                subtitle="Margen proyectado"
                prefix="RD$ "
                [value]="((inventoryData().summary.gananciaPotencial || 0) | number:'1.2-2') || '0.00'"
                icon="trending-up"
                curvePreset="asc-sigmoid"
                color="emerald"
                (refresh)="loadActiveReport()"
              />

              <app-stat-card
                [title]="'reports.inventory.lowStockAlerts' | transloco"
                subtitle="Por debajo del mínimo"
                [value]="inventoryData().summary.alertaBajoStockCount || 0"
                suffix=" productos"
                icon="alert-triangle"
                curvePreset="trough-wave"
                color="rose"
                (refresh)="loadActiveReport()"
              />
            </div>

            <!-- Healthy stock banner when no low stock alerts -->
            <div *ngIf="inventoryData().lowStockItems.length === 0" class="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-8 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20 flex flex-col items-center justify-center">
              <img
                class="max-h-[110px] w-auto select-none pointer-events-none drop-shadow-2xs mb-3"
                src="illustrations/4.svg"
                alt="Stock saludable"
              />
              <div class="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Nivel de inventario óptimo
              </div>
              <p class="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                Todos los productos en almacén cuentan con existencias por encima de su umbral mínimo.
              </p>
            </div>

            <!-- Low Stock Items Table -->
            <div *ngIf="inventoryData().lowStockItems.length > 0" class="rounded-2xl border border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20 p-6">
              <h3 class="text-base font-bold text-rose-700 dark:text-rose-400 mb-4 flex items-center gap-2">
                <mat-icon svgIcon="alert-triangle" class="icon-size-5 text-rose-600"></mat-icon>
                {{ 'reports.inventory.lowStockNotice' | transloco }}
              </h3>
              <div class="overflow-x-auto bg-white dark:bg-neutral-900 rounded-xl border border-rose-100 dark:border-rose-900/30">
                <table class="w-full text-left text-sm">
                  <thead class="bg-rose-50/50 text-[11px] font-bold uppercase text-neutral-500 dark:bg-neutral-800/80">
                    <tr>
                      <th class="py-2.5 px-4">Código</th>
                      <th class="py-2.5 px-4">Producto</th>
                      <th class="py-2.5 px-4">Almacén</th>
                      <th class="py-2.5 px-4 text-center">Stock Actual</th>
                      <th class="py-2.5 px-4 text-center">Stock Mínimo</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <tr *ngFor="let item of inventoryData().lowStockItems">
                      <td class="py-3 px-4 font-mono font-bold">{{ item.codigo }}</td>
                      <td class="py-3 px-4 font-semibold">{{ item.nombre }}</td>
                      <td class="py-3 px-4 text-neutral-500">{{ item.almacenNombre }}</td>
                      <td class="py-3 px-4 text-center font-bold text-rose-600">{{ item.cantidadActual }} {{ item.unidad }}</td>
                      <td class="py-3 px-4 text-center text-neutral-400">{{ item.stockMinimo }} {{ item.unidad }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- ================= TAB 5: VENTAS POR CLIENTE ================= -->
          <div *ngIf="activeTab() === 'clients'" class="flex flex-col gap-6">

            <div class="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
              <div class="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
                  {{ 'reports.clients.rankingTitle' | transloco }}
                </h3>
                <span class="text-xs text-neutral-500 font-semibold">
                  Gran Total: RD$ {{ (clientsData().grandTotal || 0) | number:'1.2-2' }}
                </span>
              </div>

              <div *ngIf="clientsData().clients.length === 0" class="flex flex-col items-center justify-center py-16 px-6 text-center">
                <img
                  class="max-h-[130px] w-auto select-none pointer-events-none drop-shadow-2xs mb-4"
                  src="illustrations/1.svg"
                  alt="Sin clientes"
                />
                <div class="text-base font-bold text-neutral-800 dark:text-neutral-200">
                  Sin clientes en este período
                </div>
                <p class="mt-1.5 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                  No se registran compras asociadas a clientes en las fechas seleccionadas.
                </p>
              </div>

              <div *ngIf="clientsData().clients.length > 0" class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                    <tr>
                      <th class="py-3 px-6">#</th>
                      <th class="py-3 px-6">Cliente</th>
                      <th class="py-3 px-6">RNC / Cédula</th>
                      <th class="py-3 px-6 text-center">Facturas</th>
                      <th class="py-3 px-6 text-right">Ticket Promedio</th>
                      <th class="py-3 px-6 text-right">Total Facturado</th>
                      <th class="py-3 px-6 text-right">% Participación</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <tr *ngFor="let c of clientsData().clients; let idx = index" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td class="py-4 px-6 font-bold text-neutral-400">{{ idx + 1 }}</td>
                      <td class="py-4 px-6 font-bold text-neutral-900 dark:text-white">{{ c.nombre }}</td>
                      <td class="py-4 px-6 font-mono text-neutral-600 dark:text-neutral-400">{{ c.documento }}</td>
                      <td class="py-4 px-6 text-center font-semibold text-neutral-700 dark:text-neutral-300">{{ c.totalFacturas }}</td>
                      <td class="py-4 px-6 text-right font-mono font-medium text-neutral-600 dark:text-neutral-300">RD$ {{ c.promedioTicket | number:'1.2-2' }}</td>
                      <td class="py-4 px-6 text-right font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ c.totalVentas | number:'1.2-2' }}</td>
                      <td class="py-4 px-6 text-right">
                        <span class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          {{ c.porcentajeParticipacion | number:'1.1-1' }}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- ================= TAB 6: FISCAL DGII (606, 607, 608, IT-1) ================= -->
          <div *ngIf="activeTab() === 'tax-dgii'" class="flex flex-col gap-6">

            <!-- Segmented Sub-Tab Switcher -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-neutral-200/50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
              <button
                type="button"
                (click)="taxSubTab = '606'"
                class="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
                [ngClass]="taxSubTab === '606' ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-xs border border-neutral-200/60 dark:border-neutral-700/60' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              >
                <mat-icon svgIcon="shopping-bag" class="icon-size-4"></mat-icon>
                <span>Formato 606 (Compras)</span>
              </button>
              <button
                type="button"
                (click)="taxSubTab = '607'"
                class="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
                [ngClass]="taxSubTab === '607' ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-xs border border-neutral-200/60 dark:border-neutral-700/60' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              >
                <mat-icon svgIcon="trending-up" class="icon-size-4"></mat-icon>
                <span>Formato 607 (Ventas)</span>
              </button>
              <button
                type="button"
                (click)="taxSubTab = '608'"
                class="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
                [ngClass]="taxSubTab === '608' ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-xs border border-neutral-200/60 dark:border-neutral-700/60' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              >
                <mat-icon svgIcon="alert-circle" class="icon-size-4"></mat-icon>
                <span>Formato 608 (Anulados)</span>
              </button>
              <button
                type="button"
                (click)="taxSubTab = 'it1'"
                class="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
                [ngClass]="taxSubTab === 'it1' ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-neutral-200/60 dark:border-neutral-700/60' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              >
                <mat-icon svgIcon="landmark" class="icon-size-4"></mat-icon>
                <span>Borrador IT-1 (Liquidación)</span>
              </button>
            </div>

            <!-- Dedicated Fiscal Control & Actions Toolbar -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
              <div class="flex flex-wrap items-center gap-3">
                <!-- Month / Year Selector Pill -->
                <div class="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/50">
                  <button
                    type="button"
                    (click)="prevTaxMonth()"
                    matTooltip="Mes anterior"
                    class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer shadow-2xs"
                  >
                    <mat-icon svgIcon="chevron-left" class="icon-size-4"></mat-icon>
                  </button>
                  <input
                    type="month"
                    [(ngModel)]="taxPeriod"
                    (change)="loadTaxReports()"
                    class="h-7 px-2.5 text-xs font-bold rounded-lg border-0 bg-transparent text-neutral-900 dark:text-white outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    (click)="nextTaxMonth()"
                    matTooltip="Mes siguiente"
                    class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer shadow-2xs"
                  >
                    <mat-icon svgIcon="chevron-right" class="icon-size-4"></mat-icon>
                  </button>
                </div>

                <!-- Company & Period Metadata Badges -->
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50">
                    RNC: <strong class="ml-1 font-mono text-neutral-900 dark:text-white">{{ currentEmpresa()?.rnc || report606()?.rncEmpresa || '000000000' }}</strong>
                  </span>
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20">
                    Período: <strong class="ml-1 font-mono">{{ taxPeriod }}</strong>
                  </span>
                </div>
              </div>

              <!-- Actions on the right -->
              <div class="flex items-center gap-2">
                @if (taxSubTab === '606') {
                  <button
                    type="button"
                    (click)="downloadTaxTxt('606')"
                    class="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <mat-icon svgIcon="download" class="icon-size-4"></mat-icon>
                    <span>Descargar TXT DGII</span>
                  </button>
                  <button
                    type="button"
                    (click)="exportTaxCsv('606')"
                    class="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    <mat-icon svgIcon="file-text" class="icon-size-4"></mat-icon>
                    <span>Exportar CSV</span>
                  </button>
                } @else if (taxSubTab === '607') {
                  <button
                    type="button"
                    (click)="downloadTaxTxt('607')"
                    class="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <mat-icon svgIcon="download" class="icon-size-4"></mat-icon>
                    <span>Descargar TXT DGII</span>
                  </button>
                  <button
                    type="button"
                    (click)="exportTaxCsv('607')"
                    class="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    <mat-icon svgIcon="file-text" class="icon-size-4"></mat-icon>
                    <span>Exportar CSV</span>
                  </button>
                } @else if (taxSubTab === '608') {
                  <button
                    type="button"
                    (click)="downloadTaxTxt('608')"
                    class="flex items-center gap-2 h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <mat-icon svgIcon="download" class="icon-size-4"></mat-icon>
                    <span>Descargar TXT DGII</span>
                  </button>
                } @else if (taxSubTab === 'it1') {
                  <button
                    type="button"
                    (click)="printIt1Form()"
                    class="flex items-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <mat-icon svgIcon="printer" class="icon-size-4"></mat-icon>
                    <span>Imprimir Declaración IT-1</span>
                  </button>
                }
              </div>
            </div>

            <!-- SUB-TAB 1: FORMATO 606 (COMPRAS Y GASTOS) -->
            <div *ngIf="taxSubTab === '606'" class="flex flex-col gap-6">
              <!-- Summary KPI Cards -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <app-stat-card
                  title="Total Compras Reportadas"
                  [subtitle]="(report606()?.summary?.totalRegistros || 0) + ' Comprobantes 606'"
                  [value]="((report606()?.summary?.totalRegistros || 0) | number) || '0'"
                  icon="shopping-bag"
                  curvePreset="asc-sigmoid"
                  color="blue"
                  (refresh)="loadTaxReports()"
                />

                <app-stat-card
                  title="Monto Total Facturado"
                  [subtitle]="'Bienes: RD$ ' + (((report606()?.summary?.totalMontoBienes || 0) | number:'1.2-2') || '0.00')"
                  prefix="RD$ "
                  [value]="((report606()?.summary?.totalFacturado || 0) | number:'1.2-2') || '0.00'"
                  icon="dollar-sign"
                  curvePreset="peak-wave"
                  color="blue"
                  (refresh)="loadTaxReports()"
                />

                <app-stat-card
                  title="ITBIS Facturado"
                  subtitle="Crédito fiscal deducible en IT-1"
                  prefix="RD$ "
                  [value]="((report606()?.summary?.totalItbisFacturado || 0) | number:'1.2-2') || '0.00'"
                  icon="percent"
                  curvePreset="s-curve"
                  color="emerald"
                  (refresh)="loadTaxReports()"
                />

                <app-stat-card
                  title="Retenciones (ITBIS + ISR)"
                  [subtitle]="'ITBIS Ret.: RD$ ' + (((report606()?.summary?.totalItbisRetenido || 0) | number:'1.2-2') || '0.00')"
                  prefix="RD$ "
                  [value]="(((report606()?.summary?.totalItbisRetenido || 0) + (report606()?.summary?.totalRetencionRenta || 0)) | number:'1.2-2') || '0.00'"
                  icon="receipt"
                  curvePreset="trough-wave"
                  color="amber"
                  (refresh)="loadTaxReports()"
                />
              </div>

              <!-- Table Container -->
              <div class="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
                <div class="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                  <div class="flex items-center gap-3">
                    <h3 class="text-base font-bold text-neutral-900 dark:text-white">
                      Comprobantes Fiscales de Compras (Formato 606)
                    </h3>
                    <span class="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      {{ report606()?.rows?.length || 0 }} registros
                    </span>
                  </div>
                </div>

                @if (!report606() || report606()!.rows.length === 0) {
                  <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <img
                      class="max-h-[130px] w-auto select-none pointer-events-none drop-shadow-2xs mb-4"
                      src="illustrations/1.svg"
                      alt="Sin compras"
                    />
                    <div class="text-base font-bold text-neutral-800 dark:text-neutral-200">
                      No hay compras registradas en este período
                    </div>
                    <p class="mt-1.5 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                      Registra facturas de proveedores para generar automáticamente el reporte fiscal 606.
                    </p>
                  </div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
                        <tr>
                          <th class="py-3 px-4">#</th>
                          <th class="py-3 px-4">RNC / Cédula</th>
                          <th class="py-3 px-4">Proveedor</th>
                          <th class="py-3 px-4">NCF</th>
                          <th class="py-3 px-3">Fecha</th>
                          <th class="py-3 px-4 text-right">Servicios</th>
                          <th class="py-3 px-4 text-right">Bienes</th>
                          <th class="py-3 px-4 text-right font-bold">Total Facturado</th>
                          <th class="py-3 px-4 text-right">ITBIS Fact.</th>
                          <th class="py-3 px-4 text-right">Retenciones</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                        @for (r of report606()!.rows; track r.id; let idx = $index) {
                          <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                            <td class="py-3 px-4 text-neutral-400 font-bold">{{ idx + 1 }}</td>
                            <td class="py-3 px-4 font-mono font-bold text-neutral-700 dark:text-neutral-300">{{ r.rncCedula || 'N/D' }}</td>
                            <td class="py-3 px-4 font-medium text-neutral-900 dark:text-white max-w-[200px] truncate">{{ r.proveedorNombre }}</td>
                            <td class="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{{ r.ncf }}</td>
                            <td class="py-3 px-3 text-neutral-500">{{ r.fechaComprobante }}</td>
                            <td class="py-3 px-4 text-right font-mono">RD$ {{ r.montoServicios | number:'1.2-2' }}</td>
                            <td class="py-3 px-4 text-right font-mono">RD$ {{ r.montoBienes | number:'1.2-2' }}</td>
                            <td class="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ r.totalFacturado | number:'1.2-2' }}</td>
                            <td class="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">RD$ {{ r.itbisFacturado | number:'1.2-2' }}</td>
                            <td class="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                              RD$ {{ (r.itbisRetenido + r.retencionRenta) | number:'1.2-2' }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>

            <!-- SUB-TAB 2: FORMATO 607 (VENTAS) -->
            <div *ngIf="taxSubTab === '607'" class="flex flex-col gap-6">
              <!-- Summary KPI Cards -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <app-stat-card
                  title="Facturas NCF Emitidas"
                  [subtitle]="(report607()?.summary?.totalRegistros || 0) + ' Comprobantes 607'"
                  [value]="((report607()?.summary?.totalRegistros || 0) | number) || '0'"
                  icon="file-text"
                  curvePreset="asc-sigmoid"
                  color="blue"
                  (refresh)="loadTaxReports()"
                />

                <app-stat-card
                  title="Monto Total Facturado"
                  subtitle="Base imponible de ventas"
                  prefix="RD$ "
                  [value]="((report607()?.summary?.totalMontoFacturado || 0) | number:'1.2-2') || '0.00'"
                  icon="dollar-sign"
                  curvePreset="peak-wave"
                  color="blue"
                  (refresh)="loadTaxReports()"
                />

                <app-stat-card
                  title="ITBIS Cobrado en Ventas"
                  subtitle="Débito fiscal para IT-1"
                  prefix="RD$ "
                  [value]="((report607()?.summary?.totalItbisFacturado || 0) | number:'1.2-2') || '0.00'"
                  icon="percent"
                  curvePreset="s-curve"
                  color="emerald"
                  (refresh)="loadTaxReports()"
                />

                <app-stat-card
                  title="Ventas a Crédito"
                  [subtitle]="'Contado: RD$ ' + ((((report607()?.summary?.totalEfectivo || 0) + (report607()?.summary?.totalTarjeta || 0)) | number:'1.2-2') || '0.00')"
                  prefix="RD$ "
                  [value]="((report607()?.summary?.totalCredito || 0) | number:'1.2-2') || '0.00'"
                  icon="clock"
                  curvePreset="trough-wave"
                  color="amber"
                  (refresh)="loadTaxReports()"
                />
              </div>

              <!-- Table Container -->
              <div class="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
                <div class="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                  <div class="flex items-center gap-3">
                    <h3 class="text-base font-bold text-neutral-900 dark:text-white">
                      Comprobantes Fiscales de Ventas (Formato 607)
                    </h3>
                    <span class="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      {{ report607()?.rows?.length || 0 }} registros
                    </span>
                  </div>
                </div>

                @if (!report607() || report607()!.rows.length === 0) {
                  <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <img
                      class="max-h-[130px] w-auto select-none pointer-events-none drop-shadow-2xs mb-4"
                      src="illustrations/1.svg"
                      alt="Sin ventas"
                    />
                    <div class="text-base font-bold text-neutral-800 dark:text-neutral-200">
                      No hay ventas registradas con NCF en este período
                    </div>
                    <p class="mt-1.5 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                      Emite facturas electrónicas o fiscales para generar automáticamente el reporte 607.
                    </p>
                  </div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
                        <tr>
                          <th class="py-3 px-4">#</th>
                          <th class="py-3 px-4">RNC / Cédula</th>
                          <th class="py-3 px-4">Cliente</th>
                          <th class="py-3 px-4">NCF</th>
                          <th class="py-3 px-3">Fecha</th>
                          <th class="py-3 px-4 text-right">Monto Facturado</th>
                          <th class="py-3 px-4 text-right font-bold">ITBIS Facturado</th>
                          <th class="py-3 px-4 text-right">Efectivo</th>
                          <th class="py-3 px-4 text-right">Tarjeta</th>
                          <th class="py-3 px-4 text-right">Crédito</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                        @for (r of report607()!.rows; track r.id; let idx = $index) {
                          <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                            <td class="py-3 px-4 text-neutral-400 font-bold">{{ idx + 1 }}</td>
                            <td class="py-3 px-4 font-mono font-bold text-neutral-700 dark:text-neutral-300">{{ r.rncCedula || 'Consumidor Final' }}</td>
                            <td class="py-3 px-4 font-medium text-neutral-900 dark:text-white max-w-[200px] truncate">{{ r.clienteNombre }}</td>
                            <td class="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{{ r.ncf }}</td>
                            <td class="py-3 px-3 text-neutral-500">{{ r.fechaComprobante }}</td>
                            <td class="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ r.montoFacturado | number:'1.2-2' }}</td>
                            <td class="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">RD$ {{ r.itbisFacturado | number:'1.2-2' }}</td>
                            <td class="py-3 px-4 text-right font-mono">RD$ {{ r.montoEfectivo | number:'1.2-2' }}</td>
                            <td class="py-3 px-4 text-right font-mono">RD$ {{ r.montoTarjeta | number:'1.2-2' }}</td>
                            <td class="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400">RD$ {{ r.montoCredito | number:'1.2-2' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>

            <!-- SUB-TAB 3: FORMATO 608 (ANULADOS) -->
            <div *ngIf="taxSubTab === '608'" class="flex flex-col gap-6">
              <!-- Summary KPI Cards -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <app-stat-card
                  title="Total Comprobantes Anulados"
                  subtitle="Secuencias invalidadas DGII"
                  [value]="((report608()?.summary?.totalRegistros || 0) | number) || '0'"
                  icon="alert-circle"
                  curvePreset="asc-sigmoid"
                  color="rose"
                  (refresh)="loadTaxReports()"
                />
              </div>

              <!-- Table Container -->
              <div class="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
                <div class="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
                  <div class="flex items-center gap-3">
                    <h3 class="text-base font-bold text-neutral-900 dark:text-white">
                      Comprobantes Fiscales Anulados (Formato 608)
                    </h3>
                    <span class="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      {{ report608()?.rows?.length || 0 }} registros
                    </span>
                  </div>
                </div>

                @if (!report608() || report608()!.rows.length === 0) {
                  <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div class="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-3">
                      <mat-icon svgIcon="check" class="icon-size-6 text-emerald-600 dark:text-emerald-400"></mat-icon>
                    </div>
                    <div class="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      No se registraron comprobantes fiscales anulados
                    </div>
                    <p class="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                      Todas las secuencias NCF emitidas en este período se encuentran activas y válidas.
                    </p>
                  </div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
                        <tr>
                          <th class="py-3 px-4">#</th>
                          <th class="py-3 px-4">NCF Anulado</th>
                          <th class="py-3 px-4">No. Factura</th>
                          <th class="py-3 px-4">Fecha de Anulación</th>
                          <th class="py-3 px-4">Tipo Anulación DGII</th>
                          <th class="py-3 px-4">Motivo</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                        @for (r of report608()!.rows; track r.id; let idx = $index) {
                          <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                            <td class="py-3 px-4 text-neutral-400 font-bold">{{ idx + 1 }}</td>
                            <td class="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">{{ r.ncf }}</td>
                            <td class="py-3 px-4 font-bold">{{ r.numeroFactura }}</td>
                            <td class="py-3 px-4 text-neutral-500">{{ r.fechaAnulacion }}</td>
                            <td class="py-3 px-4">
                              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                Tipo {{ r.tipoAnulacion }}
                              </span>
                            </td>
                            <td class="py-3 px-4 text-neutral-500">{{ r.motivo }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>

            <!-- SUB-TAB 4: BORRADOR DECLARACION JURADA IT-1 -->
            <div *ngIf="taxSubTab === 'it1'" class="flex flex-col gap-6">
              <div class="rounded-2xl border border-neutral-200 bg-white p-8 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-8 max-w-4xl mx-auto w-full">
                <!-- IT-1 Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-6">
                  <div>
                    <span class="text-xs uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400">
                      DGII · República Dominicana
                    </span>
                    <h2 class="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                      Declaración Jurada y Pago de ITBIS (IT-1)
                    </h2>
                    <p class="text-xs text-neutral-500 mt-1">
                      Borrador Consolidado de Liquidación Tributaria · Período Fiscal {{ reportIt1()?.periodo || taxPeriod }}
                    </p>
                  </div>
                  <div class="mt-4 sm:mt-0 text-right">
                    <div class="text-xs font-bold text-neutral-500">RNC Contribuyente</div>
                    <div class="text-sm font-mono font-black text-neutral-900 dark:text-white">
                      {{ reportIt1()?.rncEmpresa || currentEmpresa()?.rnc || '000000000' }}
                    </div>
                  </div>
                </div>

                <!-- Seccion I: Operaciones Reportadas -->
                <div class="space-y-3">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold">I</span>
                    Operaciones Reportadas en el Período (Débito Fiscal)
                  </h3>
                  <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-xs">
                    <div class="flex justify-between items-center p-3 bg-neutral-50/50 dark:bg-neutral-800/20 border-b border-neutral-100 dark:border-neutral-800">
                      <span><strong>Casilla 1:</strong> Total de Ingresos por Operaciones</span>
                      <span class="font-mono font-bold text-sm">RD$ {{ (reportIt1()?.operaciones?.totalIngresos || 0) | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 border-b border-neutral-100 dark:border-neutral-800">
                      <span class="text-neutral-600 dark:text-neutral-400"><strong>Casilla 2:</strong> Ingresos Exentos por Ley</span>
                      <span class="font-mono">RD$ {{ (reportIt1()?.operaciones?.ingresosExentos || 0) | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 border-b border-neutral-100 dark:border-neutral-800">
                      <span class="text-neutral-600 dark:text-neutral-400"><strong>Casilla 11:</strong> Operaciones Gravadas a la Tasa del 18%</span>
                      <span class="font-mono">RD$ {{ (reportIt1()?.operaciones?.ingresosGravados18 || 0) | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 font-bold">
                      <span><strong>Casilla 15:</strong> Total ITBIS Cobrado en Operaciones</span>
                      <span class="font-mono text-sm">RD$ {{ (reportIt1()?.operaciones?.totalItbisCobrado || 0) | number:'1.2-2' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Seccion II: Liquidación y Deducciones -->
                <div class="space-y-3">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold">II</span>
                    Deducciones e ITBIS Pagado en Compras (Crédito Fiscal)
                  </h3>
                  <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-xs">
                    <div class="flex justify-between items-center p-3 border-b border-neutral-100 dark:border-neutral-800">
                      <span class="text-neutral-600 dark:text-neutral-400"><strong>Casilla 23:</strong> ITBIS Pagado en Compras Locales de Bienes</span>
                      <span class="font-mono">RD$ {{ (reportIt1()?.deducciones?.itbisComprasLocales || 0) | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 border-b border-neutral-100 dark:border-neutral-800">
                      <span class="text-neutral-600 dark:text-neutral-400"><strong>Casilla 24:</strong> ITBIS Pagado por Servicios Deducibles</span>
                      <span class="font-mono">RD$ {{ (reportIt1()?.deducciones?.itbisServiciosDeducibles || 0) | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-neutral-50/50 dark:bg-neutral-800/20 border-b border-neutral-100 dark:border-neutral-800 font-bold">
                      <span><strong>Casilla 26:</strong> Total ITBIS Deducible (Crédito Fiscal)</span>
                      <span class="font-mono text-emerald-600 dark:text-emerald-400">RD$ {{ (reportIt1()?.deducciones?.totalItbisDeducible || 0) | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 border-b border-neutral-100 dark:border-neutral-800">
                      <span class="text-neutral-600 dark:text-neutral-400"><strong>Casilla 28:</strong> ITBIS Retenido por Terceros</span>
                      <span class="font-mono text-amber-600 dark:text-amber-400">RD$ {{ (reportIt1()?.deducciones?.itbisRetenido || 0) | number:'1.2-2' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Seccion III: Resultado Final de Liquidación -->
                <div class="p-6 rounded-2xl border" [ngClass]="(reportIt1()?.liquidacion?.itbisAPagar || 0) > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-500/20' : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-500/20'">
                  <div class="flex flex-col sm:flex-row justify-between items-baseline gap-2">
                    <div>
                      <span class="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                        {{ (reportIt1()?.liquidacion?.itbisAPagar || 0) > 0 ? 'Casilla 33: TOTAL ITBIS A PAGAR A LA DGII' : 'Casilla 34: SALDO A FAVOR DEL CONTRIBUYENTE' }}
                      </span>
                      <p class="text-xs text-neutral-500 mt-0.5">
                        Liquidación neta (ITBIS Cobrado en Ventas - ITBIS Deducible en Compras - Retenciones)
                      </p>
                    </div>
                    <div class="text-3xl font-black" [ngClass]="(reportIt1()?.liquidacion?.itbisAPagar || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'">
                      RD$ {{ ((reportIt1()?.liquidacion?.itbisAPagar || 0) > 0 ? reportIt1()?.liquidacion?.itbisAPagar : reportIt1()?.liquidacion?.saldoAFavor) | number:'1.2-2' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  `,
})
export default class ReportsComponent implements OnInit {
  reportsService = inject(ReportsService);
  authState = inject(AuthState);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  printDate = new Date();

  readonly currentEmpresa = computed(() => {
    const user = this.authState.user();
    const empId = this.authState.empresaId();
    if (!user?.empresas || user.empresas.length === 0) return null;
    return user.empresas.find((e) => e.id === empId) || user.empresas[0];
  });

  activeTab = signal<ReportTab>('sales');
  selectedDatePreset = 'thisMonth';
  dateFrom = '';
  dateTo = '';

  // Fiscal DGII State
  taxSubTab: '606' | '607' | '608' | 'it1' = '606';
  taxPeriod = this.getDefaultTaxPeriod();

  datePresets = [
    { value: 'today', label: 'common.today' },
    { value: 'thisMonth', label: 'common.thisMonth' },
    { value: 'lastMonth', label: 'common.lastMonth' },
    { value: 'thisYear', label: 'common.thisYear' },
    { value: 'custom', label: 'common.customRange' },
  ];

  getPresetLabel(val: string): string {
    const preset = this.datePresets.find((p) => p.value === val);
    return preset ? preset.label : 'common.thisMonth';
  }

  tabs = [
    { key: 'sales' as ReportTab, label: 'reports.tabs.sales', icon: 'trending-up' },
    { key: 'top-products' as ReportTab, label: 'reports.tabs.topProducts', icon: 'package' },
    { key: 'receivables' as ReportTab, label: 'reports.tabs.receivables', icon: 'clock' },
    { key: 'inventory' as ReportTab, label: 'reports.tabs.inventory', icon: 'boxes' },
    { key: 'clients' as ReportTab, label: 'reports.tabs.clients', icon: 'users' },
    { key: 'tax-dgii' as ReportTab, label: 'reports.tabs.taxDgii', icon: 'file-text' },
  ];

  salesData = this.reportsService.salesReport;
  topProductsData = this.reportsService.topProductsReport;
  receivablesData = this.reportsService.receivablesReport;
  inventoryData = this.reportsService.inventoryReport;
  clientsData = this.reportsService.salesByClientReport;

  report606 = this.reportsService.report606;
  report607 = this.reportsService.report607;
  report608 = this.reportsService.report608;
  reportIt1 = this.reportsService.reportIt1;

  maxSalesPoint = computed(() => {
    const points = this.salesData().timeSeries || [];
    if (points.length === 0) return 1;
    return Math.max(...points.map((p) => p.total), 1);
  });

  readonly salesChartOptions = computed(() => {
    const timeSeries = this.salesData().timeSeries || [];
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const categories = timeSeries.map((p) => {
      const parts = p.date.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return p.date;
    });

    const values = timeSeries.map((p) => p.total);

    return {
      series: [
        {
          name: 'Ventas',
          data: values,
        },
      ],
      chart: {
        type: 'area' as const,
        height: 250,
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'transparent',
      },
      colors: ['#2563eb'],
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth' as const,
        width: 3,
      },
      fill: {
        type: 'gradient' as const,
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      grid: {
        borderColor: isDark ? '#262626' : '#f3f4f6',
        strokeDashArray: 4,
        padding: { top: 0, right: 12, bottom: 0, left: 12 },
      },
      xaxis: {
        categories: categories.length > 0 ? categories : ['Hoy'],
        labels: {
          style: {
            colors: isDark ? '#a3a3a3' : '#737373',
            fontSize: '11px',
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            colors: isDark ? '#a3a3a3' : '#737373',
            fontSize: '11px',
          },
          formatter: (val: number) => `RD$ ${Number(val || 0).toLocaleString('es-DO', { maximumFractionDigits: 0 })}`,
        },
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        y: {
          formatter: (val: number) => `RD$ ${Number(val || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
      },
      markers: {
        size: timeSeries.length === 1 ? 6 : 4,
        colors: ['#2563eb'],
        strokeColors: '#fff',
        strokeWidth: 2,
        hover: { size: 7 },
      },
    };
  });

  private getDefaultTaxPeriod(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  prevTaxMonth(): void {
    const [yStr, mStr] = this.taxPeriod.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    this.taxPeriod = `${y}-${String(m).padStart(2, '0')}`;
    this.loadTaxReports();
  }

  nextTaxMonth(): void {
    const [yStr, mStr] = this.taxPeriod.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    this.taxPeriod = `${y}-${String(m).padStart(2, '0')}`;
    this.loadTaxReports();
  }

  loadTaxReports(): void {
    const periodClean = this.taxPeriod.replace('-', '');
    this.reportsService.get606(periodClean).subscribe();
    this.reportsService.get607(periodClean).subscribe();
    this.reportsService.get608(periodClean).subscribe();
    this.reportsService.getIt1(periodClean).subscribe();
  }

  downloadTaxTxt(type: '606' | '607' | '608'): void {
    const periodClean = this.taxPeriod.replace('-', '');
    this.reportsService.downloadTaxTxt(type, periodClean);
  }

  exportTaxCsv(type: '606' | '607' | '608'): void {
    const periodClean = this.taxPeriod.replace('-', '');
    let csvContent = '';
    let filename = `DGII_${type}_${periodClean}.csv`;

    if (type === '606') {
      const rep = this.report606();
      if (!rep || rep.rows.length === 0) {
        this.snackBar.open('No hay datos en el 606 para exportar', 'Cerrar', { duration: 3000 });
        return;
      }
      csvContent = 'RNC_Cedula,Tipo_ID,Tipo_Gasto,NCF,NCF_Modificado,Fecha_Comprobante,Fecha_Pago,Monto_Servicios,Monto_Bienes,Total_Facturado,ITBIS_Facturado,ITBIS_Retenido,Retencion_Renta,Forma_Pago,Proveedor\n';
      for (const r of rep.rows) {
        csvContent += `"${r.rncCedula}","${r.tipoId}","${r.tipoGasto}","${r.ncf}","${r.ncfModificado}","${r.fechaComprobante}","${r.fechaPago}",${r.montoServicios},${r.montoBienes},${r.totalFacturado},${r.itbisFacturado},${r.itbisRetenido},${r.retencionRenta},"${r.formaPago}","${r.proveedorNombre}"\n`;
      }
    } else if (type === '607') {
      const rep = this.report607();
      if (!rep || rep.rows.length === 0) {
        this.snackBar.open('No hay datos en el 607 para exportar', 'Cerrar', { duration: 3000 });
        return;
      }
      csvContent = 'RNC_Cedula,Tipo_ID,NCF,NCF_Modificado,Tipo_Ingreso,Fecha_Comprobante,Monto_Facturado,ITBIS_Facturado,Efectivo,Cheque_Transf,Tarjeta,Credito,Cliente\n';
      for (const r of rep.rows) {
        csvContent += `"${r.rncCedula}","${r.tipoId}","${r.ncf}","${r.ncfModificado}","${r.tipoIngreso}","${r.fechaComprobante}",${r.montoFacturado},${r.itbisFacturado},${r.montoEfectivo},${r.montoChequeTransf},${r.montoTarjeta},${r.montoCredito},"${r.clienteNombre}"\n`;
      }
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  printIt1Form(): void {
    this.printReport();
  }

  ngOnInit(): void {
    this.applyDatePreset('thisMonth');
    this.loadActiveReport();
  }

  setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    this.loadActiveReport();
  }

  onPresetChange(preset: string): void {
    this.selectedDatePreset = preset;
    if (preset !== 'custom') {
      this.applyDatePreset(preset);
      this.loadActiveReport();
    }
  }

  applyDatePreset(preset: string): void {
    this.selectedDatePreset = preset;
    const now = new Date();
    if (preset === 'today') {
      const todayStr = this.formatDate(now);
      this.dateFrom = todayStr;
      this.dateTo = todayStr;
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      this.dateFrom = this.formatDate(firstDay);
      this.dateTo = this.formatDate(now);
    } else if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      this.dateFrom = this.formatDate(firstDayLastMonth);
      this.dateTo = this.formatDate(lastDayLastMonth);
    } else if (preset === 'thisYear') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      this.dateFrom = this.formatDate(firstDayYear);
      this.dateTo = this.formatDate(now);
    }
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadActiveReport(): void {
    const tab = this.activeTab();
    const filter = { from: this.dateFrom || undefined, to: this.dateTo || undefined };

    switch (tab) {
      case 'sales':
        this.reportsService.getSalesReport(filter).subscribe();
        break;
      case 'top-products':
        this.reportsService.getTopProducts(filter).subscribe();
        break;
      case 'receivables':
        this.reportsService.getReceivables().subscribe();
        break;
      case 'inventory':
        this.reportsService.getInventory().subscribe();
        break;
      case 'clients':
        this.reportsService.getSalesByClient(filter).subscribe();
        break;
      case 'tax-dgii':
        this.loadTaxReports();
        break;
    }
  }

  getBarHeightPercent(value: number, max: number): number {
    if (max <= 0) return 5;
    const pct = Math.round((value / max) * 100);
    return Math.max(8, pct);
  }

  getReportTitle(): string {
    switch (this.activeTab()) {
      case 'sales': return 'INFORME DE VENTAS Y FACTURACIÓN';
      case 'top-products': return 'REPORTE DE PRODUCTOS MÁS VENDIDOS';
      case 'receivables': return 'ESTADO DE CUENTAS POR COBRAR Y ANTIGÜEDAD';
      case 'inventory': return 'VALORACIÓN DE INVENTARIO Y CONTROL DE STOCK';
      case 'clients': return 'CONSOLIDADO DE VENTAS POR CLIENTE';
      case 'tax-dgii': return 'REPORTES FISCALES DGII Y LIQUIDACIÓN IT-1';
      default: return 'REPORTE GENERAL';
    }
  }

  getReportPeriodLabel(): string {
    if (this.activeTab() === 'tax-dgii') {
      return `Período Fiscal ${this.taxPeriod}`;
    }
    if (this.activeTab() === 'inventory' || this.activeTab() === 'receivables') {
      return 'Al corte actual';
    }
    if (this.selectedDatePreset === 'custom') {
      return `Del ${this.dateFrom} al ${this.dateTo}`;
    }
    const presetObj = this.datePresets.find((p) => p.value === this.selectedDatePreset);
    const label = presetObj ? this.transloco.translate(presetObj.label) : this.selectedDatePreset;
    return `${label} (${this.dateFrom} al ${this.dateTo})`;
  }

  private formatCurrency(val: number | undefined | null): string {
    const num = Number(val || 0);
    return 'RD$ ' + num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatNumber(val: number | undefined | null): string {
    const num = Number(val || 0);
    return num.toLocaleString('es-DO');
  }

  printReport(): void {
    const html = this.generateReportHtml();
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 350);
    }
  }

  private generateReportHtml(): string {
    const empresa = this.currentEmpresa();
    const empresaNombre = empresa?.razonSocial || 'Dolphin ERP';
    const empresaRnc = empresa?.rnc ? `RNC: ${empresa.rnc}` : '';
    const user = this.authState.user();
    const usuarioNombre = user?.name || user?.email || 'Administrador';
    const fechaEmision = new Date().toLocaleString('es-DO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const periodo = this.getReportPeriodLabel();
    const titulo = this.getReportTitle();
    const tab = this.activeTab();

    let bodyContent = '';

    if (tab === 'sales') {
      const s = this.salesData();
      const summary = s?.summary;
      const timeSeries = s?.timeSeries || [];
      const paymentMethods = s?.paymentMethods || [];

      bodyContent = `
        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Total Facturado</div>
            <div class="kpi-val">${this.formatCurrency(summary?.totalVentas)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Subtotal Neto</div>
            <div class="kpi-val">${this.formatCurrency(summary?.totalSubtotal)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">ITBIS Recaudado</div>
            <div class="kpi-val" style="color: #047857;">${this.formatCurrency(summary?.totalItbis)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Total Facturas / Ticket</div>
            <div class="kpi-val">${summary?.totalFacturas || 0} facturas · ${this.formatCurrency(summary?.promedioTicket)}</div>
          </div>
        </div>

        ${paymentMethods.length > 0 ? `
          <div class="section-title">Desglose por Formas de Pago</div>
          <table>
            <thead>
              <tr>
                <th class="text-left">Forma / Método de Pago</th>
                <th class="text-center">Transacciones</th>
                <th class="text-right">Monto Total</th>
                <th class="text-right">% Participación</th>
              </tr>
            </thead>
            <tbody>
              ${paymentMethods.map((pm) => `
                <tr>
                  <td class="font-bold">${pm.metodo}</td>
                  <td class="text-center">${pm.count}</td>
                  <td class="text-right mono font-bold">${this.formatCurrency(pm.total)}</td>
                  <td class="text-right mono">${summary?.totalVentas ? ((pm.total / summary.totalVentas) * 100).toFixed(1) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="section-title">Detalle Cronológico de Ventas</div>
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 40px;">#</th>
              <th class="text-left">Fecha</th>
              <th class="text-center">Cant. Facturas</th>
              <th class="text-right">ITBIS Fiscal</th>
              <th class="text-right">Total Facturado</th>
            </tr>
          </thead>
          <tbody>
            ${timeSeries.length === 0 ? `
              <tr><td colspan="5" class="text-center" style="padding: 16px; color: #64748b;">No se registraron ventas en el período.</td></tr>
            ` : timeSeries.map((item, idx) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="color: #94a3b8;">${idx + 1}</td>
                <td class="mono font-bold">${item.date}</td>
                <td class="text-center">${item.count}</td>
                <td class="text-right mono">${this.formatCurrency(item.itbis)}</td>
                <td class="text-right mono font-bold">${this.formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2" class="text-right font-black">TOTAL GENERAL:</td>
              <td class="text-center font-bold">${summary?.totalFacturas || 0}</td>
              <td class="text-right mono">${this.formatCurrency(summary?.totalItbis)}</td>
              <td class="text-right mono">${this.formatCurrency(summary?.totalVentas)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (tab === 'top-products') {
      const top = this.topProductsData()?.topProducts || [];
      bodyContent = `
        <div class="section-title">Ranking de Artículos y Servicios Vendidos</div>
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 35px;">#</th>
              <th class="text-left">Código</th>
              <th class="text-left">Descripción del Producto</th>
              <th class="text-left">Categoría</th>
              <th class="text-right">Cant. Vendida</th>
              <th class="text-right">Ingresos Totales</th>
              <th class="text-right">Margen Bruto</th>
            </tr>
          </thead>
          <tbody>
            ${top.length === 0 ? `
              <tr><td colspan="7" class="text-center" style="padding: 16px; color: #64748b;">No hay registros de ventas para este período.</td></tr>
            ` : top.map((p: any, idx: number) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="color: #94a3b8; font-weight: bold;">${idx + 1}</td>
                <td class="mono font-bold">${p.codigo}</td>
                <td class="font-bold">${p.nombre}</td>
                <td>${p.categoria}</td>
                <td class="text-right font-bold">${this.formatNumber(p.cantidadVendida)}</td>
                <td class="text-right mono font-bold">${this.formatCurrency(p.totalIngresos)}</td>
                <td class="text-right mono font-bold" style="color: #047857;">${this.formatCurrency(p.margenEstimado)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (tab === 'receivables') {
      const r = this.receivablesData();
      const summary = r?.summary;
      const debtors = r?.topDebtors || [];

      bodyContent = `
        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">0 - 30 Días (Corriente)</div>
            <div class="kpi-val" style="color: #047857;">${this.formatCurrency(summary?.aging?.corriente)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">31 - 60 Días</div>
            <div class="kpi-val">${this.formatCurrency(summary?.aging?.de31a60)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">61 - 90 Días</div>
            <div class="kpi-val">${this.formatCurrency(summary?.aging?.de61a90)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Más de 90 Días</div>
            <div class="kpi-val" style="color: #be123c;">${this.formatCurrency(summary?.aging?.masDe90)}</div>
          </div>
        </div>

        <div class="section-title">Detalle de Clientes con Balance Pendiente</div>
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 35px;">#</th>
              <th class="text-left">Cliente / Razón Social</th>
              <th class="text-left">RNC / Cédula</th>
              <th class="text-left">Contacto</th>
              <th class="text-center">Facturas Pendientes</th>
              <th class="text-right">Saldo Deudor</th>
            </tr>
          </thead>
          <tbody>
            ${debtors.length === 0 ? `
              <tr><td colspan="6" class="text-center" style="padding: 16px; color: #047857; font-weight: bold;">Toda la cartera se encuentra al día sin saldos pendientes.</td></tr>
            ` : debtors.map((d, idx) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="color: #94a3b8;">${idx + 1}</td>
                <td class="font-bold">${d.nombre}</td>
                <td class="mono">${d.documento}</td>
                <td>${d.telefono || d.email || '-'}</td>
                <td class="text-center font-bold">${d.facturasPendientes}</td>
                <td class="text-right mono font-bold" style="color: #be123c;">${this.formatCurrency(d.totalDeuda)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4" class="text-right font-black">TOTAL PENDIENTE DE COBRO:</td>
              <td class="text-center font-bold">${summary?.totalFacturasPendientes || 0}</td>
              <td class="text-right mono font-black">${this.formatCurrency(summary?.totalPendiente)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (tab === 'inventory') {
      const inv = this.inventoryData();
      const summary = inv?.summary;
      const lowStock = inv?.lowStockItems || [];

      bodyContent = `
        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Valor Total al Costo</div>
            <div class="kpi-val">${this.formatCurrency(summary?.totalValorCosto)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Valor Total al Detalle</div>
            <div class="kpi-val">${this.formatCurrency(summary?.totalValorVenta)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Ganancia Estimada</div>
            <div class="kpi-val" style="color: #047857;">${this.formatCurrency(summary?.gananciaPotencial)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Alertas de Bajo Stock</div>
            <div class="kpi-val" style="color: #be123c;">${summary?.alertaBajoStockCount || 0} productos</div>
          </div>
        </div>

        <div class="section-title">Control de Stock Crítico / Alertas de Reabastecimiento</div>
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 35px;">#</th>
              <th class="text-left">Código</th>
              <th class="text-left">Producto / Artículo</th>
              <th class="text-left">Almacén</th>
              <th class="text-center">Stock Actual</th>
              <th class="text-center">Stock Mínimo</th>
              <th class="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${lowStock.length === 0 ? `
              <tr><td colspan="7" class="text-center" style="padding: 16px; color: #047857; font-weight: bold;">Todos los artículos cuentan con existencias óptimas.</td></tr>
            ` : lowStock.map((item, idx) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="color: #94a3b8;">${idx + 1}</td>
                <td class="mono font-bold">${item.codigo}</td>
                <td class="font-bold">${item.nombre}</td>
                <td>${item.almacenNombre}</td>
                <td class="text-center font-bold" style="color: #be123c;">${item.cantidadActual} ${item.unidad}</td>
                <td class="text-center">${item.stockMinimo} ${item.unidad}</td>
                <td class="text-center font-bold" style="color: #be123c; text-transform: uppercase; font-size: 9.5px;">Reabastecer</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (tab === 'clients') {
      const cData = this.clientsData();
      const clients = cData?.clients || [];

      bodyContent = `
        <div class="section-title">Reporte Consolidado de Ventas por Cliente</div>
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 35px;">#</th>
              <th class="text-left">Cliente / Razón Social</th>
              <th class="text-left">RNC / Cédula</th>
              <th class="text-center">Facturas</th>
              <th class="text-right">Ticket Promedio</th>
              <th class="text-right">Total Facturado</th>
              <th class="text-right">% Participación</th>
            </tr>
          </thead>
          <tbody>
            ${clients.length === 0 ? `
              <tr><td colspan="7" class="text-center" style="padding: 16px; color: #64748b;">No hay transacciones registradas para este período.</td></tr>
            ` : clients.map((c, idx) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="color: #94a3b8;">${idx + 1}</td>
                <td class="font-bold">${c.nombre}</td>
                <td class="mono">${c.documento}</td>
                <td class="text-center font-bold">${c.totalFacturas}</td>
                <td class="text-right mono">${this.formatCurrency(c.promedioTicket)}</td>
                <td class="text-right mono font-bold">${this.formatCurrency(c.totalVentas)}</td>
                <td class="text-right mono font-semibold">${c.porcentajeParticipacion.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="5" class="text-right font-black">GRAN TOTAL FACTURADO:</td>
              <td class="text-right mono font-black">${this.formatCurrency(cData?.grandTotal)}</td>
              <td class="text-right mono font-black">100.0%</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (tab === 'tax-dgii') {
      const it1 = this.reportIt1();
      bodyContent = `
        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Casilla 1: Total Ingresos</div>
            <div class="kpi-val">${this.formatCurrency(it1?.operaciones?.totalIngresos)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Casilla 15: ITBIS Cobrado</div>
            <div class="kpi-val" style="color: #2563eb;">${this.formatCurrency(it1?.operaciones?.totalItbisCobrado)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Casilla 26: ITBIS Deducible</div>
            <div class="kpi-val" style="color: #047857;">${this.formatCurrency(it1?.deducciones?.totalItbisDeducible)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">${(it1?.liquidacion?.itbisAPagar || 0) > 0 ? 'Casilla 33: A Pagar DGII' : 'Casilla 34: Saldo a Favor'}</div>
            <div class="kpi-val" style="color: ${(it1?.liquidacion?.itbisAPagar || 0) > 0 ? '#d97706' : '#047857'};">
              ${this.formatCurrency((it1?.liquidacion?.itbisAPagar || 0) > 0 ? it1?.liquidacion?.itbisAPagar : it1?.liquidacion?.saldoAFavor)}
            </div>
          </div>
        </div>

        <div class="section-title">I. Operaciones Reportadas en el Período (Débito Fiscal)</div>
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 60px;">Casilla</th>
              <th class="text-left">Descripción del Concepto Tributario</th>
              <th class="text-right">Monto Acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold mono">01</td>
              <td>Total de Ingresos por Operaciones</td>
              <td class="text-right mono font-bold">${this.formatCurrency(it1?.operaciones?.totalIngresos)}</td>
            </tr>
            <tr>
              <td class="font-bold mono">02</td>
              <td>Ingresos Exentos por Ley</td>
              <td class="text-right mono">${this.formatCurrency(it1?.operaciones?.ingresosExentos)}</td>
            </tr>
            <tr>
              <td class="font-bold mono">11</td>
              <td>Operaciones Gravadas a la Tasa del 18%</td>
              <td class="text-right mono">${this.formatCurrency(it1?.operaciones?.ingresosGravados18)}</td>
            </tr>
            <tr style="background-color: #eff6ff; font-weight: bold;">
              <td class="font-bold mono" style="color: #1d4ed8;">15</td>
              <td style="color: #1d4ed8;">Total ITBIS Cobrado en Operaciones (Débito Fiscal)</td>
              <td class="text-right mono" style="color: #1d4ed8;">${this.formatCurrency(it1?.operaciones?.totalItbisCobrado)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title" style="margin-top: 20px;">II. Deducciones e ITBIS Pagado en Compras (Crédito Fiscal)</div>
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 60px;">Casilla</th>
              <th class="text-left">Descripción del Concepto Tributario</th>
              <th class="text-right">Monto Deducible</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold mono">23</td>
              <td>ITBIS Pagado en Compras Locales de Bienes</td>
              <td class="text-right mono">${this.formatCurrency(it1?.deducciones?.itbisComprasLocales)}</td>
            </tr>
            <tr>
              <td class="font-bold mono">24</td>
              <td>ITBIS Pagado por Servicios Deducibles</td>
              <td class="text-right mono">${this.formatCurrency(it1?.deducciones?.itbisServiciosDeducibles)}</td>
            </tr>
            <tr style="background-color: #f0fdf4; font-weight: bold;">
              <td class="font-bold mono" style="color: #15803d;">26</td>
              <td style="color: #15803d;">Total ITBIS Deducible (Crédito Fiscal)</td>
              <td class="text-right mono" style="color: #15803d;">${this.formatCurrency(it1?.deducciones?.totalItbisDeducible)}</td>
            </tr>
            <tr>
              <td class="font-bold mono">28</td>
              <td>ITBIS Retenido por Terceros</td>
              <td class="text-right mono" style="color: #b45309;">${this.formatCurrency(it1?.deducciones?.itbisRetenido)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2" class="text-right font-black">${(it1?.liquidacion?.itbisAPagar || 0) > 0 ? 'CASILLA 33: TOTAL ITBIS A PAGAR A LA DGII:' : 'CASILLA 34: SALDO A FAVOR DEL CONTRIBUYENTE:'}</td>
              <td class="text-right mono font-black" style="color: ${(it1?.liquidacion?.itbisAPagar || 0) > 0 ? '#b45309' : '#15803d'};">
                ${this.formatCurrency((it1?.liquidacion?.itbisAPagar || 0) > 0 ? it1?.liquidacion?.itbisAPagar : it1?.liquidacion?.saldoAFavor)}
              </td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${titulo} - ${empresaNombre}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            padding: 24px;
            font-size: 11px;
            line-height: 1.4;
          }
          @page {
            size: letter portrait;
            margin: 1.2cm;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 14px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .company-name {
            font-size: 20px;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .company-rnc {
            font-size: 11px;
            font-weight: 700;
            color: #334155;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            margin-top: 2px;
          }
          .system-sub {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
          }
          .report-title {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e3a8a;
            text-align: right;
            letter-spacing: -0.3px;
          }
          .report-meta {
            font-size: 10px;
            color: #475569;
            text-align: right;
            margin-top: 4px;
            line-height: 1.5;
          }
          .section-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #334155;
            margin-bottom: 8px;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            padding: 7px 9px;
            border: 1px solid #cbd5e1;
          }
          td {
            padding: 6px 9px;
            border: 1px solid #e2e8f0;
            font-size: 10.5px;
          }
          .mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .font-bold { font-weight: 700; }
          .font-black { font-weight: 900; }
          .total-row {
            background-color: #e2e8f0;
            font-weight: 900;
            border-top: 2px solid #0f172a;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 18px;
          }
          .kpi-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            background-color: #f8fafc;
          }
          .kpi-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
          }
          .kpi-val {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 3px;
          }
          .footer {
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${empresaNombre}</div>
            ${empresaRnc ? `<div class="company-rnc">${empresaRnc}</div>` : ''}
            <div class="system-sub">Sistema de Gestión Empresarial y Facturación Fiscal</div>
          </div>
          <div>
            <div class="report-title">${titulo}</div>
            <div class="report-meta">
              <div><strong>Período:</strong> ${periodo}</div>
              <div><strong>Emisión:</strong> ${fechaEmision}</div>
              <div><strong>Generado por:</strong> ${usuarioNombre}</div>
            </div>
          </div>
        </div>

        ${bodyContent}

        <div class="footer">
          <span>Dolphin ERP · Documento Oficial de Reporte Contable</span>
          <span>Confidencial · Uso Interno Exclusivo</span>
        </div>
      </body>
      </html>
    `;
  }

  exportCurrentReportCsv(): void {
    const tab = this.activeTab();
    let csvContent = '';
    let filename = `Reporte_${tab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (tab === 'sales' && this.salesData()) {
      csvContent = 'Fecha,Total Facturado,Cantidad Facturas,ITBIS\n';
      for (const p of this.salesData()!.timeSeries) {
        csvContent += `"${p.date}",${p.total},${p.count},${p.itbis}\n`;
      }
    } else if (tab === 'top-products' && this.topProductsData()) {
      csvContent = 'Codigo,Nombre,Categoria,Unidades Vendidas,Ingresos Totales,Margen Estimado\n';
      for (const p of this.topProductsData()!.topProducts) {
        csvContent += `"${p.codigo}","${p.nombre}","${p.categoria}",${p.cantidadVendida},${p.totalIngresos},${p.margenEstimado}\n`;
      }
    } else if (tab === 'receivables' && this.receivablesData()) {
      csvContent = 'Cliente,Documento,Telefono,Facturas Pendientes,Total Deuda\n';
      for (const d of this.receivablesData()!.topDebtors) {
        csvContent += `"${d.nombre}","${d.documento}","${d.telefono || ''}",${d.facturasPendientes},${d.totalDeuda}\n`;
      }
    } else if (tab === 'inventory' && this.inventoryData()) {
      csvContent = 'Codigo,Nombre,Almacen,Stock Actual,Stock Minimo,Unidad\n';
      for (const s of this.inventoryData()!.lowStockItems) {
        csvContent += `"${s.codigo}","${s.nombre}","${s.almacenNombre}",${s.cantidadActual},${s.stockMinimo},"${s.unidad}"\n`;
      }
    } else if (tab === 'clients' && this.clientsData()) {
      csvContent = 'Cliente,Documento,Facturas,Ticket Promedio,Total Ventas,% Participacion\n';
      for (const c of this.clientsData()!.clients) {
        csvContent += `"${c.nombre}","${c.documento}",${c.totalFacturas},${c.promedioTicket},${c.totalVentas},${c.porcentajeParticipacion}\n`;
      }
    }

    if (!csvContent) {
      this.snackBar.open('No hay datos disponibles para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
