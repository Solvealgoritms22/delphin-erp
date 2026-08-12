import { Component, input, computed } from '@angular/core';
import { NgClass } from '@angular/common';

export type StatCardTrend = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="stat-card group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">

      <!-- Background decoration -->
      <div
        class="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 transition-transform duration-300 group-hover:scale-125"
        [ngClass]="accentBg()"
      ></div>

      <!-- Icon slot -->
      <div class="mb-4 flex items-center justify-between">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl"
          [ngClass]="iconBg()"
        >
          <!-- Icon via ng-content -->
          <ng-content select="[slot=icon]" />
        </div>

        <!-- Trend badge -->
        @if (trend() !== 'neutral') {
          <span
            class="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            [ngClass]="trendBadgeClass()"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              @if (trend() === 'up') {
                <polyline points="18 15 12 9 6 15" />
              } @else {
                <polyline points="6 9 12 15 18 9" />
              }
            </svg>
            {{ trendLabel() }}
          </span>
        }
      </div>

      <!-- Value -->
      <div class="mt-2">
        <p class="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {{ prefix() }}{{ value() }}{{ suffix() }}
        </p>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ label() }}</p>
      </div>

      <!-- Sparkline (optional) -->
      @if (sparkline().length > 1) {
        <div class="mt-4">
          <svg class="h-10 w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
            <polyline
              [attr.points]="sparklinePoints()"
              fill="none"
              [attr.stroke]="sparklineColor()"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      }
    </div>
  `,
})
export class StatCardComponent {
  // Inputs
  label = input<string>('');
  value = input<string | number>('0');
  prefix = input<string>('');
  suffix = input<string>('');
  trend = input<StatCardTrend>('neutral');
  trendLabel = input<string>('');
  color = input<'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo'>('blue');
  sparkline = input<number[]>([]);

  // Computed classes
  accentBg = computed(() => ({
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
  }[this.color()]));

  iconBg = computed(() => ({
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
  }[this.color()]));

  trendBadgeClass = computed(() =>
    this.trend() === 'up'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
  );

  sparklineColor = computed(() => ({
    blue: '#3b82f6',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    purple: '#a855f7',
    indigo: '#6366f1',
  }[this.color()]));

  sparklinePoints = computed(() => {
    const data = this.sparkline();
    if (!data.length) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = 100 / (data.length - 1);
    return data
      .map((v, i) => `${i * step},${40 - ((v - min) / range) * 36}`)
      .join(' ');
  });
}
