import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { ExchangeRateService } from '@/app/core/currency/exchange-rate.service';
import { CurrencyFlagComponent } from './currency-flag.component';
import {
  RefreshCwIcon,
  PlusIcon,
  CheckIcon,
} from 'ng-animated-icons';

type ActiveTab = 'rates' | 'calculator';

@Component({
  selector: 'app-exchange-rates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TranslocoPipe,
    CurrencyFlagComponent,
    RefreshCwIcon,
    PlusIcon,
    CheckIcon,
  ],
  template: `
    <div class="w-full rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs select-none">

      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {{ (activeTab() === 'calculator' ? 'dashboard.exchange.currencyCalculator' : 'dashboard.exchange.exchangeRates') | transloco }}
        </h2>

        <button
          type="button"
          [matMenuTriggerFor]="moreMenu"
          class="flex size-9 items-center justify-center rounded-full border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          [matTooltip]="'common.moreOptions' | transloco"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        <mat-menu #moreMenu="matMenu" class="rounded-2xl">
          <button mat-menu-item (click)="refresh()">
            <div class="flex items-center gap-2.5">
              <i-refresh-cw [size]="16" />
              <span>{{ 'common.refresh' | transloco }}</span>
            </div>
          </button>
        </mat-menu>
      </div>

      <div class="mt-6 inline-flex p-1 rounded-full border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/60">
        <button
          type="button"
          (click)="activeTab.set('calculator')"
          [class.bg-[#0B132B]]="activeTab() === 'calculator'"
          [class.text-white]="activeTab() === 'calculator'"
          [class.dark:bg-white]="activeTab() === 'calculator'"
          [class.dark:text-neutral-950]="activeTab() === 'calculator'"
          [class.text-neutral-600]="activeTab() !== 'calculator'"
          [class.dark:text-neutral-400]="activeTab() !== 'calculator'"
          class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer"
        >
          {{ 'dashboard.exchange.currencyCalculator' | transloco }}
        </button>

        <button
          type="button"
          (click)="activeTab.set('rates')"
          [class.bg-[#0B132B]]="activeTab() === 'rates'"
          [class.text-white]="activeTab() === 'rates'"
          [class.dark:bg-white]="activeTab() === 'rates'"
          [class.dark:text-neutral-950]="activeTab() === 'rates'"
          [class.text-neutral-600]="activeTab() !== 'rates'"
          [class.dark:text-neutral-400]="activeTab() !== 'rates'"
          class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer"
        >
          {{ 'dashboard.exchange.exchangeRates' | transloco }}
        </button>
      </div>

      @if (activeTab() === 'rates') {
        <div class="mt-7 flex flex-col">
          <h3 class="text-base font-bold text-neutral-900 dark:text-white">
            {{ 'dashboard.exchange.popular' | transloco }}
          </h3>

          <div class="mt-4 grid grid-cols-12 items-center text-xs font-medium text-neutral-400 dark:text-neutral-500 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <span class="col-span-6">{{ 'dashboard.exchange.currency' | transloco }}</span>
            <span class="col-span-3 text-center flex items-center justify-center gap-1">
              <span>{{ 'dashboard.exchange.change' | transloco }}</span>
              <span class="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">LIVE•</span>
            </span>
            <span class="col-span-3 text-right">{{ 'dashboard.exchange.rate' | transloco }}</span>
          </div>

          @if (loading() && currencyList().length === 0) {
            <div class="flex flex-col gap-3 py-4 animate-pulse">
              @for (i of [1, 2, 3, 4, 5, 6]; track i) {
                <div class="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800"></div>
              }
            </div>
          } @else {
            <div class="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800/80">
              @for (item of currencyList(); track item.code) {
                <div class="grid grid-cols-12 items-center py-3.5 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 rounded-xl px-1 transition-colors">

                  <div class="col-span-6 flex items-center gap-3 min-w-0">
                    <currency-flag [code]="item.code" [size]="34" />
                    <div class="flex items-baseline gap-1.5 truncate">
                      <span class="text-sm font-bold text-neutral-900 dark:text-white">{{ item.code }}</span>
                      <span class="text-xs text-neutral-400 dark:text-neutral-500">-</span>
                      <span class="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate">
                        {{ item.nameKey | transloco }}
                      </span>
                    </div>
                  </div>

                <div class="col-span-3 flex justify-center">
                  @if (item.isPositive) {
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <span class="text-[11px]">↑</span>
                      <span>+{{ item.change24h }}%</span>
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <span class="text-[11px]">↓</span>
                      <span>{{ item.change24h }}%</span>
                    </span>
                  }
                </div>

                <div class="col-span-3 text-right">
                  <span class="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {{ item.rate | number: (item.code === 'JPY' ? '1.2-2' : item.code === 'DOP' || item.code === 'SEK' || item.code === 'NOK' ? '1.2-4' : '1.4-5') }}
                  </span>
                </div>

              </div>
            }
            </div>
          }

          <div class="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">

            <div>
              <button
                type="button"
                [matMenuTriggerFor]="addCurrencyMenu"
                class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                <i-plus [size]="14" />
                <span>{{ 'dashboard.exchange.addCurrency' | transloco }}</span>
              </button>

              <mat-menu #addCurrencyMenu="matMenu" class="rounded-2xl max-h-64 overflow-y-auto">
                <div class="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                  <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    {{ 'dashboard.exchange.selectCurrencies' | transloco }}
                  </span>
                </div>
                @for (c of allAvailableCurrencies; track c.code) {
                  <button mat-menu-item (click)="toggleCurrency(c.code)">
                    <div class="flex items-center justify-between w-44">
                      <div class="flex items-center gap-2">
                        <currency-flag [code]="c.code" [size]="20" />
                        <span class="text-xs font-semibold">{{ c.code }}</span>
                        <span class="text-[11px] text-neutral-400 truncate">{{ c.name }}</span>
                      </div>
                      @if (isCurrencySelected(c.code)) {
                        <i-check [size]="14" class="text-blue-600 dark:text-blue-400 ml-2" />
                      }
                    </div>
                  </button>
                }
              </mat-menu>
            </div>

            <span class="text-[11px] text-neutral-400 dark:text-neutral-500">
              {{ 'dashboard.exchange.lastUpdated' | transloco }}: {{ formattedLastUpdated() }}
            </span>
          </div>

        </div>
      }

      @if (activeTab() === 'calculator') {
        <div class="mt-6 flex flex-col gap-4">

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {{ 'dashboard.exchange.amount' | transloco }}
            </label>
            <div class="flex items-center rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 px-4 py-3 shadow-2xs focus-within:border-blue-500 transition-colors">
              <input
                type="number"
                min="0"
                step="any"
                class="w-full bg-transparent text-sm font-semibold outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400"
                [ngModel]="calcAmount()"
                (ngModelChange)="calcAmount.set(+$event)"
                placeholder="1.00"
              />
            </div>
          </div>

          <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:gap-3">

            <div class="flex flex-col gap-1.5 min-w-0">
              <label class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {{ 'dashboard.exchange.from' | transloco }}
              </label>
              <div class="relative flex items-center rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 px-3 py-2.5 shadow-2xs cursor-pointer focus-within:border-blue-500 transition-colors">
                <currency-flag [code]="calcFrom()" [size]="24" class="mr-2.5 shrink-0" />
                <select
                  [ngModel]="calcFrom()"
                  (ngModelChange)="calcFrom.set($event)"
                  class="w-full bg-transparent text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white outline-none cursor-pointer pr-6 truncate"
                >
                  @for (c of allAvailableCurrencies; track c.code) {
                    <option [value]="c.code" class="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      {{ c.code }} - {{ ('dashboard.exchange.currencies.' + c.code.toLowerCase()) | transloco }}
                    </option>
                  }
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400">
                  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="pb-1 flex justify-center">
              <button
                type="button"
                (click)="swapCurrencies()"
                class="flex size-9 items-center justify-center rounded-full border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all cursor-pointer shadow-2xs"
                [matTooltip]="'dashboard.exchange.swap' | transloco"
              >

                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
                </svg>
              </button>
            </div>

            <div class="flex flex-col gap-1.5 min-w-0">
              <label class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {{ 'dashboard.exchange.to' | transloco }}
              </label>
              <div class="relative flex items-center rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 px-3 py-2.5 shadow-2xs cursor-pointer focus-within:border-blue-500 transition-colors">
                <currency-flag [code]="calcTo()" [size]="24" class="mr-2.5 shrink-0" />
                <select
                  [ngModel]="calcTo()"
                  (ngModelChange)="calcTo.set($event)"
                  class="w-full bg-transparent text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white outline-none cursor-pointer pr-6 truncate"
                >
                  @for (c of allAvailableCurrencies; track c.code) {
                    <option [value]="c.code" class="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      {{ c.code }} - {{ ('dashboard.exchange.currencies.' + c.code.toLowerCase()) | transloco }}
                    </option>
                  }
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400">
                  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

          </div>

          <div class="mt-2">
            <button
              type="button"
              (click)="refresh()"
              class="w-full py-3.5 px-6 rounded-2xl bg-[#0B132B] hover:bg-[#1C2541] dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-bold text-sm shadow-sm transition-all duration-200 cursor-pointer active:scale-98"
            >
              {{ 'dashboard.exchange.convert' | transloco }}
            </button>
          </div>

          <div class="mt-4 flex flex-col gap-1 border-t border-neutral-100 dark:border-neutral-800/80 pt-4">
            <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {{ calcAmount() | number: '1.2-2' }} {{ ('dashboard.exchange.currencies.' + calcFrom().toLowerCase()) | transloco }} =
            </span>

            <div class="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B132B] dark:text-white mt-1">
              {{ calcResult() | number: (calcTo() === 'JPY' ? '1.2-2' : calcTo() === 'DOP' || calcTo() === 'SEK' || calcTo() === 'NOK' ? '1.2-2' : '1.2-4') }} {{ ('dashboard.exchange.currencies.' + calcTo().toLowerCase()) | transloco }}
            </div>

            <div class="mt-3 flex flex-col gap-0.5 text-xs text-neutral-400 dark:text-neutral-500 font-medium">
              <div>
                1 {{ calcFrom() }} = {{ unitRateFromTo() | number: (calcTo() === 'DOP' ? '1.2-4' : '1.4-6') }} {{ calcTo() }}
              </div>
              <div>
                1 {{ calcTo() }} = {{ unitRateToFrom() | number: (calcFrom() === 'DOP' ? '1.2-4' : '1.4-6') }} {{ calcFrom() }}
              </div>
            </div>
          </div>

        </div>
      }

    </div>
  `,
})
export class ExchangeRatesComponent {
  readonly exchangeService = inject(ExchangeRateService);

  readonly activeTab = signal<ActiveTab>('calculator');
  readonly data = this.exchangeService.exchangeData;
  readonly loading = this.exchangeService.loading;
  readonly refreshing = this.exchangeService.refreshing;
  readonly currencyList = computed(() => this.exchangeService.getCurrencyList());
  readonly allAvailableCurrencies = this.exchangeService.getAllAvailableCurrencies();

  readonly calcAmount = signal<number>(1.0);
  readonly calcFrom = signal<string>('USD');
  readonly calcTo = signal<string>('DOP');

  readonly calcResult = computed(() => {
    this.data();
    const amt = Number(this.calcAmount()) || 0;
    return this.exchangeService.convert(amt, this.calcFrom(), this.calcTo());
  });

  readonly unitRateFromTo = computed(() => {
    this.data();
    return this.exchangeService.convert(1, this.calcFrom(), this.calcTo());
  });

  readonly unitRateToFrom = computed(() => {
    this.data();
    return this.exchangeService.convert(1, this.calcTo(), this.calcFrom());
  });

  readonly formattedLastUpdated = computed(() => {
    const dt = this.data()?.lastUpdated ?? new Date();
    const day = dt.getDate().toString().padStart(2, '0');
    const month = (dt.getMonth() + 1).toString().padStart(2, '0');
    const year = dt.getFullYear();
    const hours = dt.getHours().toString().padStart(2, '0');
    const mins = dt.getMinutes().toString().padStart(2, '0');
    return `${day}-${month}-${year} - ${hours}:${mins} UTC`;
  });

  isCurrencySelected(code: string): boolean {
    return this.exchangeService.selectedCurrencies().includes(code);
  }

  toggleCurrency(code: string): void {
    if (this.isCurrencySelected(code)) {
      this.exchangeService.removeCurrency(code);
    } else {
      this.exchangeService.addCurrency(code);
    }
  }

  swapCurrencies(): void {
    const currentFrom = this.calcFrom();
    const currentTo = this.calcTo();
    this.calcFrom.set(currentTo);
    this.calcTo.set(currentFrom);
  }

  refresh(): void {
    this.exchangeService.fetchRates(true);
  }
}
