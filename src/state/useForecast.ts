import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import type { BeachLocation, ForecastBundle, ForecastStatus } from "../domain/models";
import { adaptForecast } from "../services/forecastAdapter";
import { buildMockForecast } from "../services/mockForecast";
import { fetchForecast } from "../services/weatherClient";

const CACHE_PREFIX = "sailsforce:forecast:";
const STALE_MS = 60 * 60 * 1000;

function cacheKey(locationId: string): string {
  return `${CACHE_PREFIX}${locationId}`;
}

function isForecastBundle(value: unknown): value is ForecastBundle {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as ForecastBundle).hours) &&
    (value as ForecastBundle).hours.length > 0 &&
    typeof (value as ForecastBundle).fetchedAt === "string"
  );
}

function average(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function normalizeCachedForecast(bundle: ForecastBundle): ForecastBundle {
  const hours = bundle.hours.map((hour) => {
    const modelWind = average(hour.models.map(([wind]) => wind));
    const modelGust = average(hour.models.map(([, gust]) => gust));
    const wind = hour.wind === 0 && modelWind != null && modelWind > 0 ? Math.round(modelWind) : hour.wind;
    const gust = hour.gust === 0 && modelGust != null && modelGust > 0 ? Math.round(modelGust) : hour.gust;
    const modelWinds = hour.models.map(([value]) => value).filter((value) => Number.isFinite(value));
    const spread = hour.spread === 0 && modelWinds.length > 1 ? Math.max(...modelWinds) - Math.min(...modelWinds) : hour.spread;
    return { ...hour, wind, gust, spread };
  });
  const current = hours[bundle.currentIndex] ?? hours[0] ?? null;
  return { ...bundle, hours, current };
}

async function loadCachedForecast(locationId: string): Promise<ForecastBundle | null> {
  const raw = await AsyncStorage.getItem(cacheKey(locationId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isForecastBundle(parsed) ? normalizeCachedForecast(parsed) : null;
  } catch {
    return null;
  }
}

async function saveCachedForecast(bundle: ForecastBundle): Promise<void> {
  await AsyncStorage.setItem(cacheKey(bundle.locationId), JSON.stringify(bundle));
}

export function useForecast(location: BeachLocation | null) {
  const [forecast, setForecast] = useState<ForecastBundle | null>(null);
  const [status, setStatus] = useState<ForecastStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!location) {
      setForecast(null);
      setStatus("idle");
      setError(null);
      setStale(false);
      return;
    }

    const targetLocation = location;
    let alive = true;

    async function run() {
      setError(null);
      setStatus("loading");
      const cached = await loadCachedForecast(targetLocation.id);
      if (!alive) return;
      if (cached) {
        const age = Date.now() - new Date(cached.fetchedAt).getTime();
        setForecast(cached);
        setStale(age > STALE_MS);
        setStatus("refreshing");
      }

      try {
        const raw = await fetchForecast(targetLocation);
        if (!alive) return;
        const next = adaptForecast(targetLocation, raw);
        setForecast(next);
        setStale(false);
        setStatus("ready");
        saveCachedForecast(next).catch(() => undefined);
      } catch (err) {
        if (!alive) return;
        const fallback = buildMockForecast(targetLocation);
        setForecast(fallback);
        setError(null);
        setStatus("ready");
        setStale(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [location]);

  return { forecast, status, error, stale };
}
