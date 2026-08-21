import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, map, Observable, of, tap } from 'rxjs';
import {
  CitySearchResult,
  CurrentWeather,
  DailyForecastItem,
  HourlyForecastItem,
  TemperatureUnit,
  WeatherConditionType,
  WeatherData,
  WeatherLocation,
} from './weather.types';

const STORAGE_LOCATION_KEY = 'dolphin_weather_location';
const STORAGE_UNIT_KEY = 'dolphin_weather_unit';
const STORAGE_CACHE_KEY = 'dolphin_weather_cache';

const DEFAULT_LOCATION: WeatherLocation = {
  name: 'Santo Domingo',
  country: 'República Dominicana',
  countryCode: 'DO',
  latitude: 18.4861,
  longitude: -69.9312,
  timezone: 'America/Santo_Domingo',
};

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  
  readonly weatherData = signal<WeatherData | null>(this.loadCachedData());
  readonly location = signal<WeatherLocation>(this.loadSavedLocation());
  readonly unit = signal<TemperatureUnit>(this.loadSavedUnit());
  readonly loading = signal<boolean>(false);
  readonly refreshing = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (this.isBrowser) {
      
      this.fetchWeather();
    }
  }

  


  private loadSavedUnit(): TemperatureUnit {
    if (!this.isBrowser) return 'celsius';
    const saved = localStorage.getItem(STORAGE_UNIT_KEY) as TemperatureUnit;
    return saved === 'fahrenheit' ? 'fahrenheit' : 'celsius';
  }

  


  private loadSavedLocation(): WeatherLocation {
    if (!this.isBrowser) return DEFAULT_LOCATION;
    try {
      const saved = localStorage.getItem(STORAGE_LOCATION_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
    } catch {
      return DEFAULT_LOCATION;
    }
  }

  


  private loadCachedData(): WeatherData | null {
    if (!this.isBrowser) return null;
    try {
      const cached = localStorage.getItem(STORAGE_CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      parsed.lastUpdated = new Date(parsed.lastUpdated);
      return parsed;
    } catch {
      return null;
    }
  }

  


  setUnit(unit: TemperatureUnit): void {
    this.unit.set(unit);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_UNIT_KEY, unit);
    }
  }

  toggleUnit(): void {
    const next = this.unit() === 'celsius' ? 'fahrenheit' : 'celsius';
    this.setUnit(next);
  }

  


  formatTemp(celsius: number): number {
    if (this.unit() === 'fahrenheit') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  }

  getUnitSymbol(): string {
    return this.unit() === 'fahrenheit' ? '°F' : '°C';
  }

  


  setLocation(location: WeatherLocation): void {
    this.location.set(location);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(location));
    }
    this.fetchWeather();
  }

  


  detectCurrentLocation(): Promise<boolean> {
    if (!this.isBrowser || !navigator.geolocation) {
      return Promise.resolve(false);
    }

    this.loading.set(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=es`
            );
            const data = await resp.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.municipality ||
              data.address?.state ||
              'Ubicación actual';
            const country = data.address?.country || '';
            const countryCode = data.address?.country_code?.toUpperCase() || '';

            this.setLocation({
              name: city,
              country,
              countryCode,
              latitude: lat,
              longitude: lon,
            });
            resolve(true);
          } catch {
            this.setLocation({
              name: 'Mi Ubicación',
              country: '',
              latitude: lat,
              longitude: lon,
            });
            resolve(true);
          }
        },
        () => {
          this.loading.set(false);
          resolve(false);
        },
        { timeout: 8000 }
      );
    });
  }

  searchCities(query: string): Observable<CitySearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return of([]);

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=5&language=es&format=json`;

    return this.http.get<{ results?: CitySearchResult[] }>(url).pipe(
      map((res) => res.results || []),
      catchError(() => of([]))
    );
  }

  fetchWeather(isManualRefresh = false): void {
    const loc = this.location();
    if (isManualRefresh) {
      this.refreshing.set(true);
    } else if (!this.weatherData()) {
      this.loading.set(true);
    }
    this.error.set(null);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

    this.http.get<any>(url).pipe(
      tap((res) => {
        const mappedData = this.mapOpenMeteoResponse(res, loc);
        this.weatherData.set(mappedData);
        this.loading.set(false);
        this.refreshing.set(false);

        if (this.isBrowser) {
          try {
            localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(mappedData));
          } catch {}
        }
      }),
      catchError((err) => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('No se pudo cargar la información meteorológica.');
        return of(null);
      })
    ).subscribe();
  }

  


  private mapOpenMeteoResponse(res: any, location: WeatherLocation): WeatherData {
    const currentRaw = res.current || {};
    const isDay = currentRaw.is_day === 1;
    const weatherCode = currentRaw.weather_code ?? 0;
    const condition = this.getConditionInfo(weatherCode, isDay);

    const current: CurrentWeather = {
      temperature: currentRaw.temperature_2m ?? 24,
      apparentTemperature: currentRaw.apparent_temperature ?? currentRaw.temperature_2m ?? 24,
      humidity: currentRaw.relative_humidity_2m ?? 60,
      windSpeed: Math.round(currentRaw.wind_speed_10m ?? 10),
      precipitation: currentRaw.precipitation ?? 0,
      isDay,
      weatherCode,
      conditionType: condition.type,
      conditionLabelKey: condition.labelKey,
      time: currentRaw.time || new Date().toISOString(),
    };

    
    const daily: DailyForecastItem[] = [];
    const dailyRaw = res.daily || {};
    const dates: string[] = dailyRaw.time || [];
    const codes: number[] = dailyRaw.weather_code || [];
    const maxTemps: number[] = dailyRaw.temperature_2m_max || [];
    const minTemps: number[] = dailyRaw.temperature_2m_min || [];
    const precipSum: number[] = dailyRaw.precipitation_sum || [];

    for (let i = 0; i < Math.min(dates.length, 5); i++) {
      const code = codes[i] ?? 0;
      const itemCondition = this.getConditionInfo(code, true);
      const dateStr = dates[i];
      const d = new Date(dateStr + 'T12:00:00');
      const dayIndex = d.getDay();
      const daysKeys = [
        'weather.days.sun',
        'weather.days.mon',
        'weather.days.tue',
        'weather.days.wed',
        'weather.days.thu',
        'weather.days.fri',
        'weather.days.sat',
      ];

      daily.push({
        date: dateStr,
        dayNameKey: i === 0 ? 'weather.today' : daysKeys[dayIndex],
        weatherCode: code,
        conditionType: itemCondition.type,
        conditionLabelKey: itemCondition.labelKey,
        tempMax: maxTemps[i] ?? current.temperature,
        tempMin: minTemps[i] ?? current.temperature,
        precipitationSum: precipSum[i] ?? 0,
      });
    }

    
    const hourly: HourlyForecastItem[] = [];
    const hourlyRaw = res.hourly || {};
    const hTimes: string[] = hourlyRaw.time || [];
    const hTemps: number[] = hourlyRaw.temperature_2m || [];
    const hCodes: number[] = hourlyRaw.weather_code || [];
    const hIsDay: number[] = hourlyRaw.is_day || [];

    const nowIso = new Date().toISOString().substring(0, 13); 
    let startIndex = hTimes.findIndex((t) => t.startsWith(nowIso));
    if (startIndex === -1) startIndex = 0;

    for (let j = startIndex; j < Math.min(startIndex + 12, hTimes.length); j++) {
      const timeStr = hTimes[j];
      const hourNumber = parseInt(timeStr.substring(11, 13), 10);
      const isDayHour = hIsDay[j] === 1;
      const hCode = hCodes[j] ?? 0;
      const hCond = this.getConditionInfo(hCode, isDayHour);

      hourly.push({
        time: timeStr,
        hourLabel: String(hourNumber).padStart(2, '0') + ':00',
        temperature: hTemps[j] ?? current.temperature,
        weatherCode: hCode,
        conditionType: hCond.type,
        isDay: isDayHour,
      });
    }

    return {
      location,
      current,
      daily,
      hourly,
      lastUpdated: new Date(),
    };
  }

  /**
   * Maps WMO weather codes to internal condition types & i18n keys
   */
  getConditionInfo(
    code: number,
    isDay: boolean
  ): { type: WeatherConditionType; labelKey: string } {
    switch (code) {
      case 0:
        return {
          type: isDay ? 'clear-day' : 'clear-night',
          labelKey: isDay ? 'weather.conditions.clear' : 'weather.conditions.clearNight',
        };
      case 1:
        return {
          type: isDay ? 'clear-day' : 'clear-night',
          labelKey: isDay ? 'weather.conditions.mostlyClear' : 'weather.conditions.mostlyClearNight',
        };
      case 2:
        return {
          type: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night',
          labelKey: 'weather.conditions.partlyCloudy',
        };
      case 3:
        return {
          type: 'overcast',
          labelKey: 'weather.conditions.overcast',
        };
      case 45:
      case 48:
        return {
          type: 'fog',
          labelKey: 'weather.conditions.fog',
        };
      case 51:
      case 53:
      case 55:
        return {
          type: 'drizzle',
          labelKey: 'weather.conditions.drizzle',
        };
      case 56:
      case 57:
        return {
          type: 'drizzle',
          labelKey: 'weather.conditions.freezingDrizzle',
        };
      case 61:
      case 63:
        return {
          type: 'rain',
          labelKey: 'weather.conditions.rain',
        };
      case 65:
        return {
          type: 'heavy-rain',
          labelKey: 'weather.conditions.heavyRain',
        };
      case 66:
      case 67:
        return {
          type: 'rain',
          labelKey: 'weather.conditions.freezingRain',
        };
      case 71:
      case 73:
      case 75:
      case 77:
        return {
          type: 'snow',
          labelKey: 'weather.conditions.snow',
        };
      case 80:
      case 81:
        return {
          type: 'rain',
          labelKey: 'weather.conditions.rainShowers',
        };
      case 82:
        return {
          type: 'heavy-rain',
          labelKey: 'weather.conditions.heavyShowers',
        };
      case 85:
      case 86:
        return {
          type: 'snow',
          labelKey: 'weather.conditions.snowShowers',
        };
      case 95:
      case 96:
      case 99:
        return {
          type: 'thunderstorm',
          labelKey: 'weather.conditions.thunderstorm',
        };
      default:
        return {
          type: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night',
          labelKey: 'weather.conditions.partlyCloudy',
        };
    }
  }
}