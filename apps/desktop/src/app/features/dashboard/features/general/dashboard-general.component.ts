import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardSummary } from '../../data/dashboard.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RotateCcwIcon, ActivityIcon, RefreshCwIcon } from 'ng-animated-icons';
import { ExchangeRatesComponent } from '@shared/components/exchange-rates/exchange-rates.component';
import { ThinkingOrbComponent } from '@shared/components/thinking-orb/thinking-orb.component';
import { MarkdownRendererComponent } from '@shared/components/markdown-renderer/markdown-renderer.component';
import { environment } from '@/environments/environment';

type DashboardMetric = {
  key: string;
  labelKey: string;
  shortLabelKey: string;
  value: number;
  share: number;
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
    MatIconModule,
    MatTooltipModule,
    RouterLink,
    TranslocoPipe,
    RotateCcwIcon,
    ActivityIcon,
    RefreshCwIcon,
    ExchangeRatesComponent,
    ThinkingOrbComponent,
    MarkdownRendererComponent,
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
            @for (metric of metrics(); track metric.key) {
              <article class="rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-900">
                <div class="flex h-full min-h-[132px] flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                  <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ metric.labelKey | transloco }}</p>
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

                  <div class="grid h-full grid-cols-4 items-end gap-2 sm:gap-4 px-2 pt-6 pb-3.5 min-w-0">
                    @for (metric of metrics(); track metric.key) {
                      <div class="flex h-full flex-col items-center justify-end min-w-0 w-full">
                        <span class="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">{{ metric.share }}%</span>
                        <div class="w-full max-w-[48px] rounded-t-xl bg-neutral-900 dark:bg-white transition-all duration-500" [style.height.%]="metric.share"></div>
                        <span class="mt-3 pb-0.5 truncate text-xs font-medium text-neutral-500 dark:text-neutral-400 w-full text-center block max-w-full" [title]="metric.shortLabelKey | transloco">{{ metric.shortLabelKey | transloco }}</span>
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

          <section class="rounded-3xl bg-neutral-100 p-1 dark:bg-neutral-900 transition-all">
            <div class="flex items-center justify-between px-4 py-3 md:px-5">
              <div class="flex items-center gap-2.5 text-sm font-semibold text-neutral-900 dark:text-white">
                <thinking-orb [size]="22" state="composing" />
                <span>{{ 'dashboard.general.quickInsight' | transloco }}</span>
                @if (isAiLoading()) {
                  <span class="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-pulse">
                    Analizando con IA...
                  </span>
                }
              </div>
              <button
                type="button"
                (click)="refreshAiInsight()"
                [disabled]="isAiLoading()"
                class="flex items-center justify-center size-8 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-40"
                [matTooltip]="'dashboard.general.refreshInsight' | transloco"
              >
                <i-refresh-cw [size]="16" [class.animate-spin]="isAiLoading()" />
              </button>
            </div>
            <div class="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 md:p-7 transition-all">
              @if (isAiLoading() && !aiInsight()) {
                <div class="flex flex-col gap-2.5 py-1">
                  <div class="h-4 w-3/4 rounded-md bg-neutral-100 dark:bg-neutral-800/80 animate-pulse"></div>
                  <div class="h-4 w-full rounded-md bg-neutral-100 dark:bg-neutral-800/80 animate-pulse"></div>
                  <div class="h-4 w-5/6 rounded-md bg-neutral-100 dark:bg-neutral-800/80 animate-pulse"></div>
                </div>
              } @else if (aiInsight()) {
                <div class="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300">
                  <markdown-renderer [content]="aiInsight()" />
                </div>
              } @else if (totalRecords() === 0) {
                <p class="max-w-4xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  {{ 'dashboard.general.emptySummary' | transloco }}
                </p>
              } @else {
                <p class="max-w-4xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  {{ 'dashboard.general.summary' | transloco: {
                    total: (totalRecords() | number),
                    clients: (summary()?.totalClients ?? 0),
                    products: (summary()?.totalProducts ?? 0),
                    suppliers: (summary()?.totalSuppliers ?? 0),
                    users: (summary()?.totalUsers ?? 0)
                  } }}
                </p>
              }

              <div class="mt-5 flex flex-wrap gap-2">
                <a routerLink="/admin/commercial/clients" class="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">{{ 'dashboard.general.reviewClients' | transloco }}</a>
                <a routerLink="/admin/catalogs/products" class="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">{{ 'dashboard.general.reviewProducts' | transloco }}</a>
                <a routerLink="/admin/commercial/suppliers" class="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">{{ 'dashboard.general.reviewSuppliers' | transloco }}</a>
              </div>

              <div class="mt-5 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
                <span>{{ aiGeneratedAt() ? ('Dolphin AI • ' + aiGeneratedAt()) : ('dashboard.general.updatedOnOpen' | transloco) }}</span>
              </div>
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
  private readonly http = inject(HttpClient);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  summary = signal<DashboardSummary | null>(null);
  loading = signal(true);
  error = signal(false);

  aiInsight = signal<string>('');
  isAiLoading = signal<boolean>(false);
  aiGeneratedAt = signal<string>('');

  metrics = computed<DashboardMetric[]>(() => {
    const summary = this.summary();
    const values = [
      {
        key: 'users',
        labelKey: 'dashboard.general.users',
        shortLabelKey: 'dashboard.general.usersShort',
        value: summary?.totalUsers ?? 0,
      },
      {
        key: 'clients',
        labelKey: 'dashboard.general.clients',
        shortLabelKey: 'dashboard.general.clientsShort',
        value: summary?.totalClients ?? 0,
      },
      {
        key: 'products',
        labelKey: 'dashboard.general.products',
        shortLabelKey: 'dashboard.general.productsShort',
        value: summary?.totalProducts ?? 0,
      },
      {
        key: 'suppliers',
        labelKey: 'dashboard.general.suppliers',
        shortLabelKey: 'dashboard.general.suppliersShort',
        value: summary?.totalSuppliers ?? 0,
      },
    ];
    const max = Math.max(...values.map((item) => item.value), 1);
    return values.map((item) => ({
      ...item,
      share: item.value > 0 ? Math.max((item.value / max) * 100, 4) : 0,
    }));
  });

  totalRecords = computed(() => this.metrics().reduce((total, item) => total + item.value, 0));

  ngOnInit(): void {
    this.loadSummary();

    // Listen to real-time language changes to re-generate AI insight in the active language
    this.transloco.langChanges$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.summary()) {
          this.generateAiInsight(this.summary());
        }
      });
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
          this.generateAiInsight(data);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  refreshAiInsight(): void {
    this.generateAiInsight(this.summary());
  }

  generateAiInsight(data?: DashboardSummary | null): void {
    const summaryData = data ?? this.summary();
    if (!summaryData) return;

    this.isAiLoading.set(true);

    const isSpanish = (this.transloco.getActiveLang() || 'es').startsWith('es');
    const prompt = isSpanish
      ? `Eres el copiloto ejecutivo de Dolphin ERP. Con base en los siguientes registros reales de la empresa:
- Clientes registrados: ${summaryData.totalClients}
- Catálogo de productos/servicios: ${summaryData.totalProducts}
- Proveedores registrados: ${summaryData.totalSuppliers}
- Usuarios activos del sistema: ${summaryData.totalUsers}

Genera un resumen ejecutivo de máximo 2 a 3 oraciones usando Markdown (puedes usar negritas para destacar números y viñetas breves). Brinda una conclusión clara sobre la capacidad operativa actual y una recomendación estratégica inmediata para impulsar el negocio.`
      : `You are the executive AI copilot for Dolphin ERP. Based on the following real company metrics:
- Registered clients: ${summaryData.totalClients}
- Products & services catalog: ${summaryData.totalProducts}
- Registered suppliers: ${summaryData.totalSuppliers}
- Active system users: ${summaryData.totalUsers}

Generate a concise executive summary (maximum 2-3 sentences) using Markdown with bold highlights. Provide a clear takeaway on current operational capacity and an immediate strategic recommendation.`;

    this.http.post<{ content?: string; message?: string }>(`${environment.apiUrl}/ai/chat`, {
      prompt,
      messages: [{ role: 'user', content: prompt }]
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const content = res?.content || res?.message || (typeof res === 'string' ? res : '');
          if (content) {
            this.aiInsight.set(content);
            const now = new Date();
            this.aiGeneratedAt.set(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
          this.isAiLoading.set(false);
        },
        error: () => {
          this.isAiLoading.set(false);
        }
      });
  }

  percentageOfTotal(value: number): number {
    const total = this.totalRecords();
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}
