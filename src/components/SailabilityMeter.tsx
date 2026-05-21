import { View, Text } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop, Circle } from "react-native-svg";

type Props = {
  compact?: boolean;
  rating?: number;
  max?: number;
};

const BAR_WIDTH = 18;

export function SailabilityMeter({ compact = false, rating = 7.8, max = 10 }: Props) {
  const height = compact ? 200 : 260;
  const clamped = Math.max(0, Math.min(max, rating));
  const fraction = 1 - clamped / max;
  const markerY = fraction * height;

  return (
    <View
      className="items-center rounded-2xl bg-white px-2 py-3"
      style={{ minHeight: compact ? height + 64 : height + 64 }}
    >
      <Text className="mb-2 text-[8px] font-bold tracking-widest text-ink-soft">SAILABILITY</Text>
      <View className="relative items-center" style={{ width: BAR_WIDTH + 30, height }}>
        <Svg width={BAR_WIDTH} height={height} style={{ position: "absolute", left: 15 }}>
          <Defs>
            <LinearGradient id="sailGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#EF4444" />
              <Stop offset="0.34" stopColor="#FACC15" />
              <Stop offset="0.67" stopColor="#22C55E" />
              <Stop offset="1" stopColor="#38BDF8" />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={BAR_WIDTH}
            height={height}
            rx={BAR_WIDTH / 2}
            ry={BAR_WIDTH / 2}
            fill="url(#sailGrad)"
          />
        </Svg>
        <Svg
          width={BAR_WIDTH + 14}
          height={20}
          style={{ position: "absolute", left: 15 - 7, top: markerY - 10 }}
        >
          <Circle cx={(BAR_WIDTH + 14) / 2} cy={10} r={9} fill="#FFFFFF" />
          <Circle cx={(BAR_WIDTH + 14) / 2} cy={10} r={5} fill="#1E293B" />
        </Svg>
      </View>
      <Text className="mt-2 text-[18px] font-extrabold text-ink">{clamped.toFixed(1)}</Text>
      <Text className="-mt-0.5 text-[9px] font-bold tracking-widest text-ink-soft">/ {max}</Text>
    </View>
  );
}
