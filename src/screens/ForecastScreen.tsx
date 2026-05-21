import { memo, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CloudSun,
  Menu,
  RefreshCw,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  TrendingDown,
  TrendingUp,
  Wind,
} from "lucide-react-native";

import Svg, { Circle, Path } from "react-native-svg";

import { FadeIn } from "../components/Transitions";

import { BeachMap } from "../components/BeachMap";
import { BeachWindGraphic } from "../components/Graphs";
import { SailabilityMeter } from "../components/SailabilityMeter";
import type { ForecastData, HourData } from "../data/forecast";
import type { Location } from "../data/prototype";
import { shadows } from "../styles/shadows";

type Props = {
  mode: "summary" | "detailed";
  location: Location;
  forecast: ForecastData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onOpenSettings: () => void;
  onOpenLocations: () => void;
  onChangeMode: (mode: "summary" | "detailed") => void;
  onOpenMapDetail: () => void;
  onOpenWindBeach: () => void;
  onOpenSafety: () => void;
  onOpenFooterInfo: (key: "temp" | "uv" | "tide") => void;
};

type IconKind = HourData["icon"];
type Accent = "default" | "good" | "warn" | "bad" | "info";

const MODEL_LABELS = ["model1", "model2", "model3"];
const CELL_W = 46;
const KEY_W = 76;
const HOUR_ROW_H = 22;
const ICON_ROW_H = 28;
const DATA_ROW_H = 26;
const TIDE_ROW_H = 70;
const TIDE_PAD_Y = 10;

const ACCENT_TEXT: Record<Accent, string> = {
  default: "text-ink",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-sky",
};
const ACCENT_HEX: Record<Accent, string> = {
  default: "#1E293B",
  good: "#22C55E",
  warn: "#F59E0B",
  bad: "#EF4444",
  info: "#0EA5E9",
};

export function ForecastScreen({
  mode,
  location,
  forecast,
  loading,
  error,
  onRetry,
  isFavorite,
  onToggleFavorite,
  onShare,
  onOpenSettings,
  onOpenLocations,
  onChangeMode,
  onOpenMapDetail,
  onOpenWindBeach,
  onOpenSafety,
  onOpenFooterInfo,
}: Props) {
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

      {forecast ? (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <View className="relative px-4 pb-2 pt-2">
            <View className="flex-row items-center justify-center gap-3">
              <BeachMap
                size={236}
                wind={forecast.windKt}
                windDir={forecast.windDir}
                windLabel={forecast.windLabel}
                swell={forecast.swellLabel}
                swellLabel={forecast.swellDirLabel}
                onPress={onOpenMapDetail}
                accessibilityLabel="Wind and swell details"
              />
              <SailabilityMeter compact rating={forecast.sailability} />
            </View>
          </View>

          <WeatherWidget
            key={location.id}
            detailed={detailed}
            onChangeMode={onChangeMode}
            hours={forecast.hours}
            nowIndex={forecast.nowIndex}
            hasTide={forecast.hasTide}
          />

          <MetricGrid
            forecast={forecast}
            onOpenWindBeach={onOpenWindBeach}
            onOpenSafety={onOpenSafety}
            onOpenFooterInfo={onOpenFooterInfo}
          />
        </ScrollView>
      ) : (
        <StatusView loading={loading} error={error} onRetry={onRetry} />
      )}
    </View>
  );
}

function StatusView({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-10">
      {loading ? (
        <>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text className="mt-4 text-[14px] font-medium text-ink-soft">Loading live forecast…</Text>
        </>
      ) : (
        <>
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-bad/10">
            <AlertTriangle size={24} color="#EF4444" />
          </View>
          <Text className="text-center text-[15px] font-semibold text-ink">Forecast unavailable</Text>
          <Text className="mt-1 text-center text-[13px] text-ink-soft">
            {error ?? "Something went wrong loading this spot."}
          </Text>
          <Pressable
            onPress={onRetry}
            className="mt-5 flex-row items-center gap-2 rounded-xl bg-accent px-5 py-3 active:opacity-90"
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text className="text-[14px] font-semibold text-white">Try again</Text>
          </Pressable>
        </>
      )}
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

function WeatherWidget({
  detailed,
  onChangeMode,
  hours,
  nowIndex,
  hasTide,
}: {
  detailed: boolean;
  onChangeMode: (mode: "summary" | "detailed") => void;
  hours: HourData[];
  nowIndex: number;
  hasTide: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportW, setViewportW] = useState(0);
  const [activeIndex, setActiveIndex] = useState(nowIndex);
  const [scrollX, setScrollX] = useState(nowIndex * CELL_W);

  const showTide = detailed && hasTide;

  // Tide curve is rescaled to the live data range — heights are relative to
  // mean sea level and can be negative.
  const tide = useMemo(() => {
    const vals = hours.map((h) => h.tide);
    let min = vals.length ? Math.min(...vals) : 0;
    let max = vals.length ? Math.max(...vals) : 1;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      min = 0;
      max = 1;
    }
    const pad = (max - min) * 0.18;
    min -= pad;
    max += pad;
    const usable = TIDE_ROW_H - TIDE_PAD_Y * 2;
    const yFor = (v: number) => TIDE_PAD_Y + (1 - (v - min) / (max - min)) * usable;

    let path = "";
    for (let i = 0; i < hours.length; i++) {
      const x = i * CELL_W + CELL_W / 2;
      const y = yFor(hours[i].tide);
      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prevX = (i - 1) * CELL_W + CELL_W / 2;
        const prevY = yFor(hours[i - 1].tide);
        path += ` C ${prevX + CELL_W * 0.5} ${prevY} ${x - CELL_W * 0.5} ${y} ${x} ${y}`;
      }
    }
    const contentW = hours.length * CELL_W;
    const fill = `${path} L ${(hours.length - 1) * CELL_W + CELL_W / 2} ${TIDE_ROW_H} L ${CELL_W / 2} ${TIDE_ROW_H} Z`;

    // Tide-curve height at an arbitrary pixel x — the curve segments are cubic
    // beziers with horizontal-tangent control points (control Y = endpoint Y).
    const yAtX = (px: number): number => {
      const frac = (px - CELL_W / 2) / CELL_W;
      const i = Math.max(0, Math.min(hours.length - 2, Math.floor(frac)));
      const t = Math.max(0, Math.min(1, frac - i));
      const p0y = yFor(hours[i].tide);
      const p3y = yFor(hours[i + 1].tide);
      const mt = 1 - t;
      return mt * mt * mt * p0y + 3 * mt * mt * t * p0y + 3 * mt * t * t * p3y + t * t * t * p3y;
    };
    return { path, fill, yFor, yAtX, contentW };
  }, [hours]);

  const onToggle = useCallback(() => {
    onChangeMode(detailed ? "summary" : "detailed");
  }, [detailed, onChangeMode]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (viewportW <= 0) return;
    const x = e.nativeEvent.contentOffset.x;
    setScrollX(x);
    const idx = Math.round(x / CELL_W);
    const clamped = Math.max(0, Math.min(hours.length - 1, idx));
    if (clamped !== activeIndex) setActiveIndex(clamped);

    // Debounced snap: correct a misaligned rest position once scrolling stops.
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const snapped = Math.round(x / CELL_W) * CELL_W;
      if (Math.abs(x - snapped) > 2) {
        scrollRef.current?.scrollTo({ x: snapped, animated: true });
      }
    }, 150);
  };

  const onScrollViewLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w === viewportW) return;
    setViewportW(w);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: nowIndex * CELL_W, animated: false }));
  };

  const sidePadding = Math.max(0, viewportW / 2 - CELL_W / 2);
  const active = hours[Math.min(activeIndex, hours.length - 1)] ?? hours[0];

  return (
    <View className="px-4 pb-4">
      <View className="rounded-2xl border border-line-soft bg-surface p-3" style={shadows.soft}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={detailed ? "Collapse weather details" : "Expand weather details"}
          className="mb-2 flex-row items-baseline justify-between px-1 active:opacity-70"
        >
          <Text className="text-[11px] font-bold tracking-widest text-accent">{active.dayLabel.toUpperCase()}</Text>
          <Text className="text-[11px] font-semibold text-ink-soft">{active.hour}:00</Text>
        </Pressable>
        <View className="flex-row">
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            style={{ width: KEY_W }}
            className="border-r border-line-soft pr-2 active:opacity-70"
          >
            <KeyRow height={HOUR_ROW_H} label="HR" muted />
            <KeyRow height={ICON_ROW_H} label="" />
            <KeyRow height={DATA_ROW_H} label="WIND (kt)" />
            <KeyRow height={DATA_ROW_H} label="GUSTS (kt)" />
            <KeyRow height={DATA_ROW_H} label="SPREAD" />
            {detailed ? MODEL_LABELS.map((m) => <KeyRowIcon key={m} height={DATA_ROW_H} label={m} />) : null}
            {detailed ? <KeyRow height={DATA_ROW_H} label="CONF." iconKind="conf" /> : null}
            {showTide ? <KeyRow height={TIDE_ROW_H} label="TIDE (m)" /> : null}
          </Pressable>
          <View className="flex-1 overflow-hidden relative" onLayout={onScrollViewLayout}>
            {viewportW > 0 ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: viewportW / 2 - CELL_W / 2,
                  top: 0,
                  width: CELL_W,
                  height: HOUR_ROW_H + ICON_ROW_H + DATA_ROW_H * (3 + (detailed ? MODEL_LABELS.length + 1 : 0)),
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: "#0F766E",
                  backgroundColor: "rgba(15, 118, 110, 0.06)",
                  zIndex: 1,
                }}
              />
            ) : null}
            {viewportW > 0 && showTide ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: viewportW / 2 - 1,
                  top: HOUR_ROW_H + ICON_ROW_H + DATA_ROW_H * (3 + MODEL_LABELS.length + 1),
                  width: 2,
                  height: tide.yAtX(scrollX + CELL_W / 2),
                  backgroundColor: "#0F766E",
                  opacity: 0.55,
                  zIndex: 1,
                }}
              />
            ) : null}
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CELL_W}
              snapToAlignment="start"
              disableIntervalMomentum
              decelerationRate="fast"
              onScroll={onScroll}
              scrollEventThrottle={1}
              contentContainerStyle={{ paddingHorizontal: sidePadding }}
            >
              <View>
                <RowBand height={HOUR_ROW_H}>
                  {hours.map((h, i) => (
                    <HourCell
                      key={i}
                      value={h.hour}
                      active={i === activeIndex}
                      dayStart={h.isDayStart && i > 0}
                      onPress={onToggle}
                    />
                  ))}
                </RowBand>
                <RowBand height={ICON_ROW_H}>
                  {hours.map((h, i) => (
                    <IconCell
                      key={i}
                      value={h.icon}
                      active={i === activeIndex}
                      dayStart={h.isDayStart && i > 0}
                      onPress={onToggle}
                    />
                  ))}
                </RowBand>
                <RowBand height={DATA_ROW_H} bordered>
                  {hours.map((h, i) => (
                    <WindCell
                      key={i}
                      value={h.wind}
                      active={i === activeIndex}
                      dayStart={h.isDayStart && i > 0}
                      onPress={onToggle}
                    />
                  ))}
                </RowBand>
                <RowBand height={DATA_ROW_H} bordered>
                  {hours.map((h, i) => (
                    <GustCell
                      key={i}
                      value={h.gust}
                      active={i === activeIndex}
                      dayStart={h.isDayStart && i > 0}
                      onPress={onToggle}
                    />
                  ))}
                </RowBand>
                <RowBand height={DATA_ROW_H} bordered>
                  {hours.map((h, i) => (
                    <SpreadCell
                      key={i}
                      value={h.spread}
                      active={i === activeIndex}
                      dayStart={h.isDayStart && i > 0}
                      onPress={onToggle}
                    />
                  ))}
                </RowBand>

                {detailed ? (
                  <FadeIn duration={220} translateY={6}>
                    <View>
                      {MODEL_LABELS.map((m, mi) => (
                        <RowBand key={m} height={DATA_ROW_H} bordered>
                          {hours.map((h, i) => (
                            <ModelCell
                              key={i}
                              value={h.models[mi] ?? h.models[0]}
                              active={i === activeIndex}
                              dayStart={h.isDayStart && i > 0}
                              onPress={onToggle}
                            />
                          ))}
                        </RowBand>
                      ))}
                      <RowBand height={DATA_ROW_H} bordered>
                        {hours.map((h, i) => (
                          <ConfCell
                            key={i}
                            value={h.conf}
                            active={i === activeIndex}
                            dayStart={h.isDayStart && i > 0}
                            onPress={onToggle}
                          />
                        ))}
                      </RowBand>

                      {showTide ? (
                        <View
                          style={{ width: tide.contentW, height: TIDE_ROW_H }}
                          className="border-t border-line-soft"
                        >
                          <Svg width={tide.contentW} height={TIDE_ROW_H}>
                            <Path d={tide.fill} fill="#EFF6FF" />
                            <Path d={tide.path} stroke="#3B82F6" strokeWidth={2} fill="none" />
                          </Svg>
                        </View>
                      ) : null}
                    </View>
                  </FadeIn>
                ) : null}
              </View>
            </ScrollView>
            {viewportW > 0 && showTide ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: viewportW / 2 - 8,
                  top:
                    HOUR_ROW_H +
                    ICON_ROW_H +
                    DATA_ROW_H * (3 + MODEL_LABELS.length + 1) +
                    tide.yAtX(scrollX + CELL_W / 2) -
                    8,
                  zIndex: 2,
                }}
              >
                <Svg width={16} height={16}>
                  <Circle cx={8} cy={8} r={6} fill="#FFFFFF" stroke="#0F766E" strokeWidth={2} />
                </Svg>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          className="mt-2 flex-row items-center justify-center gap-1 active:opacity-70"
        >
          {detailed ? <ChevronUp size={12} color="#94A3B8" /> : null}
          <Text className="text-[10px] font-semibold text-ink-faint">
            {detailed ? "Tap to collapse" : "Tap to expand model view"}
          </Text>
          {!detailed ? <ChevronDown size={12} color="#94A3B8" /> : null}
        </Pressable>
      </View>
    </View>
  );
}

function RowBand({ height, bordered, children }: { height: number; bordered?: boolean; children: ReactNode }) {
  return (
    <View style={{ height }} className={`flex-row items-center ${bordered ? "border-t border-line-soft" : ""}`}>
      {children}
    </View>
  );
}

function CellShell({
  active: _active,
  dayStart,
  onPress,
  children,
}: {
  active: boolean;
  dayStart?: boolean;
  onPress?: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: CELL_W,
        borderLeftWidth: dayStart ? 2 : 0,
        borderLeftColor: "#7CB3B5",
      }}
      className="items-center justify-center"
    >
      {children}
    </Pressable>
  );
}

type CellProps<V> = {
  value: V;
  active: boolean;
  dayStart?: boolean;
  onPress?: () => void;
};

const HourCell = memo(function HourCell({ value, active, dayStart, onPress }: CellProps<string>) {
  return (
    <CellShell active={active} dayStart={dayStart} onPress={onPress}>
      <Text className={`text-[11px] ${active ? "font-bold text-accent" : "font-medium text-ink-soft"}`}>{value}</Text>
    </CellShell>
  );
});

const IconCell = memo(function IconCell({ value, active, dayStart, onPress }: CellProps<IconKind>) {
  return (
    <CellShell active={active} dayStart={dayStart} onPress={onPress}>
      <WeatherIcon icon={value} size={active ? 22 : 18} />
    </CellShell>
  );
});

const WindCell = memo(function WindCell({ value, active, dayStart, onPress }: CellProps<number>) {
  return (
    <CellShell active={active} dayStart={dayStart} onPress={onPress}>
      <Text className={`text-[13px] font-bold ${active ? "text-accent" : "text-ink"}`}>{value}</Text>
    </CellShell>
  );
});

const GustCell = memo(function GustCell({ value, active, dayStart, onPress }: CellProps<number>) {
  return (
    <CellShell active={active} dayStart={dayStart} onPress={onPress}>
      <Text className={`text-[13px] font-bold ${active ? "text-warn" : "text-ink-soft"}`}>{value}</Text>
    </CellShell>
  );
});

const SpreadCell = memo(function SpreadCell({ value, active, dayStart, onPress }: CellProps<number>) {
  return (
    <CellShell active={active} dayStart={dayStart} onPress={onPress}>
      <Text className={`text-[13px] font-bold ${active ? "text-info" : "text-ink-soft"}`}>{value}</Text>
    </CellShell>
  );
});

const ModelCell = memo(function ModelCell({ value, active, dayStart, onPress }: CellProps<[number, number]>) {
  return (
    <CellShell active={active} dayStart={dayStart} onPress={onPress}>
      <Text className={`text-[12px] font-bold ${active ? "text-ink" : "text-ink-soft"}`}>{value[0]}</Text>
      <Text className={`text-[9px] ${active ? "text-ink-soft" : "text-ink-faint"}`}>{value[1]}</Text>
    </CellShell>
  );
});

const ConfCell = memo(function ConfCell({ value, active, dayStart, onPress }: CellProps<number>) {
  return (
    <CellShell active={active} dayStart={dayStart} onPress={onPress}>
      {active ? (
        <View className="rounded-md bg-accent px-1.5 py-0.5">
          <Text className="text-[10px] font-bold text-white">{value}%</Text>
        </View>
      ) : (
        <Text className="text-[11px] font-semibold text-ink-soft">{value}%</Text>
      )}
    </CellShell>
  );
});

function KeyRow({
  height,
  label,
  muted,
  iconKind,
}: {
  height: number;
  label: string;
  muted?: boolean;
  iconKind?: "conf";
}) {
  return (
    <View
      style={{ height }}
      className={`flex-row items-center ${height === HOUR_ROW_H ? "" : "border-t border-line-soft"}`}
    >
      {iconKind === "conf" ? <ShieldCheck size={12} color="#3B82F6" /> : null}
      <Text
        className={`${iconKind === "conf" ? "ml-1" : ""} text-[10px] font-bold tracking-wider ${muted ? "text-ink-faint" : "text-ink"}`}
      >
        {label}
      </Text>
    </View>
  );
}

function KeyRowIcon({ height, label }: { height: number; label: string }) {
  const Icon = label === "model1" ? Shield : Sparkles;
  return (
    <View style={{ height }} className="flex-row items-center border-t border-line-soft">
      <Icon size={12} color="#1E3A8A" />
      <Text className="ml-1 text-[10px] font-semibold text-ink-soft">{label}</Text>
    </View>
  );
}

function MetricGrid({
  forecast,
  onOpenWindBeach,
  onOpenSafety,
  onOpenFooterInfo,
}: {
  forecast: ForecastData;
  onOpenWindBeach: () => void;
  onOpenSafety: () => void;
  onOpenFooterInfo: (key: "temp" | "uv" | "tide") => void;
}) {
  const { windBeach, safety, temp, uv, tide } = forecast.cards;
  const SafetyIcon = safety.overallAccent === "good" ? CheckCircle2 : AlertTriangle;
  const rising = tide.state === "Rising";
  const TideIcon = tide.state === "Falling" ? TrendingDown : TrendingUp;

  return (
    <View className="px-4">
      <View className="flex-row flex-wrap gap-3">
        <FadeIn duration={280} delay={80} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={onOpenWindBeach} label="Wind vs beach detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">WIND VS BEACH</Text>
            <Text className={`mt-1 text-[12px] font-bold ${ACCENT_TEXT[windBeach.orientationAccent]}`}>
              {windBeach.orientation}
            </Text>
            <View className="mt-2 flex-row items-baseline">
              <Text className="text-[28px] font-bold leading-[30px] text-ink">{windBeach.windKt}</Text>
              <Text className="text-[14px] text-ink-soft"> kt</Text>
              <ArrowUpRight size={18} color="#0EA5E9" style={{ marginLeft: 8 }} />
            </View>
            <Text className="mt-0.5 text-[10px] font-medium text-ink-soft">{windBeach.directionLabel}</Text>
            <View className="mt-auto overflow-hidden rounded-lg">
              <BeachWindGraphic />
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={220} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={onOpenSafety} label="Safety detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">SAFETY</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <SafetyIcon
                size={21}
                color={ACCENT_HEX[safety.overallAccent]}
                fill={safety.overallAccent === "good" ? ACCENT_HEX.good : "transparent"}
                stroke={safety.overallAccent === "good" ? "#FFFFFF" : ACCENT_HEX[safety.overallAccent]}
              />
              <Text className={`text-[16px] font-bold ${ACCENT_TEXT[safety.overallAccent]}`}>{safety.overall}</Text>
            </View>
            <Text className="mt-1 text-[12px] text-ink-soft">UV {safety.uvLabel}</Text>
            <View className="mt-auto flex-row items-end justify-between">
              <View>
                <Text className="text-[8px] font-bold text-ink-soft">SUNSET</Text>
                <Text className="text-[12px] font-semibold text-ink">{safety.sunsetLabel}</Text>
              </View>
              <Sun size={26} color="#FBBF24" fill="#FBBF24" />
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={290} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => onOpenFooterInfo("temp")} label="Temperature detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">TEMPERATURE</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <Sun size={22} color="#FBBF24" fill="#FBBF24" />
              <Text className="text-[26px] font-bold text-ink">{temp.current}</Text>
              <Text className="text-[14px] text-ink-soft">°C</Text>
            </View>
            <Text className="text-[10px] text-ink-soft">{temp.feelsLabel}</Text>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">{temp.waterHumidLabel}</Text>
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={360} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => onOpenFooterInfo("uv")} label="UV index detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">UV INDEX</Text>
            <View className="mt-2 flex-row items-baseline">
              <Text className="text-[28px] font-bold text-ink">{uv.value}</Text>
              <Text className={`ml-1 text-[14px] font-semibold ${ACCENT_TEXT[uv.descriptorAccent]}`}>
                {uv.descriptor}
              </Text>
            </View>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">{uv.peakLabel}</Text>
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={430} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => onOpenFooterInfo("tide")} label="Tide detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">TIDE</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <TideIcon size={20} color={rising ? "#3B82F6" : "#64748B"} />
              <Text className="text-[20px] font-bold text-ink">{tide.state}</Text>
            </View>
            <Text className="text-[10px] text-ink-soft">{tide.nowLabel}</Text>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">{tide.nextHighLabel}</Text>
            </View>
          </MetricCard>
        </FadeIn>
      </View>
    </View>
  );
}

function MetricCard({ children, onPress, label }: { children: ReactNode; onPress?: () => void; label?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label}
      className="h-36 rounded-2xl border border-line-soft bg-white p-3 active:opacity-90"
      style={shadows.soft}
    >
      {children}
    </Pressable>
  );
}

function WeatherIcon({ icon, size }: { icon: IconKind; size: number }) {
  if (icon === "cloud-sun") return <CloudSun size={size} color="#FBBF24" strokeWidth={1.8} />;
  if (icon === "wind") return <Wind size={size} color="#94A3B8" strokeWidth={1.8} />;
  return <Sun size={size} color="#FBBF24" fill="#FBBF24" strokeWidth={1.8} />;
}
