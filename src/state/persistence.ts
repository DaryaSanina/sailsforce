import AsyncStorage from "@react-native-async-storage/async-storage";

import { defaultFavoriteLocationIds, defaultLocationId } from "../data/beaches";
import { defaultUserSettings } from "../data/defaults";
import type { UserSettings } from "../domain/models";

export type PersistedAppStateV1 = {
  version: 1;
  settings: UserSettings;
  selectedLocationId: string;
  favoriteLocationIds: string[];
  addedLocationIds: string[];
  mode: "summary" | "detailed";
};

export const APP_STATE_STORAGE_KEY = "sailsforce:app-state:v1";

export const defaultPersistedAppState: PersistedAppStateV1 = {
  version: 1,
  settings: defaultUserSettings,
  selectedLocationId: defaultLocationId,
  favoriteLocationIds: defaultFavoriteLocationIds,
  addedLocationIds: [],
  mode: "summary",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

function modeValue(value: unknown): "summary" | "detailed" {
  return value === "detailed" ? "detailed" : "summary";
}

function settingsValue(value: unknown): UserSettings {
  if (!isObject(value)) return defaultUserSettings;
  return {
    ...defaultUserSettings,
    ...value,
    sails: Array.isArray(value.sails) ? (value.sails as UserSettings["sails"]) : defaultUserSettings.sails,
    boards: Array.isArray(value.boards) ? (value.boards as UserSettings["boards"]) : defaultUserSettings.boards,
  };
}

export function normalizePersistedState(value: unknown): PersistedAppStateV1 {
  if (!isObject(value)) return defaultPersistedAppState;
  return {
    version: 1,
    settings: settingsValue(value.settings),
    selectedLocationId: typeof value.selectedLocationId === "string" ? value.selectedLocationId : defaultLocationId,
    favoriteLocationIds: stringArray(value.favoriteLocationIds, defaultFavoriteLocationIds),
    addedLocationIds: stringArray(value.addedLocationIds, []),
    mode: modeValue(value.mode),
  };
}

export async function loadPersistedAppState(): Promise<PersistedAppStateV1> {
  const raw = await AsyncStorage.getItem(APP_STATE_STORAGE_KEY);
  if (!raw) return defaultPersistedAppState;
  try {
    return normalizePersistedState(JSON.parse(raw));
  } catch {
    return defaultPersistedAppState;
  }
}

export async function savePersistedAppState(state: PersistedAppStateV1): Promise<void> {
  await AsyncStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({ ...state, version: 1 }));
}

