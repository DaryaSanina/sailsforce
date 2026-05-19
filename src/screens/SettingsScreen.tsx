import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  RectangleHorizontal,
  Ruler,
  Sailboat,
  Scale,
  Sparkles,
  Star,
  UserRound,
  VenusAndMars,
  Wind,
} from "lucide-react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { settingsRows } from "../data/prototype";
import { shadows } from "../styles/shadows";

type Props = {
  onBack: () => void;
  onOpenLocations: () => void;
};

export function SettingsScreen({ onBack, onOpenLocations }: Props) {
  return (
    <View className="flex-1 bg-white">
      <View className="relative flex-row items-center justify-center px-4 py-3">
        <Pressable onPress={onBack} className="absolute left-4 h-10 w-10 items-center justify-center rounded-xl bg-white" style={shadows.soft}>
          <ChevronLeft size={24} color="#1E293B" />
        </Pressable>
        <Text className="text-[20px] font-semibold text-ink">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="mb-5 mt-1 flex-row items-center rounded-xl border border-line-soft bg-white p-3" style={shadows.soft}>
          <View className="mr-3 h-[50px] w-[50px] overflow-hidden rounded-full">
            <Avatar />
          </View>
          <View className="flex-1">
            <Text className="text-[18px] font-bold text-ink">Cole</Text>
            <Text className="text-[14px] text-ink-soft">Hookipa Beach</Text>
          </View>
          <View className="items-center">
            <Star size={23} color="#7CB3B5" fill="#7CB3B5" />
            <Text className="mt-1 text-[12px] text-ink">Favorite spot</Text>
          </View>
        </View>

        <SettingsSection title="USER DATA">
          {settingsRows.user.map(([label, value, icon], index) => (
            <SettingsRow key={label} label={label} value={value} icon={icon} bordered={index < settingsRows.user.length - 1} />
          ))}
        </SettingsSection>

        <SettingsSection title="UNITS">
          <SettingsRow label="Wind Speed units" value="Knots (kt)" icon="wind" />
        </SettingsSection>

        <SettingsSection title="SPOTS & FAVORITES">
          <SettingsRow label="Saved spots" value="18 spots" icon="pin" onPress={onOpenLocations} />
        </SettingsSection>

        <SettingsSection title="QUIVER">
          <QuiverRow label="Sails" detail="5 in collection" icon="sail" bordered />
          <QuiverRow label="Boards" detail="3 in collection" icon="board" />
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-center">
        <View className="mr-2 h-1.5 w-1.5 rounded-full bg-mint" />
        <Text className="text-[12px] font-bold tracking-wider text-ink-soft">{title}</Text>
      </View>
      <View className="overflow-hidden rounded-xl border border-line-soft bg-white" style={shadows.soft}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  icon,
  bordered = false,
  onPress,
}: {
  label: string;
  value: string;
  icon: string;
  bordered?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className={`flex-row items-center px-4 py-3.5 ${bordered ? "border-b border-line-soft" : ""}`}>
      <View className="mr-3 w-6 items-center">{rowIcon(icon)}</View>
      <Text className="flex-1 text-[16px] font-medium text-ink">{label}</Text>
      <Text className="mr-2 text-[14px] font-medium text-ink-soft">{value}</Text>
      <ChevronRight size={18} color="#64748B" />
    </Pressable>
  );
}

function QuiverRow({ label, detail, icon, bordered = false }: { label: string; detail: string; icon: string; bordered?: boolean }) {
  return (
    <Pressable className={`flex-row items-center px-4 py-3.5 ${bordered ? "border-b border-line-soft" : ""}`}>
      <View className="mr-3 w-6 items-center">{rowIcon(icon)}</View>
      <View className="flex-1">
        <Text className="text-[16px] font-medium text-ink">{label}</Text>
        <Text className="text-[12px] text-ink-faint">{detail}</Text>
      </View>
      <Text className="mr-2 text-[13px] font-semibold text-ink">{detail}</Text>
      <ChevronRight size={18} color="#64748B" />
    </Pressable>
  );
}

function rowIcon(name: string) {
  const props = { size: 22, color: "#7CB3B5", strokeWidth: 1.8 };
  if (name === "scale") return <Scale {...props} />;
  if (name === "ruler") return <Ruler {...props} />;
  if (name === "gender") return <VenusAndMars {...props} />;
  if (name === "stars") return <Sparkles {...props} />;
  if (name === "wind") return <Wind {...props} />;
  if (name === "pin") return <MapPin {...props} />;
  if (name === "sail") return <Sailboat {...props} />;
  if (name === "board") return <RectangleHorizontal {...props} />;
  return <UserRound {...props} />;
}

function Avatar() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 50 50">
      <Rect width="50" height="50" fill="#0EA5E9" />
      <Path d="M0 33 C12 28 18 24 30 26 C40 28 44 22 50 19 L50 50 L0 50 Z" fill="#E8D6A1" />
      <Circle cx="29" cy="19" r="6" fill="#1E293B" />
      <Path d="M24 24 L16 42" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      <Path d="M31 24 L39 41" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      <Path d="M20 33 L38 27" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
