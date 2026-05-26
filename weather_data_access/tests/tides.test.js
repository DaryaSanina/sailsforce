/**
 * Unit tests for tides.js
 *
 * Run with:  npm test       (or: node --test weather_data_access/)
 *
 * Uses Node's built-in test runner (node:test) — no extra dependencies.
 * All network access is stubbed via a fake global.fetch, so the tests are
 * deterministic and offline.
 */

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { getTidalData, _internals } = require('../tides.js');
const {
  getDistance,
  resolveStartDate,
  parseTimestamp,
  formatDateTime,
  formatDate,
  findTideExtrema,
} = _internals;

const MS_PER_HOUR = 3_600_000;

// ---------- Test helpers ----------------------------------------------

function approx(actual, expected, eps = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= eps,
    `expected ${actual} ≈ ${expected} (±${eps})`
  );
}

/** Builds a fake fetch Response. */
function jsonResponse(body, { ok = true, status = 200, statusText = 'OK' } = {}) {
  return { ok, status, statusText, json: async () => body };
}

/**
 * Builds an hourly sea-level series shaped like a tide: a sine wave with a
 * ~12.42 h period. `startMs` is the epoch ms of the first sample.
 */
function buildSeries(startMs, hours) {
  const time = [];
  const sea_level_height_msl = [];
  for (let h = 0; h < hours; h++) {
    time.push(formatDateTime(startMs + h * MS_PER_HOUR).replace(' ', 'T'));
    sea_level_height_msl.push(
      Number((3 * Math.sin((2 * Math.PI * h) / 12.42)).toFixed(3))
    );
  }
  return { time, sea_level_height_msl };
}

/** Marine API response generated to exactly cover the requested date window. */
function marineFromUrl(url) {
  const params = new URL(url).searchParams;
  const startMs = parseTimestamp(`${params.get('start_date')}T00:00`);
  const endMs = parseTimestamp(`${params.get('end_date')}T00:00`);
  const hours = (endMs - startMs) / MS_PER_HOUR + 24; // end_date is inclusive
  return jsonResponse({
    latitude: 50.458336,
    longitude: -5.124984,
    timezone: 'Europe/London',
    hourly_units: { sea_level_height_msl: 'm' },
    hourly: buildSeries(startMs, hours),
  });
}

const DEFAULT_STATIONS = jsonResponse({
  items: [
    { stationReference: 'E72224', label: 'Newlyn', lat: 50.103, long: -5.543 },
    { stationReference: 'E70124', label: 'Aberdeen', lat: 57.144, long: -2.078 },
    { stationReference: 'BAD', label: 'NoCoords', lat: null, long: null },
  ],
});

/**
 * Installs a fake global.fetch that routes by hostname.
 * @param marine   (url) => Response, default = generated tide series
 * @param stations () => Response, default = DEFAULT_STATIONS
 * @returns the fetch mock, with a `.calls` array of requested URLs
 */
function installFetch({ marine, stations } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(String(url));
    if (String(url).includes('marine-api.open-meteo.com')) {
      return (marine || marineFromUrl)(String(url));
    }
    if (String(url).includes('environment.data.gov.uk')) {
      return (stations || (() => DEFAULT_STATIONS))(String(url));
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };
  fn.calls = calls;
  global.fetch = fn;
  return fn;
}

const realFetch = global.fetch;

// ======================================================================
// Pure helpers
// ======================================================================

describe('getDistance (Haversine)', () => {
  it('is zero for identical points', () => {
    assert.equal(getDistance(51.5, -0.12, 51.5, -0.12), 0);
  });

  it('measures ~111 km per degree of latitude', () => {
    approx(getDistance(0, 0, 1, 0), 111.19, 0.5);
  });

  it('is symmetric', () => {
    const a = getDistance(50.4, -5.07, 50.1, -5.54);
    const b = getDistance(50.1, -5.54, 50.4, -5.07);
    approx(a, b, 1e-9);
  });
});

describe('resolveStartDate', () => {
  it('parses YYYY-MM-DD', () => {
    assert.equal(resolveStartDate('2026-05-21'), Date.UTC(2026, 4, 21));
  });

  it('parses YYYYMMDD', () => {
    assert.equal(resolveStartDate('20260521'), Date.UTC(2026, 4, 21));
  });

  it('accepts a Date and strips the time of day', () => {
    assert.equal(
      resolveStartDate(new Date(2026, 4, 21, 15, 30, 45)),
      Date.UTC(2026, 4, 21)
    );
  });

  it('defaults to today (local) when given null', () => {
    const now = new Date();
    assert.equal(
      resolveStartDate(null),
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );
  });

  it('throws on an unparseable string', () => {
    assert.throws(() => resolveStartDate('not-a-date'), /Invalid startDate/);
  });
});

describe('parseTimestamp / formatDateTime / formatDate', () => {
  it('parses a naive timestamp into epoch ms', () => {
    assert.equal(
      parseTimestamp('2026-05-21T14:30'),
      Date.UTC(2026, 4, 21, 14, 30)
    );
  });

  it('ignores any seconds component', () => {
    assert.equal(
      parseTimestamp('2026-05-21T14:30:59'),
      Date.UTC(2026, 4, 21, 14, 30)
    );
  });

  it('throws on a malformed timestamp', () => {
    assert.throws(() => parseTimestamp('21/05/2026'), /Unrecognised timestamp/);
  });

  it('formats epoch ms with zero-padding', () => {
    assert.equal(formatDateTime(Date.UTC(2026, 4, 21, 9, 5)), '2026-05-21 09:05');
    assert.equal(formatDate(Date.UTC(2026, 4, 21, 9, 5)), '2026-05-21');
  });

  it('round-trips parse -> format', () => {
    const s = '2026-12-31T23:45';
    assert.equal(formatDateTime(parseTimestamp(s)).replace(' ', 'T'), s);
  });
});

describe('findTideExtrema', () => {
  const t3 = ['2026-05-21T00:00', '2026-05-21T01:00', '2026-05-21T02:00'];

  it('detects a symmetric high at the exact sample time', () => {
    const out = findTideExtrema(t3, [0, 1, 0]);
    assert.equal(out.length, 1);
    assert.equal(out[0].type, 'high');
    assert.equal(out[0].height, 1);
    assert.equal(out[0].ms, parseTimestamp('2026-05-21T01:00'));
  });

  it('detects a symmetric low', () => {
    const out = findTideExtrema(t3, [2, 0, 2]);
    assert.equal(out.length, 1);
    assert.equal(out[0].type, 'low');
    assert.equal(out[0].height, 0);
  });

  it('refines an asymmetric peak with parabolic interpolation', () => {
    // heights [0, 1, 0.5]: parabola vertex lies 10 min past the 01:00 sample
    // and slightly above the sampled max of 1.0.
    const out = findTideExtrema(t3, [0, 1, 0.5]);
    assert.equal(out.length, 1);
    assert.equal(out[0].type, 'high');
    assert.equal(out[0].ms, parseTimestamp('2026-05-21T01:00') + 600_000);
    assert.equal(out[0].height, 1.02);
  });

  it('returns nothing for a monotonic series', () => {
    const times = ['a', 'b', 'c', 'd'].map((_, i) => `2026-05-21T0${i}:00`);
    assert.deepEqual(findTideExtrema(times, [0, 1, 2, 3]), []);
  });

  it('skips extrema adjacent to null samples', () => {
    const times = [0, 1, 2, 3, 4].map((h) => `2026-05-21T0${h}:00`);
    assert.deepEqual(findTideExtrema(times, [0, 1, null, 1, 0]), []);
  });

  it('never reports the first or last sample as an extremum', () => {
    const times = [0, 1, 2, 3, 4].map((h) => `2026-05-21T0${h}:00`);
    const out = findTideExtrema(times, [9, 1, 2, 1, 9]);
    assert.deepEqual(
      out.map((e) => e.type),
      ['low', 'high', 'low']
    );
  });

  it('ignores a plateau (equal adjacent heights are not strict extrema)', () => {
    // [0, 1, 1, 0, 0]: sample 1 has y1 == y2 so it is not a strict high;
    // sample 2 has y0 == y1 so it is not a strict high either.
    const times = [0, 1, 2, 3, 4].map((h) => `2026-05-21T0${h}:00`);
    assert.deepEqual(findTideExtrema(times, [0, 1, 1, 0, 0]), []);
  });

  it('height field is rounded to two decimal places', () => {
    const out = findTideExtrema(t3, [0, 1.23456, 0]);
    assert.equal(out.length, 1);
    assert.equal(out[0].height, 1.23); // Math.round(1.23456 * 100) / 100
  });
});

// ======================================================================
// getTidalData (integration, with stubbed fetch)
// ======================================================================

describe('getTidalData', () => {
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns 7 day-buckets covering the requested range', async () => {
    installFetch();
    const result = await getTidalData(50.4155, -5.0737, {
      startDate: '2026-05-21',
      days: 7,
    });

    assert.equal(result.range.startDate, '2026-05-21');
    assert.equal(result.range.endDate, '2026-05-27');
    assert.equal(result.range.days, 7);
    assert.equal(result.range.timezone, 'Europe/London');
    assert.equal(result.unit, 'm');

    assert.equal(result.days.length, 7);
    assert.deepEqual(
      result.days.map((d) => d.date),
      [
        '2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24',
        '2026-05-25', '2026-05-26', '2026-05-27',
      ]
    );
  });

  it('keeps every tide inside the range, in chronological order', async () => {
    installFetch();
    const { tides } = await getTidalData(50.4155, -5.0737, {
      startDate: '2026-05-21',
      days: 7,
    });

    assert.ok(tides.length >= 24, `expected a full week of tides, got ${tides.length}`);
    for (let i = 0; i < tides.length; i++) {
      assert.ok(tides[i].time >= '2026-05-21' && tides[i].time < '2026-05-28');
      assert.ok(['high', 'low'].includes(tides[i].type));
      if (i > 0) assert.ok(tides[i].time >= tides[i - 1].time, 'tides must be sorted');
    }
  });

  it('flat tide list equals the concatenation of the day-buckets', async () => {
    installFetch();
    const result = await getTidalData(50.4155, -5.0737, {
      startDate: '2026-05-21',
      days: 7,
    });
    assert.deepEqual(
      result.tides,
      result.days.flatMap((d) => d.tides)
    );
  });

  it('labels the forecast with the nearest tide gauge', async () => {
    installFetch();
    const { referenceStation } = await getTidalData(50.4155, -5.0737, {
      startDate: '2026-05-21',
    });
    assert.equal(referenceStation.name, 'Newlyn');
    assert.equal(referenceStation.id, 'E72224');
    assert.equal(typeof referenceStation.distanceKm, 'number');
    assert.ok(referenceStation.distanceKm > 0);
  });

  it('requests the correct Open-Meteo variable and padded window', async () => {
    // Regression guard: the old code requested "sea_level_height", which the
    // API rejects with HTTP 400. It must be "sea_level_height_msl".
    const fetchMock = installFetch();
    await getTidalData(50.4155, -5.0737, { startDate: '2026-05-21', days: 7 });

    const marineUrl = fetchMock.calls.find((u) => u.includes('marine-api'));
    assert.ok(marineUrl, 'a marine API call should have been made');
    assert.match(marineUrl, /hourly=sea_level_height_msl/);
    assert.match(marineUrl, /timezone=auto/);
    // Window is padded by one day on each side of the 7-day range.
    assert.match(marineUrl, /start_date=2026-05-20/);
    assert.match(marineUrl, /end_date=2026-05-28/);
  });

  it('defaults to a 7-day forecast starting today', async () => {
    installFetch();
    const now = new Date();
    const today = formatDate(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );
    const result = await getTidalData(50.4155, -5.0737);
    assert.equal(result.range.days, 7);
    assert.equal(result.range.startDate, today);
    assert.equal(result.days.length, 7);
  });

  it('still returns tides when the station lookup fails', async () => {
    installFetch({
      stations: () => jsonResponse(null, { ok: false, status: 503, statusText: 'Unavailable' }),
    });
    const result = await getTidalData(50.4155, -5.0737, { startDate: '2026-05-21' });
    assert.equal(result.referenceStation, null);
    assert.ok(result.tides.length > 0, 'tide data is independent of the station lookup');
  });

  it('rejects when the marine API returns an error', async () => {
    installFetch({
      marine: () =>
        jsonResponse(
          { error: true, reason: 'invalid variable' },
          { ok: false, status: 400, statusText: 'Bad Request' }
        ),
    });
    await assert.rejects(
      getTidalData(50.4155, -5.0737, { startDate: '2026-05-21' }),
      /Open-Meteo marine API error: invalid variable/
    );
  });

  it('validates its arguments', async () => {
    global.fetch = () => {
      throw new Error('fetch must not be called for invalid input');
    };
    await assert.rejects(getTidalData(NaN, -5), /numeric/);
    await assert.rejects(getTidalData(50, undefined), /numeric/);
    await assert.rejects(getTidalData(50, -5, { days: 0 }), /positive integer/);
    await assert.rejects(getTidalData(50, -5, { days: 2.5 }), /positive integer/);
  });

  it('works correctly for a single-day forecast (days=1)', async () => {
    installFetch();
    const result = await getTidalData(50.4155, -5.0737, {
      startDate: '2026-05-21',
      days: 1,
    });

    assert.equal(result.range.days, 1);
    assert.equal(result.range.startDate, '2026-05-21');
    assert.equal(result.range.endDate, '2026-05-21');
    assert.equal(result.days.length, 1);
    assert.equal(result.days[0].date, '2026-05-21');
    // All tides must fall within the single day.
    for (const t of result.tides) {
      assert.ok(t.time.startsWith('2026-05-21'), `tide outside requested day: ${t.time}`);
    }
  });

  it('propagates the requested and modelled location into the result', async () => {
    installFetch();
    const result = await getTidalData(50.4155, -5.0737, { startDate: '2026-05-21' });

    assert.equal(result.location.requested.lat, 50.4155);
    assert.equal(result.location.requested.lon, -5.0737);
    // The modelled location comes from the Marine API response (set by marineFromUrl).
    assert.equal(typeof result.location.modelled.lat, 'number');
    assert.equal(typeof result.location.modelled.lon, 'number');
  });

  it('filters out stations with missing coordinates when finding the nearest', async () => {
    // DEFAULT_STATIONS includes 'NoCoords' with lat/long = null.
    // It must be skipped, leaving Newlyn as nearest to 50.4155, -5.0737.
    installFetch();
    const { referenceStation } = await getTidalData(50.4155, -5.0737, {
      startDate: '2026-05-21',
    });
    assert.notEqual(referenceStation?.name, 'NoCoords');
    assert.equal(referenceStation?.name, 'Newlyn');
  });

  it('produces chronologically ordered tides and alternating high/low types', async () => {
    installFetch();
    const { tides } = await getTidalData(50.4155, -5.0737, {
      startDate: '2026-05-21',
      days: 7,
    });

    for (let i = 1; i < tides.length; i++) {
      assert.ok(
        tides[i].time >= tides[i - 1].time,
        `tides are not in chronological order at index ${i}`,
      );
      // A sine-based series produces strictly alternating high/low.
      assert.notEqual(
        tides[i].type,
        tides[i - 1].type,
        `adjacent tides have the same type at index ${i}`,
      );
    }
  });
});
