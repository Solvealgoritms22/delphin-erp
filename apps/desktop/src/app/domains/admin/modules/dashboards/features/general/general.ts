import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardSummary } from '../../data/dashboard.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

interface DashboardMetric {
  label: string;
  value: number;
  share: number;
}

@Component({
  selector: 'app-dashboard-general',
  standalone: true,
  host: {
    class: 'flex h-full w-full flex-col min-h-0 overflow-hidden',
  },
  imports: [DecimalPipe, MatIconModule, RouterLink, TranslocoPipe],
  template: `
    <div class="flex h-full w-full flex-col min-h-0 bg-white dark:bg-neutral-950 overflow-hidden">
      <!-- Header (Fixed) -->
      <header class="shrink-0 flex flex-col gap-5 border-b border-neutral-200 px-6 py-7 dark:border-neutral-800 md:flex-row md:items-end md:justify-between md:px-10 select-none">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white md:text-3xl">{{ 'dashboard.general.title' | transloco }}</h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'dashboard.general.description' | transloco }}</p>
        </div>
      </header>

      <!-- Main Content (Scrollable) -->
      <main class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-6 p-6 md:p-10">
        @if (loading()) {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (_ of [1, 2, 3, 4]; track _) {
              <div class="h-36 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900"></div>
            }
          </div>
          <div class="h-[430px] animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-900"></div>
        } @else if (error()) {
          <section class="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-neutral-200 bg-neutral-50 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <p class="text-lg font-semibold text-neutral-900 dark:text-white">{{ 'dashboard.general.loadError' | transloco }}</p>
            <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{{ 'dashboard.general.apiHint' | transloco }}</p>
            <button type="button" (click)="loadSummary()" class="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{{ 'common.retry' | transloco }}</button>
          </section>
        } @else {
          <!-- KPI row -->
          <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (metric of metrics(); track metric.label) {
              <article class="rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-900">
                <div class="flex h-full min-h-[132px] flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                  <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ metric.label }}</p>
                  <div>
                    <p class="mt-5 text-4xl font-semibold tracking-tight text-neutral-950 dark:text-white">{{ metric.value | number }}</p>
                    <p class="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{{ percentageOfTotal(metric.value) }}% {{ 'dashboard.general.ofTotal' | transloco }}</p>
                  </div>
                </div>
              </article>
            }
          </section>

          <!-- Main overview panel -->
          <section class="rounded-3xl bg-neutral-100 p-1 dark:bg-neutral-900">
            <div class="flex items-center justify-between px-4 py-3 md:px-5">
              <div class="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                <mat-icon svgIcon="activity" class="icon-size-4 text-neutral-500"></mat-icon>
                {{ 'dashboard.general.recordsOverview' | transloco }}
              </div>
              <button type="button" class="text-neutral-400 transition hover:text-neutral-700 dark:hover:text-neutral-200" [attr.aria-label]="'dashboard.general.moreOptions' | transloco">
                <mat-icon svgIcon="ellipsis-vertical" class="icon-size-4"></mat-icon>
              </button>
            </div>

            <div class="grid overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div class="p-6 md:p-8">
                <h2 class="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">{{ 'dashboard.general.areaDistribution' | transloco }}</h2>
                 <p class="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">{{ 'dashboard.general.distributionDescription' | transloco }}</p>

                <div class="relative mt-10 h-64 border-b border-neutral-200 dark:border-neutral-800">
                  <div class="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-neutral-200 dark:border-neutral-800"></div>
                  <div class="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-neutral-200 dark:border-neutral-800"></div>
                  <div class="pointer-events-none absolute inset-x-0 top-2/3 border-t border-dashed border-neutral-200 dark:border-neutral-800"></div>
                  <div class="relative flex h-full items-end justify-around gap-4 px-2 sm:gap-8 sm:px-8">
                    @for (metric of metrics(); track metric.label) {
                      <div class="flex h-full flex-1 flex-col items-center justify-end gap-3">
                        <span class="text-xs font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">{{ metric.value | number }}</span>
                        <div class="w-full max-w-20 rounded-t-lg bg-blue-600 transition-all duration-700 dark:bg-blue-500" [style.height.%]="metric.share"></div>
                        <span class="text-center text-xs text-neutral-500 dark:text-neutral-400">{{ shortLabel(metric.label) }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <aside class="border-t border-neutral-200 p-6 dark:border-neutral-800 lg:border-l lg:border-t-0">
                <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ 'dashboard.general.totalDetail' | transloco }}</p>
                <div class="mt-6 flex flex-col gap-5">
                  @for (metric of metrics(); track metric.label) {
                    <div class="flex items-center justify-between gap-3 text-sm">
                      <span class="text-neutral-500 dark:text-neutral-400">{{ metric.label }}</span>
                      <span class="font-semibold tabular-nums text-neutral-950 dark:text-white">{{ metric.value | number }}</span>
                    </div>
                  }
                </div>
                <div class="mt-8 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-neutral-500 dark:text-neutral-400">{{ 'dashboard.general.total' | transloco }}</span>
                    <span class="font-semibold tabular-nums text-neutral-950 dark:text-white">{{ totalRecords() | number }}</span>
                  </div>
                  <p class="mt-3 text-xs leading-5 text-neutral-400 dark:text-neutral-500">{{ 'dashboard.general.activeCompanyHint' | transloco }}</p>
                </div>
              </aside>
            </div>
          </section>

          <!-- Summary and actions -->
          <section class="rounded-3xl bg-neutral-100 p-1 dark:bg-neutral-900">
            <div class="flex items-center justify-between px-4 py-3 md:px-5">
              <div class="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                <mat-icon svgIcon="sparkles" class="icon-size-4 text-blue-600"></mat-icon>
                {{ 'dashboard.general.quickInsight' | transloco }}
              </div>
              <mat-icon svgIcon="refresh-cw" class="icon-size-4 text-neutral-400"></mat-icon>
            </div>
            <div class="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 md:p-7">
              <p class="max-w-4xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">{{ summaryMessage() }}</p>
              <div class="mt-5 flex flex-wrap gap-2">
                <a routerLink="/admin/commercial/clients" class="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">{{ 'dashboard.general.reviewClients' | transloco }}</a>
                <a routerLink="/admin/catalogs/products" class="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">{{ 'dashboard.general.reviewProducts' | transloco }}</a>
                <a routerLink="/admin/commercial/suppliers" class="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">{{ 'dashboard.general.reviewSuppliers' | transloco }}</a>
              </div>
              <p class="mt-5 text-xs text-neutral-400 dark:text-neutral-500">{{ 'dashboard.general.updatedOnOpen' | transloco }}</p>
            </div>
          </section>
        }
      </main>
    </div>
  `,
})
export class DashboardGeneralComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly transloco = inject(TranslocoService);

  summary = signal<DashboardSummary | null>(null);
  loading = signal(true);
  error = signal(false);

  private readonly currentLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  metrics = computed<DashboardMetric[]>(() => {
    this.currentLang();
    const summary = this.summary();
    const values = [
      { label: this.transloco.translate('dashboard.general.users'), value: summary?.totalUsers ?? 0 },
      { label: this.transloco.translate('dashboard.general.clients'), value: summary?.totalClients ?? 0 },
      { label: this.transloco.translate('dashboard.general.products'), value: summary?.totalProducts ?? 0 },
      { label: this.transloco.translate('dashboard.general.suppliers'), value: summary?.totalSuppliers ?? 0 },
    ];
    const max = Math.max(...values.map((item) => item.value), 1);
    return values.map((item) => ({
      ...item,
      share: item.value > 0 ? Math.max((item.value / max) * 100, 4) : 0,
    }));
  });

  totalRecords = computed(() => this.metrics().reduce((total, item) => total + item.value, 0));

  summaryMessage = computed(() => {
    this.currentLang();
    const total = this.totalRecords();
    const summary = this.summary();
    if (!total) return this.transloco.translate('dashboard.general.emptySummary');
    return this.transloco.translate('dashboard.general.summary', {
      total: total.toLocaleString(),
      clients: summary?.totalClients ?? 0,
      products: summary?.totalProducts ?? 0,
      suppliers: summary?.totalSuppliers ?? 0,
      users: summary?.totalUsers ?? 0
    });
  });

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading.set(true);
    this.error.set(false);
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  percentageOfTotal(value: number): number {
    const total = this.totalRecords();
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  shortLabel(label: string): string {
    return label
      .replace(' registrados', '')
      .replace(' activos', '')
      .replace(' y servicios', '')
      .replace(' registered', '')
      .replace(' active', '')
      .replace(' and services', '');
  }
}
