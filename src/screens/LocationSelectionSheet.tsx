import { Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { CheckCircle2, Map, MapPin, PlusCircle, Search, Star, X } from "lucide-react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { locations, type Location } from "../data/prototype";
import { shadows } from "../styles/shadows";

type Props = {
  visible: boolean;
  selectedLocationId: string;
  onClose: () => void;
  onSelectLocation: (id: string) => void;
};

export function LocationSelectionSheet({ visible, selectedLocationId, onClose, onSelectLocation }: Props) {
  const favorites = locations.filter((item) => item.favorite);
  const nearby = locations.filter((item) => !item.favorite);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <SafeAreaView className="w-full items-center">
          <View className="max-h-[92%] w-full max-w-[430px] rounded-t-[24px] bg-white pt-3" style={shadows.lift}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-ink-hair" />
            <View className="mb-4 flex-row items-center justify-between px-5">
              <Text className="text-[22px] font-bold text-ink">Select Location</Text>
              <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-surface">
                <X size={20} color="#1E293B" />
              </Pressable>
            </View>

            <View className="px-5 pb-5">
              <View className="flex-row items-center rounded-xl bg-surface px-3 py-3">
                <Search size={20} color="#94A3B8" />
                <TextInput
                  editable={false}
                  placeholder="Search beaches or spots"
                  placeholderTextColor="#94A3B8"
                  className="ml-2 flex-1 text-[16px] text-ink"
                />
              </View>
            </View>

            <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View className="mb-6">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-[12px] font-bold tracking-wider text-ink-faint">FAVORITES</Text>
                  <Text className="text-[14px] font-semibold text-accent">Edit</Text>
                </View>
                <View className="overflow-hidden rounded-2xl border border-line-soft bg-white" style={shadows.soft}>
                  {favorites.map((item, index) => (
                    <FavoriteRow
                      key={item.id}
                      item={item}
                      selected={item.id === selectedLocationId}
                      bordered={index < favorites.length - 1}
                      onPress={() => onSelectLocation(item.id)}
                    />
                  ))}
                </View>
              </View>

              <View className="mb-6">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-[12px] font-bold tracking-wider text-ink-faint">NEARBY SPOTS</Text>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[14px] font-semibold text-accent">View on Map</Text>
                    <Map size={16} color="#0F766E" />
                  </View>
                </View>
                <View className="overflow-hidden rounded-2xl border border-line-soft bg-white" style={shadows.soft}>
                  {nearby.map((item, index) => (
                    <NearbyRow key={item.id} item={item} bordered={index < nearby.length - 1} onPress={() => onSelectLocation(item.id)} />
                  ))}
                </View>
              </View>
            </ScrollView>

            <View className="border-t border-line-soft bg-white px-5 pb-6 pt-4">
              <Pressable className="flex-row items-center justify-center rounded-xl border border-line px-4 py-4">
                <PlusCircle size={18} color="#0F766E" />
                <Text className="ml-2 text-[16px] font-semibold text-accent">Add Custom Location</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function FavoriteRow({ item, selected, bordered, onPress }: { item: Location; selected: boolean; bordered: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-row items-center px-3 py-3 ${selected ? "bg-surface" : "bg-white"} ${bordered ? "border-b border-line-soft" : ""}`}>
      <Star size={20} color={selected ? "#7CB3B5" : "#CBD5E1"} fill={selected ? "#7CB3B5" : "transparent"} />
      <View className="mx-3 h-10 w-10 overflow-hidden rounded-full">
        <BeachThumb tone={item.id} />
      </View>
      <View className="flex-1">
        <Text className="text-[16px] font-semibold text-ink">{item.name}</Text>
        <Text className="text-[13px] text-ink-soft">{item.region}</Text>
      </View>
      {selected ? <CheckCircle2 size={24} color="#0F766E" fill="#0F766E" stroke="#FFFFFF" /> : <Text className="text-[13px] font-medium text-ink-faint">{item.distance}</Text>}
    </Pressable>
  );
}

function NearbyRow({ item, bordered, onPress }: { item: Location; bordered: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-row items-center px-4 py-4 ${bordered ? "border-b border-line-soft" : ""}`}>
      <MapPin size={22} color="#94A3B8" />
      <View className="ml-4 flex-1">
        <Text className="text-[16px] font-semibold text-ink">{item.name}</Text>
        <Text className="text-[13px] text-ink-soft">{item.region}</Text>
      </View>
      <Text className="text-[13px] font-medium text-ink-faint">{item.distance}</Text>
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
