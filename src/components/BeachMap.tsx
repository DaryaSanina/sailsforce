import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import MapView from "react-native-maps";
import { Navigation } from "lucide-react-native";

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

  return (
    <View
      style={{ width: size, height: size, borderRadius: radius, overflow: "hidden" }}
      className="relative items-center justify-center"
    >
      <MapView
        style={{ width: size, height: size }}
        initialRegion={{ latitude: lat, longitude: lon, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
        region={{ latitude: lat, longitude: lon, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
        mapType="satellite"
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        legalLabelInsets={{ top: 0, left: 0, bottom: -200, right: -200 }}
        rotateEnabled
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
      <View style={{ transform: [{ rotate: `${windDir}deg` }] }}>
        <Navigation size={28} color="#FFFFFF" fill="#FFFFFF" />
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
