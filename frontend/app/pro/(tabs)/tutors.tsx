import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { api } from "@/src/utils/api";
import { proColors, proFonts, proRadius, proShadow } from "@/src/pro/theme";

interface ProTutor {
  id: string;
  name: string;
  avatar_url?: string;
  native_accent?: string;
  bio: string;
  specialties: string[];
  teaches: string[];
  rating: number;
  reviews_count: number;
  is_online: boolean;
  hourly_rate: number;
}

const LANGS = [
  { code: "", label: "All" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "ja", label: "Japanese" },
  { code: "fr", label: "French" },
  { code: "zh", label: "Chinese" },
  { code: "it", label: "Italian" },
];

export default function ProTutors() {
  const router = useRouter();
  const [tutors, setTutors] = useState<ProTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.get<ProTutor[]>(
        `/pro/tutors${lang ? `?language=${lang}` : ""}`,
      );
      setTutors(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tutors;
    return tutors.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.bio || "").toLowerCase().includes(q) ||
        t.specialties.some((s) => s.toLowerCase().includes(q)),
    );
  }, [tutors, query]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="pro-tutors-screen">
      <View style={styles.header}>
        <Text style={styles.kicker}>PRO</Text>
        <Text style={styles.title}>Find your tutor</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={proColors.inkFaint} />
        <TextInput
          testID="pro-tutors-search"
          style={styles.searchInput}
          placeholder="Search name or specialty"
          placeholderTextColor={proColors.inkFaint}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {LANGS.map((l) => {
          const active = l.code === lang;
          return (
            <Pressable
              key={l.code || "all"}
              testID={`pro-lang-${l.code || "all"}`}
              onPress={() => setLang(l.code)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {l.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={proColors.terracotta} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No tutors match your search.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`pro-tutor-row-${item.id}`}
              style={styles.card}
              onPress={() => router.push(`/pro/tutor/${item.id}`)}
            >
              <View style={styles.mediaWrap}>
                <Image
                  source={{ uri: item.avatar_url }}
                  style={styles.media}
                  contentFit="cover"
                  transition={150}
                />
                {item.is_online && (
                  <View style={styles.onlineTag}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineTagText}>Online</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.rating}>
                    <Ionicons name="star" size={12} color={proColors.gold} />
                    <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                    <Text style={styles.reviews}>({item.reviews_count})</Text>
                  </View>
                </View>
                <Text style={styles.accent} numberOfLines={1}>
                  {item.native_accent}
                </Text>
                <Text style={styles.bio} numberOfLines={2}>
                  {item.bio}
                </Text>
                <View style={styles.pillRow}>
                  {item.specialties.slice(0, 2).map((s) => (
                    <View key={s} style={styles.pill}>
                      <Text style={styles.pillText} numberOfLines={1}>
                        {s}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.cardFoot}>
                  <Text style={styles.rate}>
                    <Text style={styles.rateNum}>{item.hourly_rate}</Text> min/lesson
                  </Text>
                  <View style={styles.bookBtn}>
                    <Ionicons name="videocam" size={14} color={proColors.onAccent} />
                    <Text style={styles.bookBtnText}>Book</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: proColors.bg },
  header: { paddingHorizontal: 22, paddingTop: 8 },
  kicker: {
    fontFamily: proFonts.sansSemi,
    fontSize: 11,
    letterSpacing: 2,
    color: proColors.terracotta,
  },
  title: {
    fontFamily: proFonts.serifBold,
    fontSize: 28,
    color: proColors.ink,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 22,
    marginTop: 14,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.md,
    borderWidth: 1,
    borderColor: proColors.border,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: proFonts.sans,
    fontSize: 15,
    color: proColors.ink,
    padding: 0,
  },
  chipScroll: { maxHeight: 60 },
  chipRow: { paddingHorizontal: 22, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: proRadius.pill,
    backgroundColor: proColors.surface,
    borderWidth: 1,
    borderColor: proColors.border,
  },
  chipActive: {
    backgroundColor: proColors.ink,
    borderColor: proColors.ink,
  },
  chipText: {
    fontFamily: proFonts.sansSemi,
    fontSize: 13,
    color: proColors.inkSoft,
  },
  chipTextActive: { color: proColors.onAccent },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 22, paddingBottom: 30, gap: 16 },
  empty: {
    fontFamily: proFonts.sans,
    fontSize: 14,
    color: proColors.inkSoft,
    textAlign: "center",
    paddingVertical: 40,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  mediaWrap: {
    width: 104,
    height: 132,
    borderRadius: proRadius.lg,
    overflow: "hidden",
    backgroundColor: proColors.surfaceMuted,
  },
  media: { width: "100%", height: "100%" },
  onlineTag: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: proColors.glassStrong,
    borderRadius: proRadius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: proColors.online },
  onlineTagText: { fontFamily: proFonts.sansSemi, fontSize: 9.5, color: proColors.ink },
  cardBody: { flex: 1, justifyContent: "space-between" },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontFamily: proFonts.sansBold, fontSize: 16, color: proColors.ink, flex: 1 },
  rating: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { fontFamily: proFonts.sansBold, fontSize: 12, color: proColors.ink },
  reviews: { fontFamily: proFonts.sans, fontSize: 11, color: proColors.inkFaint },
  accent: { fontFamily: proFonts.sans, fontSize: 12, color: proColors.inkSoft, marginTop: 1 },
  bio: {
    fontFamily: proFonts.sans,
    fontSize: 12.5,
    color: proColors.inkSoft,
    lineHeight: 18,
    marginTop: 4,
  },
  pillRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  pill: {
    backgroundColor: proColors.sageTint,
    borderRadius: proRadius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 1,
  },
  pillText: { fontFamily: proFonts.sansSemi, fontSize: 11, color: proColors.sage },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rate: { fontFamily: proFonts.sans, fontSize: 12, color: proColors.inkSoft },
  rateNum: { fontFamily: proFonts.sansBold, fontSize: 14, color: proColors.ink },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: proColors.terracotta,
    borderRadius: proRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bookBtnText: { fontFamily: proFonts.sansBold, fontSize: 13, color: proColors.onAccent },
});
