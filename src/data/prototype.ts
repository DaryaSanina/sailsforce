export type Location = {
  id: string;
  name: string;
  region: string;
  distance?: string;
  favorite: boolean;
};

export type ForecastHour = {
  hour: string;
  icon: "sun" | "cloud-sun" | "wind";
  wind: number;
  gust: number;
  tide: number;
};

export const locations: Location[] = [
  { id: "hookipa", name: "Hookipa Beach", region: "Maui, Hawaii", favorite: true },
  { id: "kanaha", name: "Kanaha Beach Park", region: "Maui, Hawaii", distance: "12 km", favorite: true },
  { id: "paia-bay", name: "Paia Bay", region: "Maui, Hawaii", distance: "15 km", favorite: true },
  { id: "spreckelsville", name: "Spreckelsville", region: "Maui, Hawaii", distance: "8 km", favorite: false },
  { id: "baldwin", name: "Baldwin Beach", region: "Maui, Hawaii", distance: "18 km", favorite: false },
  { id: "kalama", name: "Kalama Beach Park", region: "Kihei, Hawaii", distance: "23 km", favorite: false },
  { id: "hookipa-lookout", name: "Ho'okipa Lookout", region: "Maui, Hawaii", distance: "1.2 km", favorite: false },
];

export const summaryHours: ForecastHour[] = [
  { hour: "10", icon: "cloud-sun", wind: 15, gust: 21, tide: 0.7 },
  { hour: "11", icon: "cloud-sun", wind: 16, gust: 23, tide: 1.1 },
  { hour: "12", icon: "sun", wind: 17, gust: 27, tide: 1.5 },
  { hour: "13", icon: "sun", wind: 18, gust: 31, tide: 0.9 },
  { hour: "14", icon: "wind", wind: 19, gust: 29, tide: 0.4 },
  { hour: "15", icon: "sun", wind: 20, gust: 25, tide: 0.8 },
];

export const detailedHours: ForecastHour[] = [
  { hour: "10", icon: "sun", wind: 16, gust: 21, tide: 0.3 },
  { hour: "11", icon: "cloud-sun", wind: 16, gust: 23, tide: 0.8 },
  { hour: "12", icon: "sun", wind: 19, gust: 27, tide: 1.1 },
  { hour: "13", icon: "sun", wind: 21, gust: 31, tide: 1.6 },
  { hour: "14", icon: "wind", wind: 20, gust: 29, tide: 1.2 },
  { hour: "15", icon: "sun", wind: 18, gust: 25, tide: 0.6 },
  { hour: "16", icon: "cloud-sun", wind: 16, gust: 22, tide: 0.4 },
];

export const modelRows = [
  { name: "model1", icon: "shield", values: [[16, 23], [16, 29], [19, 27], [21, 31], [20, 28], [18, 25], [16, 22]] },
  { name: "model2", icon: "swirl", values: [[15, 22], [18, 26], [17, 24], [19, 28], [18, 27], [17, 23], [15, 21]] },
  { name: "model3", icon: "spark", values: [[17, 24], [17, 24], [19, 27], [20, 30], [19, 27], [18, 24], [16, 22]] },
];

export const confidence = [66, 70, 73, 78, 75, 68, 62];
export const spread = ["2 kt", "2 kt", "2 kt", "3 kt", "2 kt", "1 kt", "1 kt"];

export const settingsRows = {
  user: [
    ["Weight", "78 kg", "scale"],
    ["Height", "182 cm", "ruler"],
    ["Gender", "Male", "gender"],
    ["Ability", "Intermediate", "stars"],
  ],
  units: [["Wind Speed units", "Knots (kt)", "wind"]],
  spots: [["Saved spots", "18 spots", "pin"]],
  quiver: [
    ["Sails", "5 in collection", "sail"],
    ["Boards", "3 in collection", "board"],
  ],
} as const;
