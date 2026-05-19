/**
 * Beach Normal Service for Sailsforce
 *
 * Calculates the seaward normal direction (compass bearing) at a given
 * beach location using OpenStreetMap data via the Overpass API.
 *
 * Strategy:
 *  1. Prefer natural=coastline ways — OSM guarantees sea is always to the
 *     RIGHT of the way direction, so the right-hand perpendicular is
 *     unambiguously seaward regardless of which side of the beach you query.
 *  2. Fall back to natural=beach polygon ways and use the outward normal
 *     (perpendicular pointing away from the polygon centroid).
 *
 * Two Overpass endpoints are tried in order; if the primary times out or
 * returns an error the mirror is used automatically.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const REQUEST_TIMEOUT_MS = 30_000;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// ---------- Overpass query --------------------------------------------

async function overpassPost(query) {
  let lastError;
  for (const url of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'sailsforce/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Overpass ${res.status}: ${res.statusText}`);
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      // Try the next endpoint
    }
  }
  throw lastError;
}

// ---------- Geometry --------------------------------------------------

// Squared point-to-segment distance in equirectangular coords.
function segDistSq(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - ax) ** 2 + (py - ay) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
}

// OSM right-hand rule: sea is to the RIGHT of the coastline way direction.
// Right-hand perp of equirectangular vector (sx, sy) → (sy, −sx).
function rightHandBearing(a, b) {
  const cosLat = Math.cos(((a.lat + b.lat) / 2) * DEG_TO_RAD);
  const sx = (b.lon - a.lon) * cosLat;
  const sy = b.lat - a.lat;
  return (Math.atan2(sy, -sx) * RAD_TO_DEG + 360) % 360;
}

// Outward normal of a beach polygon segment (perpendicular pointing away
// from the polygon centroid → seaward for the exposed boundary).
function beachPolygonBearing(segA, segB, nodes, cosLat) {
  const sx = (segB.lon - segA.lon) * cosLat;
  const sy = segB.lat - segA.lat;
  const n1 = { x: -sy, y: sx };
  const n2 = { x:  sy, y: -sx };

  const cLat = nodes.reduce((s, n) => s + n.lat, 0) / nodes.length;
  const cLon = nodes.reduce((s, n) => s + n.lon, 0) / nodes.length;
  const toC  = {
    x: (cLon - (segA.lon + segB.lon) / 2) * cosLat,
    y:  cLat - (segA.lat + segB.lat) / 2,
  };

  const seaward = (n1.x * toC.x + n1.y * toC.y) < 0 ? n1 : n2;
  return (Math.atan2(seaward.x, seaward.y) * RAD_TO_DEG + 360) % 360;
}

function bearingToCompass(b) {
  const pts = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return pts[Math.round(b / 22.5) % 16];
}

// Iterate all segments across a list of OSM ways, return the segment
// closest to the query point (px, py) in equirectangular coords.
function nearestSegment(ways, px, py, cosLat) {
  let best = { distSq: Infinity, segA: null, segB: null, nodes: null };
  for (const way of ways) {
    const nodes = way.geometry;
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const d = segDistSq(px, py, a.lon * cosLat, a.lat, b.lon * cosLat, b.lat);
      if (d < best.distSq) best = { distSq: d, segA: a, segB: b, nodes };
    }
  }
  return best;
}

// ---------- Public API ------------------------------------------------

/**
 * Returns the seaward normal direction for the nearest beach boundary
 * to the given coordinates.
 *
 * @param {number} lat           - Latitude in decimal degrees
 * @param {number} lon           - Longitude in decimal degrees
 * @param {number} radiusMeters  - OSM search radius (default 500 m)
 * @returns {Promise<{
 *   bearing:        number,  // degrees clockwise from north, 0–360
 *   compass:        string,  // 16-point label e.g. "SSW"
 *   source:         string,  // "coastline" | "beach"
 *   nearestSegment: { start: {lat: number, lon: number},
 *                     end:   {lat: number, lon: number} }
 * }>}
 * @throws {Error} If no coastline or beach is found within radiusMeters.
 */
async function getBeachNormal(lat, lon, radiusMeters = 500) {
  const query =
    `[out:json][timeout:25];` +
    `(` +
    `way["natural"="coastline"](around:${radiusMeters},${lat},${lon});` +
    `way["natural"="beach"](around:${radiusMeters},${lat},${lon});` +
    `);` +
    `out geom;`;

  const data     = await overpassPost(query);
  const elements = data.elements || [];

  const coastlines = elements.filter(
    e => e.type === 'way' && e.tags?.natural === 'coastline' && e.geometry?.length >= 2
  );
  const beaches = elements.filter(
    e => e.type === 'way' && e.tags?.natural === 'beach' && e.geometry?.length >= 2
  );

  if (coastlines.length === 0 && beaches.length === 0) {
    throw new Error(
      `No coastline or beach found within ${radiusMeters} m of (${lat}, ${lon})`
    );
  }

  const cosLat = Math.cos(lat * DEG_TO_RAD);
  const px = lon * cosLat;
  const py = lat;

  let bearing, source, best;

  if (coastlines.length > 0) {
    best    = nearestSegment(coastlines, px, py, cosLat);
    bearing = rightHandBearing(best.segA, best.segB);
    source  = 'coastline';
  } else {
    best    = nearestSegment(beaches, px, py, cosLat);
    bearing = beachPolygonBearing(best.segA, best.segB, best.nodes, cosLat);
    source  = 'beach';
  }

  const rounded = Math.round(bearing * 10) / 10;
  return {
    bearing: rounded,
    compass: bearingToCompass(rounded),
    source,
    nearestSegment: { start: best.segA, end: best.segB },
  };
}

module.exports = { getBeachNormal };
