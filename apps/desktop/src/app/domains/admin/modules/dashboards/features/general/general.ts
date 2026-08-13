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
          <section class="relative flex min-h-[460px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-neutral-50/50 p-8 text-center backdrop-blur-sm dark:border-neutral-800/80 dark:bg-neutral-900/40">
            <!-- Ambient Background Glow -->
            <div class="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-500/10 via-rose-500/10 to-transparent blur-3xl"></div>

            <!-- Illustration: Disconnected Server / Cloud -->
            <div class="relative mb-6 flex size-36 items-center justify-center">
              <!-- Animated Pulse Rings -->
              <div class="absolute inset-0 rounded-full bg-rose-500/5 dark:bg-rose-500/10 animate-ping opacity-30"></div>
              <div class="absolute inset-2 rounded-full bg-gradient-to-b from-neutral-100 to-white dark:from-neutral-800 dark:to-neutral-900 shadow-xl border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center">
                <!-- SVG Illustration -->
                <svg class="size-20" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Server Rack 1 -->
                  <rect x="18" y="16" width="44" height="12" rx="4" class="fill-neutral-200/80 dark:fill-neutral-700/80 stroke-neutral-300 dark:stroke-neutral-600" stroke-width="1.5"/>
                  <circle cx="25" cy="22" r="2" class="fill-emerald-500"/>
                  <circle cx="31" cy="22" r="2" class="fill-blue-500"/>
                  <line x1="40" y1="22" x2="54" y2="22" class="stroke-neutral-300 dark:stroke-neutral-600" stroke-width="2" stroke-linecap="round"/>

                  <!-- Server Rack 2 -->
                  <rect x="18" y="32" width="44" height="12" rx="4" class="fill-neutral-200/80 dark:fill-neutral-700/80 stroke-neutral-300 dark:stroke-neutral-600" stroke-width="1.5"/>
                  <circle cx="25" cy="38" r="2" class="fill-amber-500"/>
                  <circle cx="31" cy="38" r="2" class="fill-neutral-400 dark:fill-neutral-600"/>
                  <line x1="40" y1="38" x2="54" y2="38" class="stroke-neutral-300 dark:stroke-neutral-600" stroke-width="2" stroke-linecap="round"/>

                  <!-- Server Rack 3 (Affected) -->
                  <rect x="18" y="48" width="44" height="12" rx="4" class="fill-neutral-200/80 dark:fill-neutral-700/80 stroke-rose-400/60 dark:stroke-rose-500/60" stroke-width="1.5"/>
                  <circle cx="25" cy="54" r="2" class="fill-rose-500"/>
                  <circle cx="31" cy="54" r="2" class="fill-rose-500/60"/>
                  <line x1="40" y1="54" x2="54" y2="54" class="stroke-rose-400/60 dark:stroke-rose-500/60" stroke-width="2" stroke-linecap="round"/>

                  <!-- Cloud / Signal Break Floating Badge -->
                  <g class="drop-shadow-lg">
                    <circle cx="56" cy="24" r="14" class="fill-white dark:fill-neutral-800 stroke-rose-500/30 dark:stroke-rose-500/40" stroke-width="1.5"/>
                    <path d="M51 29L61 19M51 19L61 29" class="stroke-rose-500" stroke-width="2.5" stroke-linecap="round"/>
                  </g>
                </svg>
              </div>
            </div>

            <!-- Error Status Pill -->
            <div class="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <span class="size-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              Conexión no disponible
            </div>

            <!-- Error Title & Description -->
            <h2 class="mt-3 text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              {{ 'dashboard.general.loadError' | transloco }}
            </h2>
            <p class="mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {{ 'dashboard.general.apiHint' | transloco }}
            </p>

            <!-- Action Button -->
            <div class="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                (click)="loadSummary()"
                class="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <mat-icon svgIcon="rotate-ccw" class="icon-size-4 transition-transform group-hover:-rotate-45"></mat-icon>
                <span>{{ 'common.retry' | transloco }}</span>
              </button>
            </div>
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
