import type { BeachLocation, ForecastBundle, ForecastHour } from "../domain/models";
import { compassLabel, dayIndexFor, dayLabelFor, findNearestHourIndex } from "./forecastMath";
import { findTideExtrema } from "./tides";

const HOURS = 24 * 5;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localTimestamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function locationSeed(location: BeachLocation): number {
  return Array.from(location.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function buildMockForecast(location: BeachLocation): ForecastBundle {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const seed = locationSeed(location);

  // Independent seed derivatives so each metric varies differently per location.
  // Prime multipliers + offsets keep the distributions from correlating.
  const seed2 = (seed * 31 + 17) % 97;  // temperature, wave height, wave period
  const seed3 = (seed * 53 + 29) % 89;  // swell, humidity, tide amplitude
  const seed4 = (seed * 71 + 13) % 83;  // UV, gust base, swell period

  // Wind: UK coastal sailing range roughly 8–21 kt
  const baseWind = 8 + (seed % 14);
  const baseDirection = (location.normal + 35 + (seed % 70)) % 360;

  // Temperature: UK beach air temp typically 12–21 °C in sailing season
  const baseTemp = 12 + (seed2 % 10);

  // Humidity: UK coastal air typically 65–87 %
  const baseHumidity = 65 + (seed3 % 23);

  // UV: UK summer range 3–7 (south coast higher than Scotland)
  const uvPeak = 3 + (seed4 % 5);

  // Wave height: 0.4–2.0 m depending on exposure
  const baseWaveH = round(0.4 + (seed2 % 17) * 0.1, 1);

  // Swell: 0.6–2.5 m, longer period on west/south-facing beaches
  const baseSwellH = round(0.6 + (seed3 % 20) * 0.1, 1);
  const baseSwellPeriod = 7 + (seed4 % 8);   // 7–14 s
  const baseWavePeriod = 4 + (seed2 % 6);    // 4–9 s local wind-wave

  // Gust excess above wind speed: 4–9 kt
  const gustBase = 4 + (seed4 % 6);

  // Tide: UK ranges from ~1.5 m (sheltered bays) to ~4.8 m (Bristol Channel area)
  const tideAmplitude = round(1.5 + (seed3 % 34) * 0.1, 2);
  const tideDatum = round(tideAmplitude * 0.12 + 0.1, 2);

  const times = Array.from({ length: HOURS }, (_, index) => {
    const date = new Date(start);
    date.setHours(start.getHours() + index);
    return localTimestamp(date);
  });

  const seaLevel = times.map((_, index) =>
    round(Math.sin((index / 12.4) * Math.PI * 2) * tideAmplitude + tideDatum, 2),
  );
  const tides = findTideExtrema(times, seaLevel);

  const hours: ForecastHour[] = times.map((time, index) => {
    const dayPart = Math.sin(((index % 24) / 24) * Math.PI * 2 - Math.PI / 2);
    const weatherCycle = Math.sin(index / 8 + seed);
    const wind = Math.max(4, round(baseWind + weatherCycle * 4 + dayPart * 2));
    const gust = round(wind + gustBase + Math.max(0, Math.sin(index / 5)) * 4);
    const windDir = round((baseDirection + Math.sin(index / 10) * 28 + index * 1.5 + 360) % 360);

    // Each model has its own bias, oscillation frequency, and phase so they
    // converge and diverge at different times rather than tracking each other.
    // ECMWF: slightly conservative, slow 7-hour cycle.
    // GFS:   runs warm/high, fast 5-hour cycle, offset phase.
    // ICON:  near-neutral bias, 6-hour cosine cycle, different phase again.
    const model1 = Math.max(1, round(wind - 1.0 + Math.sin(index / 7 + seed * 0.3) * 2.5));
    const model2 = Math.max(1, round(wind + 1.5 + Math.sin(index / 5 + seed * 0.5 + 1.2) * 3.0));
    const model3 = Math.max(1, round(wind + 0.5 + Math.cos(index / 6 + seed * 0.4 + 2.1) * 2.0));

    // Gust character differs too: GFS most gusty, ECMWF tightest.
    const modelGust1 = Math.max(model1, round(model1 + gustBase - 1 + Math.sin(index / 8) * 1.5));
    const modelGust2 = Math.max(model2, round(model2 + gustBase + 2 + Math.cos(index / 6) * 3.0));
    const modelGust3 = Math.max(model3, round(model3 + gustBase + Math.sin(index / 7 + 1) * 2.0));

    const spread = Math.max(model1, model2, model3) - Math.min(model1, model2, model3);
    const temperatureC = round(baseTemp + dayPart * 3 + Math.sin(index / 18) * 1.5, 1);

    return {
      time,
      hour: time.slice(11, 13),
      icon: wind >= 22 ? "wind" : dayPart > 0.15 ? "sun" : "cloud-sun",
      wind,
      gust,
      windDir,
      windDirLabel: compassLabel(windDir),
      spread,
      models: [
        [model1, modelGust1],
        [model2, modelGust2],
        [model3, modelGust3],
      ],
      conf: Math.max(45, Math.min(88, round(84 - spread * 5 - index * 0.15))),
      tide: seaLevel[index],
      dayIndex: dayIndexFor(time),
      dayLabel: dayLabelFor(time),
      isDayStart: index === 0 || time.slice(0, 10) !== times[index - 1]?.slice(0, 10),
      temperatureC,
      apparentTemperatureC: round(temperatureC - Math.max(0, wind - 18) * 0.08, 1),
      humidityPct: round(baseHumidity + Math.sin(index / 6) * 8),
      uvIndex: Math.max(0, round(dayPart > 0 ? dayPart * uvPeak : 0)),
      waveHeightM: round(baseWaveH + Math.max(0, wind - 10) * 0.08 + Math.sin(index / 9) * 0.2, 1),
      waveDirection: round((windDir + 145) % 360),
      wavePeriodS: round(baseWavePeriod + Math.sin(index / 8) * 1.5, 1),
      swellHeightM: round(baseSwellH + Math.sin(index / 11) * 0.4, 1),
      swellDirection: round((windDir + 160) % 360),
      swellPeriodS: round(baseSwellPeriod + Math.cos(index / 10) * 1.8, 1),
    };
  });

  const currentIndex = findNearestHourIndex(times);

  return {
    locationId: location.id,
    fetchedAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "auto",
    hours,
    currentIndex,
    current: hours[currentIndex] ?? null,
    tides,
  };
}
