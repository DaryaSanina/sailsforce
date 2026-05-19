import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { Star, X } from "lucide-react-native";

import type { Location } from "../data/prototype";
import { shadows } from "../styles/shadows";

type Spot = Location & { favorite: boolean };

type Props = {
  visible: boolean;
  spots: Spot[];
  selectedLocationId: string;
  onClose: () => void;
  onSelectLocation: (id: string) => void;
};

export function MapViewSheet({ visible, spots, selectedLocationId, onClose, onSelectLocation }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View
          className="w-full max-w-[430px] self-center rounded-t-[24px] bg-white pt-3"
          style={[shadows.lift, { maxHeight: "92%" }]}
        >
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-ink-hair" />
            <View className="mb-3 flex-row items-center justify-between px-5">
              <Text className="text-[20px] font-bold text-ink">Spots Map</Text>
              <Pressable
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface active:bg-line-soft"
              >
                <X size={18} color="#1E293B" />
              </Pressable>
            </View>

            <View className="mx-5 mb-4 overflow-hidden rounded-2xl border border-line-soft" style={shadows.soft}>
              <MapCanvas spots={spots} selectedLocationId={selectedLocationId} onSelect={onSelectLocation} />
            </View>

            <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 28 }}>
              <Text className="mb-2 text-[12px] font-bold tracking-wider text-ink-faint">ALL SPOTS</Text>
              <View className="overflow-hidden rounded-2xl border border-line-soft" style={shadows.soft}>
                {spots.map((spot, i) => {
                  const selected = spot.id === selectedLocationId;
                  return (
                    <Pressable
                      key={spot.id}
                      onPress={() => {
                        onSelectLocation(spot.id);
                        onClose();
                      }}
                      className={`flex-row items-center px-4 py-3 active:bg-surface ${selected ? "bg-surface" : "bg-white"} ${i < spots.length - 1 ? "border-b border-line-soft" : ""}`}
                    >
                      <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-accent-light">
                        <Text className="text-[12px] font-bold text-accent">{i + 1}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[15px] font-semibold text-ink">{spot.name}</Text>
                        <Text className="text-[12px] text-ink-soft">{spot.region}</Text>
                      </View>
                      {spot.favorite ? <Star size={16} color="#7CB3B5" fill="#7CB3B5" /> : null}
                      {spot.distance ? (
                        <Text className="ml-3 text-[12px] text-ink-faint">{spot.distance}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MapCanvas({
  spots,
  selectedLocationId,
  onSelect,
}: {
  spots: Spot[];
  selectedLocationId: string;
  onSelect: (id: string) => void;
}) {
  // Stylised island layout — pin coords are deterministic by index, in a 380x220 viewBox.
  const W = 380;
  const H = 220;
  const pins = spots.map((spot, i) => {
    const cx = 60 + ((i * 73) % (W - 110));
    const cy = 60 + ((i * 41) % (H - 110));
    return { spot, cx, cy };
  });

  return (
    <View className="bg-[#D6ECF6]" style={{ width: "100%", height: H, position: "relative" }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect x="0" y="0" width={W} height={H} fill="#D6ECF6" />
        {/* Ocean tones — discrete bands */}
        <Path d={`M0 30 L${W} 50 L${W} 80 L0 60 Z`} fill="#C1E0EF" />
        <Path d={`M0 120 L${W} 140 L${W} 170 L0 150 Z`} fill="#C1E0EF" />
        {/* Main island */}
        <Path
          d="M70 60 C110 40 170 50 220 60 C280 70 320 90 310 130 C300 165 240 185 190 175 C140 165 80 160 60 130 C50 95 50 75 70 60 Z"
          fill="#6B8E5A"
        />
        {/* Sand rim */}
        <Path
          d="M70 60 C110 40 170 50 220 60 C280 70 320 90 310 130 C300 165 240 185 190 175 C140 165 80 160 60 130 C50 95 50 75 70 60 Z"
          stroke="#E8D6A1"
          strokeWidth="4"
          fill="none"
        />
        {/* Small island */}
        <Path d="M40 175 C55 165 80 168 80 182 C80 196 50 198 40 188 Z" fill="#6B8E5A" />
        {/* Compass rose */}
        <Circle cx={W - 30} cy={28} r={14} fill="#FFFFFF" opacity="0.9" />
        <SvgText x={W - 30} y={32} fontSize={11} fontWeight="700" textAnchor="middle" fill="#1E293B">
          N
        </SvgText>
      </Svg>
      {pins.map(({ spot, cx, cy }, i) => {
        const selected = spot.id === selectedLocationId;
        const leftPct = (cx / W) * 100;
        const topPct = (cy / H) * 100;
        return (
          <Pressable
            key={spot.id}
            onPress={() => onSelect(spot.id)}
            style={{
              position: "absolute",
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: [{ translateX: -14 }, { translateY: -14 }],
            }}
            className="items-center justify-center"
          >
            <View
              className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
                selected ? "bg-accent border-white" : "bg-white border-accent"
              }`}
              style={shadows.soft}
            >
              <Text className={`text-[11px] font-bold ${selected ? "text-white" : "text-accent"}`}>{i + 1}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
