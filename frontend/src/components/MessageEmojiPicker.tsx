import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@/src/ui/icons";
import { useTheme } from "@/src/context/ThemeContext";
import { useScreenSpace } from "@/src/hooks/use-screen-space";
import { KeyboardAvoidingView } from "@/src/components/layout/KeyboardAvoidingView";
import { EMOJI_CATALOG, EMOJI_CATEGORIES } from "@/src/constants/emoji-catalog";
import { fonts } from "@/src/theme";

export function MessageEmojiPicker({ current, onBack, onSelect }: {
  current?: string; onBack: () => void; onSelect: (emoji: string) => void;
}) {
  const { colors } = useTheme();
  const { safeWidth, safeHeight, insets } = useScreenSpace();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(-1);
  const [panelHeight, setPanelHeight] = useState(560);
  const columns = Math.max(4, Math.floor((Math.min(560, safeWidth - 32) - 24) / 48));
  const options = useMemo(() => EMOJI_CATALOG.filter(item =>
    (category === -1 || item.group === category) && item.search.includes(query.trim().toLowerCase())), [category, query]);
  return <KeyboardAvoidingView testID="emoji-picker-keyboard-area" style={[s.host, {
    paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12,
    paddingLeft: insets.left + 16, paddingRight: insets.right + 16,
  }]}>
    <Pressable testID="emoji-picker-dismiss" style={s.dismiss} onPress={onBack} accessibilityLabel="Back to message actions" />
    <Pressable testID="emoji-picker-sheet" onPress={e => e.stopPropagation()}
      onLayout={e => setPanelHeight(e.nativeEvent.layout.height)}
      style={[s.sheet, { backgroundColor: colors.surface, height: Math.min(560, safeHeight - 24) }]}>
      <View style={s.header}>
        <Text testID="emoji-picker-title" style={[s.title, { color: colors.onSurface }]}>Choose a reaction</Text>
        <Pressable testID="emoji-picker-back" accessibilityLabel="Back to message actions" onPress={onBack} style={s.close}>
          <Ionicons name="close" size={22} color={colors.onSurface} />
        </Pressable>
      </View>
      <TextInput testID="emoji-picker-search" value={query} onChangeText={setQuery}
        placeholder="Search emoji or paste one…" placeholderTextColor={colors.onSurfaceSecondary}
        autoCapitalize="none" autoCorrect={false} returnKeyType="search"
        style={[s.search, { backgroundColor: colors.surfaceSecondary, color: colors.onSurface }]} />
      {panelHeight >= 260 && <ScrollView testID="emoji-picker-categories" horizontal showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" style={s.categories} contentContainerStyle={s.categoryRow}>
        {EMOJI_CATEGORIES.map(group => <Pressable key={group.id} testID={`emoji-category-${group.id}`}
          onPress={() => setCategory(group.id)} accessibilityRole="button" accessibilityState={{ selected: category === group.id }}
          style={[s.category, { backgroundColor: category === group.id ? colors.brandTertiary : colors.surfaceSecondary }]}>
          <Text style={[s.categoryLabel, { color: category === group.id ? colors.brand : colors.onSurface }]}>{group.label}</Text>
        </Pressable>)}
      </ScrollView>}
      <FlatList testID="emoji-picker-grid" key={columns} numColumns={columns} data={options}
        style={s.grid} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.gridContent} columnWrapperStyle={s.gridRow}
        initialNumToRender={48} maxToRenderPerBatch={48} windowSize={5}
        ListEmptyComponent={<Text testID="emoji-picker-empty" style={[s.empty, { color: colors.onSurfaceSecondary }]}>No matching emoji</Text>}
        renderItem={({ item }) => <Pressable testID={`emoji-option-${item.id}`} accessibilityRole="button"
          accessibilityLabel={`${current === item.emoji ? "Remove" : "Add"} ${item.label} reaction`}
          accessibilityState={{ selected: current === item.emoji }} onPress={event => { event.stopPropagation(); onSelect(item.emoji); }}
          style={({ pressed }) => [s.cell, { backgroundColor: current === item.emoji ? colors.brandTertiary : colors.surface }, pressed && s.pressed]}>
          <Text testID={`emoji-glyph-${item.id}`} allowFontScaling={false} style={s.emoji}>{item.emoji}</Text>
        </Pressable>} />
      <Text testID="emoji-picker-count" style={[s.count, { color: colors.onSurfaceSecondary }]}>{options.length} emoji · one reaction per message</Text>
    </Pressable>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  host: { flex: 1, alignItems: "center", justifyContent: "flex-end" }, dismiss: { flex: 1, width: "100%", minHeight: 0 },
  sheet: { width: "100%", maxWidth: 560, flexShrink: 1, minHeight: 0, borderRadius: 26, padding: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.textBold, fontSize: 18, flexShrink: 1 }, close: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  search: { minHeight: 44, borderRadius: 14, paddingHorizontal: 12, fontFamily: fonts.text, fontSize: 15 },
  categories: { flexGrow: 0, flexShrink: 0, marginVertical: 8 }, categoryRow: { gap: 8 },
  category: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 22 },
  categoryLabel: { fontFamily: fonts.textSemi, fontSize: 13 }, grid: { flex: 1, minHeight: 48 },
  gridContent: { paddingVertical: 4 }, gridRow: { justifyContent: "space-around" },
  cell: { width: 48, height: 48, justifyContent: "center", alignItems: "center", borderRadius: 24 },
  emoji: { fontSize: 28, lineHeight: 36 }, pressed: { opacity: 0.7, transform: [{ scale: 0.9 }] },
  empty: { paddingVertical: 16, fontFamily: fonts.text, textAlign: "center" }, count: { fontFamily: fonts.text, fontSize: 11, paddingTop: 6 },
});