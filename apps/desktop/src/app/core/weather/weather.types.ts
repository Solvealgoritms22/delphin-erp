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

export type WeatherLocation = {
  name: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type CurrentWeather = {
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
};

export type DailyForecastItem = {
  date: string;
  dayNameKey: string;
  weatherCode: number;
  conditionType: WeatherConditionType;
  conditionLabelKey: string;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
};

export type HourlyForecastItem = {
  time: string;
  hourLabel: string;
  temperature: number;
  weatherCode: number;
  conditionType: WeatherConditionType;
  isDay: boolean;
};

export type WeatherData = {
  location: WeatherLocation;
  current: CurrentWeather;
  daily: DailyForecastItem[];
  hourly: HourlyForecastItem[];
  lastUpdated: Date;
};

export type CitySearchResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
};

