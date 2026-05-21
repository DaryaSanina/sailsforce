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
import {
  defaultUserSettings,
  locations as seedLocations,
  type GearItem,
  type Location,
  type UserSettings,
} from "./src/data/prototype";

type Route = "forecast" | "settings";

const INFO_DETAILS: Record<string, InfoDetail> = {
  map: {
    key: "map",
    title: "Wind & swell conditions",
    subtitle: "Live snapshot at the launch zone",
    rows: [
      { label: "Wind speed", value: "18 kt", description: "Average over last 10 min" },
      { label: "Gusts", value: "26 kt", accent: "warn" },
      { label: "Direction", value: "ENE (70°)", description: "Steady, no major shifts forecast" },
      { label: "Swell height", value: "2.4 m" },
      { label: "Swell direction", value: "SW 210°" },
      { label: "Swell period", value: "11 s" },
    ],
  },
  windBeach: {
    key: "windBeach",
    title: "Wind vs beach",
    subtitle: "How the wind sits relative to the shore",
    rows: [
      { label: "Orientation", value: "ONSHORE", accent: "info" },
      { label: "Angle to beach", value: "82°", description: "Beach faces ~352° (almost N)" },
      { label: "Wind speed", value: "18 kt" },
      { label: "Direction", value: "ENE (70°)" },
      { label: "Cross-shore component", value: "16 kt" },
      { label: "On/offshore component", value: "9 kt" },
      { label: "Best sail size for 78 kg", value: "5.0 – 5.4 m²", accent: "good" },
    ],
  },
  safety: {
    key: "safety",
    title: "Safety overview",
    subtitle: "Advisories and lifeguard status",
    rows: [
      { label: "Overall", value: "GOOD", accent: "good" },
      { label: "Flag status", value: "Green", accent: "good" },
      { label: "Lifeguard on duty", value: "Yes · 09:00 – 17:00" },
      { label: "UV index", value: "5 · Moderate", accent: "warn" },
      { label: "Sunset", value: "18:42" },
    ],
  },
  temp: {
    key: "temp",
    title: "Temperature",
    subtitle: "Forecast for the next 24 h",
    rows: [
      { label: "Current", value: "82 °F (28 °C)" },
      { label: "Feels like", value: "85 °F (29 °C)" },
      { label: "High today", value: "86 °F (30 °C)" },
      { label: "Low overnight", value: "72 °F (22 °C)" },
      { label: "Water temp", value: "24 °C" },
      { label: "Humidity", value: "62 %" },
    ],
  },
  uv: {
    key: "uv",
    title: "UV index",
    subtitle: "Sun protection guidance",
    rows: [
      { label: "Current", value: "5 · Moderate", accent: "warn" },
      { label: "Peak today", value: "8 · Very high · 12:30", accent: "bad" },
      { label: "Recommended SPF", value: "30+" },
      { label: "Burn time (fair skin)", value: "≈ 25 min" },
      { label: "Sunglasses", value: "Recommended" },
    ],
  },
  tide: {
    key: "tide",
    title: "Tide",
    subtitle: "Today's tide schedule (Hookipa Beach)",
    rows: [
      { label: "Now", value: "0.8 m · Rising", accent: "info" },
      { label: "Next high", value: "1.6 m · 16:42" },
      { label: "Next low", value: "0.2 m · 22:58" },
      { label: "Tomorrow high", value: "1.5 m · 05:12" },
      { label: "Tomorrow low", value: "0.3 m · 11:28" },
      { label: "Range", value: "1.4 m" },
    ],
  },
};

export default function App() {
  const [route, setRoute] = useState<Route>("forecast");
  const [mode, setMode] = useState<"summary" | "detailed">("summary");
  const [locations, setLocations] = useState<Location[]>(seedLocations);
  const [selectedLocationId, setSelectedLocationId] = useState("hookipa");
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
    const text = `${selectedLocation.name} — ${selectedLocation.region}: 18 kt ENE, 2.4 m swell`;
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
                selectedLocationId={selectedLocationId}
                isFavorite={isFavorite}
                onToggleFavorite={() => toggleFavorite(selectedLocationId)}
                onShare={handleShare}
                onOpenSettings={() => setRoute("settings")}
                onOpenLocations={() => setLocationsOpen(true)}
                onChangeMode={setMode}
                onOpenMapDetail={() => setInfoDetail(INFO_DETAILS.map)}
                onOpenWindBeach={() => setInfoDetail(INFO_DETAILS.windBeach)}
                onOpenSafety={() => setInfoDetail(INFO_DETAILS.safety)}
                onOpenFooterInfo={(key) => setInfoDetail(INFO_DETAILS[key])}
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
