import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Check, Minus, Plus, X } from "lucide-react-native";

import { shadows } from "../styles/shadows";
import { RisingBackdrop, SlideUp } from "../components/Transitions";
import { KeyboardAvoider } from "../components/KeyboardAvoider";

export type EditField =
  | {
      kind: "number";
      key: string;
      title: string;
      unitLabel: string;
      value: number;
      min: number;
      max: number;
      step?: number;
    }
  | {
      kind: "choice";
      key: string;
      title: string;
      value: string;
      options: ReadonlyArray<{ label: string; value: string }>;
    }
  | {
      kind: "counter";
      key: string;
      title: string;
      itemNoun: string;
      value: number;
      min: number;
      max: number;
    }
  | {
      kind: "text";
      key: string;
      title: string;
      value: string;
      placeholder?: string;
      maxLength?: number;
    };

type Props = {
  field: EditField | null;
  onClose: () => void;
  onSave: (key: string, value: number | string) => void;
};

export function EditValueSheet({ field, onClose, onSave }: Props) {
  return (
    <Modal visible={field !== null} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoider>
        {field !== null ? <RisingBackdrop onPress={onClose} /> : null}
        {field !== null ? (
          <SlideUp from={520} duration={320} style={{ width: "100%", maxWidth: 430, alignSelf: "center" }}>
            <View
              className="w-full rounded-t-[24px] bg-white pt-3"
              style={shadows.lift}
            >
              <View className="mb-3 h-1 w-10 self-center rounded-full bg-ink-hair" />
              <EditBody field={field} onClose={onClose} onSave={onSave} />
            </View>
          </SlideUp>
        ) : null}
      </KeyboardAvoider>
    </Modal>
  );
}

function EditBody({ field, onClose, onSave }: { field: EditField; onClose: () => void; onSave: Props["onSave"] }) {
  return (
    <View className="px-5 pb-8">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-[20px] font-bold text-ink">{field.title}</Text>
        <Pressable
          onPress={onClose}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface active:bg-line-soft"
        >
          <X size={18} color="#1E293B" />
        </Pressable>
      </View>

      {field.kind === "number" ? (
        <NumberInput field={field} onSave={onSave} onClose={onClose} />
      ) : field.kind === "choice" ? (
        <ChoiceInput field={field} onSave={onSave} onClose={onClose} />
      ) : field.kind === "counter" ? (
        <CounterInput field={field} onSave={onSave} onClose={onClose} />
      ) : (
        <TextInputField field={field} onSave={onSave} onClose={onClose} />
      )}
    </View>
  );
}

function NumberInput({
  field,
  onSave,
  onClose,
}: {
  field: Extract<EditField, { kind: "number" }>;
  onSave: Props["onSave"];
  onClose: () => void;
}) {
  const [text, setText] = useState(String(field.value));
  useEffect(() => setText(String(field.value)), [field.key, field.value]);

  const parsed = Number.parseFloat(text);
  const valid = Number.isFinite(parsed) && parsed >= field.min && parsed <= field.max;

  return (
    <View>
      <View className="flex-row items-end justify-center py-4">
        <TextInput
          value={text}
          onChangeText={(t) => setText(t.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          autoFocus
          className="min-w-[120px] border-b-2 border-accent pb-1 text-center text-[48px] font-extrabold text-ink"
          style={{ outlineWidth: 0 } as any}
        />
        <Text className="ml-2 mb-2 text-[18px] font-semibold text-ink-soft">{field.unitLabel}</Text>
      </View>
      <Text className="mb-4 text-center text-[12px] text-ink-faint">
        Allowed {field.min}–{field.max} {field.unitLabel}
      </Text>
      <SaveButton
        disabled={!valid}
        onPress={() => {
          if (!valid) return;
          onSave(field.key, parsed);
          onClose();
        }}
      />
    </View>
  );
}

function ChoiceInput({
  field,
  onSave,
  onClose,
}: {
  field: Extract<EditField, { kind: "choice" }>;
  onSave: Props["onSave"];
  onClose: () => void;
}) {
  return (
    <View>
      <ScrollView className="max-h-[360px]" contentContainerStyle={{ paddingBottom: 8 }}>
        {field.options.map((opt) => {
          const selected = opt.value === field.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                onSave(field.key, opt.value);
                onClose();
              }}
              className={`mb-2 flex-row items-center justify-between rounded-xl border px-4 py-4 ${
                selected ? "border-accent bg-accent-light" : "border-line-soft bg-white"
              } active:bg-surface`}
            >
              <Text className={`text-[16px] ${selected ? "font-semibold text-accent" : "text-ink"}`}>
                {opt.label}
              </Text>
              {selected ? <Check size={20} color="#0F766E" /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CounterInput({
  field,
  onSave,
  onClose,
}: {
  field: Extract<EditField, { kind: "counter" }>;
  onSave: Props["onSave"];
  onClose: () => void;
}) {
  const [value, setValue] = useState(field.value);
  useEffect(() => setValue(field.value), [field.key, field.value]);

  const dec = () => setValue((v) => Math.max(field.min, v - 1));
  const inc = () => setValue((v) => Math.min(field.max, v + 1));

  return (
    <View>
      <View className="flex-row items-center justify-center gap-6 py-6">
        <Pressable
          onPress={dec}
          disabled={value <= field.min}
          className={`h-14 w-14 items-center justify-center rounded-full border ${
            value <= field.min ? "border-line-soft" : "border-line"
          } active:bg-surface`}
        >
          <Minus size={22} color={value <= field.min ? "#CBD5E1" : "#1E293B"} />
        </Pressable>
        <View className="items-center">
          <Text className="text-[56px] font-extrabold leading-[60px] text-ink">{value}</Text>
          <Text className="text-[13px] text-ink-soft">{field.itemNoun}</Text>
        </View>
        <Pressable
          onPress={inc}
          disabled={value >= field.max}
          className={`h-14 w-14 items-center justify-center rounded-full border ${
            value >= field.max ? "border-line-soft" : "border-line"
          } active:bg-surface`}
        >
          <Plus size={22} color={value >= field.max ? "#CBD5E1" : "#1E293B"} />
        </Pressable>
      </View>
      <Text className="mb-4 text-center text-[12px] text-ink-faint">
        {field.min}–{field.max} {field.itemNoun}
      </Text>
      <SaveButton
        onPress={() => {
          onSave(field.key, value);
          onClose();
        }}
      />
    </View>
  );
}

function TextInputField({
  field,
  onSave,
  onClose,
}: {
  field: Extract<EditField, { kind: "text" }>;
  onSave: Props["onSave"];
  onClose: () => void;
}) {
  const [text, setText] = useState(field.value);
  useEffect(() => setText(field.value), [field.key, field.value]);

  const trimmed = text.trim();
  const valid = trimmed.length > 0;

  return (
    <View>
      <View className="mb-4 rounded-xl border border-line-soft bg-surface px-3 py-3">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={field.placeholder ?? ""}
          placeholderTextColor="#94A3B8"
          maxLength={field.maxLength}
          autoFocus
          className="text-[16px] text-ink"
          style={{ outlineWidth: 0 } as any}
        />
      </View>
      <SaveButton
        disabled={!valid}
        onPress={() => {
          if (!valid) return;
          onSave(field.key, trimmed);
          onClose();
        }}
      />
    </View>
  );
}

function SaveButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`mt-2 items-center rounded-xl px-4 py-4 ${
        disabled ? "bg-line-soft" : "bg-accent active:opacity-90"
      }`}
    >
      <Text className={`text-[16px] font-semibold ${disabled ? "text-ink-faint" : "text-white"}`}>Save</Text>
    </Pressable>
  );
}
