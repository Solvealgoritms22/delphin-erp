import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DashboardService, DashboardSummary } from '../../data/dashboard.service';

type DashboardMetric = {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
  share: number;
  percentage: number;
  icon: string;
  colorClass: string;
  bgClass: string;
  pillBg: string;
};

@Component({
  selector: 'app-dashboard-general',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-full w-full flex-col min-h-0 overflow-hidden',
  },
  imports: [
    DecimalPipe,
    NgClass,
    MatIconModule,
    MatTooltipModule,
    RouterLink,
    TranslocoPipe,
  ],
  template: `
    <div
      class="flex h-full w-full flex-col min-h-0 bg-neutral-50/50 dark:bg-neutral-950 overflow-hidden"
    >
      <!-- Header (Fixed) -->
      <header
        class="shrink-0 flex flex-col gap-4 border-b border-neutral-200 px-6 py-6 dark:border-neutral-800 bg-white dark:bg-neutral-900 md:flex-row md:items-center md:justify-between md:px-8 select-none z-10"
      >
        <div>
          <h1
            class="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'dashboard.general.title' | transloco }}
          </h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'dashboard.general.description' | transloco }}
          </p>
        </div>
      </header>

      <!-- Main Content (Scrollable) -->
      <main
        class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-6 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto"
      >
        @if (loading()) {
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            @for (_ of [1, 2, 3, 4]; track _) {
              <div
                class="h-36 animate-pulse rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 space-y-3"
              >
                <div class="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                <div class="h-8 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800"></div>
              </div>
            }
          </div>
          <div
            class="h-80 animate-pulse rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          ></div>
        } @else if (error()) {
          <section
            class="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900 shadow-xs"
          >
            <div
              class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400"
            >
              <mat-icon svgIcon="alert-triangle" class="icon-size-6"></mat-icon>
            </div>
            <h2
              class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white"
            >
              {{ 'dashboard.general.loadError' | transloco }}
            </h2>
            <p
              class="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm"
            >
              {{ 'dashboard.general.loadErrorDescription' | transloco }}
            </p>
            <div class="mt-6">
              <button
                type="button"
                (click)="loadSummary()"
                class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 cursor-pointer"
              >
                <mat-icon svgIcon="refresh-cw" class="icon-size-4"></mat-icon>
                <span>{{ 'common.retry' | transloco }}</span>
              </button>
            </div>
          </section>
        } @else {
          <!-- KPI Cards Row -->
          <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            @for (metric of metrics(); track metric.key) {
              <article
                class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between min-h-[135px]"
              >
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 truncate"
                  >
                    {{ metric.label }}
                  </span>
                  <div
                    class="size-9 rounded-xl flex items-center justify-center shrink-0"
                    [ngClass]="metric.pillBg"
                  >
                    <mat-icon
                      [svgIcon]="metric.icon"
                      class="icon-size-4.5"
                      [ngClass]="metric.colorClass"
                    ></mat-icon>
                  </div>
                </div>
                <div class="mt-4">
                  <p
                    class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
                  >
                    {{ metric.value | number }}
                  </p>
                  <p
                    class="mt-1 text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5"
                  >
                    <span class="font-semibold" [ngClass]="metric.colorClass">
                      {{ metric.percentage }}%
                    </span>
                    <span>{{ 'dashboard.general.ofTotal' | transloco }}</span>
                  </p>
                </div>
              </article>
            }
          </section>

          <!-- Main Overview & Distribution Section -->
          <section
            class="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs"
          >
            <!-- Panel Header -->
            <div
              class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800"
            >
              <div
                class="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white"
              >
                <mat-icon
                  svgIcon="activity"
                  class="icon-size-4.5 text-blue-600 dark:text-blue-400"
                ></mat-icon>
                {{ 'dashboard.general.recordsOverview' | transloco }}
              </div>
              <button
                type="button"
                (click)="loadSummary()"
                [matTooltip]="'common.refresh' | transloco"
                class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <mat-icon svgIcon="refresh-cw" class="icon-size-4"></mat-icon>
              </button>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-12 min-w-0">
              <!-- Left Chart Area (8 cols on XL) -->
              <div
                class="xl:col-span-8 p-6 sm:p-8 flex flex-col justify-between min-w-0"
              >
                <div>
                  <h2
                    class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white"
                  >
                    {{ 'dashboard.general.areaDistribution' | transloco }}
                  </h2>
                  <p
                    class="mt-1 text-sm text-neutral-500 dark:text-neutral-400"
                  >
                    {{ 'dashboard.general.distributionDescription' | transloco }}
                  </p>
                </div>

                <!-- Responsive Vertical Bars Container -->
                <div class="relative mt-8 h-64 sm:h-72 flex flex-col justify-end">
                  <!-- Dashed guide lines -->
                  <div
                    class="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex justify-between"
                  >
                    <span class="text-[10px] text-neutral-400 font-medium -mt-2">100%</span>
                  </div>
                  <div
                    class="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex justify-between"
                  >
                    <span class="text-[10px] text-neutral-400 font-medium -mt-2">50%</span>
                  </div>
                  <div
                    class="pointer-events-none absolute inset-x-0 bottom-14 border-t border-neutral-200 dark:border-neutral-800 flex justify-between"
                  ></div>

                  <!-- 4-Column Responsive Grid -->
                  <div
                    class="grid h-full grid-cols-4 items-end gap-2 sm:gap-4 md:gap-6 px-1 sm:px-4 pt-4 min-w-0"
                  >
                    @for (metric of metrics(); track metric.key) {
                      <div
                        class="flex h-full flex-col items-center justify-end min-w-0 w-full"
                      >
                        <!-- Top Percentage Badge -->
                        <span
                          class="mb-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 shrink-0"
                        >
                          {{ metric.percentage }}%
                        </span>

                        <!-- Animated Color Bar -->
                        <div
                          class="w-full flex-1 flex flex-col justify-end items-center max-h-[160px] sm:max-h-[190px]"
                        >
                          <div
                            class="w-full max-w-[36px] sm:max-w-[48px] md:max-w-[56px] rounded-t-xl transition-all duration-500 shadow-xs"
                            [ngClass]="metric.bgClass"
                            [style.height.%]="metric.share || 4"
                            [matTooltip]="metric.label + ': ' + (metric.value | number) + ' (' + metric.percentage + '%)'"
                          ></div>
                        </div>

                        <!-- Bottom Category Label & Count (Always Truncated Cleanly) -->
                        <div
                          class="w-full min-w-0 text-center mt-3 shrink-0 h-10 flex flex-col justify-start"
                        >
                          <span
                            class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate w-full"
                            [matTooltip]="metric.label"
                          >
                            {{ metric.shortLabel }}
                          </span>
                          <span
                            class="block text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 truncate"
                          >
                            {{ metric.value | number }}
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- Right Summary & Progress Breakdown Area (4 cols on XL) -->
              <aside
                class="xl:col-span-4 border-t xl:border-t-0 xl:border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 p-6 sm:p-8 flex flex-col justify-between gap-6 min-w-0"
              >
                <div>
                  <h3
                    class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                  >
                    {{ 'dashboard.general.totalTracked' | transloco }}
                  </h3>
                  <p
                    class="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
                  >
                    {{ totalRecords() | number }}
                  </p>
                  <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {{ 'dashboard.general.systemTotalEntities' | transloco }}
                  </p>

                  <!-- Horizontal Progress Breakdown -->
                  <div class="mt-6 space-y-3.5 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                    @for (metric of metrics(); track metric.key) {
                      <div class="space-y-1.5">
                        <div class="flex items-center justify-between text-xs">
                          <div class="flex items-center gap-1.5 min-w-0 truncate">
                            <mat-icon
                              [svgIcon]="metric.icon"
                              class="icon-size-3.5 shrink-0"
                              [ngClass]="metric.colorClass"
                            ></mat-icon>
                            <span
                              class="font-medium text-neutral-700 dark:text-neutral-300 truncate"
                            >
                              {{ metric.label }}
                            </span>
                          </div>
                          <div
                            class="flex items-center gap-1.5 shrink-0 font-semibold"
                          >
                            <span class="text-neutral-900 dark:text-white">
                              {{ metric.value | number }}
                            </span>
                            <span
                              class="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal"
                            >
                              ({{ metric.percentage }}%)
                            </span>
                          </div>
                        </div>
                        <div
                          class="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden"
                        >
                          <div
                            class="h-full rounded-full transition-all duration-500"
                            [ngClass]="metric.bgClass"
                            [style.width.%]="metric.percentage"
                          ></div>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Footer Hint & System Status -->
                <div
                  class="pt-4 border-t border-neutral-200 dark:border-neutral-800"
                >
                  <div
                    class="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300"
                  >
                    <span class="font-medium">
                      {{ 'dashboard.general.systemHealth' | transloco }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      <span
                        class="size-2 rounded-full bg-emerald-500 animate-pulse"
                      ></span>
                      100%
                    </span>
                  </div>
                  <p
                    class="mt-2 text-xs leading-relaxed text-neutral-400 dark:text-neutral-500"
                  >
                    {{ 'dashboard.general.activeCompanyHint' | transloco }}
                  </p>
                </div>
              </aside>
            </div>
          </section>

          <!-- Quick Insights and Shortcuts Card -->
          <section
            class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white"
              >
                <mat-icon
                  svgIcon="sparkles"
                  class="icon-size-4.5 text-blue-600 dark:text-blue-400"
                ></mat-icon>
                {{ 'dashboard.general.quickInsight' | transloco }}
              </div>
            </div>
            <p
              class="max-w-4xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300"
            >
              {{ summaryMessage() }}
            </p>
            <div class="mt-5 flex flex-wrap gap-2.5">
              <a
                routerLink="/admin/commercial/clients"
                class="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs"
              >
                <mat-icon
                  svgIcon="user-check"
                  class="icon-size-3.5 text-emerald-600 dark:text-emerald-400"
                ></mat-icon>
                {{ 'dashboard.general.reviewClients' | transloco }}
              </a>
              <a
                routerLink="/admin/catalogs/products"
                class="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs"
              >
                <mat-icon
                  svgIcon="package"
                  class="icon-size-3.5 text-indigo-600 dark:text-indigo-400"
                ></mat-icon>
                {{ 'dashboard.general.reviewProducts' | transloco }}
              </a>
              <a
                routerLink="/admin/commercial/suppliers"
                class="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs"
              >
                <mat-icon
                  svgIcon="truck"
                  class="icon-size-3.5 text-amber-600 dark:text-amber-400"
                ></mat-icon>
                {{ 'dashboard.general.reviewSuppliers' | transloco }}
              </a>
            </div>
            <p class="mt-4 text-[11px] text-neutral-400 dark:text-neutral-500">
              {{ 'dashboard.general.updatedOnOpen' | transloco }}
            </p>
          </section>
        }
      </main>
    </div>
  `,
})
export class DashboardGeneralComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  private readonly currentLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  readonly metrics = computed<DashboardMetric[]>(() => {
    this.currentLang();
    const summary = this.summary();
    const totalUsers = summary?.totalUsers ?? 0;
    const totalClients = summary?.totalClients ?? 0;
    const totalProducts = summary?.totalProducts ?? 0;
    const totalSuppliers = summary?.totalSuppliers ?? 0;
    const total = totalUsers + totalClients + totalProducts + totalSuppliers;

    const items = [
      {
        key: 'users',
        label: this.transloco.translate('dashboard.general.users'),
        shortLabel: this.transloco.translate('dashboard.general.usersShort'),
        value: totalUsers,
        icon: 'users',
        colorClass: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-600 dark:bg-blue-500',
        pillBg: 'bg-blue-50 dark:bg-blue-900/30',
      },
      {
        key: 'clients',
        label: this.transloco.translate('dashboard.general.clients'),
        shortLabel: this.transloco.translate('dashboard.general.clientsShort'),
        value: totalClients,
        icon: 'user-check',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-600 dark:bg-emerald-500',
        pillBg: 'bg-emerald-50 dark:bg-emerald-900/30',
      },
      {
        key: 'products',
        label: this.transloco.translate('dashboard.general.products'),
        shortLabel: this.transloco.translate('dashboard.general.productsShort'),
        value: totalProducts,
        icon: 'package',
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgClass: 'bg-indigo-600 dark:bg-indigo-500',
        pillBg: 'bg-indigo-50 dark:bg-indigo-900/30',
      },
      {
        key: 'suppliers',
        label: this.transloco.translate('dashboard.general.suppliers'),
        shortLabel: this.transloco.translate('dashboard.general.suppliersShort'),
        value: totalSuppliers,
        icon: 'truck',
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-600 dark:bg-amber-500',
        pillBg: 'bg-amber-50 dark:bg-amber-900/30',
      },
    ];

    const max = Math.max(...items.map((item) => item.value), 1);

    return items.map((item) => {
      const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
      const share = item.value > 0 ? Math.max((item.value / max) * 100, 6) : 0;
      return {
        ...item,
        percentage,
        share,
      };
    });
  });

  readonly totalRecords = computed(() =>
    this.metrics().reduce((total, item) => total + item.value, 0)
  );

  readonly summaryMessage = computed(() => {
    this.currentLang();
    const total = this.totalRecords();
    const summary = this.summary();
    if (!total) {
      return this.transloco.translate('dashboard.general.emptySummary');
    }
    return this.transloco.translate('dashboard.general.summary', {
      total: total.toLocaleString(),
      clients: summary?.totalClients ?? 0,
      products: summary?.totalProducts ?? 0,
      suppliers: summary?.totalSuppliers ?? 0,
      users: summary?.totalUsers ?? 0,
    });
  });

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading.set(true);
    this.error.set(false);
    this.dashboardService
      .getSummary()
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
}
