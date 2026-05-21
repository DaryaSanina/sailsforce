import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Anchor, Plus, Sailboat, Trash2, X } from "lucide-react-native";

import type { GearItem } from "../data/prototype";
import { shadows } from "../styles/shadows";
import { RisingBackdrop, SlideUp } from "../components/Transitions";

type Props = {
  visible: boolean;
  title: string;
  itemNoun: string;
  kind: "sail" | "board";
  items: GearItem[];
  onClose: () => void;
  onChange: (items: GearItem[]) => void;
};

const SAIL_WHOLE_MIN = 2;
const SAIL_WHOLE_MAX = 12;

function parseSailSize(size: string): { whole: number; decimal: number } {
  const match = size.match(/(\d+)(?:\.(\d))?/);
  if (!match) return { whole: 5, decimal: 0 };
  const whole = Math.min(SAIL_WHOLE_MAX, Math.max(SAIL_WHOLE_MIN, Number.parseInt(match[1], 10)));
  const decimal = match[2] ? Number.parseInt(match[2], 10) : 0;
  return { whole, decimal };
}

function formatSailSize(whole: number, decimal: number): string {
  return `${whole}.${decimal} m²`;
}

export function CollectionEditSheet({ visible, title, itemNoun, kind, items, onClose, onChange }: Props) {
  const [draft, setDraft] = useState<GearItem[]>(items);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSize, setFormSize] = useState("");
  const [sailWhole, setSailWhole] = useState(5);
  const [sailDecimal, setSailDecimal] = useState(3);

  useEffect(() => {
    if (visible) {
      setDraft(items);
      setAdding(false);
      setEditingId(null);
      setFormName("");
      setFormSize("");
      setSailWhole(5);
      setSailDecimal(3);
    }
  }, [visible, items]);

  const sizePlaceholder = kind === "sail" ? "e.g. 5.3 m²" : "e.g. 94 L";
  const namePlaceholder = kind === "sail" ? "e.g. Severne S-1" : "e.g. JP Freestyle Wave";
  const Icon = kind === "sail" ? Sailboat : Anchor;

  const sailSizeString = kind === "sail" ? formatSailSize(sailWhole, sailDecimal) : "";
  const effectiveSize = kind === "sail" ? sailSizeString : formSize;
  const formValid = formName.trim().length > 0 && effectiveSize.trim().length > 0;
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(items), [draft, items]);

  const beginAdd = () => {
    setAdding(true);
    setEditingId(null);
    setFormName("");
    setFormSize("");
    setSailWhole(5);
    setSailDecimal(3);
  };

  const beginEdit = (item: GearItem) => {
    setEditingId(item.id);
    setAdding(false);
    setFormName(item.name);
    setFormSize(item.size);
    if (kind === "sail") {
      const { whole, decimal } = parseSailSize(item.size);
      setSailWhole(whole);
      setSailDecimal(decimal);
    }
  };

  const commitForm = () => {
    if (!formValid) return;
    const finalSize = kind === "sail" ? sailSizeString : formSize.trim();
    if (editingId) {
      setDraft((prev) =>
        prev.map((it) => (it.id === editingId ? { ...it, name: formName.trim(), size: finalSize } : it)),
      );
    } else {
      const id = `${kind[0]}${Date.now().toString(36)}`;
      setDraft((prev) => [...prev, { id, name: formName.trim(), size: finalSize }]);
    }
    setAdding(false);
    setEditingId(null);
    setFormName("");
    setFormSize("");
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingId(null);
    setFormName("");
    setFormSize("");
  };

  const remove = (id: string) => setDraft((prev) => prev.filter((it) => it.id !== id));

  const save = () => {
    onChange(draft);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
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
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-ink-hair" />
            <View className="mb-3 flex-row items-center justify-between px-5">
              <View>
                <Text className="text-[20px] font-bold text-ink">{title}</Text>
                <Text className="text-[12px] text-ink-soft">
                  {draft.length} {itemNoun} in collection
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface active:bg-line-soft"
              >
                <X size={18} color="#1E293B" />
              </Pressable>
            </View>

            <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 12 }}>
              <View className="overflow-hidden rounded-2xl border border-line-soft" style={shadows.soft}>
                {draft.length === 0 ? (
                  <View className="items-center py-10">
                    <Icon size={28} color="#CBD5E1" />
                    <Text className="mt-2 text-[14px] text-ink-soft">No {itemNoun} yet</Text>
                  </View>
                ) : (
                  draft.map((item, i) => {
                    const isEditing = editingId === item.id;
                    return (
                      <View
                        key={item.id}
                        className={`flex-row items-center px-4 py-3 bg-white ${i < draft.length - 1 ? "border-b border-line-soft" : ""}`}
                      >
                        <View className="mr-3">
                          <Icon size={20} color="#7CB3B5" />
                        </View>
                        <Pressable onPress={() => beginEdit(item)} className="flex-1 active:opacity-70">
                          <Text className="text-[15px] font-medium text-ink">{item.name}</Text>
                          <Text className="text-[12px] text-ink-soft">{item.size}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => remove(item.id)}
                          hitSlop={8}
                          className="ml-2 h-9 w-9 items-center justify-center rounded-full active:bg-surface"
                        >
                          <Trash2 size={18} color="#EF4444" />
                        </Pressable>
                        {isEditing ? (
                          <Text className="ml-2 text-[10px] font-bold text-accent">EDITING</Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>

              {adding || editingId ? (
                <View className="mt-4 rounded-2xl border border-accent-light bg-white p-4" style={shadows.soft}>
                  <Text className="mb-3 text-[12px] font-bold tracking-wider text-accent">
                    {editingId ? "EDIT ITEM" : "NEW ITEM"}
                  </Text>
                  <Text className="mb-1 text-[11px] font-bold tracking-wider text-ink-soft">NAME</Text>
                  <View className="mb-3 rounded-xl border border-line-soft bg-surface px-3 py-3">
                    <TextInput
                      value={formName}
                      onChangeText={setFormName}
                      placeholder={namePlaceholder}
                      placeholderTextColor="#94A3B8"
                      className="text-[16px] text-ink"
                      style={{ outlineWidth: 0 } as any}
                    />
                  </View>
                  <Text className="mb-1 text-[11px] font-bold tracking-wider text-ink-soft">SIZE</Text>
                  {kind === "sail" ? (
                    <View className="mb-4">
                      <SailSizePicker
                        whole={sailWhole}
                        decimal={sailDecimal}
                        onChangeWhole={setSailWhole}
                        onChangeDecimal={setSailDecimal}
                      />
                    </View>
                  ) : (
                    <View className="mb-4 rounded-xl border border-line-soft bg-surface px-3 py-3">
                      <TextInput
                        value={formSize}
                        onChangeText={setFormSize}
                        placeholder={sizePlaceholder}
                        placeholderTextColor="#94A3B8"
                        className="text-[16px] text-ink"
                        style={{ outlineWidth: 0 } as any}
                      />
                    </View>
                  )}
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={cancelForm}
                      className="flex-1 items-center rounded-xl border border-line px-4 py-3 active:bg-surface"
                    >
                      <Text className="text-[15px] font-medium text-ink">Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={commitForm}
                      disabled={!formValid}
                      className={`flex-1 items-center rounded-xl px-4 py-3 ${formValid ? "bg-accent active:opacity-90" : "bg-line-soft"}`}
                    >
                      <Text className={`text-[15px] font-semibold ${formValid ? "text-white" : "text-ink-faint"}`}>
                        {editingId ? "Update" : "Add"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={beginAdd}
                  className="mt-4 flex-row items-center justify-center rounded-xl border border-line px-4 py-4 active:bg-surface"
                >
                  <Plus size={18} color="#0F766E" />
                  <Text className="ml-2 text-[15px] font-semibold text-accent">Add {itemNoun.replace(/s$/, "")}</Text>
                </Pressable>
              )}
            </ScrollView>

            <View className="border-t border-line-soft bg-white px-5 pb-6 pt-3">
              <Pressable
                onPress={save}
                disabled={!dirty}
                className={`items-center rounded-xl px-4 py-3 ${dirty ? "bg-accent active:opacity-90" : "bg-line-soft"}`}
              >
                <Text className={`text-[16px] font-semibold ${dirty ? "text-white" : "text-ink-faint"}`}>
                  {dirty ? "Save changes" : "No changes"}
                </Text>
              </Pressable>
            </View>
        </View>
        </SlideUp> : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ITEM_HEIGHT = 40;
const VISIBLE = 5;

function SailSizePicker({
  whole,
  decimal,
  onChangeWhole,
  onChangeDecimal,
}: {
  whole: number;
  decimal: number;
  onChangeWhole: (v: number) => void;
  onChangeDecimal: (v: number) => void;
}) {
  const wholeOptions = useMemo(
    () => Array.from({ length: SAIL_WHOLE_MAX - SAIL_WHOLE_MIN + 1 }, (_, i) => SAIL_WHOLE_MIN + i),
    [],
  );
  const decimalOptions = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);

  return (
    <View
      className="rounded-2xl border border-line-soft bg-surface px-4 pt-3 pb-3"
    >
      <Text className="mb-2 text-center text-[10px] font-bold tracking-widest text-ink-soft">
        SCROLL TO PICK SIZE
      </Text>
      <View className="flex-row items-center justify-center">
        <Wheel
          options={wholeOptions}
          value={whole}
          onChange={onChangeWhole}
          format={(n) => String(n)}
          width={70}
        />
        <Text className="mx-1 text-[40px] font-extrabold leading-[44px] text-ink">.</Text>
        <Wheel
          options={decimalOptions}
          value={decimal}
          onChange={onChangeDecimal}
          format={(n) => String(n)}
          width={60}
        />
        <Text className="ml-3 text-[16px] font-semibold text-ink-soft">m²</Text>
      </View>
    </View>
  );
}

function Wheel({
  options,
  value,
  onChange,
  format,
  width,
}: {
  options: number[];
  value: number;
  onChange: (v: number) => void;
  format: (n: number) => string;
  width: number;
}) {
  const ref = useRef<ScrollView | null>(null);
  const initialIndex = Math.max(0, options.indexOf(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    const idx = options.indexOf(value);
    if (idx >= 0) {
      ref.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
    }
  }, [options, value]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(options.length - 1, idx));
    const next = options[clamped];
    if (next !== lastEmitted.current) {
      lastEmitted.current = next;
      onChange(next);
    }
    ref.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  };

  const padding = (VISIBLE - 1) / 2;

  return (
    <View
      style={{
        width,
        height: ITEM_HEIGHT * VISIBLE,
      }}
      className="relative overflow-hidden rounded-xl bg-white"
    >
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 border-y border-accent"
        style={{
          top: ITEM_HEIGHT * padding,
          height: ITEM_HEIGHT,
        }}
      />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * padding,
        }}
      >
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <View
              key={opt}
              style={{ height: ITEM_HEIGHT }}
              className="items-center justify-center"
            >
              <Text
                className={
                  isSelected
                    ? "text-[28px] font-extrabold text-ink"
                    : "text-[20px] font-medium text-ink-faint"
                }
              >
                {format(opt)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
