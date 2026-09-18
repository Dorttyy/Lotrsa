import { VIcon } from "@/src/learn/Icon";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { vocabApi, VocabLesson } from "@/src/learn/api";
import { useLearnTheme } from "@/src/learn/ThemeContext";
import { LearnPalette, learnRadius } from "@/src/learn/theme";

type Level = "Beginner" | "Intermediate" | "Advanced";
const LEVELS: Level[] = ["Beginner", "Intermediate", "Advanced"];

export default function VocabLessons() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useLearnTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [q, setQ] = useState("");
  const [lessons, setLessons] = useState<VocabLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [levelFilter, setLevelFilter] = useState<Level | null>(null);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vocabApi.listLessons(levelFilter ? { level: levelFilter } : undefined);
      setLessons(data);
    } finally {
      setLoading(false);
    }
  }, [levelFilter]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    let list = lessons;
    const x = q.trim().toLowerCase();
    if (x) list = list.filter((l) => l.title.toLowerCase().includes(x) || l.description.toLowerCase().includes(x));
    if (maxMinutes) list = list.filter((l) => l.minutes <= maxMinutes);
    return list;
  }, [q, lessons, maxMinutes]);

  const activeFilters = (levelFilter ? 1 : 0) + (maxMinutes ? 1 : 0);

  return (
    <View testID="learn-lessons-screen" style={{ flex: 1, backgroundColor: colors.bg, paddingLeft: insets.left, paddingRight: insets.right }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 40,
          paddingHorizontal: 18,
        }}
      >
        <View style={s.searchRow}>
          <View style={s.searchPill}>
            <VIcon name="search" size={18} color="#7A7A85" />
            <TextInput
              testID="learn-lessons-search"
              value={q}
              onChangeText={setQ}
              placeholder="Search video lessons"
              placeholderTextColor="#7A7A85"
              style={s.searchInput}
            />
          </View>
          <Pressable testID="learn-lessons-filters-open" style={s.filterBtn} onPress={() => setFilterOpen(true)}>
            <VIcon name="options-outline" size={20} color="#FFFFFF" />
            {activeFilters > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeText}>{activeFilters}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Text style={s.section}>Lessons for you</Text>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.cardPurple} />
          </View>
        ) : filtered.length === 0 ? (
          <Text style={{ color: colors.textDim, textAlign: "center", marginTop: 20 }}>No lessons match.</Text>
        ) : (
          <View style={{ gap: 14 }}>
            {filtered.map((l) => (
              <View key={l.id} style={s.lessonCard}>
                <Text style={s.lessonTitle}>{l.title}</Text>
                <Text style={s.lessonDesc}>{l.description}</Text>
                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <VIcon name="time-outline" size={16} color="#0B0B0F" />
                    <Text style={s.metaText}>{l.minutes} min</Text>
                  </View>
                  <View style={s.metaItem}>
                    <VIcon name="stats-chart" size={16} color="#0B0B0F" />
                    <Text style={s.metaText}>{l.level}</Text>
                  </View>
                  {l.completed && (
                    <View style={[s.metaItem, { marginLeft: "auto" }]}>
                      <VIcon name="checkmark-circle" size={18} color="#2E8B57" />
                      <Text style={[s.metaText, { color: "#2E8B57" }]}>Done</Text>
                    </View>
                  )}
                </View>
                <Pressable
                  style={({ pressed }) => [s.startBtn, pressed && { opacity: 0.9 }]}
                  onPress={() => router.push({ pathname: "/learn/lesson/[id]", params: { id: l.id } })}
                >
                  <VIcon name="play" size={16} color="#FFFFFF" />
                  <Text style={s.startText}>{l.completed ? "Practice again" : "Start lesson"}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <FiltersModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        colors={colors}
        levelFilter={levelFilter}
        setLevelFilter={setLevelFilter}
        maxMinutes={maxMinutes}
        setMaxMinutes={setMaxMinutes}
      />
    </View>
  );
}

function FiltersModal({
  open, onClose, colors, levelFilter, setLevelFilter, maxMinutes, setMaxMinutes,
}: {
  open: boolean;
  onClose: () => void;
  colors: LearnPalette;
  levelFilter: Level | null;
  setLevelFilter: (l: Level | null) => void;
  maxMinutes: number | null;
  setMaxMinutes: (n: number | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const s = makeStyles(colors);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable testID="learn-lessons-filters-backdrop" style={s.sheetBackdrop} onPress={onClose} />
      <BoundedSheet testID="learn-lessons-filters-sheet" style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Filters</Text>
          <Pressable testID="learn-lessons-filters-reset" hitSlop={12} onPress={() => { setLevelFilter(null); setMaxMinutes(null); }}>
            <Text style={s.sheetReset}>Reset</Text>
          </Pressable>
        </View>

        <Text style={s.sheetLabel}>Level</Text>
        <View style={s.sheetRow}>
          {LEVELS.map((lv) => (
            <Pressable
              key={lv}
              testID={`learn-lessons-level-${lv}`}
              onPress={() => setLevelFilter(levelFilter === lv ? null : lv)}
              style={[s.chip, levelFilter === lv && s.chipActive]}
            >
              <Text style={[s.chipText, levelFilter === lv && s.chipTextActive]}>{lv}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sheetLabel}>Max duration</Text>
        <View style={s.sheetRow}>
          {[15, 25, 40].map((m) => (
            <Pressable
              key={m}
              testID={`learn-lessons-duration-${m}`}
              onPress={() => setMaxMinutes(maxMinutes === m ? null : m)}
              style={[s.chip, maxMinutes === m && s.chipActive]}
            >
              <Text style={[s.chipText, maxMinutes === m && s.chipTextActive]}>≤ {m} min</Text>
            </Pressable>
          ))}
        </View>

        <Pressable testID="learn-lessons-filters-apply" style={s.applyBtn} onPress={onClose}>
          <Text style={s.applyText}>Apply</Text>
        </Pressable>
      </BoundedSheet>
    </Modal>
  );
}

const makeStyles = (c: LearnPalette) =>
  StyleSheet.create({
    searchRow: { flexDirection: "row", gap: 10, marginBottom: 22, alignItems: "center" },
    searchPill: {
      flex: 1, backgroundColor: c.mode === "dark" ? c.cardLight : "#FFFFFF",
      borderRadius: learnRadius.chip, paddingHorizontal: 18, height: 48,
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    searchInput: { flex: 1, color: c.onLight, fontSize: 15, padding: 0 },
    filterBtn: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: c.purple,
      alignItems: "center", justifyContent: "center",
    },
    filterBadge: {
      position: "absolute", top: -2, right: -2,
      minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.cardCoral,
      alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
    },
    filterBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
    section: { color: c.text, fontSize: 22, fontWeight: "800", marginBottom: 16 },
    lessonCard: {
      backgroundColor: c.mode === "dark" ? c.cardLight : "#FFFFFF",
      borderRadius: 24, padding: 18,
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    lessonTitle: { color: c.onLight, fontSize: 20, fontWeight: "800", lineHeight: 26, marginBottom: 10 },
    lessonDesc: { color: "#3E3E48", fontSize: 14, lineHeight: 20, marginBottom: 12 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginBottom: 14, alignItems: "center" },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaText: { color: "#0B0B0F", fontSize: 13, fontWeight: "600" },
    startBtn: {
      backgroundColor: c.onLight, borderRadius: learnRadius.chip, paddingVertical: 14,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    startText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
    sheetBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: {
      position: "absolute", left: 0, right: 0, bottom: 0,
      backgroundColor: c.mode === "dark" ? c.surface : "#FFFFFF",
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 20, paddingTop: 12,
      borderTopWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    sheetHandle: {
      width: 40, height: 4, borderRadius: 2, backgroundColor: c.textFaint,
      alignSelf: "center", marginBottom: 12,
    },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sheetTitle: { color: c.text, fontSize: 20, fontWeight: "800" },
    sheetReset: { color: c.cardPurple, fontSize: 14, fontWeight: "700" },
    sheetLabel: { color: c.textDim, fontSize: 13, fontWeight: "700", marginTop: 12, marginBottom: 8, textTransform: "uppercase" },
    sheetRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    chip: {
      minHeight: 44, justifyContent: "center",
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
      backgroundColor: c.surfaceRaised, borderWidth: 1,
      borderColor: c.mode === "light" ? c.border : "transparent",
    },
    chipActive: { backgroundColor: c.cardPurple, borderColor: c.cardPurple },
    chipText: { color: c.text, fontSize: 13, fontWeight: "700" },
    chipTextActive: { color: "#0B0B0F" },
    applyBtn: {
      marginTop: 20, backgroundColor: c.cardPurple, borderRadius: 999, paddingVertical: 14,
      alignItems: "center",
    },
    applyText: { color: "#0B0B0F", fontSize: 16, fontWeight: "800" },
  });
