import type { WindUnit } from "../domain/models";

export function knotsToUnit(knots: number, unit: WindUnit): number {
  if (unit === "m/s") return knots * 0.514444;
  if (unit === "km/h") return knots * 1.852;
  if (unit === "mph") return knots * 1.15078;
  return knots;
}

export function windUnitShort(unit: WindUnit): string {
  return unit;
}

export function formatWind(knots: number | null | undefined, unit: WindUnit): string {
  if (knots == null || !Number.isFinite(knots)) return "--";
  return `${Math.round(knotsToUnit(knots, unit))} ${windUnitShort(unit)}`;
}

export function displayWindValue(knots: number | null | undefined, unit: WindUnit): number {
  if (knots == null || !Number.isFinite(knots)) return 0;
  return Math.round(knotsToUnit(knots, unit));
}

export function formatNumber(value: number | null | undefined, unit = "", decimals = 0): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

