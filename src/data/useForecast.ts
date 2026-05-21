/**
 * useForecast — fetches live weather + tide data for a location and adapts
 * it into the display-ready ForecastData shape.
 *
 * Network calls run only when the selected spot changes; the (cheap, pure)
 * adapter re-runs whenever user settings change so things like sail sizing
 * stay in sync without re-fetching.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchWeatherData, type RawWeatherData } from "../../weather_data_access/weather";
import { getTidalData, type TidalData } from "../../weather_data_access/tides";
import { buildForecast, type ForecastData } from "./forecast";
import type { Location, UserSettings } from "./prototype";

type RawBundle = { weather: RawWeatherData; tides: TidalData | null };

export type UseForecastResult = {
  data: ForecastData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useForecast(location: Location | undefined, settings: UserSettings): UseForecastResult {
  const [bundle, setBundle] = useState<RawBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const locId = location?.id;
  const lat = location?.lat;
  const lng = location?.lng;

  useEffect(() => {
    if (lat == null || lng == null) {
      setBundle(null);
      setLoading(false);
      setError(location ? "No coordinates for this spot — live forecast unavailable." : null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setBundle(null);

    (async () => {
      try {
        // Weather is required; tides are best-effort so a marine-API miss
        // still leaves a usable forecast.
        const [weather, tides] = await Promise.all([
          fetchWeatherData(lat, lng),
          getTidalData(lat, lng, { days: 7 }).catch((err) => {
            console.warn("Tide data unavailable:", err?.message ?? err);
            return null;
          }),
        ]);
        if (!cancelled) setBundle({ weather, tides });
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError(`Couldn't load the forecast. ${message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locId, lat, lng, reloadKey]);

  const data = useMemo(() => {
    if (!bundle || !location) return null;
    try {
      return buildForecast(bundle.weather, bundle.tides, location, settings);
    } catch (err) {
      console.warn("Failed to build forecast:", err);
      return null;
    }
  }, [bundle, location, settings]);

  return { data, loading, error, reload };
}
