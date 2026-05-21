import "./global.css";

import { useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { FadeIn } from "./src/components/Transitions";
import { ForecastScreen } from "./src/screens/ForecastScreen";
import { LocationSelectionSheet } from "./src/screens/LocationSelectionSheet";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { EditValueSheet, type EditField } from "./src/screens/EditValueSheet";
import { AddLocationSheet } from "./src/screens/AddLocationSheet";
import { CollectionEditSheet } from "./src/screens/CollectionEditSheet";
import { InfoDetailSheet, type InfoDetail } from "./src/screens/InfoDetailSheet";
import { useForecast } from "./src/data/useForecast";
import type { DetailKey } from "./src/data/forecast";
import {
  defaultUserSettings,
  locations as seedLocations,
  type GearItem,
  type Location,
  type UserSettings,
} from "./src/data/prototype";

type Route = "forecast" | "settings";

export default function App() {
  const [route, setRoute] = useState<Route>("forecast");
  const [mode, setMode] = useState<"summary" | "detailed">("summary");
  const [locations, setLocations] = useState<Location[]>(seedLocations);
  const [selectedLocationId, setSelectedLocationId] = useState(seedLocations[0]?.id ?? "");
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(seedLocations.filter((l) => l.favorite).map((l) => l.id)),
  );
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editCollection, setEditCollection] = useState<"sails" | "boards" | null>(null);
  const [infoDetail, setInfoDetail] = useState<InfoDetail | null>(null);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? locations[0],
    [locations, selectedLocationId],
  );
  const isFavorite = favoriteIds.has(selectedLocationId);

  const { data: forecast, loading: forecastLoading, error: forecastError, reload: reloadForecast } = useForecast(
    selectedLocation,
    settings,
  );

  const openDetail = (key: DetailKey) => {
    if (forecast) setInfoDetail(forecast.details[key]);
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeLocation = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
    setFavoriteIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedLocationId((prev) => {
      if (prev !== id) return prev;
      const remaining = locations.filter((l) => l.id !== id);
      return remaining[0]?.id ?? "";
    });
  };

  const addCustomLocation = ({ name, region, favorite }: { name: string; region: string; favorite: boolean }) => {
    const id = `custom-${Date.now().toString(36)}`;
    const newLoc: Location = { id, name, region, favorite: false };
    setLocations((prev) => [...prev, newLoc]);
    if (favorite) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
    setSelectedLocationId(id);
  };

  const handleShare = async () => {
    const summary = forecast ? `: ${forecast.shareSummary}` : "";
    const text = `${selectedLocation.name} — ${selectedLocation.region}${summary}`;
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: selectedLocation.name, text });
      } catch {
        // user cancelled
      }
    } else if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // ignore
      }
    } else {
      const { Share } = await import("react-native");
      Share.share({ message: text }).catch(() => undefined);
    }
  };

  const handleEditSave = (key: string, value: number | string) => {
    setSettings((prev) => ({ ...prev, [key]: value } as UserSettings));
  };

  const handleCollectionSave = (kind: "sails" | "boards", items: GearItem[]) => {
    setSettings((prev) => ({ ...prev, [kind]: items }));
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View className="flex-1 items-center bg-white">
        <SafeAreaView edges={["top", "bottom"]} className="w-full max-w-[430px] flex-1 bg-white">
          <FadeIn key={route} duration={220} style={{ flex: 1 }}>
            {route === "forecast" ? (
              <ForecastScreen
                mode={mode}
                location={selectedLocation}
                forecast={forecast}
                loading={forecastLoading}
                error={forecastError}
                onRetry={reloadForecast}
                isFavorite={isFavorite}
                onToggleFavorite={() => toggleFavorite(selectedLocationId)}
                onShare={handleShare}
                onOpenSettings={() => setRoute("settings")}
                onOpenLocations={() => setLocationsOpen(true)}
                onChangeMode={setMode}
                onOpenMapDetail={() => openDetail("map")}
                onOpenWindBeach={() => openDetail("windBeach")}
                onOpenSafety={() => openDetail("safety")}
                onOpenFooterInfo={(key) => openDetail(key)}
              />
            ) : (
              <SettingsScreen
                settings={settings}
                onBack={() => setRoute("forecast")}
                onEditField={setEditField}
                onEditSails={() => setEditCollection("sails")}
                onEditBoards={() => setEditCollection("boards")}
              />
            )}
          </FadeIn>

          <LocationSelectionSheet
            visible={locationsOpen}
            selectedLocationId={selectedLocationId}
            favoriteIds={favoriteIds}
            locations={locations}
            onClose={() => setLocationsOpen(false)}
            onSelectLocation={(id) => {
              setSelectedLocationId(id);
              setLocationsOpen(false);
            }}
            onToggleFavorite={toggleFavorite}
            onRemoveLocation={removeLocation}
            onOpenAdd={() => setAddLocationOpen(true)}
          />

          <AddLocationSheet
            visible={addLocationOpen}
            onClose={() => setAddLocationOpen(false)}
            onAdd={(input) => {
              addCustomLocation(input);
              setAddLocationOpen(false);
            }}
          />

          <EditValueSheet field={editField} onClose={() => setEditField(null)} onSave={handleEditSave} />

          <CollectionEditSheet
            visible={editCollection !== null}
            title={editCollection === "sails" ? "Sails" : "Boards"}
            itemNoun={editCollection === "sails" ? "sails" : "boards"}
            kind={editCollection === "sails" ? "sail" : "board"}
            items={editCollection ? settings[editCollection] : []}
            onClose={() => setEditCollection(null)}
            onChange={(items) => {
              if (editCollection) handleCollectionSave(editCollection, items);
            }}
          />

          <InfoDetailSheet detail={infoDetail} onClose={() => setInfoDetail(null)} />
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
