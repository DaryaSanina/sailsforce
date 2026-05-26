export type BeachLocation = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  normal: number;
  distance?: string;
};

export type ForecastIcon = "sun" | "cloud-sun" | "wind";

export type ForecastHour = {
  time: string;
  hour: string;
  icon: ForecastIcon;
  wind: number;
  gust: number;
  windDir: number;
  windDirLabel: string;
  spread: number;
  models: [number, number][];
  conf: number;
  tide: number | null;
  dayIndex: number;
  dayLabel: string;
  isDayStart: boolean;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  humidityPct: number | null;
  uvIndex: number | null;
  waveHeightM: number | null;
  waveDirection: number | null;
  wavePeriodS: number | null;
  swellHeightM: number | null;
  swellDirection: number | null;
  swellPeriodS: number | null;
};

export type TideExtremum = {
  time: string;
  heightM: number;
  type: "high" | "low";
};

export type ForecastBundle = {
  locationId: string;
  fetchedAt: string;
  timezone: string;
  hours: ForecastHour[];
  currentIndex: number;
  current: ForecastHour | null;
  tides: TideExtremum[];
};

export const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"] as const;
export type Gender = (typeof genderOptions)[number];

export const abilityOptions = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
export type Ability = (typeof abilityOptions)[number];

export const windUnitOptions = [
  { label: "Knots (kt)", value: "kt" as const },
  { label: "Metres / sec (m/s)", value: "m/s" as const },
  { label: "Kilometres / hour (km/h)", value: "km/h" as const },
  { label: "Miles / hour (mph)", value: "mph" as const },
];
export type WindUnit = (typeof windUnitOptions)[number]["value"];

export type GearItem = {
  id: string;
  name: string;
  size: string;
};

export type UserSettings = {
  name: string;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  ability: Ability;
  windUnit: WindUnit;
  sails: GearItem[];
  boards: GearItem[];
};

export type ForecastStatus = "idle" | "loading" | "refreshing" | "ready" | "error";

