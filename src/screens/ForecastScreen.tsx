import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
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
  Wind,
} from "lucide-react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { BeachMap } from "../components/BeachMap";
import { BeachWindGraphic } from "../components/Graphs";
import { SailabilityMeter } from "../components/SailabilityMeter";
import { FadeIn } from "../components/Transitions";
import type { InfoDetail } from "./InfoDetailSheet";
import type { BeachLocation, ForecastBundle, ForecastHour, ForecastStatus, WindUnit } from "../domain/models";
import { displayWindValue, formatNumber, formatWind, knotsToUnit } from "../services/format";
import {
  angleDifference,
  sailabilityFromWind,
  windBeachOrientation,
  windComponents,
} from "../services/forecastMath";
import { shadows } from "../styles/shadows";

type Props = {
  mode: "summary" | "detailed";
  location: BeachLocation;
  forecast: ForecastBundle | null;
  status: ForecastStatus;
  error: string | null;
  stale: boolean;
  windUnit: WindUnit;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onOpenSettings: () => void;
  onOpenLocations: () => void;
  onChangeMode: (mode: "summary" | "detailed") => void;
  onOpenDetail: (detail: InfoDetail) => void;
};

const MODEL_LABELS = ["ECMWF", "GFS", "ICON"];
const CELL_W = 46;
const KEY_W = 60;
const HOUR_ROW_H = 22;
const ICON_ROW_H = 28;
const DATA_ROW_H = 26;
const TIDE_ROW_H = 70;
const TIDE_PAD_Y = 10;

export { sailabilityFromWind };

export function ForecastScreen({
  mode,
  location,
  forecast,
  status,
  error,
  stale,
  windUnit,
  isFavorite,
  onToggleFavorite,
  onShare,
  onOpenSettings,
  onOpenLocations,
  onChangeMode,
  onOpenDetail,
}: Props) {
  const detailed = mode === "detailed";
  const hours = forecast?.hours ?? [];
  const initialIndex = forecast?.currentIndex ?? 0;
  const [viewingIndex, setViewingIndex] = useState(initialIndex);

  useEffect(() => {
    setViewingIndex(forecast?.currentIndex ?? 0);
  }, [forecast?.locationId, forecast?.currentIndex]);

  const active = hours[Math.max(0, Math.min(hours.length - 1, viewingIndex))] ?? forecast?.current ?? null;
  const sailability = active ? sailabilityFromWind(active.wind) : 0;
  const swellText = active?.swellHeightM != null ? `${active.swellHeightM.toFixed(1)} m` : "--";

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
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="relative px-4 pb-2 pt-2">
          <View className="flex-row items-center justify-center gap-3">
            <BeachMap
              size={236}
              lat={location.lat}
              lon={location.lon}
              wind={displayWindValue(active?.wind, windUnit)}
              windDir={active?.windDir ?? 0}
              windDirLabel={active?.windDirLabel ?? "--"}
              swell={swellText}
              unit={windUnit}
            />
            <SailabilityMeter compact rating={sailability} />
          </View>
          <DataStatus status={status} error={error} stale={stale} fetchedAt={forecast?.fetchedAt} />
        </View>

        <WeatherWidget
          key={location.id}
          detailed={detailed}
          hours={hours}
          windUnit={windUnit}
          initialIndex={initialIndex}
          onActiveIndexChange={setViewingIndex}
          onChangeMode={onChangeMode}
        />

        <MetricGrid
          location={location}
          active={active}
          forecast={forecast}
          windUnit={windUnit}
          onOpenDetail={onOpenDetail}
        />
      </ScrollView>
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

function DataStatus({
  status,
  error,
  stale,
  fetchedAt,
}: {
  status: ForecastStatus;
  error: string | null;
  stale: boolean;
  fetchedAt?: string;
}) {
  if (status === "ready" && !stale) return null;
  const text =
    status === "loading"
      ? "Loading forecast data"
      : status === "refreshing"
        ? "Refreshing forecast data"
        : error
          ? stale
            ? `Showing cached data · ${error}`
            : error
          : stale
            ? `Showing cached data from ${new Date(fetchedAt ?? "").toLocaleString()}`
            : null;
  if (!text) return null;
  return (
    <View className="mt-2 rounded-xl border border-line-soft bg-surface px-3 py-2">
      <Text className="text-center text-[12px] font-medium text-ink-soft">{text}</Text>
    </View>
  );
}

const WeatherWidget = memo(function WeatherWidget({
  detailed,
  hours,
  windUnit,
  initialIndex,
  onChangeMode,
  onActiveIndexChange,
}: {
  detailed: boolean;
  hours: ForecastHour[];
  windUnit: WindUnit;
  initialIndex: number;
  onChangeMode: (mode: "summary" | "detailed") => void;
  onActiveIndexChange: (idx: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportW, setViewportW] = useState(0);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [scrollX, setScrollX] = useState(initialIndex * CELL_W);
  const active = hours[Math.max(0, Math.min(hours.length - 1, activeIndex))];

  const onToggle = useCallback(() => {
    onChangeMode(detailed ? "summary" : "detailed");
  }, [detailed, onChangeMode]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (viewportW <= 0 || hours.length === 0) return;
    const x = e.nativeEvent.contentOffset.x;
    setScrollX(x);
    const idx = Math.round(x / CELL_W);
    const clamped = Math.max(0, Math.min(hours.length - 1, idx));
    if (clamped !== activeIndex) {
      setActiveIndex(clamped);
      onActiveIndexChange(clamped);
    }
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
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: initialIndex * CELL_W, animated: false }));
  };

  const sidePadding = Math.max(0, viewportW / 2 - CELL_W / 2);
  const tideGraph = useMemo(() => buildTideGraph(hours), [hours]);

  return (
    <View className="px-4 pb-4">
      <View className="rounded-2xl border border-line-soft bg-surface p-3" style={shadows.soft}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={detailed ? "Collapse weather details" : "Expand weather details"}
          className="mb-2 flex-row items-baseline justify-between px-1 active:opacity-70"
        >
          <Text className="text-[11px] font-bold tracking-widest text-accent">
            {(active?.dayLabel ?? "Forecast").toUpperCase()}
          </Text>
          <Text className="text-[11px] font-semibold text-ink-soft">{active ? `${active.hour}:00` : "--"}</Text>
        </Pressable>
        {hours.length === 0 ? (
          <View className="items-center py-8">
            <Text className="text-[14px] font-medium text-ink-soft">Forecast data is not available yet.</Text>
          </View>
        ) : (
          <View className="flex-row">
            <Pressable
              onPress={onToggle}
              accessibilityRole="button"
              style={{ width: KEY_W }}
              className="border-r border-line-soft pr-1 active:opacity-70"
            >
              <KeyRow height={HOUR_ROW_H} label="HR" muted />
              <KeyRow height={ICON_ROW_H} label="" />
              <KeyRow height={DATA_ROW_H} label={`WIND (${windUnit})`} />
              <KeyRow height={DATA_ROW_H} label={`GUSTS (${windUnit})`} />
              <KeyRow height={DATA_ROW_H} label="SPREAD" />
              {detailed ? MODEL_LABELS.map((m) => <KeyRowIcon key={m} height={DATA_ROW_H} label={m} />) : null}
              {detailed ? <KeyRow height={DATA_ROW_H} label="CONF." iconKind="conf" /> : null}
              {detailed ? <KeyRow height={TIDE_ROW_H} label="TIDE (m)" /> : null}
            </Pressable>
            <View className="relative flex-1 overflow-hidden" onLayout={onScrollViewLayout}>
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
              {viewportW > 0 && detailed && tideGraph.path ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: viewportW / 2 - 1,
                    top: HOUR_ROW_H + ICON_ROW_H + DATA_ROW_H * (3 + MODEL_LABELS.length + 1),
                    width: 2,
                    height: tideGraph.yAtX(scrollX + CELL_W / 2),
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
                    {hours.map((hour, i) => (
                      <HourCell key={hour.time} value={hour.hour} active={i === activeIndex} dayStart={hour.isDayStart && i > 0} />
                    ))}
                  </RowBand>
                  <RowBand height={ICON_ROW_H}>
                    {hours.map((hour, i) => (
                      <IconCell key={hour.time} value={hour.icon} active={i === activeIndex} dayStart={hour.isDayStart && i > 0} />
                    ))}
                  </RowBand>
                  <RowBand height={DATA_ROW_H} bordered>
                    {hours.map((hour, i) => (
                      <WindCell key={hour.time} value={knotsToUnit(hour.wind, windUnit)} active={i === activeIndex} dayStart={hour.isDayStart && i > 0} />
                    ))}
                  </RowBand>
                  <RowBand height={DATA_ROW_H} bordered>
                    {hours.map((hour, i) => (
                      <GustCell key={hour.time} value={knotsToUnit(hour.gust, windUnit)} active={i === activeIndex} dayStart={hour.isDayStart && i > 0} />
                    ))}
                  </RowBand>
                  <RowBand height={DATA_ROW_H} bordered>
                    {hours.map((hour, i) => (
                      <SpreadCell key={hour.time} value={knotsToUnit(hour.spread, windUnit)} active={i === activeIndex} dayStart={hour.isDayStart && i > 0} />
                    ))}
                  </RowBand>

                  {detailed ? (
                    <FadeIn duration={220} translateY={6}>
                      <View>
                        {MODEL_LABELS.map((m, mi) => (
                          <RowBand key={m} height={DATA_ROW_H} bordered>
                            {hours.map((hour, i) => (
                              <ModelCell
                                key={hour.time}
                                value={[knotsToUnit(hour.models[mi]?.[0] ?? hour.wind, windUnit), knotsToUnit(hour.models[mi]?.[1] ?? hour.gust, windUnit)]}
                                active={i === activeIndex}
                                dayStart={hour.isDayStart && i > 0}
                              />
                            ))}
                          </RowBand>
                        ))}
                        <RowBand height={DATA_ROW_H} bordered>
                          {hours.map((hour, i) => (
                            <ConfCell key={hour.time} value={hour.conf} active={i === activeIndex} dayStart={hour.isDayStart && i > 0} />
                          ))}
                        </RowBand>
                        <View style={{ width: tideGraph.width, height: TIDE_ROW_H }} className="border-t border-line-soft">
                          {tideGraph.path ? (
                            <Svg width={tideGraph.width} height={TIDE_ROW_H}>
                              <Path d={tideGraph.fillPath} fill="#EFF6FF" />
                              <Path d={tideGraph.path} stroke="#3B82F6" strokeWidth={2} fill="none" />
                            </Svg>
                          ) : null}
                        </View>
                      </View>
                    </FadeIn>
                  ) : null}
                </View>
              </ScrollView>
              {viewportW > 0 && detailed && tideGraph.path ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: viewportW / 2 - 8,
                    top:
                      HOUR_ROW_H +
                      ICON_ROW_H +
                      DATA_ROW_H * (3 + MODEL_LABELS.length + 1) +
                      tideGraph.yAtX(scrollX + CELL_W / 2) -
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
        )}

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
});

function buildTideGraph(hours: ForecastHour[]) {
  const values = hours.map((hour) => hour.tide).filter((value): value is number => value != null);
  const width = Math.max(CELL_W, hours.length * CELL_W);
  if (values.length < 2) {
    return { width, path: "", fillPath: "", yFor: () => TIDE_ROW_H / 2, yAtX: () => TIDE_ROW_H / 2 };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.1, max - min);
  const yFor = (value: number | null | undefined) => {
    if (value == null) return TIDE_ROW_H / 2;
    const t = (value - min) / range;
    const usable = TIDE_ROW_H - TIDE_PAD_Y * 2;
    return TIDE_PAD_Y + (1 - t) * usable;
  };
  let path = "";
  hours.forEach((hour, index) => {
    const x = index * CELL_W + CELL_W / 2;
    const y = yFor(hour.tide);
    if (index === 0) path += `M ${x} ${y}`;
    else {
      const prevX = (index - 1) * CELL_W + CELL_W / 2;
      const prevY = yFor(hours[index - 1].tide);
      path += ` C ${prevX + CELL_W * 0.5} ${prevY} ${x - CELL_W * 0.5} ${y} ${x} ${y}`;
    }
  });
  const fillPath = `${path} L ${(hours.length - 1) * CELL_W + CELL_W / 2} ${TIDE_ROW_H} L ${CELL_W / 2} ${TIDE_ROW_H} Z`;
  const yAtX = (px: number) => {
    if (hours.length < 2) return TIDE_ROW_H / 2;
    const frac = (px - CELL_W / 2) / CELL_W;
    const i = Math.max(0, Math.min(hours.length - 2, Math.floor(frac)));
    const t = Math.max(0, Math.min(1, frac - i));
    const p0y = yFor(hours[i].tide);
    const p3y = yFor(hours[i + 1].tide);
    const mt = 1 - t;
    return mt * mt * mt * p0y + 3 * mt * mt * t * p0y + 3 * mt * t * t * p3y + t * t * t * p3y;
  };
  return { width, path, fillPath, yFor, yAtX };
}

function RowBand({ height, bordered, children }: { height: number; bordered?: boolean; children: ReactNode }) {
  return <View style={{ height }} className={`flex-row items-center ${bordered ? "border-t border-line-soft" : ""}`}>{children}</View>;
}

function CellShell({ dayStart, children }: { dayStart?: boolean; children: ReactNode }) {
  return (
    <View
      style={{ width: CELL_W, borderLeftWidth: dayStart ? 2 : 0, borderLeftColor: "#7CB3B5" }}
      className="items-center justify-center"
    >
      {children}
    </View>
  );
}

type CellProps<V> = {
  value: V;
  active: boolean;
  dayStart?: boolean;
};

const HourCell = memo(function HourCell({ value, active, dayStart }: CellProps<string>) {
  return (
    <CellShell dayStart={dayStart}>
      <Text className={`text-[11px] ${active ? "font-bold text-accent" : "font-medium text-ink-soft"}`}>{value}</Text>
    </CellShell>
  );
});

const IconCell = memo(function IconCell({ value, active, dayStart }: CellProps<ForecastHour["icon"]>) {
  return (
    <CellShell dayStart={dayStart}>
      <WeatherIcon icon={value} size={active ? 22 : 18} />
    </CellShell>
  );
});

const WindCell = memo(function WindCell({ value, active, dayStart }: CellProps<number>) {
  return (
    <CellShell dayStart={dayStart}>
      <Text className={`text-[13px] font-bold ${active ? "text-accent" : "text-ink"}`}>{Math.round(value)}</Text>
    </CellShell>
  );
});

const GustCell = memo(function GustCell({ value, active, dayStart }: CellProps<number>) {
  return (
    <CellShell dayStart={dayStart}>
      <Text className={`text-[13px] font-bold ${active ? "text-warn" : "text-ink-soft"}`}>{Math.round(value)}</Text>
    </CellShell>
  );
});

const SpreadCell = memo(function SpreadCell({ value, active, dayStart }: CellProps<number>) {
  return (
    <CellShell dayStart={dayStart}>
      <Text className={`text-[13px] font-bold ${active ? "text-info" : "text-ink-soft"}`}>{Math.round(value)}</Text>
    </CellShell>
  );
});

const ModelCell = memo(function ModelCell({ value, active, dayStart }: CellProps<[number, number]>) {
  return (
    <CellShell dayStart={dayStart}>
      <Text className={`text-[12px] font-bold ${active ? "text-ink" : "text-ink-soft"}`}>{Math.round(value[0])}</Text>
      <Text className={`text-[9px] ${active ? "text-ink-soft" : "text-ink-faint"}`}>{Math.round(value[1])}</Text>
    </CellShell>
  );
});

const ConfCell = memo(function ConfCell({ value, active, dayStart }: CellProps<number>) {
  return (
    <CellShell dayStart={dayStart}>
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

function KeyRow({ height, label, muted, iconKind }: { height: number; label: string; muted?: boolean; iconKind?: "conf" }) {
  return (
    <View style={{ height }} className={`flex-row items-center ${height === HOUR_ROW_H ? "" : "border-t border-line-soft"}`}>
      {iconKind === "conf" ? <ShieldCheck size={12} color="#3B82F6" /> : null}
      <Text className={`${iconKind === "conf" ? "ml-1" : ""} text-[10px] font-bold ${muted ? "text-ink-faint" : "text-ink"}`}>
        {label}
      </Text>
    </View>
  );
}

function KeyRowIcon({ height, label }: { height: number; label: string }) {
  const Icon = label === "ECMWF" ? Shield : Sparkles;
  return (
    <View style={{ height }} className="flex-row items-center border-t border-line-soft">
      <Icon size={12} color="#1E3A8A" />
      <Text className="ml-1 text-[10px] font-semibold text-ink-soft">{label}</Text>
    </View>
  );
}

function MetricGrid({
  location,
  active,
  forecast,
  windUnit,
  onOpenDetail,
}: {
  location: BeachLocation;
  active: ForecastHour | null;
  forecast: ForecastBundle | null;
  windUnit: WindUnit;
  onOpenDetail: (detail: InfoDetail) => void;
}) {
  const orientation = active ? windBeachOrientation(active.windDir, location.normal) : "--";
  const safety = safetySummary(active);
  const nextTide = forecast?.tides.find((tide) => active && tide.time > active.time);

  return (
    <View className="px-4">
      <View className="flex-row flex-wrap gap-3">
        <FadeIn duration={280} delay={80} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => active && onOpenDetail(windBeachDetail(location, active, windUnit))} label="Wind vs beach detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">WIND VS BEACH</Text>
            <Text className="mt-1 text-[12px] font-bold text-sky">{orientation}</Text>
            <View className="mt-2 flex-row items-baseline">
              <Text className="text-[28px] font-bold leading-[30px] text-ink">{displayWindValue(active?.wind, windUnit)}</Text>
              <Text className="text-[14px] text-ink-soft"> {windUnit}</Text>
              <ArrowUpRight size={18} color="#0EA5E9" style={{ marginLeft: 8 }} />
            </View>
            <Text className="mt-0.5 text-[10px] font-medium text-ink-soft">
              {active ? `${active.windDirLabel} (${Math.round(active.windDir)} deg)` : "--"}
            </Text>
            <View className="mt-auto overflow-hidden rounded-lg">
              <BeachWindGraphic />
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={220} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => active && onOpenDetail(safetyDetail(active))} label="Safety detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">CONDITIONS</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <CheckCircle2 size={21} color={safety.color} fill={safety.color} stroke="#FFFFFF" />
              <Text className={`text-[16px] font-bold ${safety.className}`}>{safety.label}</Text>
            </View>
            <Text className="mt-1 text-[12px] text-ink-soft">{safety.reason}</Text>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">
                Gusts {formatWind(active?.gust, windUnit)} · Swell {formatNumber(active?.swellHeightM, "m", 1)}
              </Text>
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={290} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => active && onOpenDetail(temperatureDetail(active))} label="Temperature detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">TEMPERATURE</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <Sun size={22} color="#FBBF24" fill="#FBBF24" />
              <Text className="text-[26px] font-bold text-ink">{active?.temperatureC != null ? Math.round(active.temperatureC) : "--"}</Text>
              <Text className="text-[14px] text-ink-soft">C</Text>
            </View>
            <Text className="text-[10px] text-ink-soft">
              Feels {formatNumber(active?.apparentTemperatureC, "C", 0)} · Humidity {formatNumber(active?.humidityPct, "%", 0)}
            </Text>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">Wave {formatNumber(active?.waveHeightM, "m", 1)}</Text>
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={360} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => active && onOpenDetail(uvDetail(active))} label="UV index detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">UV INDEX</Text>
            <View className="mt-2 flex-row items-baseline">
              <Text className="text-[28px] font-bold text-ink">{active?.uvIndex ?? "--"}</Text>
              <Text className="ml-1 text-[14px] font-semibold text-warn">{uvLabel(active?.uvIndex)}</Text>
            </View>
            <Text className="text-[10px] text-ink-soft">{active ? `${active.dayLabel} · ${active.hour}:00` : "--"}</Text>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">{uvGuidance(active?.uvIndex)}</Text>
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={430} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => active && onOpenDetail(tideDetail(active, forecast))} label="Tide detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">TIDE</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <TrendingUp size={20} color="#3B82F6" />
              <Text className="text-[20px] font-bold text-ink">{tideTrend(active, forecast)}</Text>
            </View>
            <Text className="text-[10px] text-ink-soft">Now {formatNumber(active?.tide, "m", 1)}</Text>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">
                {nextTide ? `Next ${nextTide.type} ${nextTide.heightM} m · ${nextTide.time.slice(11, 16)}` : "No tide extrema in range"}
              </Text>
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
      className="min-h-[168px] overflow-hidden rounded-2xl border border-line-soft bg-white p-3 active:opacity-90"
      style={shadows.soft}
    >
      {children}
    </Pressable>
  );
}

function WeatherIcon({ icon, size }: { icon: ForecastHour["icon"]; size: number }) {
  if (icon === "cloud-sun") return <CloudSun size={size} color="#FBBF24" strokeWidth={1.8} />;
  if (icon === "wind") return <Wind size={size} color="#94A3B8" strokeWidth={1.8} />;
  return <Sun size={size} color="#FBBF24" fill="#FBBF24" strokeWidth={1.8} />;
}

function mapDetail(location: BeachLocation, hour: ForecastHour, windUnit: WindUnit): InfoDetail {
  return {
    key: "map",
    title: "Wind & swell conditions",
    subtitle: `${location.name} · ${hour.dayLabel} ${hour.hour}:00`,
    rows: [
      { label: "Wind speed", value: formatWind(hour.wind, windUnit) },
      { label: "Gusts", value: formatWind(hour.gust, windUnit), accent: hour.gust >= 25 ? "warn" : "default" },
      { label: "Direction", value: `${hour.windDirLabel} (${Math.round(hour.windDir)} deg)` },
      { label: "Wave height", value: formatNumber(hour.waveHeightM, "m", 1) },
      { label: "Swell height", value: formatNumber(hour.swellHeightM, "m", 1) },
      { label: "Swell direction", value: hour.swellDirection == null ? "--" : `${Math.round(hour.swellDirection)} deg` },
      { label: "Swell period", value: formatNumber(hour.swellPeriodS, "s", 1) },
    ],
  };
}

function windBeachDetail(location: BeachLocation, hour: ForecastHour, windUnit: WindUnit): InfoDetail {
  const orientation = windBeachOrientation(hour.windDir, location.normal);
  const components = windComponents(hour.wind, hour.windDir, location.normal);
  return {
    key: "windBeach",
    title: "Wind vs beach",
    subtitle: "How the wind sits relative to the shore",
    rows: [
      { label: "Orientation", value: orientation, accent: orientation === "OFFSHORE" ? "bad" : orientation === "CROSS-SHORE" ? "warn" : "good" },
      { label: "Angle to beach", value: `${Math.round(angleDifference(hour.windDir, location.normal))} deg` },
      { label: "Beach normal", value: `${Math.round(location.normal)} deg` },
      { label: "Wind speed", value: formatWind(hour.wind, windUnit) },
      { label: "Direction", value: `${hour.windDirLabel} (${Math.round(hour.windDir)} deg)` },
      { label: "Cross-shore component", value: formatWind(Math.abs(components.crossShoreKt), windUnit) },
      { label: "On/offshore component", value: formatWind(components.onshoreKt, windUnit) },
    ],
  };
}

function safetySummary(hour: ForecastHour | null) {
  if (!hour) return { label: "--", reason: "Waiting for forecast data", color: "#94A3B8", className: "text-ink-soft" };
  if (hour.gust >= 35 || (hour.swellHeightM ?? 0) >= 3) {
    return { label: "HIGH", reason: "Strong gusts or large swell", color: "#EF4444", className: "text-bad" };
  }
  if (hour.gust >= 25 || (hour.swellHeightM ?? 0) >= 2) {
    return { label: "CAUTION", reason: "Elevated gusts or swell", color: "#F59E0B", className: "text-warn" };
  }
  return { label: "GOOD", reason: "Moderate wind and swell", color: "#22C55E", className: "text-good" };
}

function safetyDetail(hour: ForecastHour): InfoDetail {
  const safety = safetySummary(hour);
  return {
    key: "safety",
    title: "Condition overview",
    subtitle: "Derived from live forecast values",
    rows: [
      { label: "Overall", value: safety.label, accent: safety.label === "GOOD" ? "good" : safety.label === "CAUTION" ? "warn" : "bad" },
      { label: "Reason", value: safety.reason },
      { label: "Gusts", value: `${hour.gust} kt` },
      { label: "Swell height", value: formatNumber(hour.swellHeightM, "m", 1) },
      { label: "Wave height", value: formatNumber(hour.waveHeightM, "m", 1) },
      { label: "UV index", value: hour.uvIndex == null ? "--" : `${hour.uvIndex} · ${uvLabel(hour.uvIndex)}` },
    ],
  };
}

function temperatureDetail(hour: ForecastHour): InfoDetail {
  return {
    key: "temp",
    title: "Temperature",
    subtitle: `${hour.dayLabel} ${hour.hour}:00`,
    rows: [
      { label: "Temperature", value: formatNumber(hour.temperatureC, "C", 1) },
      { label: "Feels like", value: formatNumber(hour.apparentTemperatureC, "C", 1) },
      { label: "Humidity", value: formatNumber(hour.humidityPct, "%", 0) },
      { label: "Wave height", value: formatNumber(hour.waveHeightM, "m", 1) },
    ],
  };
}

function uvDetail(hour: ForecastHour): InfoDetail {
  return {
    key: "uv",
    title: "UV index",
    subtitle: `${hour.dayLabel} ${hour.hour}:00`,
    rows: [
      { label: "UV index", value: hour.uvIndex == null ? "--" : `${hour.uvIndex} · ${uvLabel(hour.uvIndex)}` },
      { label: "Guidance", value: uvGuidance(hour.uvIndex) },
    ],
  };
}

function tideDetail(hour: ForecastHour, forecast: ForecastBundle | null): InfoDetail {
  const next = forecast?.tides.find((tide) => tide.time > hour.time);
  return {
    key: "tide",
    title: "Tide",
    subtitle: `${hour.dayLabel} ${hour.hour}:00`,
    rows: [
      { label: "Now", value: formatNumber(hour.tide, "m", 2) },
      { label: "Trend", value: tideTrend(hour, forecast), accent: "info" },
      { label: "Next high/low", value: next ? `${next.type} · ${next.heightM} m · ${next.time.slice(11, 16)}` : "--" },
    ],
  };
}

function uvLabel(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value < 3) return "Low";
  if (value < 6) return "Moderate";
  if (value < 8) return "High";
  if (value < 11) return "Very high";
  return "Extreme";
}

function uvGuidance(value: number | null | undefined): string {
  if (value == null) return "No UV data";
  if (value < 3) return "Basic protection";
  if (value < 6) return "SPF recommended";
  return "Strong sun protection";
}

function tideTrend(hour: ForecastHour | null, forecast: ForecastBundle | null): string {
  if (!hour || !forecast) return "--";
  const index = forecast.hours.findIndex((candidate) => candidate.time === hour.time);
  const next = forecast.hours[index + 1]?.tide;
  if (hour.tide == null || next == null) return "--";
  if (next > hour.tide) return "Rising";
  if (next < hour.tide) return "Falling";
  return "Steady";
}
