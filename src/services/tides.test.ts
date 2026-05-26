/**
 * Unit tests for the TypeScript findTideExtrema in tides.ts.
 *
 * Note: tides.ts uses local time (Date constructor, not Date.UTC) for both
 * parsing and formatting, so parse-then-format round-trips are
 * timezone-safe as long as there is no DST transition inside the test window.
 * May 2026 timestamps (well into British Summer Time) are fine on any system.
 *
 * Run with: npm test  (or: tsx --test src/services/tides.test.ts)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { findTideExtrema } from "./tides";

// Build a small times array centred on 2026-05-21.
const T = (h: number) => `2026-05-21T${String(h).padStart(2, "0")}:00`;

describe("findTideExtrema (TypeScript, src/services/tides.ts)", () => {
  it("detects a symmetric high tide and returns heightM and type", () => {
    const times = [T(0), T(1), T(2)];
    const out = findTideExtrema(times, [0, 3, 0]);

    assert.equal(out.length, 1);
    assert.equal(out[0].type, "high");
    assert.equal(out[0].heightM, 3);
    // Output time uses local formatting — verify it contains the expected date and hour.
    assert.ok(out[0].time.startsWith("2026-05-21T01:"), `unexpected time: ${out[0].time}`);
  });

  it("detects a symmetric low tide", () => {
    const times = [T(0), T(1), T(2)];
    const out = findTideExtrema(times, [3, 0, 3]);

    assert.equal(out.length, 1);
    assert.equal(out[0].type, "low");
    assert.equal(out[0].heightM, 0);
  });

  it("uses parabolic interpolation: asymmetric peak shifts time past the sampled maximum", () => {
    // Heights [0, 1, 0.5]: vertex of the parabola lies 10 min after the 01:00 sample.
    const times = [T(0), T(1), T(2)];
    const out = findTideExtrema(times, [0, 1, 0.5]);

    assert.equal(out.length, 1);
    assert.equal(out[0].type, "high");
    // The refined heightM should exceed the sampled maximum of 1.
    assert.ok(out[0].heightM > 1, `expected heightM > 1, got ${out[0].heightM}`);
    // The refined time should be after 01:00.
    assert.ok(out[0].time > "2026-05-21T01:00", `expected time after 01:00, got ${out[0].time}`);
  });

  it("returns nothing for a strictly monotonic series", () => {
    const times = [T(0), T(1), T(2), T(3)];
    assert.deepEqual(findTideExtrema(times, [0, 1, 2, 3]), []);
  });

  it("skips extrema that are adjacent to null samples", () => {
    const times = [T(0), T(1), T(2), T(3), T(4)];
    // Null at index 2 should suppress any extremum at index 1 or 3.
    assert.deepEqual(findTideExtrema(times, [0, 1, null, 1, 0]), []);
  });

  it("never reports the first or last sample as an extremum", () => {
    const times = [T(0), T(1), T(2), T(3), T(4)];
    // First and last samples are the tallest — they must still be excluded.
    const out = findTideExtrema(times, [9, 1, 2, 1, 9]);
    assert.deepEqual(
      out.map((e) => e.type),
      ["low", "high", "low"],
    );
  });

  it("ignores plateau (equal adjacent heights) — neither endpoint is a strict extremum", () => {
    const times = [T(0), T(1), T(2), T(3), T(4)];
    // [0, 1, 1, 0, 0]: neither sample 1 nor 2 satisfies y1 > y2 strictly.
    assert.deepEqual(findTideExtrema(times, [0, 1, 1, 0, 0]), []);
  });

  it("detects multiple high/low pairs in a realistic 12 h window", () => {
    // A simple two-cycle tide: high at 03:00, low at 09:00, high at 15:00, low at 21:00.
    const hours = Array.from({ length: 24 }, (_, h) => T(h));
    const heights = hours.map((_, h) =>
      Number((3 * Math.sin((2 * Math.PI * h) / 12)).toFixed(3)),
    );
    const out = findTideExtrema(hours, heights);

    assert.ok(out.length >= 2, `expected at least 2 extrema, got ${out.length}`);
    const highs = out.filter((e) => e.type === "high");
    const lows = out.filter((e) => e.type === "low");
    assert.ok(highs.length > 0, "expected at least one high");
    assert.ok(lows.length > 0, "expected at least one low");
  });

  it("heightM is rounded to two decimal places", () => {
    // Use heights whose parabolic vertex would produce a sub-millimetre value.
    const times = [T(0), T(1), T(2)];
    const out = findTideExtrema(times, [0, 1.23456, 0]);
    assert.equal(out.length, 1);
    // Math.round(1.23456 * 100) / 100 = 1.23
    assert.equal(out[0].heightM, 1.23);
  });
});
