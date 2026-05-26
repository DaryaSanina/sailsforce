/**
 * Unit tests for format.ts
 *
 * Run with: npm test  (or: tsx --test src/services/format.test.ts)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  knotsToUnit,
  windUnitShort,
  formatWind,
  displayWindValue,
  formatNumber,
} from "./format";

// ======================================================================
// knotsToUnit
// ======================================================================

describe("knotsToUnit", () => {
  const KT = 10;

  it("returns the knot value unchanged when unit is 'kt'", () => {
    assert.equal(knotsToUnit(KT, "kt"), KT);
  });

  it("converts to m/s correctly", () => {
    // 1 kt = 0.514444 m/s
    assert.ok(
      Math.abs(knotsToUnit(KT, "m/s") - KT * 0.514444) < 1e-9,
      "m/s conversion",
    );
  });

  it("converts to km/h correctly", () => {
    // 1 kt = 1.852 km/h
    assert.ok(
      Math.abs(knotsToUnit(KT, "km/h") - KT * 1.852) < 1e-9,
      "km/h conversion",
    );
  });

  it("converts to mph correctly", () => {
    // 1 kt = 1.15078 mph
    assert.ok(
      Math.abs(knotsToUnit(KT, "mph") - KT * 1.15078) < 1e-9,
      "mph conversion",
    );
  });

  it("handles zero knots", () => {
    assert.equal(knotsToUnit(0, "kt"), 0);
    assert.equal(knotsToUnit(0, "m/s"), 0);
    assert.equal(knotsToUnit(0, "km/h"), 0);
  });
});

// ======================================================================
// windUnitShort
// ======================================================================

describe("windUnitShort", () => {
  it("returns the unit string itself (identity)", () => {
    assert.equal(windUnitShort("kt"), "kt");
    assert.equal(windUnitShort("m/s"), "m/s");
    assert.equal(windUnitShort("km/h"), "km/h");
    assert.equal(windUnitShort("mph"), "mph");
  });
});

// ======================================================================
// formatWind
// ======================================================================

describe("formatWind", () => {
  it("formats a knot value with the unit appended", () => {
    assert.equal(formatWind(10, "kt"), "10 kt");
  });

  it("converts and rounds before formatting", () => {
    // 10 kt in km/h = 18.52 → rounded to 19.
    assert.equal(formatWind(10, "km/h"), "19 km/h");
  });

  it("returns '--' for null", () => {
    assert.equal(formatWind(null, "kt"), "--");
  });

  it("returns '--' for undefined", () => {
    assert.equal(formatWind(undefined, "kt"), "--");
  });

  it("returns '--' for NaN", () => {
    assert.equal(formatWind(NaN, "kt"), "--");
  });

  it("returns '--' for Infinity", () => {
    assert.equal(formatWind(Infinity, "kt"), "--");
  });

  it("rounds fractional values to the nearest integer", () => {
    assert.equal(formatWind(10.6, "kt"), "11 kt");
    assert.equal(formatWind(10.4, "kt"), "10 kt");
  });
});

// ======================================================================
// displayWindValue
// ======================================================================

describe("displayWindValue", () => {
  it("returns the rounded knot value", () => {
    assert.equal(displayWindValue(10, "kt"), 10);
    assert.equal(displayWindValue(10.6, "kt"), 11);
  });

  it("converts units before rounding", () => {
    // 10 kt × 1.852 = 18.52 → rounded to 19.
    assert.equal(displayWindValue(10, "km/h"), 19);
  });

  it("returns 0 for null", () => {
    assert.equal(displayWindValue(null, "kt"), 0);
  });

  it("returns 0 for undefined", () => {
    assert.equal(displayWindValue(undefined, "kt"), 0);
  });

  it("returns 0 for NaN", () => {
    assert.equal(displayWindValue(NaN, "kt"), 0);
  });
});

// ======================================================================
// formatNumber
// ======================================================================

describe("formatNumber", () => {
  it("formats an integer with no unit", () => {
    assert.equal(formatNumber(5), "5");
  });

  it("formats an integer with a unit", () => {
    assert.equal(formatNumber(5, "m"), "5 m");
  });

  it("respects the decimals parameter", () => {
    assert.equal(formatNumber(3.14159, "m", 2), "3.14 m");
    assert.equal(formatNumber(3.14159, "m", 0), "3 m");
  });

  it("returns '--' for null", () => {
    assert.equal(formatNumber(null, "m"), "--");
  });

  it("returns '--' for undefined", () => {
    assert.equal(formatNumber(undefined, "m"), "--");
  });

  it("returns '--' for NaN", () => {
    assert.equal(formatNumber(NaN, "m"), "--");
  });

  it("returns '--' for Infinity", () => {
    assert.equal(formatNumber(Infinity, "m"), "--");
  });

  it("omits the space when unit is an empty string", () => {
    assert.equal(formatNumber(42, ""), "42");
  });
});
