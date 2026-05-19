import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloudSun,
  Menu,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  TrendingUp,
  Waves,
  Wind,
} from "lucide-react-native";

import { FadeIn } from "../components/Transitions";

import { BeachMap } from "../components/BeachMap";
import { BeachWindGraphic, MiniTideWave, TideGraph, WaveGraphic } from "../components/Graphs";
import { SailabilityMeter } from "../components/SailabilityMeter";
import { confidence, detailedHours, locations, modelRows, spread, summaryHours } from "../data/prototype";
import { shadows } from "../styles/shadows";

type Props = {
  mode: "summary" | "detailed";
  selectedLocationId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onOpenSettings: () => void;
  onOpenLocations: () => void;
  onChangeMode: (mode: "summary" | "detailed") => void;
  onOpenMapDetail: () => void;
  onOpenWindBeach: () => void;
  onOpenWaterState: () => void;
  onOpenSafety: () => void;
  onOpenFooterInfo: (key: "temp" | "uv" | "tide") => void;
};

export function ForecastScreen({
  mode,
  selectedLocationId,
  isFavorite,
  onToggleFavorite,
  onShare,
  onOpenSettings,
  onOpenLocations,
  onChangeMode,
  onOpenMapDetail,
  onOpenWindBeach,
  onOpenWaterState,
  onOpenSafety,
  onOpenFooterInfo,
}: Props) {
  const location = locations.find((item) => item.id === selectedLocationId) ?? locations[0];
  const detailed = mode === "detailed";

  return (
    <View className="flex-1 bg-white">
      <Header
        locationName={location.name}
        region={location.region}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onShare={onShare}
        onOpenSettings={onOpenSettings}
        onOpenLocations={onOpenLocations}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <View className="relative px-4 pb-2 pt-2">
          <View className="absolute left-4 top-2 z-10 flex-row items-center rounded-xl bg-accent-light px-2 py-1">
            <View className="mr-1 h-1.5 w-1.5 rounded-full bg-good" />
            <Text className="text-[10px] font-bold tracking-widest text-accent">LIVE</Text>
          </View>

          <View className="flex-row items-center justify-center gap-3">
            <BeachMap
              size={236}
              wind={18}
              swell="2.4 m"
              onPress={onOpenMapDetail}
              accessibilityLabel="Wind and swell details"
            />
            <SailabilityMeter compact />
          </View>
        </View>

        <WeatherWidget detailed={detailed} onToggle={() => onChangeMode(detailed ? "summary" : "detailed")} />

        <MetricCardsRow
          onOpenWindBeach={onOpenWindBeach}
          onOpenWaterState={onOpenWaterState}
          onOpenSafety={onOpenSafety}
        />
      </ScrollView>

      <FooterInfoBar onOpen={onOpenFooterInfo} />
    </View>
  );
}

function Header({
  locationName,
  region,
  isFavorite,
  onToggleFavorite,
  onShare,
  onOpenSettings,
  onOpenLocations,
}: {
  locationName: string;
  region: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onOpenSettings: () => void;
  onOpenLocations: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between bg-white px-4 py-3">
      <IconButton onPress={onOpenSettings}>
        <Menu size={22} color="#1E293B" strokeWidth={1.8} />
      </IconButton>
      <Pressable onPress={onOpenLocations} className="items-center px-2 active:opacity-70">
        <Text className="text-[18px] font-bold text-ink">{locationName}</Text>
        <View className="mt-0.5 flex-row items-center">
          <Text className="text-[12px] text-ink-soft">{region}</Text>
          <ChevronRight size={13} color="#64748B" />
        </View>
      </Pressable>
      <View className="flex-row gap-2">
        <IconButton onPress={onToggleFavorite}>
          <Star
            size={20}
            color={isFavorite ? "#7CB3B5" : "#1E293B"}
            fill={isFavorite ? "#7CB3B5" : "transparent"}
            strokeWidth={1.8}
          />
        </IconButton>
        <IconButton onPress={onShare}>
          <Share2 size={20} color="#1E293B" strokeWidth={1.8} />
        </IconButton>
      </View>
    </View>
  );
}

function IconButton({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-lg border border-line bg-white active:bg-surface"
    >
      {children}
    </Pressable>
  );
}

function WeatherWidget({ detailed, onToggle }: { detailed: boolean; onToggle: () => void }) {
  return (
    <View className="px-4 pb-4">
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={detailed ? "Collapse weather details" : "Expand weather details"}
        className="rounded-2xl border border-line-soft bg-surface p-4 active:opacity-95"
        style={shadows.soft}
      >
        <View className="mb-3 flex-row justify-between">
          {summaryHours.map((item) => (
            <View key={item.hour} className="items-center gap-1">
              <Text className="text-[12px] font-medium text-ink-soft">{item.hour}</Text>
              <WeatherIcon icon={item.icon} size={22} />
            </View>
          ))}
        </View>
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-[10px] font-bold tracking-wider text-ink">WIND (kt)</Text>
          {summaryHours.map((item) => (
            <View key={item.hour} className="w-9 flex-row items-center justify-center gap-0.5">
              <Text className="text-[12px] font-bold text-accent">{item.wind}</Text>
              <ArrowUpRight size={12} color="#0F766E" />
            </View>
          ))}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-bold tracking-wider text-ink">TIDE (m)</Text>
          {summaryHours.map((item) => (
            <Text key={item.hour} className="w-9 text-center text-[12px] font-semibold text-info">
              {item.tide.toFixed(1)}
            </Text>
          ))}
        </View>
        <View className="mt-1">
          <MiniTideWave />
        </View>

        {detailed ? (
          <FadeIn duration={220} translateY={8}>
            <ModelTable />
          </FadeIn>
        ) : null}

        <View className="mt-2 flex-row items-center justify-center gap-1">
          {detailed ? <ChevronUp size={12} color="#94A3B8" /> : null}
          <Text className="text-[10px] font-semibold text-ink-faint">
            {detailed ? "Tap to collapse" : "Tap to expand model view"}
          </Text>
          {!detailed ? <ChevronDown size={12} color="#94A3B8" /> : null}
        </View>
      </Pressable>
    </View>
  );
}

function ModelTable() {
  return (
    <View className="mt-4 border-t border-line-soft pt-3">
      <View className="mb-3 items-center">
        <View className="rounded-full bg-indigo px-3 py-1">
          <Text className="text-[12px] font-semibold text-white">13:00</Text>
        </View>
      </View>
      <View className="mb-2 flex-row items-center justify-center gap-3">
        <ChevronLeft size={16} color="#94A3B8" />
        <Text className="text-[11px] text-ink-soft">Drag timeline to update map</Text>
        <ChevronRight size={16} color="#94A3B8" />
      </View>

      <View className="flex-row pl-[70px]">
        {detailedHours.map((item) => (
          <Text
            key={item.hour}
            className={`flex-1 text-center text-[11px] ${item.hour === "13" ? "font-bold text-info" : "font-medium text-ink"}`}
          >
            {item.hour}
          </Text>
        ))}
      </View>
      <View className="mt-1 flex-row border-b-2 border-[#EFF6FF] pb-2 pl-[70px]">
        {detailedHours.map((item) => (
          <View key={item.hour} className="flex-1 items-center">
            <WeatherIcon icon={item.icon} size={item.hour === "13" ? 22 : 19} />
          </View>
        ))}
      </View>

      <DataRow label="WIND" unit="(kt)" values={detailedHours.map((item) => String(item.wind))} highlightedIndex={3} />
      <DataRow label="GUSTS" unit="(kt)" values={detailedHours.map((item) => String(item.gust))} highlightedIndex={3} />

      {modelRows.map((row) => (
        <View key={row.name} className="flex-row items-center border-t border-line-soft py-1.5">
          <View className="w-[70px] flex-row items-center gap-1">
            {row.icon === "shield" ? <Shield size={14} color="#1E3A8A" /> : <Sparkles size={14} color="#1E3A8A" />}
            <Text className="text-[10px] text-ink-soft">{row.name}</Text>
          </View>
          <View className="flex-1 flex-row">
            {row.values.map(([wind, gust], index) => (
              <View key={`${row.name}-${index}`} className="flex-1 items-center">
                <Text className={`text-[11px] font-bold ${index === 3 ? "text-info" : "text-ink"}`}>{wind}</Text>
                <Text className={`text-[9px] ${index === 3 ? "text-info" : "text-ink-soft"}`}>{gust}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View className="flex-row items-center border-t border-line-soft py-1.5">
        <View className="w-[70px] flex-row items-center gap-1">
          <ShieldCheck size={14} color="#3B82F6" />
          <Text className="text-[10px] font-bold text-ink-soft">CONF.</Text>
        </View>
        <View className="flex-1 flex-row">
          {confidence.map((value, index) => (
            <View key={value + index} className="flex-1 items-center">
              {index === 3 ? (
                <View className="rounded-md bg-accent px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-white">{value}%</Text>
                </View>
              ) : (
                <Text className="text-[11px] font-semibold text-ink">{value}%</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      <View className="flex-row items-center border-t border-line-soft py-1.5">
        <View className="w-[70px]">
          <Text className="text-[10px] font-bold text-ink-soft">SPREAD</Text>
        </View>
        <View className="flex-1 flex-row">
          {spread.map((value, index) => (
            <Text key={value + index} className="flex-1 text-center text-[10px] font-semibold text-ink">
              {value}
            </Text>
          ))}
        </View>
      </View>

      <View className="mt-3 border-t border-line-soft pt-2">
        <Text className="mb-1 text-[10px] font-bold tracking-wider text-ink-soft">TIDE (ft)</Text>
        <TideGraph />
      </View>
    </View>
  );
}

function DataRow({ label, unit, values, highlightedIndex }: { label: string; unit: string; values: string[]; highlightedIndex: number }) {
  return (
    <View className="flex-row items-center border-t border-line-soft py-1.5">
      <View className="w-[70px]">
        <Text className="text-[10px] font-bold text-ink">
          {label} <Text className="text-[9px] font-medium text-ink-soft">{unit}</Text>
        </Text>
      </View>
      <View className="flex-1 flex-row">
        {values.map((value, index) => (
          <View key={label + value + index} className="flex-1 items-center">
            <Text className={`text-[11px] font-bold ${index === highlightedIndex ? "text-info" : "text-ink"}`}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MetricCardsRow({
  onOpenWindBeach,
  onOpenWaterState,
  onOpenSafety,
}: {
  onOpenWindBeach: () => void;
  onOpenWaterState: () => void;
  onOpenSafety: () => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
      <FadeIn duration={280} delay={80} translateY={12}>
      <MetricCard onPress={onOpenWindBeach} label="Wind vs beach detail">
        <Text className="text-[10px] font-bold tracking-wider text-ink-soft">WIND VS BEACH</Text>
        <Text className="mt-1 text-[12px] font-bold text-sky">ONSHORE</Text>
        <View className="mt-2 flex-row items-baseline">
          <Text className="text-[28px] font-bold leading-[30px] text-ink">18</Text>
          <Text className="text-[14px] text-ink-soft"> kt</Text>
          <ArrowUpRight size={18} color="#0EA5E9" style={{ marginLeft: 8 }} />
        </View>
        <Text className="mt-0.5 text-[10px] font-medium text-ink-soft">ENE (70°)</Text>
        <View className="mt-auto overflow-hidden rounded-lg">
          <BeachWindGraphic />
        </View>
      </MetricCard>
      </FadeIn>

      <FadeIn duration={280} delay={150} translateY={12}>
      <MetricCard onPress={onOpenWaterState} label="Water state detail">
        <Text className="text-[10px] font-bold tracking-wider text-ink-soft">WATER STATE</Text>
        <View className="mt-2 flex-row items-center gap-1">
          <Waves size={20} color="#0F766E" />
          <Text className="text-[24px] font-bold text-ink">2.4</Text>
          <Text className="text-[14px] text-ink-soft">m</Text>
        </View>
        <Text className="text-[10px] text-ink-soft">SW 210°</Text>
        <Text className="mt-3 text-center text-[12px] font-medium text-accent">Surface{"\n"}Clean</Text>
        <View className="mt-auto overflow-hidden rounded-lg">
          <WaveGraphic />
        </View>
      </MetricCard>
      </FadeIn>

      <FadeIn duration={280} delay={220} translateY={12}>
      <MetricCard onPress={onOpenSafety} label="Safety detail">
        <Text className="text-[10px] font-bold tracking-wider text-ink-soft">SAFETY</Text>
        <View className="mt-2 flex-row items-center gap-1">
          <CheckCircle2 size={21} color="#22C55E" fill="#22C55E" stroke="#FFFFFF" />
          <Text className="text-[16px] font-bold text-good">GOOD</Text>
        </View>
        <Text className="mt-1 text-[12px] text-ink-soft">No hazards{"\n"}reported</Text>
        <View className="mt-auto flex-row items-end justify-between">
          <View>
            <Text className="text-[8px] font-bold text-ink-soft">UV INDEX</Text>
            <Text className="text-[12px] font-semibold text-ink">5 Moderate</Text>
          </View>
          <Sun size={26} color="#FBBF24" fill="#FBBF24" />
        </View>
      </MetricCard>
      </FadeIn>
    </ScrollView>
  );
}

function MetricCard({
  children,
  onPress,
  label,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label}
      className="h-36 w-[140px] rounded-2xl border border-line-soft bg-white p-3 active:opacity-90"
      style={shadows.soft}
    >
      {children}
    </Pressable>
  );
}

function WeatherIcon({ icon, size }: { icon: "sun" | "cloud-sun" | "wind"; size: number }) {
  if (icon === "cloud-sun") return <CloudSun size={size} color="#FBBF24" strokeWidth={1.8} />;
  if (icon === "wind") return <Wind size={size} color="#94A3B8" strokeWidth={1.8} />;
  return <Sun size={size} color="#FBBF24" fill="#FBBF24" strokeWidth={1.8} />;
}

function FooterInfoBar({ onOpen }: { onOpen: (key: "temp" | "uv" | "tide") => void }) {
  return (
    <View className="flex-row items-center justify-around border-t border-line-soft bg-white px-4 py-3">
      <Pressable
        onPress={() => onOpen("temp")}
        accessibilityRole="button"
        accessibilityLabel="Temperature detail"
        className="flex-1 flex-row items-center justify-center gap-1 active:opacity-70"
      >
        <Sun size={20} color="#FBBF24" fill="#FBBF24" />
        <Text className="text-[16px] font-semibold text-ink">82°</Text>
      </Pressable>
      <View className="h-7 w-px bg-line" />
      <Pressable
        onPress={() => onOpen("uv")}
        accessibilityRole="button"
        accessibilityLabel="UV index detail"
        className="flex-1 items-center justify-center active:opacity-70"
      >
        <Text className="text-[16px] font-semibold text-ink">UV  5</Text>
      </Pressable>
      <View className="h-7 w-px bg-line" />
      <Pressable
        onPress={() => onOpen("tide")}
        accessibilityRole="button"
        accessibilityLabel="Tide detail"
        className="flex-1 flex-row items-center justify-center gap-1 active:opacity-70"
      >
        <TrendingUp size={18} color="#3B82F6" />
        <Text className="text-[16px] font-semibold text-ink">Rising</Text>
      </Pressable>
    </View>
  );
}
