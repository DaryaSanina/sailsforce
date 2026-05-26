import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { CheckCircle2, MapPin, Search, Star, Trash2, X } from "lucide-react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { type BeachLocation } from "../domain/models";
import { shadows } from "../styles/shadows";
import { RisingBackdrop, SlideUp } from "../components/Transitions";
import { KeyboardAvoider } from "../components/KeyboardAvoider";

const INITIAL_SPOT_LIMIT = 24;
const SEARCH_RESULT_LIMIT = 60;

type Props = {
  visible: boolean;
  selectedLocationId: string;
  favoriteIds: Set<string>;
  locations: BeachLocation[];
  onClose: () => void;
  onSelectLocation: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onRemoveLocation: (id: string) => void;
};

export function LocationSelectionSheet({
  visible,
  selectedLocationId,
  favoriteIds,
  locations,
  onClose,
  onSelectLocation,
  onToggleFavorite,
  onRemoveLocation,
}: Props) {
  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const normalised = query.trim().toLowerCase();

  const { favorites, nearby, hiddenCount } = useMemo(() => {
    const matches = normalised
      ? locations.filter((l) => l.name.toLowerCase().includes(normalised) || l.region.toLowerCase().includes(normalised))
      : locations;
    const nonFavorites = matches.filter((l) => !favoriteIds.has(l.id));
    const limit = normalised ? SEARCH_RESULT_LIMIT : INITIAL_SPOT_LIMIT;
    const visibleNearby = nonFavorites.slice(0, limit);
    return {
      favorites: matches.filter((l) => favoriteIds.has(l.id)),
      nearby: visibleNearby,
      hiddenCount: Math.max(0, nonFavorites.length - visibleNearby.length),
    };
  }, [favoriteIds, locations, normalised]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoider>
        {visible ? <RisingBackdrop onPress={onClose} /> : null}
        {visible ? <SlideUp
          from={520}
          duration={320}
          style={{ width: "100%", maxWidth: 430, alignSelf: "center", maxHeight: "92%" }}
        >
        <View
          className="w-full rounded-t-[24px] bg-white pt-3"
          style={shadows.lift}
        >
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-ink-hair" />
            <View className="mb-4 flex-row items-center justify-between px-5">
              <Text className="text-[22px] font-bold text-ink">Select Location</Text>
              <Pressable
                onPress={() => {
                  setEditMode(false);
                  onClose();
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface active:bg-line-soft"
              >
                <X size={20} color="#1E293B" />
              </Pressable>
            </View>

            <View className="px-5 pb-5">
              <View className="flex-row items-center rounded-xl bg-surface px-3 py-3">
                <Search size={20} color="#94A3B8" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search beaches or spots"
                  placeholderTextColor="#94A3B8"
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  className="ml-2 flex-1 text-[16px] text-ink"
                  style={{ outlineWidth: 0 } as any}
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery("")} hitSlop={8} className="ml-1 p-1">
                    <X size={16} color="#94A3B8" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {favorites.length > 0 && (
                <View className="mb-6">
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-[12px] font-bold tracking-wider text-ink-faint">FAVORITES</Text>
                    <Pressable onPress={() => setEditMode((e) => !e)} hitSlop={8} className="active:opacity-70">
                      <Text className="text-[14px] font-semibold text-accent">{editMode ? "Done" : "Edit"}</Text>
                    </Pressable>
                  </View>
                  <View className="overflow-hidden rounded-2xl border border-line-soft bg-white" style={shadows.soft}>
                    {favorites.map((item, index) => (
                      <FavoriteRow
                        key={item.id}
                        item={item}
                        selected={item.id === selectedLocationId}
                        bordered={index < favorites.length - 1}
                        editMode={editMode}
                        onPress={() => {
                          if (editMode) return;
                          onSelectLocation(item.id);
                        }}
                        onToggleStar={() => onToggleFavorite(item.id)}
                        onRemove={() => onRemoveLocation(item.id)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {nearby.length > 0 ? (
                <View className="mb-6">
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-[12px] font-bold tracking-wider text-ink-faint">
                      {normalised ? "MATCHING SPOTS" : "NEARBY SPOTS"}
                    </Text>
                  </View>
                  <View className="overflow-hidden rounded-2xl border border-line-soft bg-white" style={shadows.soft}>
                    {nearby.map((item, index) => (
                      <NearbyRow
                        key={item.id}
                        item={item}
                        bordered={index < nearby.length - 1}
                        editMode={editMode}
                        onPress={() => {
                          if (editMode) return;
                          onSelectLocation(item.id);
                        }}
                        onToggleStar={() => onToggleFavorite(item.id)}
                        onRemove={() => onRemoveLocation(item.id)}
                      />
                    ))}
                  </View>
                  {hiddenCount > 0 ? (
                    <Text className="mt-3 text-center text-[12px] font-medium text-ink-soft">
                      {normalised
                        ? `${hiddenCount} more matches. Keep typing to narrow the search.`
                        : `${hiddenCount} more spots. Search to find a specific beach.`}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {favorites.length === 0 && nearby.length === 0 ? (
                <View className="items-center py-10">
                  <Text className="text-[14px] text-ink-soft">No spots match “{query}”.</Text>
                </View>
              ) : null}
            </ScrollView>

            <View className="border-t border-line-soft bg-white pb-6" />
        </View>
        </SlideUp> : null}
      </KeyboardAvoider>
    </Modal>
  );
}

function FavoriteRow({
  item,
  selected,
  bordered,
  editMode,
  onPress,
  onToggleStar,
  onRemove,
}: {
  item: BeachLocation;
  selected: boolean;
  bordered: boolean;
  editMode: boolean;
  onPress: () => void;
  onToggleStar: () => void;
  onRemove: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-3 py-3 active:bg-surface ${selected ? "bg-surface" : "bg-white"} ${bordered ? "border-b border-line-soft" : ""}`}
    >
      {editMode ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-bad/10 active:bg-bad/20"
        >
          <Trash2 size={18} color="#EF4444" />
        </Pressable>
      ) : (
        <Pressable onPress={onToggleStar} hitSlop={8} className="p-1">
          <Star size={20} color="#7CB3B5" fill="#7CB3B5" />
        </Pressable>
      )}
      <View className="mx-3 h-10 w-10 overflow-hidden rounded-full">
        <BeachThumb tone={item.id} />
      </View>
      <View className="flex-1">
        <Text className="text-[16px] font-semibold text-ink">{item.name}</Text>
        <Text className="text-[13px] text-ink-soft">{item.region}</Text>
      </View>
      {!editMode && selected ? (
        <CheckCircle2 size={24} color="#0F766E" fill="#0F766E" stroke="#FFFFFF" />
      ) : !editMode ? (
        <Text className="text-[13px] font-medium text-ink-faint">{item.distance}</Text>
      ) : null}
    </Pressable>
  );
}

function NearbyRow({
  item,
  bordered,
  editMode,
  onPress,
  onToggleStar,
  onRemove,
}: {
  item: BeachLocation;
  bordered: boolean;
  editMode: boolean;
  onPress: () => void;
  onToggleStar: () => void;
  onRemove: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-3 py-4 active:bg-surface ${bordered ? "border-b border-line-soft" : ""}`}
    >
      {editMode ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-bad/10 active:bg-bad/20"
        >
          <Trash2 size={18} color="#EF4444" />
        </Pressable>
      ) : (
        <Pressable onPress={onToggleStar} hitSlop={8} className="p-1">
          <Star size={20} color="#CBD5E1" fill="transparent" />
        </Pressable>
      )}
      <View className="ml-2 mr-3">
        <MapPin size={22} color="#94A3B8" />
      </View>
      <View className="flex-1">
        <Text className="text-[16px] font-semibold text-ink">{item.name}</Text>
        <Text className="text-[13px] text-ink-soft">{item.region}</Text>
      </View>
      {!editMode ? <Text className="text-[13px] font-medium text-ink-faint">{item.distance}</Text> : null}
    </Pressable>
  );
}

function BeachThumb({ tone }: { tone: string }) {
  const teal = tone.length % 2 === 0 ? "#0F766E" : "#0EA5E9";
  return (
    <Svg width="100%" height="100%" viewBox="0 0 40 40">
      <Rect width="40" height="40" fill={teal} />
      <Path d="M0 15 C10 8 20 15 31 9 C35 7 38 6 40 6 L40 40 L0 40 Z" fill="#2C7FB0" opacity="0.8" />
      <Path d="M0 25 C10 21 19 20 28 23 C34 25 38 25 40 24 L40 40 L0 40 Z" fill="#E8D6A1" />
      <Path d="M0 29 C10 25 20 26 30 29 C35 30 38 30 40 29" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth="1.4" fill="none" />
    </Svg>
  );
}
