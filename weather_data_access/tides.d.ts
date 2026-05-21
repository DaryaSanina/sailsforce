/**
 * Type declarations for tides.js (CommonJS).
 * Lets the TypeScript app import getTidalData with full typing while
 * Metro continues to bundle the .js implementation at runtime.
 */

export interface TideExtremum {
  /** "YYYY-MM-DD HH:MM" in the beach's local time. */
  time: string;
  height: number;
  type: "high" | "low";
}

export interface TidalData {
  location: {
    requested: { lat: number; lon: number };
    modelled: { lat: number; lon: number };
  };
  referenceStation: { id: string; name: string; distanceKm: number } | null;
  unit: string;
  range: { startDate: string; endDate: string; days: number; timezone: string };
  tides: TideExtremum[];
  days: { date: string; tides: TideExtremum[] }[];
}

export function getTidalData(
  lat: number,
  lon: number,
  opts?: { startDate?: string | Date; days?: number },
): Promise<TidalData>;
