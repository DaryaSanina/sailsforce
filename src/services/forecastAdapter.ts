import type { BeachLocation, ForecastBundle, ForecastHour, ForecastIcon } from "../domain/models";
import { compassLabel, dayIndexFor, dayLabelFor, findNearestHourIndex } from "./forecastMath";
import { findTideExtrema } from "./tides";
import type { RawForecastResponse } from "./weatherClient";
import { WIND_MODELS } from "./weatherClient";

function numberAt(values: unknown[] | undefined, index: number): number | null {
  const value = values?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringAt(values: unknown[] | undefined, index: number): string | null {
  const value = values?.[index];
  return typeof value === "string" ? value : null;
}

function round(value: number | null, decimals = 0): number | null {
  if (value == null) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function iconForWeatherCode(code: number | null, windKt: number | null): ForecastIcon {
  if ((windKt ?? 0) >= 22) return "wind";
  if (code == null) return "cloud-sun";
  if (code <= 1) return "sun";
  return "cloud-sun";
}

function confidenceFromSpread(spreadKt: number, index: number): number {
  return Math.max(35, Math.min(88, Math.round(86 - spreadKt * 7 - index * 0.18)));
}

function modelValue(raw: Record<string, unknown[]>, base: string, model: string, index: number): number | null {
  return numberAt(raw[`${base}_${model}`], index);
}

export function adaptForecast(location: BeachLocation, raw: RawForecastResponse): ForecastBundle {
  const weatherHourly = raw.weather.hourly ?? {};
  const marineHourly = raw.marine.hourly ?? {};
  const times = (weatherHourly.time ?? []).filter((value): value is string => typeof value === "string");
  const currentIndex = findNearestHourIndex(times);

  const seaLevel = times.map((_, index) => round(numberAt(marineHourly.sea_level_height_msl, index), 2));
  const tides = findTideExtrema(times, seaLevel);

  const hours: ForecastHour[] = times.map((time, index) => {
    const wind = round(numberAt(weatherHourly.wind_speed_10m, index)) ?? 0;
    const gust = round(numberAt(weatherHourly.wind_gusts_10m, index)) ?? wind;
    const windDir = round(numberAt(weatherHourly.wind_direction_10m, index)) ?? 0;

    const models: [number, number][] = WIND_MODELS.map((model) => [
      round(modelValue(weatherHourly, "wind_speed_10m", model, index)) ?? wind,
      round(modelValue(weatherHourly, "wind_gusts_10m", model, index)) ?? gust,
    ]);
    const modelWinds = models.map(([modelWind]) => modelWind);
    const spread = Math.max(...modelWinds) - Math.min(...modelWinds);

    return {
      time,
      hour: time.slice(11, 13),
      icon: iconForWeatherCode(numberAt(weatherHourly.weather_code, index), wind),
      wind,
      gust,
      windDir,
      windDirLabel: compassLabel(windDir),
      spread,
      models,
      conf: confidenceFromSpread(spread, index),
      tide: seaLevel[index],
      dayIndex: dayIndexFor(time),
      dayLabel: dayLabelFor(time),
      isDayStart: index === 0 || time.slice(0, 10) !== stringAt(weatherHourly.time, index - 1)?.slice(0, 10),
      temperatureC: round(numberAt(weatherHourly.temperature_2m, index), 1),
      apparentTemperatureC: round(numberAt(weatherHourly.apparent_temperature, index), 1),
      humidityPct: round(numberAt(weatherHourly.relative_humidity_2m, index)),
      uvIndex: round(numberAt(weatherHourly.uv_index, index)),
      waveHeightM: round(numberAt(marineHourly.wave_height, index), 1),
      waveDirection: round(numberAt(marineHourly.wave_direction, index)),
      wavePeriodS: round(numberAt(marineHourly.wave_period, index), 1),
      swellHeightM: round(numberAt(marineHourly.swell_wave_height, index), 1),
      swellDirection: round(numberAt(marineHourly.swell_wave_direction, index)),
      swellPeriodS: round(numberAt(marineHourly.swell_wave_period, index), 1),
    };
  });

  return {
    locationId: location.id,
    fetchedAt: raw.fetchedAt,
    timezone: raw.weather.timezone ?? raw.marine.timezone ?? "auto",
    hours,
    currentIndex,
    current: hours[currentIndex] ?? null,
    tides,
  };
}

