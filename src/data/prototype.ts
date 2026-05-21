export type Location = {
  id: string;
  name: string;
  region: string;
  distance?: string;
  favorite: boolean;
  /** Latitude — required to fetch live forecast data. */
  lat?: number;
  /** Longitude — required to fetch live forecast data. */
  lng?: number;
  /** Seaward beach normal in degrees (0–360), used for wind-vs-beach. */
  normal?: number;
};

// Seed spots: real UK beaches sourced from weather_data_access/beaches.json,
// each carrying the coordinates and seaward normal the live APIs need.
export const locations: Location[] = [
  { id: "watergate", name: "Watergate Beach", region: "Newquay, Cornwall", lat: 50.4446234, lng: -5.0465166, normal: 296.4, favorite: true },
  { id: "bantham", name: "Bantham Beach", region: "South Hams, Devon", lat: 50.2803387, lng: -3.8818567, normal: 5.7, favorite: true },
  { id: "rest-bay", name: "Rest Bay", region: "Porthcawl, Bridgend", lat: 51.4900053, lng: -3.7313428, normal: 234.6, favorite: true },
  { id: "west-sands", name: "West Sands", region: "St Andrews, Fife", lat: 56.3587222, lng: -2.8120266, normal: 73.3, favorite: true },
  { id: "brighton", name: "Brighton Beach", region: "Brighton & Hove", lat: 50.8237309, lng: -0.1924826, normal: 204.1, favorite: false },
  { id: "camber", name: "Camber Sands", region: "Camber, East Sussex", lat: 50.9319289, lng: 0.7924184, normal: 186.5, favorite: false },
  { id: "hunstanton", name: "Hunstanton Beach", region: "Hunstanton, Norfolk", lat: 52.9371497, lng: 0.4909134, normal: 292.2, favorite: false },
  { id: "lossiemouth", name: "Lossiemouth East Beach", region: "Lossiemouth, Moray", lat: 57.7128757, lng: -3.2616881, normal: 40.1, favorite: false },
];

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
  ability: Ability;
  windUnit: WindUnit;
  sails: GearItem[];
  boards: GearItem[];
};

export const defaultUserSettings: UserSettings = {
  name: "Cole",
  weightKg: 78,
  heightCm: 182,
  ability: "Intermediate",
  windUnit: "kt",
  sails: [
    { id: "s1", name: "Severne S-1", size: "5.3 m²" },
    { id: "s2", name: "Severne Blade", size: "4.7 m²" },
    { id: "s3", name: "Goya Banzai", size: "4.2 m²" },
    { id: "s4", name: "NeilPryde Combat", size: "5.7 m²" },
    { id: "s5", name: "Goya Banzai", size: "3.7 m²" },
  ],
  boards: [
    { id: "b1", name: "JP Freestyle Wave", size: "94 L" },
    { id: "b2", name: "Goya One 3", size: "84 L" },
    { id: "b3", name: "Quatro Cube", size: "79 L" },
  ],
};

export function windUnitLabel(value: WindUnit): string {
  return windUnitOptions.find((o) => o.value === value)?.label ?? value;
}
