import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { WeatherService } from '@/app/core/weather/weather.service';
import { WeatherIconComponent } from './weather-icon.component';
import { CitySearchResult, WeatherLocation } from '@/app/core/weather/weather.types';
import {
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from 'ng-animated-icons';

@Component({
  selector: 'weather-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
    WeatherIconComponent,
    RefreshCwIcon,
    SearchIcon,
    XIcon,
  ],
  host: {
    class: 'flex items-center select-none',
  },
  template: `
    <!-- Header Weather Widget (Unboxed / Flat inline layout) -->
    <button
      type="button"
      [matMenuTriggerFor]="weatherMenu"
      (menuOpened)="onMenuOpened()"
      class="group flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer outline-none shrink-0 select-none bg-transparent border-0"
      [matTooltip]="'weather.widgetTooltip' | transloco"
      style="-webkit-app-region: no-drag"
    >
      @if (loading() && !data()) {
        <!-- Skeleton -->
        <div class="flex items-center gap-1.5 animate-pulse">
          <div class="size-5 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
          <div class="flex flex-col gap-0.5 text-left">
            <div class="h-2.5 w-6 rounded bg-neutral-200 dark:bg-neutral-700"></div>
            <div class="h-2 w-10 rounded bg-neutral-200 dark:bg-neutral-700"></div>
          </div>
        </div>
      } @else {
        <!-- Weather Icon with Animated SVG -->
        <div class="shrink-0 transition-transform duration-200 group-hover:scale-105">
          <weather-icon
            [condition]="current()?.conditionType ?? 'partly-cloudy-day'"
            [size]="24"
          />
        </div>

        <!-- Temperature and Condition Text -->
        <div class="flex flex-col items-start justify-center text-left leading-none">
          <span class="text-[12px] font-bold tracking-tight text-neutral-900 dark:text-neutral-100 leading-tight">
            {{ weatherService.formatTemp(current()?.temperature ?? 24) }}{{ weatherService.getUnitSymbol() }}
          </span>
          <span class="text-[9px] font-medium text-neutral-500 dark:text-neutral-400 truncate max-w-[85px] leading-tight">
            {{ (current()?.conditionLabelKey ?? 'weather.conditions.partlyCloudy') | transloco }}
          </span>
        </div>
      }
    </button>

    <!-- Expanded Weather Popover / MatMenu -->
    <mat-menu
      #weatherMenu="matMenu"
      class="!max-w-none !p-0 rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 backdrop-blur-xl"
      xPosition="before"
    >
      <div class="w-80 sm:w-88 text-neutral-900 dark:text-white flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
        
        <!-- Popover Header: Location & Quick Actions (Fixed at Top) -->
        <div class="p-3.5 pb-2.5 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2 shrink-0 select-none">
          <div class="flex items-center gap-1.5 min-w-0">
            <svg class="size-4 text-blue-600 dark:text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold text-neutral-900 dark:text-white truncate">
                {{ location().name }}
              </span>
              @if (location().country) {
                <span class="text-[10px] text-neutral-400 truncate">
                  {{ location().country }}
                </span>
              }
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <!-- Locate via GPS -->
            <button
              mat-icon-button
              class="!size-7 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400"
              (click)="detectLocation()"
              [matTooltip]="'weather.detectLocation' | transloco"
            >
              <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            </button>

            <!-- Toggle City Search -->
            <button
              mat-icon-button
              class="!size-7 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400"
              (click)="toggleSearch()"
              [matTooltip]="'weather.searchCity' | transloco"
            >
              <i-search [size]="15" />
            </button>

            <!-- Refresh Weather -->
            <button
              mat-icon-button
              class="!size-7 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400"
              (click)="refresh()"
              [matTooltip]="'weather.refresh' | transloco"
            >
              <i-refresh-cw [size]="15" [class.animate-spin]="refreshing()" />
            </button>
          </div>
        </div>

        <!-- Scrollable Body Container -->
        <div class="p-3.5 max-h-[62vh] sm:max-h-[68vh] overflow-y-auto overflow-x-hidden flex flex-col gap-3.5 custom-scrollbar">

        <!-- City Search Input (Collapsible) -->
        @if (showSearch()) {
          <div class="flex flex-col gap-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/70 p-2 border border-neutral-200 dark:border-neutral-700">
            <div class="flex items-center gap-2">
              <i-search [size]="14" class="text-neutral-400 shrink-0" />
              <input
                #cityInput
                type="text"
                class="flex-1 bg-transparent text-xs outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400"
                [placeholder]="'weather.searchPlaceholder' | transloco"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchInput($event)"
                (keydown.enter)="onSearchEnter()"
              />
              @if (searchQuery) {
                <button
                  type="button"
                  (click)="searchQuery = ''; searchResults.set([])"
                  class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <i-x [size]="13" />
                </button>
              }
            </div>

            <!-- Search Results Dropdown -->
            @if (searching()) {
              <div class="flex items-center justify-center py-2">
                <mat-spinner diameter="16" />
              </div>
            } @else if (searchResults().length > 0) {
              <div class="flex flex-col gap-1 max-h-32 overflow-y-auto pt-1 border-t border-neutral-200 dark:border-neutral-700">
                @for (city of searchResults(); track city.id) {
                  <button
                    type="button"
                    (click)="selectCity(city)"
                    class="flex items-center justify-between text-left px-2 py-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors text-xs cursor-pointer"
                  >
                    <span class="font-medium text-neutral-800 dark:text-neutral-200 truncate">{{ city.name }}</span>
                    <span class="text-[10px] text-neutral-400 ml-2 shrink-0">{{ city.country || city.admin1 }}</span>
                  </button>
                }
              </div>
            } @else if (searchQuery.length >= 2) {
              <div class="text-[11px] text-neutral-400 text-center py-1">
                {{ 'weather.noCityFound' | transloco }}
              </div>
            }
          </div>
        }

        <!-- Hero Status Card (shrink-0 prevents flexbox collapse) -->
        <div class="relative overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 p-3.5 border border-neutral-200/70 dark:border-neutral-700/60 shrink-0">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <weather-icon
                [condition]="current()?.conditionType ?? 'partly-cloudy-day'"
                [size]="46"
                class="shrink-0"
              />
              <div class="flex flex-col min-w-0">
                <div class="flex items-baseline gap-1">
                  <span class="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                    {{ weatherService.formatTemp(current()?.temperature ?? 24) }}
                  </span>
                  <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    {{ weatherService.getUnitSymbol() }}
                  </span>
                </div>
                <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                  {{ (current()?.conditionLabelKey ?? 'weather.conditions.partlyCloudy') | transloco }}
                </span>
                <span class="text-[10px] text-neutral-400 mt-0.5 truncate">
                  {{ 'weather.feelsLike' | transloco }}: {{ weatherService.formatTemp(current()?.apparentTemperature ?? 24) }}{{ weatherService.getUnitSymbol() }}
                </span>
              </div>
            </div>

            <!-- Unit switch: °C / °F -->
            <div class="flex flex-col items-end gap-2 shrink-0">
              <div class="flex items-center rounded-xl bg-white dark:bg-neutral-800 p-0.5 border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                <button
                  type="button"
                  (click)="weatherService.setUnit('celsius')"
                  [class.bg-blue-600]="weatherService.unit() === 'celsius'"
                  [class.text-white]="weatherService.unit() === 'celsius'"
                  [class.text-neutral-500]="weatherService.unit() !== 'celsius'"
                  class="px-1.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  °C
                </button>
                <button
                  type="button"
                  (click)="weatherService.setUnit('fahrenheit')"
                  [class.bg-blue-600]="weatherService.unit() === 'fahrenheit'"
                  [class.text-white]="weatherService.unit() === 'fahrenheit'"
                  [class.text-neutral-500]="weatherService.unit() !== 'fahrenheit'"
                  class="px-1.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  °F
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Weather Metrics Grid (3 columns, shrink-0) -->
        <div class="grid grid-cols-3 gap-2 shrink-0">
          <!-- Humidity -->
          <div class="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
            <svg class="size-3.5 text-sky-500 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
            <span class="text-[9px] text-neutral-400">{{ 'weather.humidity' | transloco }}</span>
            <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
              {{ current()?.humidity ?? 60 }}%
            </span>
          </div>

          <!-- Wind Speed -->
          <div class="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
            <svg class="size-3.5 text-teal-500 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
            </svg>
            <span class="text-[9px] text-neutral-400">{{ 'weather.wind' | transloco }}</span>
            <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
              {{ current()?.windSpeed ?? 10 }} km/h
            </span>
          </div>

          <!-- Precipitation -->
          <div class="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
            <svg class="size-3.5 text-blue-500 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
              <path d="M16 14v6M8 14v6M12 16v6"/>
            </svg>
            <span class="text-[9px] text-neutral-400">{{ 'weather.precip' | transloco }}</span>
            <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
              {{ current()?.precipitation ?? 0 }} mm
            </span>
          </div>
        </div>

        <!-- Hourly Forecast Slider (Horizontal) -->
        @if (hourly().length > 0) {
          <div class="flex flex-col gap-1 shrink-0">
            <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              {{ 'weather.hourlyForecast' | transloco }}
            </span>
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              @for (hour of hourly(); track hour.time) {
                <div class="flex flex-col items-center shrink-0 p-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800/60 min-w-[48px] text-center">
                  <span class="text-[9px] text-neutral-400">{{ hour.hourLabel }}</span>
                  <div class="my-0.5">
                    <weather-icon [condition]="hour.conditionType" [size]="18" />
                  </div>
                  <span class="text-[10px] font-bold text-neutral-800 dark:text-neutral-200">
                    {{ weatherService.formatTemp(hour.temperature) }}°
                  </span>
                </div>
              }
            </div>
          </div>
        }

        <!-- 5-Day Forecast List -->
        @if (daily().length > 0) {
          <div class="flex flex-col gap-1 shrink-0">
            <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              {{ 'weather.next5Days' | transloco }}
            </span>
            <div class="flex flex-col gap-0.5">
              @for (day of daily(); track day.date) {
                <div class="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors">
                  <span class="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 w-16 truncate">
                    {{ day.dayNameKey | transloco }}
                  </span>
                  <div class="flex items-center justify-center">
                    <weather-icon [condition]="day.conditionType" [size]="18" />
                  </div>
                  <div class="flex items-center gap-1.5 text-[11px] font-semibold w-20 justify-end">
                    <span class="text-neutral-400 text-[10px]">{{ weatherService.formatTemp(day.tempMin) }}°</span>
                    <div class="w-8 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden relative">
                      <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-amber-400 rounded-full"></div>
                    </div>
                    <span class="text-neutral-900 dark:text-white text-[10px]">{{ weatherService.formatTemp(day.tempMax) }}°</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Footer Info -->
        <div class="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[9px] text-neutral-400 shrink-0">
          <span>{{ 'weather.poweredBy' | transloco }} Open-Meteo</span>
          @if (data()?.lastUpdated) {
            <span>{{ 'weather.updated' | transloco }}: {{ lastUpdatedTime() }}</span>
          }
        </div>

        </div>
      </div>
    </mat-menu>
  `,
  styles: [
    `
      .weather-pill {
        user-select: none;
      }
      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `,
  ],
})
export class WeatherWidgetComponent {
  readonly weatherService = inject(WeatherService);
  private readonly transloco = inject(TranslocoService);

  readonly data = this.weatherService.weatherData;
  readonly location = this.weatherService.location;
  readonly loading = this.weatherService.loading;
  readonly refreshing = this.weatherService.refreshing;

  readonly current = computed(() => this.data()?.current ?? null);
  readonly daily = computed(() => this.data()?.daily ?? []);
  readonly hourly = computed(() => this.data()?.hourly ?? []);

  readonly lastUpdatedTime = computed(() => {
    const dt = this.data()?.lastUpdated;
    if (!dt) return '';
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  // Search state
  protected showSearch = signal(false);
  protected searchQuery = '';
  protected searchResults = signal<CitySearchResult[]>([]);
  protected searching = signal(false);

  private searchDebounceTimer?: any;
  private cityInput = viewChild<ElementRef<HTMLInputElement>>('cityInput');

  onMenuOpened(): void {
    const last = this.data()?.lastUpdated;
    if (!last || Date.now() - new Date(last).getTime() > 30 * 60 * 1000) {
      this.weatherService.fetchWeather();
    }
  }

  toggleSearch(): void {
    const next = !this.showSearch();
    this.showSearch.set(next);
    if (next) {
      setTimeout(() => this.cityInput()?.nativeElement.focus(), 150);
    } else {
      this.searchQuery = '';
      this.searchResults.set([]);
    }
  }

  onSearchInput(query: string): void {
    clearTimeout(this.searchDebounceTimer);
    if (!query || query.trim().length < 2) {
      this.searchResults.set([]);
      this.searching.set(false);
      return;
    }

    this.searching.set(true);
    this.searchDebounceTimer = setTimeout(() => {
      this.weatherService.searchCities(query).subscribe({
        next: (results) => {
          this.searchResults.set(results);
          this.searching.set(false);
        },
        error: () => this.searching.set(false),
      });
    }, 350);
  }

  onSearchEnter(): void {
    const first = this.searchResults()[0];
    if (first) {
      this.selectCity(first);
    }
  }

  selectCity(city: CitySearchResult): void {
    const loc: WeatherLocation = {
      name: city.name,
      country: city.country || city.admin1 || '',
      countryCode: city.country_code?.toUpperCase(),
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
    };
    this.weatherService.setLocation(loc);
    this.showSearch.set(false);
    this.searchQuery = '';
    this.searchResults.set([]);
  }

  async detectLocation(): Promise<void> {
    await this.weatherService.detectCurrentLocation();
  }

  refresh(): void {
    this.weatherService.fetchWeather(true);
  }
}
