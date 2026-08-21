export type WeatherConditionType =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'thunderstorm';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface WeatherLocation {
  name: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  isDay: boolean;
  weatherCode: number;
  conditionType: WeatherConditionType;
  conditionLabelKey: string;
  time: string;
}

export interface DailyForecastItem {
  date: string;
  dayNameKey: string;
  weatherCode: number;
  conditionType: WeatherConditionType;
  conditionLabelKey: string;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
}

export interface HourlyForecastItem {
  time: string;
  hourLabel: string;
  temperature: number;
  weatherCode: number;
  conditionType: WeatherConditionType;
  isDay: boolean;
}

export interface WeatherData {
  location: WeatherLocation;
  current: CurrentWeather;
  daily: DailyForecastItem[];
  hourly: HourlyForecastItem[];
  lastUpdated: Date;
}

export interface CitySearchResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}
