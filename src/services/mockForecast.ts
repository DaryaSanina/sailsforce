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
  const baseWind = 13 + (seed % 7);
  const baseDirection = (location.normal + 35 + (seed % 70)) % 360;

  const times = Array.from({ length: HOURS }, (_, index) => {
    const date = new Date(start);
    date.setHours(start.getHours() + index);
    return localTimestamp(date);
  });

  const seaLevel = times.map((_, index) => round(Math.sin((index / 12.4) * Math.PI * 2) * 1.35 + 0.15, 2));
  const tides = findTideExtrema(times, seaLevel);

  const hours: ForecastHour[] = times.map((time, index) => {
    const dayPart = Math.sin(((index % 24) / 24) * Math.PI * 2 - Math.PI / 2);
    const weatherCycle = Math.sin(index / 8 + seed);
    const wind = Math.max(4, round(baseWind + weatherCycle * 4 + dayPart * 2));
    const gust = round(wind + 5 + Math.max(0, Math.sin(index / 5)) * 4);
    const windDir = round((baseDirection + Math.sin(index / 10) * 28 + index * 1.5 + 360) % 360);
    const model1 = Math.max(1, round(wind - 1 + Math.sin(index / 6)));
    const model2 = Math.max(1, round(wind + 1 + Math.cos(index / 7)));
    const model3 = Math.max(1, round(wind + Math.sin(index / 5 + 1)));
    const modelGust1 = Math.max(model1, round(gust - 2));
    const modelGust2 = Math.max(model2, round(gust + 1));
    const modelGust3 = Math.max(model3, round(gust));
    const spread = Math.max(model1, model2, model3) - Math.min(model1, model2, model3);
    const temperatureC = round(15 + dayPart * 3 + Math.sin(index / 18) * 1.5, 1);

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
      humidityPct: round(68 + Math.sin(index / 6) * 10),
      uvIndex: Math.max(0, round(dayPart > 0 ? dayPart * 6 : 0)),
      waveHeightM: round(0.8 + Math.max(0, wind - 10) * 0.08 + Math.sin(index / 9) * 0.2, 1),
      waveDirection: round((windDir + 145) % 360),
      wavePeriodS: round(7 + Math.sin(index / 8) * 1.5, 1),
      swellHeightM: round(1.1 + Math.sin(index / 11) * 0.4, 1),
      swellDirection: round((windDir + 160) % 360),
      swellPeriodS: round(9 + Math.cos(index / 10) * 1.8, 1),
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
