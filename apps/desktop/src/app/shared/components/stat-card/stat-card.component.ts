import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

export type StatCardTrend = 'up' | 'down' | 'neutral';
export type StatCardCurvePreset = 'asc-sigmoid' | 'trough-wave' | 'peak-wave' | 's-curve';
export type StatCardColor = 'emerald' | 'rose' | 'blue' | 'amber' | 'purple' | 'indigo' | 'auto';

let nextId = 0;

@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DecimalPipe,
    NgClass,
    RouterLink,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatButtonModule,
    TranslocoPipe,
  ],
  template: `
    <div
      class="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <!-- Top Body Section -->
      <div class="flex flex-1 flex-col justify-between p-5 pb-4">
        <!-- Header: Icon, Translated Title & 3-Dots Action Menu -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            @if (icon()) {
              <mat-icon [svgIcon]="icon()" class="icon-size-4 shrink-0 text-neutral-500 dark:text-neutral-400"></mat-icon>
            } @else {
              <svg
                class="size-4 shrink-0 text-neutral-400 dark:text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            }

            <ng-content select="[slot=header-icon]" />

            <span class="truncate tracking-tight font-semibold text-neutral-800 dark:text-neutral-200">
              {{ title() || domain() || label() }}
            </span>
          </div>

          <!-- 3-Dots Action Menu Button -->
          <div>
            <button
              type="button"
              [matMenuTriggerFor]="cardMenu"
              class="flex size-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              [matTooltip]="menuTooltip() || ('dashboard.general.moreOptions' | transloco)"
            >
              <mat-icon svgIcon="ellipsis" class="icon-size-4"></mat-icon>
            </button>

            <mat-menu #cardMenu="matMenu" class="min-w-[180px]">
              @if (route()) {
                <a mat-menu-item [routerLink]="route()">
                  <mat-icon svgIcon="list" class="icon-size-4.5 mr-2 text-neutral-500"></mat-icon>
                  <span>{{ 'dashboard.general.viewRecords' | transloco }}</span>
                </a>
              }
              @if (newRoute()) {
                <a mat-menu-item [routerLink]="newRoute()">
                  <mat-icon svgIcon="plus" class="icon-size-4.5 mr-2 text-blue-600"></mat-icon>
                  <span>{{ 'dashboard.general.addNew' | transloco }}</span>
                </a>
              }
              <button mat-menu-item (click)="onRefresh()">
                <mat-icon svgIcon="refresh-cw" class="icon-size-4.5 mr-2 text-neutral-500"></mat-icon>
                <span>{{ 'common.refresh' | transloco }}</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Metric Value & SVG Sparkline Row -->
        <div class="mt-3.5 flex items-end justify-between gap-1 min-w-0">
          <!-- Metric Number & Trend Pill & Subtitle -->
          <div class="flex flex-col min-w-0 flex-1 overflow-hidden pr-0.5">
            <div class="flex items-baseline gap-1.5 flex-wrap">
              <span class="text-2xl sm:text-[28px] font-extrabold tracking-tight text-neutral-900 dark:text-white truncate max-w-full">
                {{ prefix() }}@if (isNumeric(value())) { {{ +value() | number }} } @else { {{ value() }} }{{ suffix() }}
              </span>

              <!-- Trend Pill Badge -->
              @if (trend() !== 'neutral' && trendValue()) {
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0"
                  [ngClass]="trendBadgeClass()"
                >
                  @if (trend() === 'up') {
                    <svg class="size-3 fill-current" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="8" opacity="0.2" />
                      <path d="M8 4.5l3.5 3.5h-2.5v4h-2v-4h-2.5L8 4.5z" />
                    </svg>
                  } @else {
                    <svg class="size-3 fill-current" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="8" opacity="0.2" />
                      <path d="M8 11.5l-3.5-3.5h2.5v-4h2v4h2.5L8 11.5z" />
                    </svg>
                  }
                  <span>{{ trendValue() }}</span>
                </span>
              }
            </div>

            <!-- Subtitle / Label (Clean & readable) -->
            <p class="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate max-w-full" [title]="subtitle() || label()">
              {{ subtitle() || label() }}
            </p>
          </div>

          <!-- SVG Sparkline Wave Curve -->
          <div class="relative flex h-11 w-20 sm:w-24 shrink-0 items-end justify-end overflow-hidden pb-0.5 opacity-90">
            <svg class="h-full w-full" viewBox="0 0 140 60" preserveAspectRatio="none">
              <defs>
                <linearGradient [id]="gradientId()" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" [attr.stop-color]="resolvedStrokeColor()" stop-opacity="0.22" />
                  <stop offset="100%" [attr.stop-color]="resolvedStrokeColor()" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Area Fill -->
              <path [attr.d]="curveData().areaPath" [attr.fill]="'url(#' + gradientId() + ')'" />

              <!-- Dashed Guide Line -->
              <line
                [attr.x1]="curveData().focalX"
                [attr.y1]="curveData().guideY1"
                [attr.x2]="curveData().focalX"
                [attr.y2]="curveData().guideY2"
                stroke="#d4d4d8"
                class="dark:stroke-neutral-700"
                stroke-width="1"
                stroke-dasharray="2 2"
              />

              <!-- Stroke Curve Line -->
              <path
                [attr.d]="curveData().linePath"
                fill="none"
                [attr.stroke]="resolvedStrokeColor()"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <!-- Focal Point Outer Glow -->
              <circle
                [attr.cx]="curveData().focalX"
                [attr.cy]="curveData().focalY"
                r="6"
                [attr.fill]="resolvedStrokeColor()"
                opacity="0.25"
              />

              <!-- Focal Point Solid Dot -->
              <circle
                [attr.cx]="curveData().focalX"
                [attr.cy]="curveData().focalY"
                r="3.5"
                [attr.fill]="resolvedStrokeColor()"
                stroke="#ffffff"
                class="dark:stroke-neutral-900"
                stroke-width="1.5"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Bottom Footer Action -->
      @if (actionLabel() || route()) {
        @if (route()) {
          <a
            [routerLink]="route()"
            class="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100/70 hover:text-neutral-900 dark:border-neutral-800/80 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-white cursor-pointer select-none"
          >
            <span>{{ actionLabel() }}</span>
            <mat-icon
              svgIcon="arrow-right"
              class="icon-size-3.5 text-neutral-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-neutral-900 dark:group-hover:text-white"
            ></mat-icon>
          </a>
        } @else {
          <div
            class="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 text-xs font-medium text-neutral-500 dark:border-neutral-800/80 dark:bg-neutral-900/40 dark:text-neutral-400"
          >
            <span>{{ actionLabel() }}</span>
            <mat-icon svgIcon="arrow-right" class="icon-size-3.5 text-neutral-400"></mat-icon>
          </div>
        }
      }
    </div>
  `,
})
export class StatCardComponent {
  private readonly cardId = ++nextId;

  // Title / Domain / Icon
  title = input<string>('');
  domain = input<string>('');
  label = input<string>('');
  subtitle = input<string>('');
  icon = input<string>('');
  menuTooltip = input<string>('');

  // Values
  value = input<string | number>('0');
  prefix = input<string>('');
  suffix = input<string>('');

  // Trend
  trend = input<StatCardTrend>('neutral');
  trendValue = input<string>('');
  trendLabel = input<string>('');

  // Style & Visuals
  color = input<StatCardColor>('auto');
  curvePreset = input<StatCardCurvePreset | undefined>(undefined);
  sparkline = input<number[]>([]);

  // Action / Link
  actionLabel = input<string>('');
  route = input<string | any[]>('');
  newRoute = input<string | any[]>('');

  // Events
  refresh = output<void>();

  gradientId = computed(() => `stat-card-grad-${this.cardId}`);

  isNumeric(val: unknown): boolean {
    return !isNaN(Number(val)) && val !== '' && val !== null;
  }

  resolvedColor = computed<'emerald' | 'rose' | 'blue' | 'amber' | 'purple' | 'indigo'>(() => {
    const c = this.color();
    if (c && c !== 'auto') {
      return c as 'emerald' | 'rose' | 'blue' | 'amber' | 'purple' | 'indigo';
    }
    if (this.trend() === 'down') return 'rose';
    if (this.trend() === 'up') return 'emerald';
    return 'blue';
  });

  resolvedStrokeColor = computed(() => {
    switch (this.resolvedColor()) {
      case 'emerald':
        return '#10b981';
      case 'rose':
        return '#f43f5e';
      case 'blue':
        return '#3b82f6';
      case 'amber':
        return '#f59e0b';
      case 'purple':
        return '#a855f7';
      case 'indigo':
        return '#6366f1';
      default:
        return '#10b981';
    }
  });

  trendBadgeClass = computed(() => {
    if (this.trend() === 'up') {
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40';
    }
    if (this.trend() === 'down') {
      return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40';
    }
    return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
  });

  curveData = computed(() => {
    const preset = this.curvePreset();
    const data = this.sparkline();

    // 1. If explicit preset provided
    if (preset === 'asc-sigmoid') {
      return {
        linePath: 'M 10 50 C 40 50, 60 44, 85 24 C 100 12, 115 8, 135 8',
        areaPath: 'M 10 50 C 40 50, 60 44, 85 24 C 100 12, 115 8, 135 8 L 135 60 L 10 60 Z',
        focalX: 88,
        focalY: 22,
        guideY1: 22,
        guideY2: 60,
      };
    }

    if (preset === 'trough-wave') {
      return {
        linePath: 'M 10 48 C 25 42, 35 18, 55 18 C 75 18, 85 46, 100 46 C 115 46, 125 38, 135 32',
        areaPath: 'M 10 48 C 25 42, 35 18, 55 18 C 75 18, 85 46, 100 46 C 115 46, 125 38, 135 32 L 135 60 L 10 60 Z',
        focalX: 100,
        focalY: 46,
        guideY1: 14,
        guideY2: 46,
      };
    }

    if (preset === 'peak-wave') {
      return {
        linePath: 'M 10 50 C 25 50, 35 40, 50 40 C 70 40, 80 18, 100 18 C 115 18, 125 34, 135 44',
        areaPath: 'M 10 50 C 25 50, 35 40, 50 40 C 70 40, 80 18, 100 18 C 115 18, 125 34, 135 44 L 135 60 L 10 60 Z',
        focalX: 100,
        focalY: 18,
        guideY1: 18,
        guideY2: 60,
      };
    }

    if (preset === 's-curve') {
      return {
        linePath: 'M 10 52 C 22 46, 32 24, 52 24 C 72 24, 80 40, 98 40 C 112 40, 122 22, 135 14',
        areaPath: 'M 10 52 C 22 46, 32 24, 52 24 C 72 24, 80 40, 98 40 C 112 40, 122 22, 135 14 L 135 60 L 10 60 Z',
        focalX: 98,
        focalY: 40,
        guideY1: 14,
        guideY2: 60,
      };
    }

    // 2. If sparkline array provided (dynamic points)
    if (data && data.length > 1) {
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;
      const step = 120 / (data.length - 1);
      const points = data.map((v, i) => ({
        x: 10 + i * step,
        y: 50 - ((v - min) / range) * 38,
      }));

      // Generate smooth bezier through points
      let linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
      }

      const lastPoint = points[points.length - 1];
      const areaPath = `${linePath} L ${lastPoint.x} 60 L ${points[0].x} 60 Z`;

      return {
        linePath,
        areaPath,
        focalX: Math.round(lastPoint.x),
        focalY: Math.round(lastPoint.y),
        guideY1: Math.round(lastPoint.y),
        guideY2: 60,
      };
    }

    // 3. Fallback based on trend
    if (this.trend() === 'down') {
      return {
        linePath: 'M 10 48 C 25 42, 35 18, 55 18 C 75 18, 85 46, 100 46 C 115 46, 125 38, 135 32',
        areaPath: 'M 10 48 C 25 42, 35 18, 55 18 C 75 18, 85 46, 100 46 C 115 46, 125 38, 135 32 L 135 60 L 10 60 Z',
        focalX: 100,
        focalY: 46,
        guideY1: 14,
        guideY2: 46,
      };
    }

    // Default ascending
    return {
      linePath: 'M 10 50 C 40 50, 60 44, 85 24 C 100 12, 115 8, 135 8',
      areaPath: 'M 10 50 C 40 50, 60 44, 85 24 C 100 12, 115 8, 135 8 L 135 60 L 10 60 Z',
      focalX: 88,
      focalY: 22,
      guideY1: 22,
      guideY2: 60,
    };
  });

  onRefresh() {
    this.refresh.emit();
  }
}
