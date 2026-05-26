import beachesJson from "../../weather_data_access/beaches.json";
import type { BeachLocation } from "../domain/models";

type BeachCatalogRecord = {
  id: string;
  name: string;
  city?: string;
  county?: string;
  postcode?: string;
  lat: number;
  lng: number;
  normal: number;
};

function regionForBeach(beach: BeachCatalogRecord): string {
  const parts = [beach.city, beach.county].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "United Kingdom";
}

export const beachLocations: BeachLocation[] = (beachesJson as BeachCatalogRecord[])
  .filter(
    (beach) =>
      typeof beach.id === "string" &&
      typeof beach.name === "string" &&
      Number.isFinite(beach.lat) &&
      Number.isFinite(beach.lng) &&
      Number.isFinite(beach.normal),
  )
  .map((beach) => ({
    id: beach.id,
    name: beach.name,
    region: regionForBeach(beach),
    lat: beach.lat,
    lon: beach.lng,
    normal: beach.normal,
  }));

export const defaultLocationId = beachLocations[0]?.id ?? "";
export const defaultFavoriteLocationIds = beachLocations.slice(0, 3).map((beach) => beach.id);

export function findBeachLocation(id: string): BeachLocation | undefined {
  return beachLocations.find((beach) => beach.id === id);
}

