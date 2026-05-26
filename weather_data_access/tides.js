/**
 * Tides Service for Sailsforce
 *
 * Produces a 7-day (configurable) high/low tide forecast for any UK beach.
 *
 * Strategy:
 *  1. Fetch hourly mean-sea-level height from Open-Meteo's Marine API for a
 *     single window that covers the requested range plus one padding day on
 *     each side (so peaks near the range boundaries are not missed).
 *  2. Detect high/low tides as local maxima/minima of the hourly series,
 *     then refine each peak's time and height with parabolic interpolation
 *     (hourly samples rarely land exactly on a true tide peak).
 *  3. Look up the nearest UK Environment Agency tide gauge purely to give
 *     the result a human-readable reference name.
 */

const EA_STATIONS_URL =
  'https://environment.data.gov.uk/flood-monitoring/id/stations?parameter=level&qualifier=Tidal%20Level';
const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const DEFAULT_DAYS = 7;

// ---------- Date helpers ----------------------------------------------
// Open-Meteo (timezone=auto) returns naive local timestamps with no offset,
// e.g. "2026-05-20T14:00". We parse and format every timestamp the same
// naive way using Date.UTC, so values stay in the beach's local time end to end.

/** Parses a naive "YYYY-MM-DDTHH:MM" timestamp into epoch ms. */
function parseTimestamp(s) {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error(`Unrecognised timestamp from API: ${s}`);
  // We use UTC to avoid local machine timezone interference with the naive API strings.
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

/** Formats epoch ms as "YYYY-MM-DD HH:MM". */
function formatDateTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
  );
}

/** Formats epoch ms as a "YYYY-MM-DD" date string. */
function formatDate(ms) {
  return formatDateTime(ms).slice(0, 10);
}

/**
 * Resolves the start date to UTC-midnight epoch ms.
 * Accepts a Date, "YYYY-MM-DD", "YYYYMMDD", or null (= today, local).
 */
function resolveStartDate(input) {
  if (!input) {
    const now = new Date();
    // Use the machine's local date but treat as UTC midnight for naive comparison.
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (input instanceof Date) {
    return Date.UTC(
      input.getFullYear(),
      input.getMonth(),
      input.getDate()
    );
  }
  const m = String(input).match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (!m) {
    throw new Error(
      `Invalid startDate "${input}" — expected YYYY-MM-DD or YYYYMMDD.`
    );
  }
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}

// ---------- Geometry --------------------------------------------------

/** Haversine distance between two lat/lon points, in kilometres. */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------- Reference station -----------------------------------------

/**
 * Finds the nearest UK Environment Agency tidal level station.
 * Used only to label the forecast with a recognisable place name.
 */
async function findNearestStation(lat, lon) {
  const response = await fetch(EA_STATIONS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch UK EA stations: ${response.statusText}`);
  }
  const data = await response.json();
  let nearest = null;
  // EA API items can be at root or in items array depending on query.
  const stations = data.items || (Array.isArray(data) ? data : []);
  for (const s of stations) {
    if (typeof s.lat !== 'number' || typeof s.long !== 'number') continue;
    const distance = getDistance(lat, lon, s.lat, s.long);
    if (!nearest || distance < nearest.distance) {
      nearest = { id: s.stationReference, name: s.label, distance };
    }
  }
  return nearest;
}

// ---------- Tide series -----------------------------------------------

/**
 * Fetches the hourly mean-sea-level height series from Open-Meteo's Marine
 * API. Note: Accuracy is limited in estuaries and complex coastlines;
 * global models often drift by 30-90 minutes compared to local charts.
 * For high-precision UK tides, the UKHO (Admiralty) API is recommended.
 */
async function fetchSeaLevelSeries(lat, lon, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'sea_level_height_msl',
    start_date: startDate,
    end_date: endDate,
    timezone: 'auto',
  });

  const url = `${OPEN_METEO_MARINE_URL}?${params}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.error) {
    const reason =
      (data && data.reason) || response.statusText || `HTTP ${response.status}`;
    throw new Error(`Open-Meteo marine API error: ${reason}`);
  }

  const times = data.hourly && data.hourly.time;
  const heights = data.hourly && data.hourly.sea_level_height_msl;
  if (!Array.isArray(times) || !Array.isArray(heights)) {
    throw new Error('Open-Meteo marine API returned no sea-level data.');
  }

  return {
    times,
    heights,
    unit: (data.hourly_units && data.hourly_units.sea_level_height_msl) || 'm',
    timezone: data.timezone || 'UTC',
    modelled: { lat: data.latitude, lon: data.longitude },
  };
}

/**
 * Detects high/low tides as local extrema of the hourly height series.
 * Each peak is refined with parabolic interpolation over its three
 * surrounding samples, giving a sub-hourly time and a corrected height.
 *
 * @returns {Array<{ ms: number, height: number, type: 'high'|'low' }>}
 */
function findTideExtrema(times, heights) {
  const extrema = [];

  for (let i = 1; i < heights.length - 1; i++) {
    const y0 = heights[i - 1];
    const y1 = heights[i];
    const y2 = heights[i + 1];
    if (y0 == null || y1 == null || y2 == null) continue;

    const isHigh = y1 > y0 && y1 > y2;
    const isLow = y1 < y0 && y1 < y2;
    if (!isHigh && !isLow) continue;

    // Vertex of the parabola through (-1,y0), (0,y1), (1,y2).
    // denom is non-zero for any strict extremum.
    const denom = y0 - 2 * y1 + y2;
    let offsetHours = 0;
    let height = y1;
    if (denom !== 0) {
      offsetHours = (0.5 * (y0 - y2)) / denom; // within (-0.5, 0.5)
      height = y1 - 0.25 * (y0 - y2) * offsetHours;
    }

    extrema.push({
      ms: parseTimestamp(times[i]) + offsetHours * MS_PER_HOUR,
      height: Math.round(height * 100) / 100,
      type: isHigh ? 'high' : 'low',
    });
  }

  return extrema;
}

// ---------- Public API ------------------------------------------------

/**
 * Returns a multi-day high/low tide forecast for a location.
 *
 * @param {number} lat   - Latitude in decimal degrees.
 * @param {number} lon   - Longitude in decimal degrees.
 * @param {object} [opts]
 * @param {string|Date} [opts.startDate] - First day of the forecast
 *        (YYYY-MM-DD / YYYYMMDD / Date). Defaults to today.
 * @param {number}      [opts.days]      - Number of days to forecast
 *        (default 7).
 * @returns {Promise<{
 *   location: { requested: {lat,lon}, modelled: {lat,lon} },
 *   referenceStation: { id, name, distanceKm } | null,
 *   unit: string,
 *   range: { startDate: string, endDate: string, days: number, timezone: string },
 *   tides: Array<{ time: string, height: number, type: 'high'|'low' }>,
 *   days: Array<{ date: string, tides: Array<object> }>
 * }>}
 */
async function getTidalData(lat, lon, opts = {}) {
  const { startDate = null, days = DEFAULT_DAYS } = opts;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('getTidalData requires numeric lat and lon.');
  }
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('getTidalData: days must be a positive integer.');
  }

  const startMs = resolveStartDate(startDate);
  const rangeEndExclusiveMs = startMs + days * MS_PER_DAY;

  // Fetch one padded window: a day before the range and a day after, so
  // tide peaks straddling the boundaries are still detected.
  const fetchStart = formatDate(startMs - MS_PER_DAY);
  const fetchEnd = formatDate(startMs + days * MS_PER_DAY);

  // Tides are the core data; the station name is best-effort.
  const [series, station] = await Promise.all([
    fetchSeaLevelSeries(lat, lon, fetchStart, fetchEnd),
    findNearestStation(lat, lon).catch((err) => {
      console.warn('Reference station lookup failed:', err.message);
      return null;
    }),
  ]);

  const tides = findTideExtrema(series.times, series.heights)
    .filter((t) => t.ms >= startMs && t.ms < rangeEndExclusiveMs)
    .sort((a, b) => a.ms - b.ms)
    .map((t) => ({
      time: formatDateTime(t.ms),
      height: t.height,
      type: t.type,
    }));

  // Group into one bucket per day, including days that have no tides.
  const byDay = [];
  for (let d = 0; d < days; d++) {
    const date = formatDate(startMs + d * MS_PER_DAY);
    byDay.push({
      date,
      tides: tides.filter((t) => t.time.startsWith(date)),
    });
  }

  return {
    location: {
      requested: { lat, lon },
      modelled: series.modelled,
    },
    referenceStation: station
      ? {
          id: station.id,
          name: station.name,
          distanceKm: Math.round(station.distance * 10) / 10,
        }
      : null,
    unit: series.unit,
    range: {
      startDate: formatDate(startMs),
      endDate: formatDate(rangeEndExclusiveMs - MS_PER_DAY),
      days,
      timezone: series.timezone,
    },
    tides,
    days: byDay,
  };
}

module.exports = {
  getTidalData,
  // Exposed for unit testing — not part of the public API.
  _internals: {
    getDistance,
    resolveStartDate,
    parseTimestamp,
    formatDateTime,
    formatDate,
    findNearestStation,
    fetchSeaLevelSeries,
    findTideExtrema,
  },
};

// ---------- CLI entry point -------------------------------------------
// Quick check:  node tides.js <lat> <lon> [days]
if (require.main === module) {
  const lat = Number(process.argv[2]);
  const lon = Number(process.argv[3]);
  const days = process.argv[4] ? Number(process.argv[4]) : DEFAULT_DAYS;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    console.error('Usage: node tides.js <lat> <lon> [days]');
    process.exit(1);
  }

  getTidalData(lat, lon, { days })
    .then((data) => console.log(JSON.stringify(data, null, 2)))
    .catch((err) => {
      console.error('Failed:', err.message);
      process.exit(1);
    });
}
