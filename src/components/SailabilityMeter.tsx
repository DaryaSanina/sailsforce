import { View, Text } from "react-native";

type Props = {
  compact?: boolean;
};

export function SailabilityMeter({ compact = false }: Props) {
  const height = compact ? 150 : 220;

  return (
    <View className="items-center rounded-2xl bg-white px-2 py-3" style={{ minHeight: compact ? 210 : 282 }}>
      <Text className="mb-3 text-[8px] font-bold tracking-widest text-ink-soft">SAILABILITY</Text>
      <View className="relative w-8 items-center" style={{ height }}>
        <View className="h-full w-2 overflow-hidden rounded-full">
          <View className="flex-[0.3] bg-good" />
          <View className="flex-[0.25] bg-warnSoft" />
          <View className="flex-[0.45] bg-bad" />
        </View>
        <View className="absolute top-[15%] h-4 w-4 rounded-full border-2 border-good bg-white" />
        <View className="absolute left-6 top-[11%]">
          <Text className="text-[8px] font-bold text-good">EXCELLENT</Text>
        </View>
        {!compact ? (
          <>
            <Text className="absolute left-6 top-[34%] text-[8px] font-bold text-good">GOOD</Text>
            <Text className="absolute left-6 top-[58%] text-[8px] font-bold text-warn">FAIR</Text>
            <Text className="absolute left-6 top-[78%] text-[8px] font-bold text-bad">POOR</Text>
            <Text className="absolute left-6 bottom-1 text-[8px] font-bold text-bad">BAD</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
