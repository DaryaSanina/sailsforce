import type { TideExtremum } from "../domain/models";
import { parseNaiveTimestamp } from "./forecastMath";

function formatNaive(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function findTideExtrema(times: string[], heights: Array<number | null>): TideExtremum[] {
  const extrema: TideExtremum[] = [];
  for (let i = 1; i < heights.length - 1; i++) {
    const y0 = heights[i - 1];
    const y1 = heights[i];
    const y2 = heights[i + 1];
    if (y0 == null || y1 == null || y2 == null) continue;

    const isHigh = y1 > y0 && y1 > y2;
    const isLow = y1 < y0 && y1 < y2;
    if (!isHigh && !isLow) continue;

    const denom = y0 - 2 * y1 + y2;
    let offsetHours = 0;
    let height = y1;
    if (denom !== 0) {
      offsetHours = (0.5 * (y0 - y2)) / denom;
      height = y1 - 0.25 * (y0 - y2) * offsetHours;
    }

    const ms = parseNaiveTimestamp(times[i]) + offsetHours * 3_600_000;
    if (!Number.isFinite(ms)) continue;

    extrema.push({
      time: formatNaive(ms),
      heightM: Math.round(height * 100) / 100,
      type: isHigh ? "high" : "low",
    });
  }
  return extrema;
}

