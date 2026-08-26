import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ReportsService,
  SalesReportResponse,
  TopProductsReportResponse,
  ReceivablesReportResponse,
  InventoryReportResponse,
  SalesByClientResponse,
} from './data/reports.service';

export type ReportTab =
  | 'sales'
  | 'top-products'
  | 'receivables'
  | 'inventory'
  | 'clients';

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
    MatSnackBarModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">

      <!-- Header -->
      <div
        class="relative flex flex-0 shrink-0 flex-col border-b border-neutral-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <mat-icon svgIcon="bar-chart-2" class="icon-size-7 text-blue-600 dark:text-blue-400"></mat-icon>
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
        <div *ngIf="activeTab() !== 'inventory' && activeTab() !== 'receivables'" class="flex items-center gap-2">
          <select
            [(ngModel)]="selectedDatePreset"
            (ngModelChange)="onPresetChange($event)"
            class="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="today">{{ 'common.today' | transloco }}</option>
            <option value="thisMonth">{{ 'common.thisMonth' | transloco }}</option>
            <option value="lastMonth">{{ 'common.lastMonth' | transloco }}</option>
            <option value="thisYear">{{ 'common.thisYear' | transloco }}</option>
            <option value="custom">{{ 'common.customRange' | transloco }}</option>
          </select>

          <div *ngIf="selectedDatePreset === 'custom'" class="flex items-center gap-1.5">
            <input
              type="date"
              [(ngModel)]="dateFrom"
              class="rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <span class="text-xs text-neutral-400">-</span>
            <input
              type="date"
              [(ngModel)]="dateTo"
              class="rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <button
              (click)="loadActiveReport()"
              class="rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-auto min-h-0 overflow-y-auto p-6 md:p-8">

        <!-- Loading Skeleton / Spinner -->
        <div *ngIf="reportsService.loading()" class="flex h-64 flex-col items-center justify-center gap-3">
          <div class="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
          <span class="text-xs font-semibold text-neutral-500">{{ 'common.loading' | transloco }}</span>
        </div>

        <div *ngIf="!reportsService.loading()">

          <!-- ================= TAB 1: VENTAS ================= -->
          <div *ngIf="activeTab() === 'sales' && salesData()" class="flex flex-col gap-6">

            <!-- Summary KPI Cards -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <div class="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                  <span class="text-xs font-bold uppercase tracking-wider">{{ 'reports.sales.totalRevenue' | transloco }}</span>
                  <div class="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <mat-icon svgIcon="dollar-sign" class="icon-size-4"></mat-icon>
                  </div>
                </div>
                <div class="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  RD$ {{ (salesData()?.summary?.totalVentas || 0) | number:'1.2-2' }}
                </div>
                <span class="mt-1 block text-xs text-neutral-400">
                  {{ salesData()?.summary?.totalFacturas }} {{ 'reports.sales.invoicesCount' | transloco }}
                </span>
              </div>

              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <div class="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                  <span class="text-xs font-bold uppercase tracking-wider">{{ 'reports.sales.itbisCollected' | transloco }}</span>
                  <div class="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <mat-icon svgIcon="percent" class="icon-size-4"></mat-icon>
                  </div>
                </div>
                <div class="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  RD$ {{ (salesData()?.summary?.totalItbis || 0) | number:'1.2-2' }}
                </div>
                <span class="mt-1 block text-xs text-neutral-400">{{ 'reports.sales.taxDeducted' | transloco }}</span>
              </div>

              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <div class="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                  <span class="text-xs font-bold uppercase tracking-wider">{{ 'reports.sales.avgTicket' | transloco }}</span>
                  <div class="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                    <mat-icon svgIcon="shopping-cart" class="icon-size-4"></mat-icon>
                  </div>
                </div>
                <div class="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  RD$ {{ (salesData()?.summary?.promedioTicket || 0) | number:'1.2-2' }}
                </div>
                <span class="mt-1 block text-xs text-neutral-400">{{ 'reports.sales.perInvoice' | transloco }}</span>
              </div>

              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <div class="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                  <span class="text-xs font-bold uppercase tracking-wider">{{ 'reports.sales.discounts' | transloco }}</span>
                  <div class="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    <mat-icon svgIcon="tag" class="icon-size-4"></mat-icon>
                  </div>
                </div>
                <div class="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  RD$ {{ (salesData()?.summary?.totalDescuento || 0) | number:'1.2-2' }}
                </div>
                <span class="mt-1 block text-xs text-neutral-400">{{ 'reports.sales.discountsGiven' | transloco }}</span>
              </div>
            </div>

            <!-- Time-Series Chart & Payment Methods Breakdown -->
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">

              <!-- Sales Timeline Chart -->
              <div class="lg:col-span-2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <h3 class="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center justify-between">
                  <span>{{ 'reports.sales.timeline' | transloco }}</span>
                  <span class="text-xs font-normal text-neutral-400">{{ salesData()?.timeSeries?.length || 0 }} {{ 'reports.sales.dataPoints' | transloco }}</span>
                </h3>

                <div *ngIf="salesData()?.timeSeries?.length === 0" class="flex h-48 items-center justify-center text-sm text-neutral-400">
                  {{ 'reports.noDataForPeriod' | transloco }}
                </div>

                <!-- SVG Bar Chart -->
                <div *ngIf="(salesData()?.timeSeries?.length || 0) > 0" class="h-64 flex items-end gap-2 pt-6 pb-2 overflow-x-auto">
                  <div
                    *ngFor="let point of salesData()?.timeSeries"
                    class="flex flex-col items-center flex-1 min-w-[32px] group relative h-full justify-end"
                  >
                    <!-- Tooltip -->
                    <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-neutral-900 text-white text-[10px] rounded-lg px-2 py-1.5 z-20 pointer-events-none shadow-lg whitespace-nowrap">
                      <span class="font-bold">RD$ {{ point.total | number:'1.2-2' }}</span>
                      <span class="text-neutral-400">{{ point.date }} ({{ point.count }} facturas)</span>
                    </div>

                    <!-- Bar -->
                    <div
                      class="w-full rounded-t-lg bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer"
                      [style.height.%]="getBarHeightPercent(point.total, maxSalesPoint())"
                    ></div>
                    <span class="mt-2 text-[10px] font-mono text-neutral-400 truncate w-full text-center">{{ point.date | slice:5:10 }}</span>
                  </div>
                </div>
              </div>

              <!-- Payment Methods Breakdown -->
              <div class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <h3 class="text-base font-bold text-neutral-900 dark:text-white mb-4">
                  {{ 'reports.sales.byPaymentMethod' | transloco }}
                </h3>
                <div class="flex flex-col gap-4">
                  <div *ngFor="let pm of salesData()?.paymentMethods" class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between text-xs font-bold">
                      <span class="text-neutral-700 dark:text-neutral-300">{{ pm.metodo }}</span>
                      <span class="text-neutral-900 dark:text-white">RD$ {{ pm.total | number:'1.2-2' }}</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        class="h-full rounded-full bg-blue-600"
                        [style.width.%]="salesData()?.summary?.totalVentas ? (pm.total / salesData()!.summary.totalVentas) * 100 : 0"
                      ></div>
                    </div>
                    <span class="text-[10px] text-neutral-400 text-right">{{ pm.count }} transacciones</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          <!-- ================= TAB 2: TOP PRODUCTOS ================= -->
          <div *ngIf="activeTab() === 'top-products' && topProductsData()" class="flex flex-col gap-6">

            <div class="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
              <div class="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
                  {{ 'reports.topProducts.ranking' | transloco }}
                </h3>
                <span class="text-xs text-neutral-500">{{ topProductsData()?.topProducts?.length }} productos analizados</span>
              </div>

              <div class="overflow-x-auto">
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
                    <tr *ngFor="let p of topProductsData()?.topProducts; let i = index" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
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
          <div *ngIf="activeTab() === 'receivables' && receivablesData()" class="flex flex-col gap-6">

            <!-- Aging Summary Cards -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">0 - 30 Días (Corriente)</span>
                <div class="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  RD$ {{ (receivablesData()?.summary?.aging?.corriente || 0) | number:'1.2-2' }}
                </div>
              </div>
              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-500">31 - 60 Días</span>
                <div class="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  RD$ {{ (receivablesData()?.summary?.aging?.de31a60 || 0) | number:'1.2-2' }}
                </div>
              </div>
              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <span class="text-xs font-bold uppercase tracking-wider text-orange-500">61 - 90 Días</span>
                <div class="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  RD$ {{ (receivablesData()?.summary?.aging?.de61a90 || 0) | number:'1.2-2' }}
                </div>
              </div>
              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <span class="text-xs font-bold uppercase tracking-wider text-rose-600">Más de 90 Días</span>
                <div class="mt-2 text-2xl font-extrabold text-rose-600">
                  RD$ {{ (receivablesData()?.summary?.aging?.masDe90 || 0) | number:'1.2-2' }}
                </div>
              </div>
            </div>

            <!-- Debtor Ranking -->
            <div class="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
              <div class="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
                  {{ 'reports.receivables.debtorClients' | transloco }}
                </h3>
                <span class="text-xs font-bold text-rose-600">
                  Total Pendiente: RD$ {{ (receivablesData()?.summary?.totalPendiente || 0) | number:'1.2-2' }}
                </span>
              </div>

              <div class="overflow-x-auto">
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
                    <tr *ngFor="let d of receivablesData()?.topDebtors" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
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
          <div *ngIf="activeTab() === 'inventory' && inventoryData()" class="flex flex-col gap-6">

            <!-- Summary KPI Cards -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <span class="text-xs font-bold uppercase tracking-wider text-neutral-500">{{ 'reports.inventory.totalCostValue' | transloco }}</span>
                <div class="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  RD$ {{ (inventoryData()?.summary?.totalValorCosto || 0) | number:'1.2-2' }}
                </div>
              </div>
              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <span class="text-xs font-bold uppercase tracking-wider text-neutral-500">{{ 'reports.inventory.totalRetailValue' | transloco }}</span>
                <div class="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
                  RD$ {{ (inventoryData()?.summary?.totalValorVenta || 0) | number:'1.2-2' }}
                </div>
              </div>
              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-600">{{ 'reports.inventory.potentialProfit' | transloco }}</span>
                <div class="mt-2 text-2xl font-extrabold text-emerald-600">
                  RD$ {{ (inventoryData()?.summary?.gananciaPotencial || 0) | number:'1.2-2' }}
                </div>
              </div>
              <div class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                <span class="text-xs font-bold uppercase tracking-wider text-rose-600">{{ 'reports.inventory.lowStockAlerts' | transloco }}</span>
                <div class="mt-2 text-2xl font-extrabold text-rose-600">
                  {{ inventoryData()?.summary?.alertaBajoStockCount || 0 }} productos
                </div>
              </div>
            </div>

            <!-- Low Stock Items Table -->
            <div *ngIf="(inventoryData()?.lowStockItems?.length || 0) > 0" class="rounded-2xl border border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20 p-6">
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
                    <tr *ngFor="let item of inventoryData()?.lowStockItems">
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
          <div *ngIf="activeTab() === 'clients' && clientsData()" class="flex flex-col gap-6">

            <div class="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
              <div class="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
                  {{ 'reports.clients.rankingTitle' | transloco }}
                </h3>
                <span class="text-xs text-neutral-500 font-semibold">
                  Gran Total: RD$ {{ (clientsData()?.grandTotal || 0) | number:'1.2-2' }}
                </span>
              </div>

              <div class="overflow-x-auto">
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
                    <tr *ngFor="let c of clientsData()?.clients; let idx = index" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
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

        </div>

      </div>

    </div>
  `,
})
export default class ReportsComponent implements OnInit {
  reportsService = inject(ReportsService);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  activeTab = signal<ReportTab>('sales');
  selectedDatePreset = 'thisMonth';
  dateFrom = '';
  dateTo = '';

  tabs = [
    { key: 'sales' as ReportTab, label: 'reports.tabs.sales', icon: 'trending-up' },
    { key: 'top-products' as ReportTab, label: 'reports.tabs.topProducts', icon: 'package' },
    { key: 'receivables' as ReportTab, label: 'reports.tabs.receivables', icon: 'clock' },
    { key: 'inventory' as ReportTab, label: 'reports.tabs.inventory', icon: 'boxes' },
    { key: 'clients' as ReportTab, label: 'reports.tabs.clients', icon: 'users' },
  ];

  salesData = this.reportsService.salesReport;
  topProductsData = this.reportsService.topProductsReport;
  receivablesData = this.reportsService.receivablesReport;
  inventoryData = this.reportsService.inventoryReport;
  clientsData = this.reportsService.salesByClientReport;

  maxSalesPoint = computed(() => {
    const points = this.salesData()?.timeSeries || [];
    if (points.length === 0) return 1;
    return Math.max(...points.map((p) => p.total), 1);
  });

  ngOnInit(): void {
    this.applyDatePreset('thisMonth');
    this.loadActiveReport();
  }

  setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    this.loadActiveReport();
  }

  onPresetChange(preset: string): void {
    if (preset !== 'custom') {
      this.applyDatePreset(preset);
      this.loadActiveReport();
    }
  }

  applyDatePreset(preset: string): void {
    const now = new Date();
    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      this.dateFrom = todayStr;
      this.dateTo = todayStr;
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      this.dateFrom = firstDay.toISOString().split('T')[0];
      this.dateTo = now.toISOString().split('T')[0];
    } else if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      this.dateFrom = firstDayLastMonth.toISOString().split('T')[0];
      this.dateTo = lastDayLastMonth.toISOString().split('T')[0];
    } else if (preset === 'thisYear') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      this.dateFrom = firstDayYear.toISOString().split('T')[0];
      this.dateTo = now.toISOString().split('T')[0];
    }
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
    }
  }

  getBarHeightPercent(value: number, max: number): number {
    if (max <= 0) return 5;
    const pct = Math.round((value / max) * 100);
    return Math.max(8, pct);
  }

  printReport(): void {
    window.print();
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
