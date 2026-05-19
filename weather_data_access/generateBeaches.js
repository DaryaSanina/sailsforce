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
const { getBeachNormal } = require('./beachNormal');

const DEFAULT_OUTPUT_PATH = path.join(__dirname, 'beaches.json');
const CHECKPOINT_PATH     = path.join(__dirname, 'beaches_checkpoint.json');

// Nominatim enforces a hard 1 req/sec limit for anonymous use.
const NOMINATIM_DELAY_MS = 1100;

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
    const timer = setTimeout(() => controller.abort(), 120_000);
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
      way["natural"="beach"]["name"]${areaUnion};
      relation["natural"="beach"]["name"]${areaUnion};
    );`;
  } else if (bbox) {
    // Bounding box filter — no area lookup needed.
    const { south, west, north, east } = bbox;
    areaFilter = `
    (
      way["natural"="beach"]["name"](${south},${west},${north},${east});
      relation["natural"="beach"]["name"](${south},${west},${north},${east});
    );`;
  } else {
    // Default: all of Great Britain.
    areaFilter = `
    area["ISO3166-1"="GB"][admin_level=2]->.uk;
    (
      way["natural"="beach"]["name"](area.uk);
      relation["natural"="beach"]["name"](area.uk);
    );`;
  }

  const query = `[out:json][timeout:180];${areaFilter}\nout center tags;`;
  const data = await overpassPost(query);
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

    // Skip if already present in the output file or the current checkpoint.
    if (existing.has(id)) { processed++; continue; }

    process.stdout.write(`[${processed + 1}/${cap}] ${name} ... `);

    // Reverse geocode (rate-limited).
    let locationInfo = { city: null, county: null, postcode: null };
    try {
      await sleep(NOMINATIM_DELAY_MS);
      locationInfo = await reverseGeocode(lat, lon);
    } catch (err) {
      process.stdout.write(`(geocode failed: ${err.message}) `);
    }

    // Beach normal — failures leave normal as null rather than skipping the beach.
    let normal = null;
    try {
      const result = await getBeachNormal(lat, lon, 500);
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
