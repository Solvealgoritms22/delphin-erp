import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardSummary } from '../../data/dashboard.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RotateCcwIcon, ActivityIcon, SparklesIcon, RefreshCwIcon } from 'ng-animated-icons';
import { ExchangeRatesComponent } from '@shared/components/exchange-rates/exchange-rates.component';

interface DashboardMetric {
  label: string;
  value: number;
  share: number;
}

@Component({
  selector: 'app-dashboard-general',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-full w-full flex-col min-h-0 overflow-hidden',
  },
  imports: [
    DecimalPipe,
    MatIconModule,
    RouterLink,
    TranslocoPipe,
    RotateCcwIcon,
    ActivityIcon,
    SparklesIcon,
    RefreshCwIcon,
    ExchangeRatesComponent,
  ],
  template: `
    <div class="flex h-full w-full flex-col min-h-0 bg-white dark:bg-neutral-950 overflow-hidden">

      <header class="shrink-0 flex flex-col gap-5 border-b border-neutral-200 px-6 py-7 dark:border-neutral-800 md:flex-row md:items-end md:justify-between md:px-10 select-none">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white md:text-3xl">{{ 'dashboard.general.title' | transloco }}</h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'dashboard.general.description' | transloco }}</p>
        </div>
      </header>

      <main class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-6 p-6 md:p-10">
        @if (loading()) {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (_ of [1, 2, 3, 4]; track _) {
              <div class="h-36 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900"></div>
            }
          </div>
          <div class="h-[430px] animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-900"></div>
        } @else if (error()) {
          <section class="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-neutral-200/80 bg-neutral-50/50 p-8 text-center dark:border-neutral-800/80 dark:bg-neutral-900/40">

            <div class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60 shadow-xs">
              <i-rotate-ccw [size]="26" class="text-neutral-500 dark:text-neutral-400" />
            </div>

            <h2 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              {{ 'dashboard.general.loadError' | transloco }}
            </h2>
            <p class="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
              {{ 'dashboard.general.loadErrorDescription' | transloco }}
            </p>

            <div class="mt-6">
              <button
                type="button"
                (click)="loadSummary()"
                class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 cursor-pointer"
              >
                <i-rotate-ccw [size]="16" />
                <span>{{ 'common.retry' | transloco }}</span>
              </button>
            </div>
          </section>
        } @else {

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

          <section class="rounded-3xl bg-neutral-100 p-1 dark:bg-neutral-900">
            <div class="flex items-center justify-between px-4 py-3 md:px-5">
              <div class="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                <i-activity [size]="16" class="text-neutral-500" />
                {{ 'dashboard.general.recordsOverview' | transloco }}
              </div>
              <button type="button" class="text-neutral-400 transition hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer" [attr.aria-label]="'dashboard.general.moreOptions' | transloco">
                <mat-icon svgIcon="ellipsis-vertical" class="icon-size-4"></mat-icon>
              </button>
            </div>

            <div class="grid overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div class="p-6 md:p-8">
                <h2 class="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">{{ 'dashboard.general.areaDistribution' | transloco }}</h2>
                <p class="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">{{ 'dashboard.general.distributionDescription' | transloco }}</p>

                <div class="relative mt-10 h-64 border-b border-neutral-200 dark:border-neutral-800">
                  <div class="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-neutral-200 dark:border-neutral-800"></div>
                  <div class="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-neutral-200 dark:border-neutral-800"></div>

                  <div class="grid h-full grid-cols-4 items-end gap-2 sm:gap-4 px-2 pt-6 min-w-0">
                    @for (metric of metrics(); track metric.label) {
                      <div class="flex h-full flex-col items-center justify-end min-w-0 w-full">
                        <span class="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">{{ metric.share }}%</span>
                        <div class="w-full max-w-[48px] rounded-t-xl bg-neutral-900 dark:bg-white transition-all duration-500" [style.height.%]="metric.share"></div>
                        <span class="mt-3 truncate text-xs text-neutral-500 dark:text-neutral-400 w-full text-center block max-w-full" [title]="metric.label">{{ shortLabel(metric.label) }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <aside class="flex flex-col justify-between border-t border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900/50 lg:border-t-0 lg:border-l">
                <div>
                  <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">{{ 'dashboard.general.totalTracked' | transloco }}</h3>
                  <p class="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">{{ totalRecords() | number }}</p>
                  <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{{ 'dashboard.general.systemTotalEntities' | transloco }}</p>
                </div>

                <div class="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
                  <div class="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
                    <span>{{ 'dashboard.general.systemHealth' | transloco }}</span>
                    <span class="font-semibold text-emerald-600 dark:text-emerald-400">100%</span>
                  </div>
                  <p class="mt-3 text-xs leading-5 text-neutral-400 dark:text-neutral-500">{{ 'dashboard.general.activeCompanyHint' | transloco }}</p>
                </div>
              </aside>
            </div>
          </section>

          <section class="rounded-3xl bg-neutral-100 p-1 dark:bg-neutral-900">
            <div class="flex items-center justify-between px-4 py-3 md:px-5">
              <div class="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                <i-sparkles [size]="16" class="text-blue-600" />
                {{ 'dashboard.general.quickInsight' | transloco }}
              </div>
              <i-refresh-cw [size]="16" class="text-neutral-400" />
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

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            <app-exchange-rates class="w-full" />

            <div class="flex flex-col gap-6 w-full">
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class DashboardGeneralComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

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
    this.dashboardService.getSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
