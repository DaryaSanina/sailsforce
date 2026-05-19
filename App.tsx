import "./global.css";

import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";

import { ForecastScreen } from "./src/screens/ForecastScreen";
import { LocationSelectionSheet } from "./src/screens/LocationSelectionSheet";
import { SettingsScreen } from "./src/screens/SettingsScreen";

type Route = "forecast" | "settings";

export default function App() {
  const [route, setRoute] = useState<Route>("forecast");
  const [mode, setMode] = useState<"summary" | "detailed">("summary");
  const [selectedLocationId, setSelectedLocationId] = useState("hookipa");
  const [locationsOpen, setLocationsOpen] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View className="flex-1 items-center bg-white">
        <SafeAreaView edges={["top", "bottom"]} className="w-full max-w-[430px] flex-1 bg-white">
          {route === "forecast" ? (
            <ForecastScreen
              mode={mode}
              selectedLocationId={selectedLocationId}
              onOpenSettings={() => setRoute("settings")}
              onOpenLocations={() => setLocationsOpen(true)}
              onChangeMode={setMode}
            />
          ) : (
            <SettingsScreen onBack={() => setRoute("forecast")} onOpenLocations={() => setLocationsOpen(true)} />
          )}

          <LocationSelectionSheet
            visible={locationsOpen}
            selectedLocationId={selectedLocationId}
            onClose={() => setLocationsOpen(false)}
            onSelectLocation={(id) => {
              setSelectedLocationId(id);
              setLocationsOpen(false);
            }}
          />
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
