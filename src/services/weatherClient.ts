import type { BeachLocation } from "../domain/models";

export const WIND_MODELS = [
  "ecmwf_ifs025",
  "gfs_seamless",
  "icon_seamless",
] as const;

export type WindModelId = (typeof WIND_MODELS)[number];

export type OpenMeteoWeatherResponse = {
  timezone?: string;
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown[]>;
  daily?: Record<string, unknown[]>;
};

export type OpenMeteoMarineResponse = {
  timezone?: string;
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown[]>;
};

export type RawForecastResponse = {
  weather: OpenMeteoWeatherResponse;
  marine: OpenMeteoMarineResponse;
  fetchedAt: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json().catch(() => null)) as T & { error?: boolean; reason?: string };
  if (!response.ok || !data || data.error) {
    throw new Error(data?.reason || response.statusText || `HTTP ${response.status}`);
  }
  return data;
}

export async function fetchForecast(location: BeachLocation): Promise<RawForecastResponse> {
  const common = {
    latitude: String(location.lat),
    longitude: String(location.lon),
    timezone: "auto",
  };

  const weatherParams = new URLSearchParams({
    ...common,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly:
      "temperature_2m,relative_humidity_2m,apparent_temperature,uv_index,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
    models: WIND_MODELS.join(","),
    wind_speed_unit: "kn",
    forecast_days: "5",
  });

  const marineParams = new URLSearchParams({
    ...common,
    current: "wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period",
    hourly:
      "wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,sea_level_height_msl",
    forecast_days: "5",
  });

  const [weather, marine] = await Promise.all([
    fetchJson<OpenMeteoWeatherResponse>(`https://api.open-meteo.com/v1/forecast?${weatherParams}`),
    fetchJson<OpenMeteoMarineResponse>(`https://marine-api.open-meteo.com/v1/marine?${marineParams}`),
  ]);

  return {
    weather,
    marine,
    fetchedAt: new Date().toISOString(),
  };
}

