const COMPASS_POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

export function compassLabel(deg: number): string {
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_POINTS[idx];
}

export function angleDifference(a: number, b: number): number {
  return Math.abs((((a - b + 540) % 360) + 360) % 360 - 180);
}

export function sailabilityFromWind(windKt: number): number {
  if (windKt <= 0) return 0;
  if (windKt <= 18) return Math.min(10, (windKt / 18) * 10);
  const decline = Math.max(0, 10 - (windKt - 18) * 0.3);
  return Math.max(0, decline);
}

export function windBeachOrientation(windFromDeg: number, beachNormalDeg: number) {
  // Beach normals in beaches.json point seaward. Open-Meteo wind directions are
  // meteorological "from" bearings, so wind from the seaward normal is onshore.
  const angle = angleDifference(windFromDeg, beachNormalDeg);
  if (angle <= 45) return "ONSHORE";
  if (angle < 135) return "CROSS-SHORE";
  return "OFFSHORE";
}

export function windComponents(windKt: number, windFromDeg: number, beachNormalDeg: number) {
  // Positive onshoreKt means wind is blowing from sea toward land; negative is
  // offshore. crossShoreKt is returned as a magnitude relative to the shoreline.
  const angle = angleDifference(windFromDeg, beachNormalDeg) * (Math.PI / 180);
  return {
    onshoreKt: windKt * Math.cos(angle),
    crossShoreKt: windKt * Math.sin(angle),
  };
}

export function parseNaiveTimestamp(timestamp: string): number {
  const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return Number.NaN;
  return new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]).getTime();
}

export function dayLabelFor(timestamp: string, base = new Date()): string {
  const datePart = timestamp.slice(0, 10);
  const baseMidnight = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  const dateMidnight = parseNaiveTimestamp(`${datePart}T00:00`);
  const dayIndex = Math.round((dateMidnight - baseMidnight) / 86_400_000);
  if (dayIndex === 0) return "Today";
  if (dayIndex === 1) return "Tomorrow";
  return new Date(dateMidnight).toLocaleDateString(undefined, { weekday: "short" });
}

export function dayIndexFor(timestamp: string, base = new Date()): number {
  const datePart = timestamp.slice(0, 10);
  const baseMidnight = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  const dateMidnight = parseNaiveTimestamp(`${datePart}T00:00`);
  return Math.max(0, Math.round((dateMidnight - baseMidnight) / 86_400_000));
}

export function findNearestHourIndex(times: string[], target = Date.now()): number {
  if (times.length === 0) return 0;
  let bestIndex = 0;
  let bestDiff = Infinity;
  times.forEach((time, index) => {
    const ms = parseNaiveTimestamp(time);
    const diff = Math.abs(ms - target);
    if (diff < bestDiff) {
      bestIndex = index;
      bestDiff = diff;
    }
  });
  return bestIndex;
}
