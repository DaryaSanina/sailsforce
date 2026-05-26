/**
 * generateBeaches.js
 *
 * Queries OpenStreetMap (Overpass API) for named beaches in the UK,
 * reverse-geocodes each one via Nominatim for county/city/postcode,
 * computes the seaward beach normal via getBeachNormal, then writes
 * the result to beaches.json in the same directory.
 *
 * Run with: node generateBeaches.js [options]
 *
 * CLI options (all optional):
 *   --areas   Comma-separated list of UK counties/regions to restrict to.
 *             e.g. --areas="Cornwall,Devon"
 *   --bbox    Bounding box as "south,west,north,east" in decimal degrees.
 *             e.g. --bbox="49.9,-5.8,50.5,-4.5"
 *   --limit   Maximum number of beaches to process.
 *             e.g. --limit=50
 *   --output  Path to write the JSON file (default: beaches.json).
 *             e.g. --output="./data/cornwall.json"
 *
 * Progress is checkpointed to beaches_checkpoint.json so a failed run
 * can resume from where it left off rather than starting over.
 */

const fs   = require('fs');
const path = require('path');

const DEFAULT_OUTPUT_PATH = path.join(__dirname, 'beaches.json');
const CHECKPOINT_PATH     = path.join(__dirname, 'beaches_checkpoint.json');
const BEACH_GEOMETRY_CACHE_PATH = path.join(__dirname, 'overpass_named_beaches_geom_latest.json');
const COASTLINE_GEOMETRY_CACHE_PATH = path.join(__dirname, 'overpass_uk_coastline_geom_latest.json');

// Nominatim enforces a hard 1 req/sec limit for anonymous use.
const NOMINATIM_DELAY_MS = 1100;
const NORMAL_SEARCH_RADIUS_METERS = 5000;
const METERS_PER_DEGREE_LAT = 111_320;
const CELL_SIZE_DEGREES = 0.05;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const UK_COASTLINE_BBOX = {
  south: 49.7,
  west: -8.7,
  north: 61.1,
  east: 2.2,
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// ---------- Helpers -------------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function overpassPost(query) {
  let lastError;
  for (const url of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 240_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
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
    }
  }
  throw lastError;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value));
}

function hasGeometry(elements) {
  return Array.isArray(elements) && elements.some(el => Array.isArray(el.geometry));
}

// ---------- Data fetching -------------------------------------------------

/**
 * Builds and runs an Overpass query for named beaches.
 *
 * @param {object} opts
 * @param {string[]} [opts.areas]  Named UK counties/regions (OSM admin areas).
 * @param {object}  [opts.bbox]   { south, west, north, east } in decimal degrees.
 */
async function fetchUKBeaches({ areas, bbox } = {}) {
  console.log('Querying Overpass API for UK beaches...');

  const canUseCache = (!areas || areas.length === 0) && !bbox;
  if (canUseCache) {
    const cached = readJsonIfExists(BEACH_GEOMETRY_CACHE_PATH);
    if (cached?.elements && hasGeometry(cached.elements)) {
      console.log(`Loaded ${cached.elements.length} beach elements from ${BEACH_GEOMETRY_CACHE_PATH}.`);
      return cached.elements;
    }
  }

  let areaFilter;

  if (areas && areas.length > 0) {
    // Resolve each named area to an OSM admin_level area and union the results.
    const areaLookups = areas
      .map(a => `area["name"="${a}"]["boundary"="administrative"]->.a${areas.indexOf(a)};`)
      .join('\n    ');
    const areaUnion = areas.map((_, i) => `(area.a${i})`).join('');
    areaFilter = `
    ${areaLookups}
    (
      node["natural"="beach"]["name"]${areaUnion};
      way["natural"="beach"]["name"]${areaUnion};
      relation["natural"="beach"]["name"]${areaUnion};
    );`;
  } else if (bbox) {
    // Bounding box filter — no area lookup needed.
    const { south, west, north, east } = bbox;
    areaFilter = `
    (
      node["natural"="beach"]["name"](${south},${west},${north},${east});
      way["natural"="beach"]["name"](${south},${west},${north},${east});
      relation["natural"="beach"]["name"](${south},${west},${north},${east});
    );`;
  } else {
    // Default: the United Kingdom.
    areaFilter = `
    area["ISO3166-1"="GB"][admin_level=2]->.uk;
    (
      node["natural"="beach"]["name"](area.uk);
      way["natural"="beach"]["name"](area.uk);
      relation["natural"="beach"]["name"](area.uk);
    );`;
  }

  const query = `[out:json][timeout:180];${areaFilter}\nout center geom tags;`;
  const data = await overpassPost(query);
  if (canUseCache) writeJson(BEACH_GEOMETRY_CACHE_PATH, data);
  return data.elements ?? [];
}

async function fetchUKCoastlineWays() {
  const cached = readJsonIfExists(COASTLINE_GEOMETRY_CACHE_PATH);
  if (cached?.elements && hasGeometry(cached.elements)) {
    console.log(`Loaded ${cached.elements.length} coastline ways from ${COASTLINE_GEOMETRY_CACHE_PATH}.`);
    return cached.elements;
  }

  console.log('Querying Overpass API for UK coastline geometry...');
  const { south, west, north, east } = UK_COASTLINE_BBOX;
  const query =
    `[out:json][timeout:180];` +
    `way["natural"="coastline"](${south},${west},${north},${east});` +
    `out geom;`;
  const data = await overpassPost(query);
  writeJson(COASTLINE_GEOMETRY_CACHE_PATH, data);
  return data.elements ?? [];
}

async function reverseGeocode(lat, lon) {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'sailsforce/1.0',
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}: ${res.statusText}`);
  const data = await res.json();
  const a = data.address ?? {};
  return {
    city:     a.city ?? a.town ?? a.village ?? a.hamlet ?? null,
    county:   a.county ?? a.state_district ?? null,
    postcode: a.postcode ?? null,
  };
}

// ---------- Local normal calculation --------------------------------------

function segDistSq(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - ax) ** 2 + (py - ay) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
}

function rightHandBearing(a, b) {
  const cosLat = Math.cos(((a.lat + b.lat) / 2) * DEG_TO_RAD);
  const sx = (b.lon - a.lon) * cosLat;
  const sy = b.lat - a.lat;
  return (Math.atan2(sy, -sx) * RAD_TO_DEG + 360) % 360;
}

function beachPolygonBearing(segA, segB, nodes, cosLat) {
  const sx = (segB.lon - segA.lon) * cosLat;
  const sy = segB.lat - segA.lat;
  const n1 = { x: -sy, y: sx };
  const n2 = { x: sy, y: -sx };

  const cLat = nodes.reduce((s, n) => s + n.lat, 0) / nodes.length;
  const cLon = nodes.reduce((s, n) => s + n.lon, 0) / nodes.length;
  const toC = {
    x: (cLon - (segA.lon + segB.lon) / 2) * cosLat,
    y: cLat - (segA.lat + segB.lat) / 2,
  };

  const seaward = (n1.x * toC.x + n1.y * toC.y) < 0 ? n1 : n2;
  return (Math.atan2(seaward.x, seaward.y) * RAD_TO_DEG + 360) % 360;
}

function roundedBearing(bearing) {
  return Math.round(bearing * 10) / 10;
}

function cellCoord(value) {
  return Math.floor(value / CELL_SIZE_DEGREES);
}

function cellKey(x, y) {
  return `${x},${y}`;
}

function addSegmentToIndex(index, segment) {
  const minLat = Math.min(segment.a.lat, segment.b.lat);
  const maxLat = Math.max(segment.a.lat, segment.b.lat);
  const minLon = Math.min(segment.a.lon, segment.b.lon);
  const maxLon = Math.max(segment.a.lon, segment.b.lon);

  for (let x = cellCoord(minLon); x <= cellCoord(maxLon); x++) {
    for (let y = cellCoord(minLat); y <= cellCoord(maxLat); y++) {
      const key = cellKey(x, y);
      const bucket = index.cells.get(key);
      if (bucket) bucket.push(segment);
      else index.cells.set(key, [segment]);
    }
  }
}

function buildSegmentIndex(elements) {
  const index = { cells: new Map() };
  for (const el of elements) {
    const nodes = el.geometry;
    if (!Array.isArray(nodes) || nodes.length < 2) continue;
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;
      if (!Number.isFinite(b.lat) || !Number.isFinite(b.lon)) continue;
      addSegmentToIndex(index, { a, b, nodes });
    }
  }
  return index;
}

function nearestIndexedSegment(index, lat, lon, radiusMeters) {
  const cosLat = Math.cos(lat * DEG_TO_RAD);
  const latRadius = radiusMeters / METERS_PER_DEGREE_LAT;
  const lonRadius = latRadius / Math.max(cosLat, 0.1);
  const px = lon * cosLat;
  const py = lat;
  const maxDistSq = latRadius ** 2;

  let best = { distSq: Infinity, segA: null, segB: null, nodes: null };
  const seen = new Set();

  for (let x = cellCoord(lon - lonRadius); x <= cellCoord(lon + lonRadius); x++) {
    for (let y = cellCoord(lat - latRadius); y <= cellCoord(lat + latRadius); y++) {
      const bucket = index.cells.get(cellKey(x, y));
      if (!bucket) continue;

      for (const segment of bucket) {
        if (seen.has(segment)) continue;
        seen.add(segment);

        const d = segDistSq(
          px,
          py,
          segment.a.lon * cosLat,
          segment.a.lat,
          segment.b.lon * cosLat,
          segment.b.lat,
        );
        if (d < best.distSq) {
          best = { distSq: d, segA: segment.a, segB: segment.b, nodes: segment.nodes };
        }
      }
    }
  }

  return best.distSq <= maxDistSq ? best : null;
}

function nearestGeometrySegment(nodes, lat, lon) {
  if (!Array.isArray(nodes) || nodes.length < 2) return null;
  const cosLat = Math.cos(lat * DEG_TO_RAD);
  const px = lon * cosLat;
  const py = lat;
  let best = { distSq: Infinity, segA: null, segB: null, nodes };

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;
    if (!Number.isFinite(b.lat) || !Number.isFinite(b.lon)) continue;
    const d = segDistSq(px, py, a.lon * cosLat, a.lat, b.lon * cosLat, b.lat);
    if (d < best.distSq) best = { distSq: d, segA: a, segB: b, nodes };
  }

  return best.segA ? best : null;
}

function calculateBeachNormal(el, coastIndex, beachIndex) {
  const center = el.center ?? (el.type === 'node' ? { lat: el.lat, lon: el.lon } : null);
  if (!center) return null;

  const { lat, lon } = center;
  const cosLat = Math.cos(lat * DEG_TO_RAD);
  const coastline = nearestIndexedSegment(coastIndex, lat, lon, NORMAL_SEARCH_RADIUS_METERS);
  if (coastline) return roundedBearing(rightHandBearing(coastline.segA, coastline.segB));

  const ownBeach = nearestGeometrySegment(el.geometry, lat, lon);
  if (ownBeach) {
    return roundedBearing(beachPolygonBearing(ownBeach.segA, ownBeach.segB, ownBeach.nodes, cosLat));
  }

  const beach = nearestIndexedSegment(beachIndex, lat, lon, NORMAL_SEARCH_RADIUS_METERS);
  if (beach) return roundedBearing(beachPolygonBearing(beach.segA, beach.segB, beach.nodes, cosLat));

  return null;
}

// ---------- ID generation -------------------------------------------------

function makeId(name, lat, lon) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Truncated coords make the ID unique when two beaches share a name.
  return `${slug}-${Math.round(lat * 100)}-${Math.round(lon * 100)}`;
}

// ---------- Main ----------------------------------------------------------

/**
 * Generates a beaches JSON file, fetching data from OSM and Nominatim.
 * Safe to call programmatically; also invoked directly via `node generateBeaches.js`.
 *
 * @param {object}   [opts]
 * @param {string[]} [opts.areas]   Named UK counties/regions to restrict to,
 *                                  e.g. ['Cornwall', 'Devon'].
 * @param {object}   [opts.bbox]    Bounding box { south, west, north, east }.
 * @param {number}   [opts.limit]   Maximum number of beaches to process.
 * @param {string}   [opts.output]  Output file path (default: beaches.json).
 * @returns {Promise<object[]>} The array of beach records written to disk.
 */
async function generateBeachesJson({ areas, bbox, limit, output } = {}) {
  const outputPath = output ?? DEFAULT_OUTPUT_PATH;

  // Load existing output file so previous runs are preserved.
  const existing = new Map();
  if (fs.existsSync(outputPath)) {
    try {
      const prior = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      for (const beach of prior) existing.set(beach.id, beach);
      console.log(`Loaded ${existing.size} existing beaches from ${outputPath}.`);
    } catch {
      console.warn('Existing output file unreadable — treating as empty.');
    }
  }

  // Load existing checkpoint if present so we can resume.
  let checkpoint = { processed: {}, elements: null };
  if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
      checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
      console.log(`Resuming from checkpoint (${Object.keys(checkpoint.processed).length} already done).`);
    } catch {
      console.warn('Checkpoint file unreadable — starting fresh.');
    }
  }

  // Fetch element list once, or reuse from checkpoint.
  const elements = checkpoint.elements ?? await fetchUKBeaches({ areas, bbox });
  checkpoint.elements = elements;

  const cap = limit ?? elements.length;
  console.log(`${elements.length} named beach elements found — processing up to ${cap}.`);

  // Merge checkpoint entries into the existing map.
  for (const beach of Object.values(checkpoint.processed)) existing.set(beach.id, beach);
  let processed = 0;

  for (let i = 0; i < elements.length; i++) {
    if (processed >= cap) break;

    const el   = elements[i];
    const name = el.tags?.name;
    if (!name) continue;

    const center = el.center ?? (el.type === 'node' ? { lat: el.lat, lon: el.lon } : null);
    if (!center) continue;

    const { lat, lon } = center;
    const id = makeId(name, lat, lon);

    const prior = existing.get(id);

    // Skip complete existing records. Records with a missing normal are
    // refreshed because the app filters them out.
    if (prior && Number.isFinite(prior.normal)) { processed++; continue; }

    process.stdout.write(`[${processed + 1}/${cap}] ${name}${prior ? ' (refresh normal)' : ''} ... `);

    // Reverse geocode (rate-limited).
    let locationInfo = prior
      ? {
          city: prior.city ?? null,
          county: prior.county ?? null,
          postcode: prior.postcode ?? null,
        }
      : { city: null, county: null, postcode: null };
    if (!prior || (!locationInfo.city && !locationInfo.county && !locationInfo.postcode)) {
      try {
        await sleep(NOMINATIM_DELAY_MS);
        locationInfo = await reverseGeocode(lat, lon);
      } catch (err) {
        process.stdout.write(`(geocode failed: ${err.message}) `);
      }
    }

    // Beach normal — failures leave normal as null rather than skipping the beach.
    let normal = prior?.normal ?? null;
    try {
      const result = await getBeachNormalWithFallback(lat, lon);
      normal = result.bearing;
    } catch (err) {
      process.stdout.write(`(normal failed: ${err.message}) `);
    }

    const beach = {
      id,
      name,
      city:     locationInfo.city,
      county:   locationInfo.county,
      postcode: locationInfo.postcode,
      lat,
      lng:    lon,
      normal,
    };

    existing.set(id, beach);
    checkpoint.processed[id] = beach;
    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint));

    console.log(`OK (${locationInfo.county ?? '?'}, normal: ${normal ?? '?'}°)`);
    processed++;
  }

  const beaches = Array.from(existing.values());
  fs.writeFileSync(outputPath, JSON.stringify(beaches, null, 2));
  console.log(`\nWrote ${beaches.length} beaches to ${outputPath}`);

  // Clean up checkpoint on successful completion.
  if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);

  return beaches;
}

// ---------- CLI entry point -----------------------------------------------

if (require.main === module) {
  // Parse --key=value or --key value flags from process.argv.
  const args = {};
  process.argv.slice(2).forEach((arg, i, arr) => {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) return;
    args[match[1]] = match[2] ?? arr[i + 1] ?? true;
  });

  const opts = {};

  if (args.areas) {
    opts.areas = String(args.areas).split(',').map(s => s.trim()).filter(Boolean);
  }

  if (args.bbox) {
    const [south, west, north, east] = String(args.bbox).split(',').map(Number);
    opts.bbox = { south, west, north, east };
  }

  if (args.limit) {
    opts.limit = parseInt(args.limit, 10);
  }

  if (args.output) {
    opts.output = String(args.output);
  }

  generateBeachesJson(opts).catch(err => {
    console.error('\nFailed:', err.message);
    process.exit(1);
  });
}

module.exports = { generateBeachesJson };
