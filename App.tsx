import "./global.css";

import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { FadeIn } from "./src/components/Transitions";
import { ForecastScreen } from "./src/screens/ForecastScreen";
import { LocationSelectionSheet } from "./src/screens/LocationSelectionSheet";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { EditValueSheet, type EditField } from "./src/screens/EditValueSheet";
import { CollectionEditSheet } from "./src/screens/CollectionEditSheet";
import { InfoDetailSheet, type InfoDetail } from "./src/screens/InfoDetailSheet";
import { beachLocations, defaultLocationId, findBeachLocation } from "./src/data/beaches";
import type { GearItem } from "./src/domain/models";
import { formatWind } from "./src/services/format";
import { useForecast } from "./src/state/useForecast";
import { usePersistentAppState } from "./src/state/usePersistentAppState";

type Route = "forecast" | "settings";

export default function App() {
  const [route, setRoute] = useState<Route>("forecast");
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editCollection, setEditCollection] = useState<"sails" | "boards" | null>(null);
  const [infoDetail, setInfoDetail] = useState<InfoDetail | null>(null);
  const {
    hydrated,
    state,
    favoriteIds,
    setMode,
    setSelectedLocationId,
    updateSetting,
    updateGear,
    toggleFavorite,
    removeFavorite,
  } = usePersistentAppState();

  const selectedLocation =
    findBeachLocation(state.selectedLocationId) ?? findBeachLocation(defaultLocationId) ?? beachLocations[0];
  const { forecast, status, error, stale } = useForecast(hydrated ? selectedLocation : null);
  const isFavorite = favoriteIds.has(selectedLocation.id);

  const handleShare = async () => {
    const active = forecast?.current;
    const text = active
      ? `${selectedLocation.name} - ${selectedLocation.region}: ${formatWind(active.wind, state.settings.windUnit)}, gusts ${formatWind(
          active.gust,
          state.settings.windUnit,
        )}, swell ${active.swellHeightM ?? "--"} m`
      : `${selectedLocation.name} - ${selectedLocation.region}`;
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
    updateSetting(key, value);
  };

  const handleCollectionSave = (kind: "sails" | "boards", items: GearItem[]) => {
    updateGear(kind, items);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View className="flex-1 items-center bg-white">
        <SafeAreaView edges={["top", "bottom"]} className="w-full max-w-[430px] flex-1 bg-white">
          {!hydrated ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-[14px] font-medium text-ink-soft">Loading saved settings</Text>
            </View>
          ) : (
            <FadeIn key={route} duration={220} style={{ flex: 1 }}>
              {route === "forecast" ? (
                <ForecastScreen
                  mode={state.mode}
                  location={selectedLocation}
                  forecast={forecast}
                  status={status}
                  error={error}
                  stale={stale}
                  windUnit={state.settings.windUnit}
                  userSettings={state.settings}
                  isFavorite={isFavorite}
                  onToggleFavorite={() => toggleFavorite(selectedLocation.id)}
                  onShare={handleShare}
                  onOpenSettings={() => setRoute("settings")}
                  onOpenLocations={() => setLocationsOpen(true)}
                  onChangeMode={setMode}
                  onOpenDetail={setInfoDetail}
                />
              ) : (
                <SettingsScreen
                  settings={state.settings}
                  onBack={() => setRoute("forecast")}
                  onEditField={setEditField}
                  onEditSails={() => setEditCollection("sails")}
                  onEditBoards={() => setEditCollection("boards")}
                />
              )}
            </FadeIn>
          )}

          <LocationSelectionSheet
            visible={locationsOpen}
            selectedLocationId={selectedLocation.id}
            favoriteIds={favoriteIds}
            locations={beachLocations}
            onClose={() => setLocationsOpen(false)}
            onSelectLocation={(id) => {
              setSelectedLocationId(id);
              setLocationsOpen(false);
            }}
            onToggleFavorite={toggleFavorite}
            onRemoveLocation={removeFavorite}
          />

          <EditValueSheet field={editField} onClose={() => setEditField(null)} onSave={handleEditSave} />

          <CollectionEditSheet
            visible={editCollection !== null}
            title={editCollection === "sails" ? "Sails" : "Boards"}
            itemNoun={editCollection === "sails" ? "sails" : "boards"}
            kind={editCollection === "sails" ? "sail" : "board"}
            items={editCollection ? state.settings[editCollection] : []}
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

