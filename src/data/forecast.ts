/**
 * Forecast adapter.
 *
 * Turns the raw Open-Meteo responses from weather_data_access into the
 * display-ready shapes the UI renders. All unit conversion, model-ensemble
 * averaging, tide interpolation and copy formatting lives here so the
 * screen components stay presentational.
 */

import type { RawWeatherData } from "../../weather_data_access/weather";
import type { TidalData } from "../../weather_data_access/tides";
import type { InfoDetail, InfoRow } from "../screens/InfoDetailSheet";
import type { Location, UserSettings } from "./prototype";

type Accent = NonNullable<InfoRow["accent"]>;
type IconKind = "sun" | "cloud-sun" | "wind";

export type HourData = {
  hour: string;
  icon: IconKind;
  wind: number;
  gust: number;
  spread: number;
  models: [number, number][];
  conf: number;
  tide: number;
  dayIndex: number;
  dayLabel: string;
  isDayStart: boolean;
};

export type DetailKey = "map" | "windBeach" | "safety" | "temp" | "uv" | "tide";

export type ForecastData = {
  /** Circular beach map at the top of the screen. */
  windKt: number;
  gustKt: number;
  windDir: number;
  windLabel: string;
  swellLabel: string;
  swellDirLabel: string;
  /** Sailability score, 0–10. */
  sailability: number;
  /** Scrollable model-view timeline. */
  hours: HourData[];
  nowIndex: number;
  hasTide: boolean;
  /** Pre-formatted copy for the metric cards. */
  cards: {
    windBeach: { orientation: string; orientationAccent: Accent; windKt: number; directionLabel: string };
    safety: { overall: string; overallAccent: Accent; uvLabel: string; sunsetLabel: string };
    temp: { current: number; feelsLabel: string; waterHumidLabel: string };
    uv: { value: number; descriptor: string; descriptorAccent: Accent; peakLabel: string };
    tide: { state: string; nowLabel: string; nextHighLabel: string };
  };
  /** Expanded widget detail sheets. */
  details: Record<DetailKey, InfoDetail>;
  shareSummary: string;
};

// ---------- Small helpers ---------------------------------------------

const KMH_TO_KT = 0.539957;
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const r0 = (v: number) => Math.round(v);
const r1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ktOf = (kmh: number) => kmh * KMH_TO_KT;

function degToCompass(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

/** Shortest absolute angle between two bearings, 0–180°. */
function angularDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function mean(values: number[]): number {
  const finite = values.filter((v) => Number.isFinite(v));
  return finite.length ? finite.reduce((s, v) => s + v, 0) / finite.length : 0;
}

/** Parses a naive "YYYY-MM-DDTHH:MM" or "YYYY-MM-DD HH:MM" timestamp to epoch ms. */
function parseLocal(s: string): number {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : NaN;
}

/** Extracts "HH:MM" from any timestamp string. */
function clockOf(s: string | undefined): string {
  const m = String(s ?? "").match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "—";
}

function addDays(dateStr: string, n: number): string {
  const ms = parseLocal(`${dateStr}T00:00`) + n * 86_400_000;
  const d = new Date(ms);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/**
 * Open-Meteo appends the model name to every hourly/daily variable when the
 * request carries a `models=` list (e.g. `sunset_ecmwf_ifs025`). This resolves
 * a plain base name to its series, preferring the ECMWF model.
 */
function pick<T>(obj: Record<string, unknown>, base: string): T[] | undefined {
  if (Array.isArray(obj[base])) return obj[base] as T[];
  const preferred = obj[`${base}_ecmwf_ifs025`];
  if (Array.isArray(preferred)) return preferred as T[];
  const key = Object.keys(obj).find((k) => k.startsWith(`${base}_`));
  return key && Array.isArray(obj[key]) ? (obj[key] as T[]) : undefined;
}

function weatherCodeToIcon(code: number | null | undefined): IconKind {
  if (code == null) return "cloud-sun";
  if (code === 0) return "sun";
  if (code <= 48) return "cloud-sun"; // partly cloudy / overcast / fog
  return "wind"; // drizzle, rain, snow, showers, thunder
}

function uvInfo(uv: number): { label: string; accent: Accent } {
  if (uv < 3) return { label: "Low", accent: "good" };
  if (uv < 6) return { label: "Moderate", accent: "warn" };
  if (uv < 8) return { label: "High", accent: "warn" };
  if (uv < 11) return { label: "Very high", accent: "bad" };
  return { label: "Extreme", accent: "bad" };
}

/** Windsurf sailability score, 0–10, from wind strength with a gustiness penalty. */
function computeSailability(windKt: number, gustKt: number): number {
  let base: number;
  if (windKt <= 6) base = (windKt / 6) * 2;
  else if (windKt <= 18) base = 2 + ((windKt - 6) / 12) * 7;
  else if (windKt <= 26) base = 9 + ((windKt - 18) / 8) * 1;
  else if (windKt <= 34) base = 10 - ((windKt - 26) / 8) * 4;
  else base = Math.max(2, 6 - ((windKt - 34) / 6) * 2);
  const gustPenalty = Math.max(0, gustKt - windKt - 6) * 0.15;
  return clamp(r1(base - gustPenalty), 0, 10);
}

/** Builds a smooth tide-height lookup that interpolates between high/low extrema. */
function makeTideAt(extrema: { ms: number; height: number }[]): (ms: number) => number {
  return (ms: number): number => {
    if (extrema.length === 0) return 0;
    if (ms <= extrema[0].ms) return extrema[0].height;
    if (ms >= extrema[extrema.length - 1].ms) return extrema[extrema.length - 1].height;
    let i = 0;
    while (i < extrema.length - 1 && extrema[i + 1].ms <= ms) i++;
    const a = extrema[i];
    const b = extrema[i + 1];
    const phase = (ms - a.ms) / (b.ms - a.ms);
    // Cosine easing approximates the sinusoidal shape of a tidal half-cycle.
    return a.height + (b.height - a.height) * ((1 - Math.cos(Math.PI * phase)) / 2);
  };
}

// ---------- Main builder ----------------------------------------------

export function buildForecast(
  weather: RawWeatherData,
  tides: TidalData | null,
  location: Location,
  settings: UserSettings,
): ForecastData {
  const cur = weather.current;
  const todayDate = String(cur.time).slice(0, 10);

  // --- Current wind & swell ------------------------------------------
  const windKt = r0(ktOf(cur.wind_speed_10m ?? 0));
  const gustKt = r0(ktOf(cur.wind_gusts_10m ?? 0));
  const windDir = r0(cur.wind_direction_10m ?? 0);
  const windCompass = degToCompass(windDir);
  const swellH = cur.swell_wave_height ?? cur.wave_height ?? 0;
  const swellDir = r0(cur.swell_wave_direction ?? cur.wave_direction ?? 0);

  // --- Tides ----------------------------------------------------------
  const extrema = (tides?.tides ?? [])
    .map((t) => ({ ...t, ms: parseLocal(t.time) }))
    .filter((t) => Number.isFinite(t.ms))
    .sort((a, b) => a.ms - b.ms);
  const hasTide = extrema.length > 0;
  const tideAt = makeTideAt(extrema);
  const nowMs = parseLocal(cur.time);
  const nowTide = hasTide ? tideAt(nowMs) : 0;
  const nextExtremum = extrema.find((t) => t.ms > nowMs);
  const tideState = nextExtremum ? (nextExtremum.type === "high" ? "Rising" : "Falling") : "—";
  const nextHigh = extrema.find((t) => t.type === "high" && t.ms > nowMs);
  const nextLow = extrema.find((t) => t.type === "low" && t.ms > nowMs);
  const tomorrowDate = addDays(todayDate, 1);
  const tomorrowHigh = extrema.find((t) => t.type === "high" && t.time.startsWith(tomorrowDate));
  const tomorrowLow = extrema.find((t) => t.type === "low" && t.time.startsWith(tomorrowDate));
  const todayExtrema = extrema.filter((t) => t.time.startsWith(todayDate));
  const tideRange = todayExtrema.length
    ? Math.max(...todayExtrema.map((t) => t.height)) - Math.min(...todayExtrema.map((t) => t.height))
    : 0;
  const heightLabel = (h: number) => `${r1(h).toFixed(1)} m`;

  // --- Hourly timeline (model ensemble) ------------------------------
  const hourlyTime = weather.hourly.time ?? [];
  const weatherCodes = pick<number>(weather.hourly, "weather_code");
  const modelNames = Object.keys(weather.wind_models ?? {});
  const trioNames = ["ecmwf_ifs025", "gfs_seamless", "icon_seamless"].filter((m) => weather.wind_models?.[m]);
  const dayCount = clamp(Math.floor(hourlyTime.length / 24), 1, 5);
  const totalHours = dayCount * 24;

  const hours: HourData[] = [];
  for (let i = 0; i < totalHours; i++) {
    const ts = hourlyTime[i] ?? "";
    const date = ts.slice(0, 10);
    const hh = ts.slice(11, 13);
    const dayIndex = Math.floor(i / 24);

    const speeds = modelNames.map((m) => weather.wind_models[m].wind_speed_10m?.[i]).filter((v): v is number => v != null);
    const gusts = modelNames.map((m) => weather.wind_models[m].wind_gusts_10m?.[i]).filter((v): v is number => v != null);
    const speedsKt = speeds.map(ktOf);
    const windAvg = r0(mean(speedsKt));
    const gustAvg = r0(mean(gusts.map(ktOf)));
    const spread = speedsKt.length ? r0(Math.max(...speedsKt) - Math.min(...speedsKt)) : 0;
    const conf = clamp(r0(94 - spread * 5 - dayIndex * 4), 40, 96);

    const models: [number, number][] = trioNames.map((m) => {
      const s = weather.wind_models[m].wind_speed_10m?.[i];
      const g = weather.wind_models[m].wind_gusts_10m?.[i];
      return [r0(ktOf(s ?? mean(speeds))), r0(ktOf(g ?? mean(gusts)))];
    });

    hours.push({
      hour: hh || String(i % 24).padStart(2, "0"),
      icon: weatherCodeToIcon(weatherCodes?.[i]),
      wind: windAvg,
      gust: gustAvg,
      spread,
      models: models.length ? models : [[windAvg, gustAvg]],
      conf,
      tide: hasTide && ts ? r1(tideAt(parseLocal(ts))) : 0,
      dayIndex,
      dayLabel: dayLabelFor(date, todayDate),
      isDayStart: hh === "00",
    });
  }

  const nowHour = String(cur.time).slice(0, 13);
  let nowIndex = hourlyTime.findIndex((t) => t.slice(0, 13) === nowHour);
  if (nowIndex < 0 || nowIndex >= totalHours) nowIndex = clamp(nowIndex, 0, totalHours - 1);

  // --- Beach normal / wind vs beach ----------------------------------
  const normal = location.normal;
  const hasNormal = typeof normal === "number";
  const angleToNormal = hasNormal ? r0(angularDiff(windDir, normal!)) : 0;
  const orientation = !hasNormal
    ? "—"
    : angleToNormal <= 45
      ? "ONSHORE"
      : angleToNormal >= 135
        ? "OFFSHORE"
        : "CROSS-SHORE";
  const angleRad = (angleToNormal * Math.PI) / 180;
  const crossKt = r0(windKt * Math.sin(angleRad));
  const alongKt = r0(windKt * Math.abs(Math.cos(angleRad)));
  const alongLabel = angleToNormal < 90 ? "onshore" : "offshore";

  // Practical windsurf sail sizing, scaled by rider weight.
  const sailCentre = clamp((settings.weightKg / 75) * (115 / Math.max(windKt, 6)), 3.5, 9);
  const sailLabel = `${(sailCentre - 0.3).toFixed(1)} – ${(sailCentre + 0.3).toFixed(1)} m²`;

  // --- Daily-derived values ------------------------------------------
  const dailyTime = (weather.daily.time as string[]) ?? [];
  const todayIdx = Math.max(0, dailyTime.indexOf(todayDate));
  const sunsetSeries = pick<string>(weather.daily, "sunset");
  const sunsetLabel = clockOf(sunsetSeries?.[todayIdx]);
  const highToday = r0(numAt(pick<number>(weather.daily, "temperature_2m_max"), todayIdx));
  const lowToday = r0(numAt(pick<number>(weather.daily, "temperature_2m_min"), todayIdx));

  // UV index comes from the Air Quality API; today's peak is the max of the
  // hourly series and the hour it occurs.
  const uvHourly = pick<number>(weather.hourly, "uv_index");
  let uvPeak = 0;
  let uvPeakTime = "—";
  if (uvHourly) {
    let best = -1;
    let bestVal = -Infinity;
    for (let i = 0; i < uvHourly.length; i++) {
      const v = uvHourly[i];
      if (hourlyTime[i]?.startsWith(todayDate) && v != null && v > bestVal) {
        bestVal = v;
        best = i;
      }
    }
    if (best >= 0) {
      uvPeak = r0(bestVal);
      uvPeakTime = clockOf(hourlyTime[best]);
    }
  }

  // --- Current weather values ----------------------------------------
  const tempNow = r0(cur.temperature_2m ?? 0);
  const feelsNow = r0(cur.apparent_temperature ?? 0);
  const humidity = r0(cur.relative_humidity_2m ?? 0);
  const hasWater = Number.isFinite(cur.sea_surface_temperature);
  const waterTemp = hasWater ? r0(cur.sea_surface_temperature) : null;
  const uvNow = r0(typeof cur.uv_index === "number" ? cur.uv_index : numAt(uvHourly, nowIndex));
  const uv = uvInfo(uvNow);
  const uvPeakInfo = uvInfo(uvPeak);

  // --- Safety overall ------------------------------------------------
  const waveH = cur.wave_height ?? 0;
  const safety: { overall: string; accent: Accent } =
    gustKt > 38 || waveH > 3
      ? { overall: "POOR", accent: "bad" }
      : gustKt > 30 || waveH > 2
        ? { overall: "CAUTION", accent: "warn" }
        : { overall: "GOOD", accent: "good" };

  // --- Detail sheets --------------------------------------------------
  const tideRows: InfoRow[] = hasTide
    ? [
        { label: "Now", value: `${heightLabel(nowTide)} · ${tideState}`, accent: "info" },
        { label: "Next high", value: nextHigh ? `${heightLabel(nextHigh.height)} · ${clockOf(nextHigh.time)}` : "—" },
        { label: "Next low", value: nextLow ? `${heightLabel(nextLow.height)} · ${clockOf(nextLow.time)}` : "—" },
        {
          label: "Tomorrow high",
          value: tomorrowHigh ? `${heightLabel(tomorrowHigh.height)} · ${clockOf(tomorrowHigh.time)}` : "—",
        },
        {
          label: "Tomorrow low",
          value: tomorrowLow ? `${heightLabel(tomorrowLow.height)} · ${clockOf(tomorrowLow.time)}` : "—",
        },
        { label: "Range", value: heightLabel(tideRange) },
      ]
    : [{ label: "Tide", value: "Unavailable", description: "No tide model data for this spot." }];

  const details: Record<DetailKey, InfoDetail> = {
    map: {
      key: "map",
      title: "Wind & swell conditions",
      subtitle: "Live snapshot at the launch zone",
      rows: [
        { label: "Wind speed", value: `${windKt} kt`, description: "10 m, current" },
        { label: "Gusts", value: `${gustKt} kt`, accent: gustKt > 30 ? "warn" : "default" },
        { label: "Direction", value: `${windCompass} (${windDir}°)` },
        { label: "Swell height", value: `${r1(swellH).toFixed(1)} m` },
        { label: "Swell direction", value: `${degToCompass(swellDir)} (${swellDir}°)` },
        { label: "Swell period", value: `${r1(cur.swell_wave_period ?? cur.wave_period ?? 0).toFixed(1)} s` },
      ],
    },
    windBeach: {
      key: "windBeach",
      title: "Wind vs beach",
      subtitle: "How the wind sits relative to the shore",
      rows: [
        { label: "Orientation", value: orientation, accent: "info" },
        {
          label: "Angle to beach",
          value: hasNormal ? `${angleToNormal}°` : "—",
          description: hasNormal ? `Beach faces ${degToCompass(normal!)} (${r1(normal!)}°)` : undefined,
        },
        { label: "Wind speed", value: `${windKt} kt` },
        { label: "Direction", value: `${windCompass} (${windDir}°)` },
        { label: "Cross-shore component", value: `${crossKt} kt` },
        { label: "On/offshore component", value: `${alongKt} kt ${alongLabel}` },
        { label: `Best sail size for ${settings.weightKg} kg`, value: sailLabel, accent: "good" },
      ],
    },
    safety: {
      key: "safety",
      title: "Safety overview",
      subtitle: "Conditions advisory",
      rows: [
        { label: "Overall", value: safety.overall, accent: safety.accent },
        { label: "UV index", value: `${uvNow} · ${uv.label}`, accent: uv.accent },
        { label: "Sunset", value: sunsetLabel },
      ],
    },
    temp: {
      key: "temp",
      title: "Temperature",
      subtitle: "Conditions for today",
      rows: [
        { label: "Current", value: `${tempNow} °C` },
        { label: "Feels like", value: `${feelsNow} °C` },
        { label: "High today", value: `${highToday} °C` },
        { label: "Low overnight", value: `${lowToday} °C` },
        { label: "Water temp", value: waterTemp != null ? `${waterTemp} °C` : "—" },
        { label: "Humidity", value: `${humidity} %` },
      ],
    },
    uv: {
      key: "uv",
      title: "UV index",
      subtitle: "Sun exposure today",
      rows: [
        { label: "Current", value: `${uvNow} · ${uv.label}`, accent: uv.accent },
        {
          label: "Peak today",
          value: `${uvPeak} · ${uvPeakInfo.label}${uvPeakTime !== "—" ? ` · ${uvPeakTime}` : ""}`,
          accent: uvPeakInfo.accent,
        },
      ],
    },
    tide: {
      key: "tide",
      title: "Tide",
      subtitle: tides?.referenceStation
        ? `Modelled near ${tides.referenceStation.name}`
        : `Today's tide schedule (${location.name})`,
      rows: tideRows,
    },
  };

  return {
    windKt,
    gustKt,
    windDir,
    windLabel: `${windCompass} (${windDir}°)`,
    swellLabel: `${r1(swellH).toFixed(1)} m`,
    swellDirLabel: `${degToCompass(swellDir)} ${swellDir}°`,
    sailability: computeSailability(windKt, gustKt),
    hours,
    nowIndex,
    hasTide,
    cards: {
      windBeach: { orientation, orientationAccent: "info", windKt, directionLabel: `${windCompass} (${windDir}°)` },
      safety: {
        overall: safety.overall,
        overallAccent: safety.accent,
        uvLabel: `${uvNow} · ${uv.label}`,
        sunsetLabel,
      },
      temp: {
        current: tempNow,
        feelsLabel: `Feels ${feelsNow}° · H ${highToday}° / L ${lowToday}°`,
        waterHumidLabel: `Water ${waterTemp != null ? `${waterTemp} °C` : "—"} · Humidity ${humidity}%`,
      },
      uv: {
        value: uvNow,
        descriptor: uv.label,
        descriptorAccent: uv.accent,
        peakLabel: `Peak ${uvPeak}${uvPeakTime !== "—" ? ` · ${uvPeakTime}` : ""}`,
      },
      tide: {
        state: hasTide ? tideState : "—",
        nowLabel: hasTide ? `Now ${heightLabel(nowTide)}` : "Unavailable",
        nextHighLabel: nextHigh ? `Next high ${heightLabel(nextHigh.height)} · ${clockOf(nextHigh.time)}` : "No high tide ahead",
      },
    },
    details,
    shareSummary: `${windKt} kt ${windCompass}, ${r1(swellH).toFixed(1)} m swell`,
  };
}

// ---------- Internal ---------------------------------------------------

function numAt(series: number[] | undefined, index: number): number {
  const v = series?.[index];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function dayLabelFor(date: string, todayDate: string): string {
  const diff = Math.round((parseLocal(`${date}T00:00`) - parseLocal(`${todayDate}T00:00`)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  const ms = parseLocal(`${date}T00:00`);
  return Number.isFinite(ms) ? WEEKDAYS[new Date(ms).getUTCDay()] : date;
}
