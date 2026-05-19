import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { MapPin, X } from "lucide-react-native";

import { shadows } from "../styles/shadows";

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (input: { name: string; region: string; favorite: boolean }) => void;
};

export function AddLocationSheet({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [favorite, setFavorite] = useState(true);

  useEffect(() => {
    if (!visible) {
      setName("");
      setRegion("");
      setFavorite(true);
    }
  }, [visible]);

  const valid = name.trim().length > 0 && region.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="w-full max-w-[430px] self-center rounded-t-[24px] bg-white pt-3" style={shadows.lift}>
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-ink-hair" />
            <View className="px-5 pb-8">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-[20px] font-bold text-ink">Add Custom Location</Text>
                <Pressable
                  onPress={onClose}
                  className="h-9 w-9 items-center justify-center rounded-full bg-surface active:bg-line-soft"
                >
                  <X size={18} color="#1E293B" />
                </Pressable>
              </View>

              <View className="mb-4">
                <Text className="mb-1 text-[11px] font-bold tracking-wider text-ink-soft">SPOT NAME</Text>
                <View className="flex-row items-center rounded-xl border border-line-soft bg-surface px-3 py-3">
                  <MapPin size={18} color="#94A3B8" />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. North Shore"
                    placeholderTextColor="#94A3B8"
                    className="ml-2 flex-1 text-[16px] text-ink"
                    style={{ outlineWidth: 0 } as any}
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="mb-1 text-[11px] font-bold tracking-wider text-ink-soft">REGION</Text>
                <View className="flex-row items-center rounded-xl border border-line-soft bg-surface px-3 py-3">
                  <TextInput
                    value={region}
                    onChangeText={setRegion}
                    placeholder="e.g. Oahu, Hawaii"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-[16px] text-ink"
                    style={{ outlineWidth: 0 } as any}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => setFavorite((f) => !f)}
                className="mb-5 flex-row items-center justify-between rounded-xl border border-line-soft bg-white px-4 py-3 active:bg-surface"
              >
                <View>
                  <Text className="text-[14px] font-medium text-ink">Add to favorites</Text>
                  <Text className="text-[12px] text-ink-faint">Show this spot in the favorites list</Text>
                </View>
                <View
                  className={`h-6 w-11 justify-center rounded-full px-0.5 ${favorite ? "bg-accent" : "bg-line"}`}
                >
                  <View
                    className="h-5 w-5 rounded-full bg-white"
                    style={{ transform: [{ translateX: favorite ? 20 : 0 }] }}
                  />
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!valid) return;
                  onAdd({ name: name.trim(), region: region.trim(), favorite });
                  onClose();
                }}
                disabled={!valid}
                className={`items-center rounded-xl px-4 py-4 ${valid ? "bg-accent active:opacity-90" : "bg-line-soft"}`}
              >
                <Text className={`text-[16px] font-semibold ${valid ? "text-white" : "text-ink-faint"}`}>
                  Add Location
                </Text>
              </Pressable>
            </View>
        </View>
      </View>
    </Modal>
  );
}
