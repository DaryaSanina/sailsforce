import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import type { BeachLocation, ForecastBundle, ForecastStatus } from "../domain/models";
import { adaptForecast } from "../services/forecastAdapter";
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
    typeof (value as ForecastBundle).fetchedAt === "string"
  );
}

async function loadCachedForecast(locationId: string): Promise<ForecastBundle | null> {
  const raw = await AsyncStorage.getItem(cacheKey(locationId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isForecastBundle(parsed) ? parsed : null;
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
        setError(err instanceof Error ? err.message : "Failed to load forecast.");
        setStatus(cached ? "ready" : "error");
        setStale(Boolean(cached));
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [location]);

  return { forecast, status, error, stale };
}
