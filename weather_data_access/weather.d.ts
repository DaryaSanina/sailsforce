/**
 * Type declarations for weather.js (CommonJS).
 * Lets the TypeScript app import fetchWeatherData with full typing while
 * Metro continues to bundle the .js implementation at runtime.
 */

/** A nullable hourly/daily series keyed by variable name (often model-suffixed). */
export type Series = (number | null)[];

export interface RawWeatherCurrent {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  uv_index: number;
  wave_height: number;
  wave_direction: number;
  wave_period: number;
  swell_wave_height: number;
  swell_wave_direction: number;
  swell_wave_period: number;
  sea_surface_temperature: number;
}

export interface RawWindModel {
  wind_speed_10m: Series;
  wind_direction_10m: Series;
  wind_gusts_10m: Series;
}

export interface RawWeatherData {
  metadata: {
    latitude: number;
    longitude: number;
    fetchedAt: string;
    models_requested: string[];
    units: { temperature: string; wind_speed: string; wave_height: string };
  };
  current: RawWeatherCurrent;
  /** time is string[]; every other key is a model-suffixed numeric series. */
  hourly: { time: string[] } & Record<string, Series | string[]>;
  /** time is string[]; every other key is a model-suffixed series. */
  daily: { time: string[] } & Record<string, (number | string | null)[]>;
  wind_models: Record<string, RawWindModel>;
}

export function fetchWeatherData(lat: number, lon: number): Promise<RawWeatherData>;
