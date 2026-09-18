import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/context/ThemeContext";
import { Ionicons } from "@/src/ui/icons";

export const REACTION_OPTIONS = [
  { emoji: "👍", id: "like", label: "Like" },
  { emoji: "❤️", id: "love", label: "Love" },
  { emoji: "😂", id: "laugh", label: "Laugh" },
  { emoji: "😮", id: "wow", label: "Surprised" },
  { emoji: "😢", id: "sad", label: "Sad" },
  { emoji: "🙏", id: "thanks", label: "Thanks" },
];

export function MessageReactionBar({ current, onReact, onMore }: {
  current?: string; onReact: (emoji: string) => void; onMore: () => void;
}) {
  const { colors } = useTheme();
  return <View style={s.container}><ScrollView testID="msg-reaction-bar-scroll" horizontal
    showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
    contentContainerStyle={s.row} style={s.scroll}>
    {REACTION_OPTIONS.map(({ emoji, id, label }) => <Pressable key={id}
      testID={`msg-reaction-${id}`} accessibilityRole="button"
      accessibilityLabel={`${current === emoji ? "Remove" : "Add"} ${label} reaction`}
      accessibilityState={{ selected: current === emoji }}
      onPress={event => { event.stopPropagation(); void Haptics.selectionAsync().catch(() => {}); onReact(emoji); }}
      style={({ pressed }) => [s.button, {
        backgroundColor: current === emoji ? colors.brandTertiary : colors.surface,
        borderColor: current === emoji ? colors.brand : colors.surface,
      }, pressed && s.pressed]}>
      <Text testID={`msg-reaction-${id}-emoji`} allowFontScaling={false} style={s.emoji}>{emoji}</Text>
    </Pressable>)}
  </ScrollView><Pressable testID="msg-reaction-more" accessibilityRole="button"
    accessibilityLabel="Choose from all emoji" onPress={event => { event.stopPropagation(); onMore(); }}
    style={({ pressed }) => [s.button, { backgroundColor: colors.surfaceSecondary, borderColor: colors.surfaceSecondary }, pressed && s.pressed]}>
    <Ionicons name="add" size={25} color={colors.onSurface} />
  </Pressable></View>;
}

const s = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", padding: 6, height: 56 },
  scroll: { flex: 1 },
  row: { flexGrow: 1, justifyContent: "space-between", gap: 0 },
  button: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 25, lineHeight: 32 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.9 }] },
});