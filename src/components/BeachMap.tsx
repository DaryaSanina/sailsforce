import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import MapView, { type Region } from "react-native-maps";
import { Locate, Navigation2 } from "lucide-react-native";

type Props = {
  size: number;
  lat: number;
  lon: number;
  wind: number;
  windDir?: number;
  windDirLabel?: string;
  swell: string;
  unit?: string;
  showDirection?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export const BeachMap = memo(function BeachMap({
  size,
  lat,
  lon,
  wind,
  windDir = 0,
  windDirLabel = "--",
  swell,
  unit = "kt",
  showDirection = true,
  onPress,
  accessibilityLabel,
}: Props) {
  const radius = size / 2;
  const mapRef = useRef<MapView | null>(null);
  const originRegion: Region = {
    latitude: lat,
    longitude: lon,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };
  const [moved, setMoved] = useState(false);

  const handleRegionChange = useCallback(
    (region: Region) => {
      const drifted =
        Math.abs(region.latitude - lat) > 1e-5 ||
        Math.abs(region.longitude - lon) > 1e-5 ||
        Math.abs(region.latitudeDelta - 0.005) > 1e-5 ||
        Math.abs(region.longitudeDelta - 0.005) > 1e-5;
      setMoved(drifted);
    },
    [lat, lon],
  );

  const recenter = useCallback(() => {
    mapRef.current?.animateToRegion(originRegion, 300);
    setMoved(false);
  }, [originRegion]);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lon, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      300,
    );
    setMoved(false);
  }, [lat, lon]);

  return (
    <View style={{ width: size, height: size }} className="relative items-center justify-center">
      <View
        style={{ width: size, height: size, borderRadius: radius, overflow: "hidden" }}
        className="items-center justify-center"
      >
        <MapView
          ref={mapRef}
          style={{ width: size, height: size }}
          initialRegion={originRegion}
          onRegionChangeComplete={handleRegionChange}
          mapType="satellite"
          showsCompass={false}
          showsScale={false}
          showsBuildings={false}
          showsTraffic={false}
          showsIndoors={false}
          showsPointsOfInterest={false}
          toolbarEnabled={false}
          legalLabelInsets={{ top: 0, left: 0, bottom: -200, right: -200 }}
          rotateEnabled={false}
          zoomEnabled
          scrollEnabled
          pitchEnabled={false}
        />

        <View pointerEvents="box-none" className="absolute inset-0 items-center justify-center">
          <View pointerEvents="none" className="absolute top-[12%] items-center">
            <Text className="text-[14px] font-semibold text-white">{swell}</Text>
          </View>

          {onPress ? (
            <Pressable
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              className="items-center px-4 py-2 active:opacity-70"
              style={{ paddingTop: 10 }}
            >
              <WindBlock wind={wind} unit={unit} windDir={windDir} windDirLabel={windDirLabel} showDirection={showDirection} />
            </Pressable>
          ) : (
            <View pointerEvents="none" className="items-center px-4 py-2" style={{ paddingTop: 10 }}>
              <WindBlock wind={wind} unit={unit} windDir={windDir} windDirLabel={windDirLabel} showDirection={showDirection} />
            </View>
          )}
        </View>
      </View>

      {moved ? (
        <Pressable
          onPress={recenter}
          accessibilityRole="button"
          accessibilityLabel="Recenter map"
          hitSlop={8}
          className="absolute h-9 w-9 items-center justify-center active:opacity-60"
          style={{ left: 0, top: size - 36, zIndex: 10, elevation: 6 }}
        >
          <Locate size={20} color="#94A3B8" />
        </Pressable>
      ) : null}
    </View>
  );
});

function WindBlock({
  wind,
  unit,
  windDir,
  windDirLabel,
  showDirection,
}: {
  wind: number;
  unit: string;
  windDir: number;
  windDirLabel: string;
  showDirection: boolean;
}) {
  return (
    <>
      <View style={{ transform: [{ rotate: `${windDir + 180}deg` }] }}>
        <Navigation2 size={28} color="#FFFFFF" fill="#FFFFFF" />
      </View>
      <Text className="mt-2 text-[48px] font-extrabold leading-[50px] text-white">{wind}</Text>
      <Text className="-mt-1 text-[16px] font-medium text-white">{unit}</Text>
      {showDirection ? (
        <Text className="mt-1 text-[14px] font-semibold text-white">
          {windDirLabel} ({Math.round(windDir)} deg)
        </Text>
      ) : null}
    </>
  );
}
