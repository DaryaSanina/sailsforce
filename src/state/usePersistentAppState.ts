import { useEffect, useMemo, useState } from "react";

import type { GearItem, UserSettings } from "../domain/models";
import {
  defaultPersistedAppState,
  loadPersistedAppState,
  savePersistedAppState,
  type PersistedAppStateV1,
} from "./persistence";

export function usePersistentAppState() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<PersistedAppStateV1>(defaultPersistedAppState);

  useEffect(() => {
    let alive = true;
    loadPersistedAppState()
      .then((loaded) => {
        if (!alive) return;
        setState(loaded);
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePersistedAppState(state).catch(() => undefined);
  }, [hydrated, state]);

  const favoriteIds = useMemo(() => new Set(state.favoriteLocationIds), [state.favoriteLocationIds]);

  return {
    hydrated,
    state,
    favoriteIds,
    setMode: (mode: PersistedAppStateV1["mode"]) => setState((prev) => ({ ...prev, mode })),
    setSelectedLocationId: (selectedLocationId: string) => setState((prev) => ({ ...prev, selectedLocationId })),
    setSettings: (updater: UserSettings | ((settings: UserSettings) => UserSettings)) =>
      setState((prev) => ({
        ...prev,
        settings: typeof updater === "function" ? updater(prev.settings) : updater,
      })),
    updateSetting: (key: string, value: number | string) =>
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, [key]: value } as UserSettings,
      })),
    updateGear: (kind: "sails" | "boards", items: GearItem[]) =>
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, [kind]: items },
      })),
    toggleFavorite: (id: string) =>
      setState((prev) => {
        const next = new Set(prev.favoriteLocationIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { ...prev, favoriteLocationIds: Array.from(next) };
      }),
    removeFavorite: (id: string) =>
      setState((prev) => ({
        ...prev,
        favoriteLocationIds: prev.favoriteLocationIds.filter((favoriteId) => favoriteId !== id),
      })),
  };
}

