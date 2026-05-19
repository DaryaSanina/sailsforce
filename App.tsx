import "./global.css";

import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";

import { LocationSelectionSheet } from "./src/screens/LocationSelectionSheet";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ForecastScreen } from "./src/screens/ForecastScreen";

type Screen = "summary" | "detailed" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("summary");
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState("hookipa");

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View className="flex-1 items-center bg-white">
        <SafeAreaView edges={["top"]} className="w-full max-w-[430px] flex-1 bg-white">
          {screen === "settings" ? (
            <SettingsScreen onBack={() => setScreen("summary")} onOpenLocations={() => setLocationSheetOpen(true)} />
          ) : (
            <ForecastScreen
              mode={screen}
              selectedLocationId={selectedLocationId}
              onOpenSettings={() => setScreen("settings")}
              onOpenLocations={() => setLocationSheetOpen(true)}
              onChangeMode={setScreen}
            />
          )}
        </SafeAreaView>
      </View>
      <LocationSelectionSheet
        visible={locationSheetOpen}
        selectedLocationId={selectedLocationId}
        onClose={() => setLocationSheetOpen(false)}
        onSelectLocation={(id) => {
          setSelectedLocationId(id);
          setLocationSheetOpen(false);
        }}
      />
    </SafeAreaProvider>
  );
}
