import { memo, useCallback, useRef, useState, type ReactNode } from "react";
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

import { FadeIn } from "../components/Transitions";

import { BeachMap } from "../components/BeachMap";
import { BeachWindGraphic } from "../components/Graphs";
import { SailabilityMeter } from "../components/SailabilityMeter";
import { locations } from "../data/prototype";
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
  onOpenSafety: () => void;
  onOpenFooterInfo: (key: "temp" | "uv" | "tide") => void;
};

type IconKind = "sun" | "cloud-sun" | "wind";

type HourData = {
  hour: string;
  icon: IconKind;
  wind: number;
  gust: number;
  spread: number;
  models: [number, number][];
  conf: number;
  tide: number;
  dayIndex: number;
  dayLabel: string;
  isDayStart: boolean;
};

const DAY_LABELS = ["Today", "Tomorrow", "Wed", "Thu", "Fri"];
const NOW_HOUR = 13;

function iconForHour(h: number): IconKind {
  if (h >= 7 && h < 10) return "cloud-sun";
  if (h >= 10 && h < 17) return "sun";
  if (h >= 17 && h < 20) return "cloud-sun";
  return "wind";
}

function generateHours(): HourData[] {
  const out: HourData[] = [];
  for (let d = 0; d < DAY_LABELS.length; d++) {
    for (let h = 0; h < 24; h++) {
      const dayPeak = 18 + Math.sin((d - 1) * 0.7) * 3;
      const wind = Math.max(4, Math.round(dayPeak * Math.sin(((h - 6) / 18) * Math.PI) + 8 + d * 0.4));
      const gust = wind + Math.round(3 + Math.abs(Math.sin(h)) * 4);
      const spread = 1 + ((d + h) % 3);
      const conf = Math.max(40, Math.min(82, 78 - Math.abs(13 - h) * 2 - d * 3));
      const models: [number, number][] = [
        [Math.max(2, wind - 1 + ((h + d) % 3)), gust + 1],
        [Math.max(2, wind + ((h + 1) % 2)), gust - 1],
        [Math.max(2, wind + 1 - ((h + d) % 2)), gust],
      ];
      const tideHr = d * 24 + h;
      const tide = 1 + Math.sin((tideHr - 4) * ((2 * Math.PI) / 12.4)) * 0.8;
      out.push({
        hour: String(h).padStart(2, "0"),
        icon: iconForHour(h),
        wind,
        gust,
        spread,
        models,
        conf,
        tide,
        dayIndex: d,
        dayLabel: DAY_LABELS[d],
        isDayStart: h === 0,
      });
    }
  }
  return out;
}

const HOURS: HourData[] = generateHours();
const INITIAL_INDEX = NOW_HOUR;

const MODEL_LABELS = ["model1", "model2", "model3"];
const CELL_W = 46;
const KEY_W = 76;
const HOUR_ROW_H = 22;
const ICON_ROW_H = 28;
const DATA_ROW_H = 26;
const TIDE_ROW_H = 70;
const TIDE_PAD_Y = 10;
const TIDE_MIN = 0;
const TIDE_MAX = 2.2;

function tideYForValue(v: number): number {
  const range = TIDE_MAX - TIDE_MIN;
  const t = (v - TIDE_MIN) / range;
  const usable = TIDE_ROW_H - TIDE_PAD_Y * 2;
  return TIDE_PAD_Y + (1 - t) * usable;
}

function buildTidePath(): string {
  let d = "";
  for (let i = 0; i < HOURS.length; i++) {
    const x = i * CELL_W + CELL_W / 2;
    const y = tideYForValue(HOURS[i].tide);
    if (i === 0) {
      d += `M ${x} ${y}`;
    } else {
      const prevX = (i - 1) * CELL_W + CELL_W / 2;
      const prevY = tideYForValue(HOURS[i - 1].tide);
      const cx1 = prevX + CELL_W * 0.5;
      const cx2 = x - CELL_W * 0.5;
      d += ` C ${cx1} ${prevY} ${cx2} ${y} ${x} ${y}`;
    }
  }
  return d;
}

function tideYAtX(px: number): number {
  const frac = (px - CELL_W / 2) / CELL_W;
  const i = Math.max(0, Math.min(HOURS.length - 2, Math.floor(frac)));
  const t = Math.max(0, Math.min(1, frac - i));

  const p0y = tideYForValue(HOURS[i].tide);
  const p3y = tideYForValue(HOURS[i + 1].tide);
  const c1y = p0y;
  const c2y = p3y;

  const mt = 1 - t;
  return mt * mt * mt * p0y + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * p3y;
}

const TIDE_PATH = buildTidePath();
const TIDE_FILL_PATH = `${TIDE_PATH} L ${(HOURS.length - 1) * CELL_W + CELL_W / 2} ${TIDE_ROW_H} L ${CELL_W / 2} ${TIDE_ROW_H} Z`;
const TIDE_CONTENT_W = HOURS.length * CELL_W;

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
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="relative px-4 pb-2 pt-2">
          <View className="flex-row items-center justify-center gap-3">
            <BeachMap
              size={236}
              wind={18}
              swell="2.4 m"
              onPress={onOpenMapDetail}
              accessibilityLabel="Wind and swell details"
            />
            <SailabilityMeter compact rating={7.8} />
          </View>
        </View>

        <WeatherWidget detailed={detailed} onChangeMode={onChangeMode} />

        <MetricGrid
          onOpenWindBeach={onOpenWindBeach}
          onOpenSafety={onOpenSafety}
          onOpenFooterInfo={onOpenFooterInfo}
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

function WeatherWidget({
  detailed,
  onChangeMode,
}: {
  detailed: boolean;
  onChangeMode: (mode: "summary" | "detailed") => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [viewportW, setViewportW] = useState(0);
  const [activeIndex, setActiveIndex] = useState(INITIAL_INDEX);
  const [scrollX, setScrollX] = useState(INITIAL_INDEX * CELL_W);

  const onToggle = useCallback(() => {
    onChangeMode(detailed ? "summary" : "detailed");
  }, [detailed, onChangeMode]);

  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (viewportW <= 0) return;
    const x = e.nativeEvent.contentOffset.x;
    setScrollX(x);
    const idx = Math.round(x / CELL_W);
    const clamped = Math.max(0, Math.min(HOURS.length - 1, idx));
    if (clamped !== activeIndex) setActiveIndex(clamped);

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
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: INITIAL_INDEX * CELL_W, animated: false }));
  };

  const sidePadding = Math.max(0, viewportW / 2 - CELL_W / 2);
  const active = HOURS[activeIndex];

  return (
    <View className="px-4 pb-4">
      <View
        className="rounded-2xl border border-line-soft bg-surface p-3"
        style={shadows.soft}
      >
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={detailed ? "Collapse weather details" : "Expand weather details"}
          className="mb-2 flex-row items-baseline justify-between px-1 active:opacity-70"
        >
          <Text className="text-[11px] font-bold tracking-widest text-accent">
            {active.dayLabel.toUpperCase()}
          </Text>
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
            {detailed
              ? MODEL_LABELS.map((m) => (
                  <KeyRowIcon key={m} height={DATA_ROW_H} label={m} />
                ))
              : null}
            {detailed ? <KeyRow height={DATA_ROW_H} label="CONF." iconKind="conf" /> : null}
            {detailed ? <KeyRow height={TIDE_ROW_H} label="TIDE (m)" /> : null}
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
                  height:
                    HOUR_ROW_H +
                    ICON_ROW_H +
                    DATA_ROW_H * (3 + (detailed ? MODEL_LABELS.length + 1 : 0)),
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: "#0F766E",
                  backgroundColor: "rgba(15, 118, 110, 0.06)",
                  zIndex: 1,
                }}
              />
            ) : null}
            {viewportW > 0 && detailed ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: viewportW / 2 - 1,
                  top:
                    HOUR_ROW_H +
                    ICON_ROW_H +
                    DATA_ROW_H * (3 + MODEL_LABELS.length + 1),
                  width: 2,
                  height: tideYAtX(scrollX + CELL_W / 2),
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
                  {HOURS.map((h, i) => (
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
                  {HOURS.map((h, i) => (
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
                  {HOURS.map((h, i) => (
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
                  {HOURS.map((h, i) => (
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
                  {HOURS.map((h, i) => (
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
                          {HOURS.map((h, i) => (
                            <ModelCell
                              key={i}
                              value={h.models[mi]}
                              active={i === activeIndex}
                              dayStart={h.isDayStart && i > 0}
                              onPress={onToggle}
                            />
                          ))}
                        </RowBand>
                      ))}
                      <RowBand height={DATA_ROW_H} bordered>
                        {HOURS.map((h, i) => (
                          <ConfCell
                            key={i}
                            value={h.conf}
                            active={i === activeIndex}
                            dayStart={h.isDayStart && i > 0}
                            onPress={onToggle}
                          />
                        ))}
                      </RowBand>

                      <View
                        style={{ width: TIDE_CONTENT_W, height: TIDE_ROW_H }}
                        className="border-t border-line-soft"
                      >
                        <Svg width={TIDE_CONTENT_W} height={TIDE_ROW_H}>
                          <Path d={TIDE_FILL_PATH} fill="#EFF6FF" />
                          <Path d={TIDE_PATH} stroke="#3B82F6" strokeWidth={2} fill="none" />
                        </Svg>
                      </View>
                    </View>
                  </FadeIn>
                ) : null}
              </View>
            </ScrollView>
            {viewportW > 0 && detailed ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: viewportW / 2 - 8,
                  top:
                    HOUR_ROW_H +
                    ICON_ROW_H +
                    DATA_ROW_H * (3 + MODEL_LABELS.length + 1) +
                    tideYAtX(scrollX + CELL_W / 2) - 8,
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
    <View
      style={{ height }}
      className={`flex-row items-center ${bordered ? "border-t border-line-soft" : ""}`}
    >
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
      <Text className={`text-[11px] ${active ? "font-bold text-accent" : "font-medium text-ink-soft"}`}>
        {value}
      </Text>
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

const ModelCell = memo(function ModelCell({
  value,
  active,
  dayStart,
  onPress,
}: CellProps<[number, number]>) {
  return (
    <CellShell active={active} dayStart={dayStart} onPress={onPress}>
      <Text className={`text-[12px] font-bold ${active ? "text-ink" : "text-ink-soft"}`}>
        {value[0]}
      </Text>
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
    <View
      style={{ height }}
      className="flex-row items-center border-t border-line-soft"
    >
      <Icon size={12} color="#1E3A8A" />
      <Text className="ml-1 text-[10px] font-semibold text-ink-soft">{label}</Text>
    </View>
  );
}

function MetricGrid({
  onOpenWindBeach,
  onOpenSafety,
  onOpenFooterInfo,
}: {
  onOpenWindBeach: () => void;
  onOpenSafety: () => void;
  onOpenFooterInfo: (key: "temp" | "uv" | "tide") => void;
}) {
  return (
    <View className="px-4">
      <View className="flex-row flex-wrap gap-3">
        <FadeIn duration={280} delay={80} translateY={12} style={{ width: "48%" }}>
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

        <FadeIn duration={280} delay={220} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={onOpenSafety} label="Safety detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">SAFETY</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <CheckCircle2 size={21} color="#22C55E" fill="#22C55E" stroke="#FFFFFF" />
              <Text className="text-[16px] font-bold text-good">GOOD</Text>
            </View>
            <Text className="mt-1 text-[12px] text-ink-soft">Flag green ·{"\n"}Lifeguard on</Text>
            <View className="mt-auto flex-row items-end justify-between">
              <View>
                <Text className="text-[8px] font-bold text-ink-soft">FLAG</Text>
                <Text className="text-[12px] font-semibold text-ink">Green</Text>
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
              <Text className="text-[26px] font-bold text-ink">82</Text>
              <Text className="text-[14px] text-ink-soft">°F</Text>
            </View>
            <Text className="text-[10px] text-ink-soft">Feels 85°F · H 86° / L 72°</Text>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">Water 24 °C · Humid 62%</Text>
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={360} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => onOpenFooterInfo("uv")} label="UV index detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">UV INDEX</Text>
            <View className="mt-2 flex-row items-baseline">
              <Text className="text-[28px] font-bold text-ink">5</Text>
              <Text className="ml-1 text-[14px] font-semibold text-warn">Moderate</Text>
            </View>
            <Text className="text-[10px] text-ink-soft">Peak 8 · 12:30</Text>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">SPF 30+ · Burn ≈ 25 min</Text>
            </View>
          </MetricCard>
        </FadeIn>

        <FadeIn duration={280} delay={430} translateY={12} style={{ width: "48%" }}>
          <MetricCard onPress={() => onOpenFooterInfo("tide")} label="Tide detail">
            <Text className="text-[10px] font-bold tracking-wider text-ink-soft">TIDE</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <TrendingUp size={20} color="#3B82F6" />
              <Text className="text-[20px] font-bold text-ink">Rising</Text>
            </View>
            <Text className="text-[10px] text-ink-soft">Now 0.8 m</Text>
            <View className="mt-auto">
              <Text className="text-[10px] font-medium text-ink-soft">Next high 1.6 m · 16:42</Text>
            </View>
          </MetricCard>
        </FadeIn>
      </View>
    </View>
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
