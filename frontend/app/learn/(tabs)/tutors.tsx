import { VIcon } from "@/src/learn/Icon";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/utils/api";
import { vocabApi } from "@/src/learn/api";
import { useLearnTheme } from "@/src/learn/ThemeContext";
import { LearnPalette, learnRadius } from "@/src/learn/theme";

type ProTutor = {
  id: string;
  name: string;
  avatar_url?: string | null;
  headline?: string;
  native_accent?: string;
  rating?: number;
  reviews_count?: number;
  lessons_taught?: number;
  students_count?: number;
  specialties?: string[];
};

type SortMode = "top" | "most-lessons" | "newest";

export default function VocabTutors() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useLearnTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [tutors, setTutors] = useState<ProTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("top");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [accent, setAccent] = useState<string | null>(null);

  const cardBgs = [colors.cardMint, colors.cardPurple, colors.cardLime];

  const load = useCallback(async () => {
    try {
      const [tuts, marks] = await Promise.all([
        api.get<ProTutor[]>("/pro/tutors"),
        vocabApi.myBookmarks().catch(() => ({ tutors: [], words: [], lessons: [] })),
      ]);
      setTutors(Array.isArray(tuts) ? tuts : []);
      setBookmarks(new Set((marks.tutors || []).map((b: any) => b.target_id)));
    } catch {
      setTutors([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    let list = [...tutors];
    if (minRating !== null) list = list.filter((t) => (t.rating ?? 5) >= minRating);
    if (accent) list = list.filter((t) => (t.native_accent || "").toLowerCase().includes(accent.toLowerCase()));
    if (sort === "top") list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === "most-lessons") list.sort((a, b) => (b.lessons_taught ?? 0) - (a.lessons_taught ?? 0));
    return list;
  }, [tutors, sort, minRating, accent]);

  const accents = useMemo(() => {
    const set = new Set<string>();
    tutors.forEach((t) => t.native_accent && set.add(t.native_accent));
    return Array.from(set);
  }, [tutors]);

  const activeFilters = (minRating !== null ? 1 : 0) + (accent ? 1 : 0) + (sort !== "top" ? 1 : 0);

  const toggleBookmark = async (tutorId: string) => {
    // Optimistic update
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(tutorId)) next.delete(tutorId); else next.add(tutorId);
      return next;
    });
    try {
      await vocabApi.toggleBookmark("tutor", tutorId);
    } catch {
      // revert on failure
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(tutorId)) next.delete(tutorId); else next.add(tutorId);
        return next;
      });
    }
  };

  return (
    <View testID="learn-tutors-screen" style={{ flex: 1, backgroundColor: colors.bg, paddingLeft: insets.left, paddingRight: insets.right }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 40,
          paddingHorizontal: 18,
        }}
      >
        <Text style={s.title}>Tutors for private online lessons</Text>

        <Pressable testID="learn-tutors-filters-open" style={s.filtersBtn} onPress={() => setFiltersOpen(true)}>
          <VIcon name="options-outline" size={18} color={colors.onLight} />
          <Text style={s.filtersText}>Filters</Text>
          {activeFilters > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </Pressable>

        <Text style={s.section}>Top tutors for your level</Text>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.cardPurple} />
          </View>
        ) : filtered.length === 0 ? (
          <Text style={{ color: colors.textDim, textAlign: "center", marginTop: 20 }}>No tutors match.</Text>
        ) : (
          <View style={{ gap: 14 }}>
            {filtered.map((t, idx) => {
              const bookmarked = bookmarks.has(t.id);
              return (
                <View
                  key={t.id}
                  style={[s.tutorCard, { backgroundColor: cardBgs[idx % cardBgs.length] }]}
                >
                  <View style={s.tutorTopRow}>
                    <View style={s.avatarRing}>
                      {t.avatar_url ? (
                        <Image source={{ uri: t.avatar_url }} style={s.avatar} />
                      ) : (
                        <View style={[s.avatar, { backgroundColor: "#DAD1FF", alignItems: "center", justifyContent: "center" }]}>
                          <Text style={{ fontSize: 22, fontWeight: "800", color: "#4B3F82" }}>{t.name?.[0] ?? "?"}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tutorName}>{t.name}</Text>
                      <Text style={s.tutorRole}>
                        {t.headline || `Certified ${(t.native_accent || "English").toString().replace(/^./, (c) => c.toUpperCase())} Teacher`}
                      </Text>
                    </View>
                    <Pressable onPress={() => toggleBookmark(t.id)} hitSlop={8}>
                      <VIcon name={bookmarked ? "bookmark" : "bookmark-outline"} size={22} color="#0B0B0F" />
                    </Pressable>
                  </View>

                  <View style={s.metaRow}>
                    <VIcon name="star" size={16} color="#0B0B0F" />
                    <Text style={s.metaText}>
                      {(t.rating ?? 5).toFixed(0)} · {t.reviews_count ?? 24} reviews
                    </Text>
                  </View>
                  <View style={s.metaRow}>
                    <View style={s.metaItem}>
                      <VIcon name="school-outline" size={16} color="#0B0B0F" />
                      <Text style={s.metaText}>{t.lessons_taught ?? 256} lessons</Text>
                    </View>
                    <View style={s.metaItem}>
                      <VIcon name="people-outline" size={16} color="#0B0B0F" />
                      <Text style={s.metaText}>{t.students_count ?? 32} students</Text>
                    </View>
                  </View>

                  <View style={s.actionRow}>
                    <Pressable
                      style={({ pressed }) => [s.bookBtn, pressed && { opacity: 0.9 }]}
                      onPress={() => router.push({ pathname: "/learn/tutor/[id]", params: { id: t.id } })}
                    >
                      <VIcon name="calendar-outline" size={16} color="#FFFFFF" />
                      <Text style={s.bookText}>Book lesson</Text>
                    </Pressable>
                    <Pressable style={s.chatBtn} onPress={() => router.push({ pathname: "/learn/tutor/[id]", params: { id: t.id } })}>
                      <VIcon name="chatbubble-ellipses-outline" size={20} color={colors.onLight} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TutorFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        colors={colors}
        sort={sort}
        setSort={setSort}
        minRating={minRating}
        setMinRating={setMinRating}
        accent={accent}
        setAccent={setAccent}
        accents={accents}
      />
    </View>
  );
}

function TutorFiltersModal({
  open, onClose, colors, sort, setSort, minRating, setMinRating, accent, setAccent, accents,
}: {
  open: boolean;
  onClose: () => void;
  colors: LearnPalette;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  minRating: number | null;
  setMinRating: (r: number | null) => void;
  accent: string | null;
  setAccent: (a: string | null) => void;
  accents: string[];
}) {
  const insets = useSafeAreaInsets();
  const s = makeStyles(colors);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable testID="learn-tutors-filters-backdrop" style={s.sheetBackdrop} onPress={onClose} />
      <BoundedSheet testID="learn-tutors-filters-sheet" style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Filters</Text>
          <Pressable testID="learn-tutors-filters-reset" hitSlop={12} onPress={() => { setSort("top"); setMinRating(null); setAccent(null); }}>
            <Text style={s.sheetReset}>Reset</Text>
          </Pressable>
        </View>

        <Text style={s.sheetLabel}>Sort by</Text>
        <View style={s.sheetRow}>
          {[["top", "Top rated"], ["most-lessons", "Most lessons"], ["newest", "Newest"]].map(([v, l]) => (
            <Pressable
              key={v}
              testID={`learn-tutors-sort-${v}`}
              onPress={() => setSort(v as SortMode)}
              style={[s.chip, sort === v && s.chipActive]}
            >
              <Text style={[s.chipText, sort === v && s.chipTextActive]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sheetLabel}>Minimum rating</Text>
        <View style={s.sheetRow}>
          {[3, 4, 5].map((r) => (
            <Pressable
              key={r}
              testID={`learn-tutors-rating-${r}`}
              onPress={() => setMinRating(minRating === r ? null : r)}
              style={[s.chip, minRating === r && s.chipActive]}
            >
              <Text style={[s.chipText, minRating === r && s.chipTextActive]}>{r}+ ★</Text>
            </Pressable>
          ))}
        </View>

        {accents.length > 0 && (
          <>
            <Text style={s.sheetLabel}>Accent</Text>
            <View style={s.sheetRow}>
              {accents.map((a) => (
                <Pressable
                  key={a}
                  testID={`learn-tutors-accent-${a}`}
                  onPress={() => setAccent(accent === a ? null : a)}
                  style={[s.chip, accent === a && s.chipActive]}
                >
                  <Text style={[s.chipText, accent === a && s.chipTextActive]}>{a}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Pressable testID="learn-tutors-filters-apply" style={s.applyBtn} onPress={onClose}>
          <Text style={s.applyText}>Apply</Text>
        </Pressable>
      </BoundedSheet>
    </Modal>
  );
}

const makeStyles = (c: LearnPalette) =>
  StyleSheet.create({
    title: { color: c.text, fontSize: 28, fontWeight: "800", lineHeight: 34, marginBottom: 20 },
    filtersBtn: {
      backgroundColor: c.mode === "dark" ? c.cardLight : "#FFFFFF",
      borderRadius: learnRadius.chip, height: 52, flexDirection: "row",
      alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24,
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    filterBadge: {
      marginLeft: 6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.cardCoral,
      alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
    },
    filterBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
    filtersText: { color: c.onLight, fontSize: 16, fontWeight: "700" },
    section: { color: c.text, fontSize: 20, fontWeight: "800", marginBottom: 14 },
    tutorCard: { borderRadius: 24, padding: 14 },
    tutorTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    avatarRing: {
      width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: "#F0715C",
      alignItems: "center", justifyContent: "center", overflow: "hidden",
    },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    tutorName: { color: c.onLight, fontSize: 18, fontWeight: "800" },
    tutorRole: { color: "#2A2A34", fontSize: 13, fontWeight: "500", marginTop: 2 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 20, alignItems: "center", marginTop: 4, marginBottom: 6 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { color: "#0B0B0F", fontSize: 13, fontWeight: "600" },
    actionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    bookBtn: {
      flex: 1, backgroundColor: c.onLight, borderRadius: learnRadius.chip, paddingVertical: 14,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    bookText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
    chatBtn: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFFFFF",
      alignItems: "center", justifyContent: "center",
    },
    sheetBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: {
      position: "absolute", left: 0, right: 0, bottom: 0,
      backgroundColor: c.mode === "dark" ? c.surface : "#FFFFFF",
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 20, paddingTop: 12,
      borderTopWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.textFaint, alignSelf: "center", marginBottom: 12 },
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
    applyBtn: { marginTop: 20, backgroundColor: c.cardPurple, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
    applyText: { color: "#0B0B0F", fontSize: 16, fontWeight: "800" },
  });
