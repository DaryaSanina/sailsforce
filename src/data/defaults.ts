import type { UserSettings, WindUnit } from "../domain/models";
import { windUnitOptions } from "../domain/models";

export const defaultUserSettings: UserSettings = {
  name: "Sailor",
  weightKg: 78,
  heightCm: 182,
  gender: "Prefer not to say",
  ability: "Intermediate",
  windUnit: "kt",
  sails: [
    { id: "s-default-1", name: "Severne Blade", size: "4.5 m²" },
    { id: "s-default-2", name: "Severne Gator", size: "5.5 m²" },
    { id: "s-default-3", name: "Severne Convert", size: "6.5 m²" },
    { id: "s-default-4", name: "Severne NCX", size: "7.5 m²" },
  ],
  boards: [
    { id: "b-default-1", name: "JP Freestyle Wave", size: "95 L" },
    { id: "b-default-2", name: "Starboard Carve", size: "120 L" },
    { id: "b-default-3", name: "Starboard GO", size: "150 L" },
  ],
};

export function windUnitLabel(value: WindUnit): string {
  return windUnitOptions.find((option) => option.value === value)?.label ?? value;
}

