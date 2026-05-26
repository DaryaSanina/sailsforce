/**
 * Unit tests for forecastMath.ts
 *
 * Run with: npm test  (or: tsx --test src/services/forecastMath.test.ts)
 *
 * Uses Node's built-in test runner — no extra dependencies.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compassLabel,
  angleDifference,
  sailabilityFromWind,
  windBeachOrientation,
  windComponents,
  parseNaiveTimestamp,
  dayLabelFor,
  dayIndexFor,
  findNearestHourIndex,
} from "./forecastMath";

// ======================================================================
// compassLabel
// ======================================================================

describe("compassLabel", () => {
  it("returns all 16 compass points at their exact sector centres", () => {
    const points = [
      [0, "N"],
      [22.5, "NNE"],
      [45, "NE"],
      [67.5, "ENE"],
      [90, "E"],
      [112.5, "ESE"],
      [135, "SE"],
      [157.5, "SSE"],
      [180, "S"],
      [202.5, "SSW"],
      [225, "SW"],
      [247.5, "WSW"],
      [270, "W"],
      [292.5, "WNW"],
      [315, "NW"],
      [337.5, "NNW"],
    ] as const;
    for (const [deg, expected] of points) {
      assert.equal(compassLabel(deg), expected, `compassLabel(${deg})`);
    }
  });

  it("wraps at 360° back to N", () => {
    assert.equal(compassLabel(360), "N");
    assert.equal(compassLabel(360 + 45), "NE");
    assert.equal(compassLabel(720), "N");
  });

  it("handles negative degrees", () => {
    assert.equal(compassLabel(-90), "W");   // -90 ≡ 270
    assert.equal(compassLabel(-45), "NW");  // -45 ≡ 315
  });

  it("rounds ambiguous mid-sector angles consistently", () => {
    // 11.25° sits exactly between N (0°) and NNE (22.5°).
    // Math.round(0.5) === 1 in JS, so it resolves to NNE.
    assert.equal(compassLabel(11.25), "NNE");
    // 11.24° rounds down → N.
    assert.equal(compassLabel(11.24), "N");
  });
});

// ======================================================================
// angleDifference
// ======================================================================

describe("angleDifference", () => {
  it("is 0 for identical angles", () => {
    assert.equal(angleDifference(90, 90), 0);
    assert.equal(angleDifference(0, 0), 0);
    assert.equal(angleDifference(359, 359), 0);
  });

  it("wraps correctly near 0° / 360°", () => {
    assert.equal(angleDifference(350, 10), 20);
    assert.equal(angleDifference(10, 350), 20);
    assert.equal(angleDifference(1, 359), 2);
  });

  it("returns 180° for diametrically opposite angles", () => {
    assert.equal(angleDifference(0, 180), 180);
    assert.equal(angleDifference(90, 270), 180);
    assert.equal(angleDifference(45, 225), 180);
  });

  it("is symmetric — order of arguments does not matter", () => {
    assert.equal(angleDifference(30, 210), angleDifference(210, 30));
    assert.equal(angleDifference(100, 260), angleDifference(260, 100));
  });

  it("returns 90° for a right-angle pair", () => {
    assert.equal(angleDifference(0, 90), 90);
    assert.equal(angleDifference(180, 270), 90);
  });
});

// ======================================================================
// sailabilityFromWind
// ======================================================================

describe("sailabilityFromWind", () => {
  it("returns 0 for zero wind", () => {
    assert.equal(sailabilityFromWind(0), 0);
  });

  it("returns 0 for negative wind speeds", () => {
    assert.equal(sailabilityFromWind(-1), 0);
    assert.equal(sailabilityFromWind(-100), 0);
  });

  it("scales linearly between 0 and 18 kt", () => {
    // At 9 kt (half of 18), score should be 5 (half of 10).
    assert.equal(sailabilityFromWind(9), 5);
    // At 18 kt, score reaches the cap of 10.
    assert.equal(sailabilityFromWind(18), 10);
  });

  it("caps at 10 (never exceeds max) within the ramp range", () => {
    assert.ok(sailabilityFromWind(15) <= 10);
    assert.ok(sailabilityFromWind(17) <= 10);
  });

  it("declines smoothly above 18 kt but stays non-negative", () => {
    const score20 = sailabilityFromWind(20);
    const score30 = sailabilityFromWind(30);
    assert.ok(score20 < 10 && score20 > 0, `score at 20 kt = ${score20}`);
    assert.ok(score30 < score20, "score at 30 kt should be lower than at 20 kt");
    assert.ok(score30 >= 0);
  });

  it("reaches 0 at very high wind speeds", () => {
    // Above ~51 kt the formula goes negative; max(0,…) clamps it.
    assert.equal(sailabilityFromWind(60), 0);
    assert.equal(sailabilityFromWind(100), 0);
  });
});

// ======================================================================
// windBeachOrientation
// ======================================================================

describe("windBeachOrientation", () => {
  // Beach faces east (normal = 90°).
  const normal = 90;

  it("is ONSHORE when wind blows directly at the beach", () => {
    assert.equal(windBeachOrientation(90, normal), "ONSHORE");
  });

  it("is ONSHORE within 45° of the beach normal", () => {
    assert.equal(windBeachOrientation(60, normal), "ONSHORE");
    assert.equal(windBeachOrientation(130, normal), "ONSHORE");
  });

  it("is CROSS-SHORE when wind is roughly perpendicular to the beach", () => {
    assert.equal(windBeachOrientation(0, normal), "CROSS-SHORE");
    assert.equal(windBeachOrientation(180, normal), "CROSS-SHORE");
  });

  it("is OFFSHORE when wind blows away from the beach", () => {
    assert.equal(windBeachOrientation(270, normal), "OFFSHORE");
  });
});

// ======================================================================
// windComponents
// ======================================================================

describe("windComponents", () => {
  /** Checks that two numbers are equal within a small tolerance. */
  function approxEqual(actual: number, expected: number, label = "") {
    assert.ok(
      Math.abs(actual - expected) < 1e-9,
      `${label}: expected ${actual} ≈ ${expected}`,
    );
  }

  it("pure onshore: all wind is in the onshore direction", () => {
    // Wind from east (90°) onto a beach facing east (normal=90°).
    const { onshoreKt, crossShoreKt } = windComponents(10, 90, 90);
    approxEqual(onshoreKt, 10, "onshoreKt");
    approxEqual(crossShoreKt, 0, "crossShoreKt");
  });

  it("pure cross-shore: all wind is perpendicular to the beach", () => {
    // Wind from north (0°) along a beach facing east (normal=90°).
    const { onshoreKt, crossShoreKt } = windComponents(10, 0, 90);
    approxEqual(onshoreKt, 0, "onshoreKt");
    approxEqual(crossShoreKt, 10, "crossShoreKt");
  });

  it("pure offshore: onshore component is negative", () => {
    // Wind from west (270°) blowing away from an east-facing beach.
    const { onshoreKt, crossShoreKt } = windComponents(10, 270, 90);
    approxEqual(onshoreKt, -10, "onshoreKt");
    approxEqual(Math.abs(crossShoreKt), 0, "crossShoreKt magnitude");
  });

  it("zero wind speed gives zero components", () => {
    const { onshoreKt, crossShoreKt } = windComponents(0, 45, 90);
    approxEqual(onshoreKt, 0, "onshoreKt");
    approxEqual(crossShoreKt, 0, "crossShoreKt");
  });

  it("components satisfy Pythagoras: |onshore|² + cross² ≈ wind²", () => {
    const { onshoreKt, crossShoreKt } = windComponents(10, 45, 90);
    const magnitude = Math.sqrt(onshoreKt ** 2 + crossShoreKt ** 2);
    approxEqual(magnitude, 10, "magnitude");
  });
});

// ======================================================================
// parseNaiveTimestamp
// ======================================================================

describe("parseNaiveTimestamp", () => {
  it("parses a standard naive timestamp using local time", () => {
    const ms = parseNaiveTimestamp("2026-05-21T14:30");
    const d = new Date(ms);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 4); // May is month 4 (0-indexed)
    assert.equal(d.getDate(), 21);
    assert.equal(d.getHours(), 14);
    assert.equal(d.getMinutes(), 30);
  });

  it("ignores a seconds component if present", () => {
    const a = parseNaiveTimestamp("2026-05-21T14:30");
    const b = parseNaiveTimestamp("2026-05-21T14:30:59");
    assert.equal(a, b);
  });

  it("handles midnight correctly", () => {
    const ms = parseNaiveTimestamp("2026-05-21T00:00");
    const d = new Date(ms);
    assert.equal(d.getHours(), 0);
    assert.equal(d.getMinutes(), 0);
  });

  it("returns NaN for unrecognised formats", () => {
    assert.ok(Number.isNaN(parseNaiveTimestamp("21/05/2026")));
    assert.ok(Number.isNaN(parseNaiveTimestamp("not-a-date")));
    assert.ok(Number.isNaN(parseNaiveTimestamp("2026-05-21")));   // date only, no T
  });

  it("round-trips consistently with formatNaive-style output", () => {
    // Verify that parsing a timestamp and re-formatting it gives the same string.
    const input = "2026-12-31T23:45";
    const ms = parseNaiveTimestamp(input);
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    const reparsed =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    assert.equal(reparsed, input);
  });
});

// ======================================================================
// dayLabelFor
// ======================================================================

describe("dayLabelFor", () => {
  // Fix a known base date so assertions are deterministic.
  // 21 May 2026 is a Thursday; 22 May is a Friday.
  const base = new Date(2026, 4, 21); // local time: Thu 21 May 2026

  it("returns 'Today' for a timestamp on the base date", () => {
    assert.equal(dayLabelFor("2026-05-21T09:00", base), "Today");
  });

  it("returns 'Today' regardless of the time component", () => {
    assert.equal(dayLabelFor("2026-05-21T00:00", base), "Today");
    assert.equal(dayLabelFor("2026-05-21T23:59", base), "Today");
  });

  it("returns 'Tomorrow' for the day after the base date", () => {
    assert.equal(dayLabelFor("2026-05-22T06:00", base), "Tomorrow");
  });

  it("returns a non-empty string for dates beyond tomorrow", () => {
    const label = dayLabelFor("2026-05-23T12:00", base);
    assert.ok(
      label.length > 0 && label !== "Today" && label !== "Tomorrow",
      `expected a weekday label, got "${label}"`,
    );
  });

  it("labels a week from now correctly (not Today/Tomorrow)", () => {
    const label = dayLabelFor("2026-05-28T00:00", base);
    assert.ok(label !== "Today" && label !== "Tomorrow");
  });
});

// ======================================================================
// dayIndexFor
// ======================================================================

describe("dayIndexFor", () => {
  const base = new Date(2026, 4, 21); // Thu 21 May 2026

  it("returns 0 for a timestamp on the base date", () => {
    assert.equal(dayIndexFor("2026-05-21T12:00", base), 0);
  });

  it("returns 1 for the following day", () => {
    assert.equal(dayIndexFor("2026-05-22T00:00", base), 1);
  });

  it("returns the correct index for a later day", () => {
    assert.equal(dayIndexFor("2026-05-28T00:00", base), 7);
  });

  it("clamps dates before the base to 0 (not negative)", () => {
    assert.equal(dayIndexFor("2026-05-20T00:00", base), 0);
    assert.equal(dayIndexFor("2026-01-01T00:00", base), 0);
  });
});

// ======================================================================
// findNearestHourIndex
// ======================================================================

describe("findNearestHourIndex", () => {
  it("returns 0 for an empty times array", () => {
    assert.equal(findNearestHourIndex([]), 0);
  });

  it("returns 0 when there is only one timestamp", () => {
    // Target is far from the single entry — still the only option.
    const target = parseNaiveTimestamp("2026-05-21T18:00");
    assert.equal(findNearestHourIndex(["2026-05-21T12:00"], target), 0);
  });

  it("returns the index of an exact-match timestamp", () => {
    const times = [
      "2026-05-21T10:00",
      "2026-05-21T11:00",
      "2026-05-21T12:00",
    ];
    const target = parseNaiveTimestamp("2026-05-21T11:00");
    assert.equal(findNearestHourIndex(times, target), 1);
  });

  it("returns the index of the closest timestamp when target is between two", () => {
    const times = [
      "2026-05-21T10:00",
      "2026-05-21T11:00",
      "2026-05-21T12:00",
    ];
    // 11:20 is 20 min past 11:00 and 40 min before 12:00 → closer to index 1.
    const targetNear1 = parseNaiveTimestamp("2026-05-21T11:20");
    assert.equal(findNearestHourIndex(times, targetNear1), 1);

    // 11:40 is 40 min past 11:00 and 20 min before 12:00 → closer to index 2.
    const targetNear2 = parseNaiveTimestamp("2026-05-21T11:40");
    assert.equal(findNearestHourIndex(times, targetNear2), 2);
  });

  it("favours the earlier index when two timestamps are equidistant", () => {
    // Target is exactly at 11:00, equidistant from 10:00 (index 0) and 12:00 (index 1).
    const times = ["2026-05-21T10:00", "2026-05-21T12:00"];
    const target = parseNaiveTimestamp("2026-05-21T11:00");
    // The loop uses strict '<' so ties go to the first (lower) index.
    assert.equal(findNearestHourIndex(times, target), 0);
  });
});
