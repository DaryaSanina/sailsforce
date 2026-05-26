import type { UserSettings, WindUnit } from "../domain/models";
import { windUnitOptions } from "../domain/models";

export const defaultUserSettings: UserSettings = {
  name: "Sailor",
  weightKg: 78,
  heightCm: 182,
  gender: "Prefer not to say",
  ability: "Intermediate",
  windUnit: "kt",
  sails: [],
  boards: [],
};

export function windUnitLabel(value: WindUnit): string {
  return windUnitOptions.find((option) => option.value === value)?.label ?? value;
}

