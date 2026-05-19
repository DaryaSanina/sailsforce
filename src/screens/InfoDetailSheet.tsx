import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { shadows } from "../styles/shadows";

export type InfoRow = {
  label: string;
  value: string;
  description?: string;
  accent?: "default" | "good" | "warn" | "bad" | "info";
};

export type InfoDetail = {
  key: string;
  title: string;
  subtitle?: string;
  rows: InfoRow[];
};

const ACCENT_CLASSES: Record<NonNullable<InfoRow["accent"]>, string> = {
  default: "text-ink",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-info",
};

type Props = {
  detail: InfoDetail | null;
  onClose: () => void;
};

export function InfoDetailSheet({ detail, onClose }: Props) {
  return (
    <Modal visible={detail !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View
          className="w-full max-w-[430px] self-center rounded-t-[24px] bg-white pt-3"
          style={[shadows.lift, { maxHeight: "85%" }]}
        >
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-ink-hair" />
          {detail !== null ? (
            <View className="px-5 pb-8">
              <View className="mb-4 flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[20px] font-bold text-ink">{detail.title}</Text>
                  {detail.subtitle ? (
                    <Text className="mt-0.5 text-[13px] text-ink-soft">{detail.subtitle}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={onClose}
                  className="h-9 w-9 items-center justify-center rounded-full bg-surface active:bg-line-soft"
                >
                  <X size={18} color="#1E293B" />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 480 }}>
                <View className="overflow-hidden rounded-2xl border border-line-soft" style={shadows.soft}>
                  {detail.rows.map((row, i) => (
                    <View
                      key={`${row.label}-${i}`}
                      className={`flex-row items-start px-4 py-3 bg-white ${i < detail.rows.length - 1 ? "border-b border-line-soft" : ""}`}
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-[14px] font-medium text-ink">{row.label}</Text>
                        {row.description ? (
                          <Text className="mt-0.5 text-[12px] text-ink-soft">{row.description}</Text>
                        ) : null}
                      </View>
                      <Text className={`text-[15px] font-semibold ${ACCENT_CLASSES[row.accent ?? "default"]}`}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
