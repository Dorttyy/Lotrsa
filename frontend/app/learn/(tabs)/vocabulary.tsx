import { VIcon } from "@/src/learn/Icon";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { vocabApi, VocabTopic } from "@/src/learn/api";
import { useLearnTheme } from "@/src/learn/ThemeContext";
import { LearnPalette, learnRadius } from "@/src/learn/theme";

export default function VocabVocabulary() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [topics, setTopics] = useState<VocabTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useLearnTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await vocabApi.listTopics();
      setTopics(data);
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return topics;
    return topics.filter((t) => t.name.toLowerCase().includes(x) || t.subtitle.toLowerCase().includes(x));
  }, [q, topics]);

  const featured = topics.slice(0, 5);

  const chipBg = (col: string) =>
    col === "purple" ? colors.cardPurple : col === "lime" ? colors.cardLime : colors.cardMint;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingLeft: insets.left, paddingRight: insets.right }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 40,
          paddingHorizontal: 18,
        }}
      >
        <View style={s.searchPill}>
          <VIcon name="search" size={18} color="#7A7A85" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search topics"
            placeholderTextColor="#7A7A85"
            style={s.searchInput}
          />
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.cardPurple} />
          </View>
        ) : (
          <>
            <Text style={s.section}>Topics for you</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16, gap: 12 }}
              style={{ marginHorizontal: -18, paddingHorizontal: 18 }}
            >
              {featured.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => router.push({ pathname: "/learn/topic/[id]", params: { id: t.id } })}
                  style={[s.smallChip, { backgroundColor: chipBg(t.color) }]}
                >
                  <View style={s.smallChipIcon}>
                    <VIcon name={t.icon as any} size={22} color={colors.onLight} />
                  </View>
                  <View>
                    <Text style={s.smallChipText}>{t.name}</Text>
                    <Text style={s.smallChipSub}>{t.words_learned}/{t.word_count}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.section}>All topics</Text>
            <View style={s.grid}>
              {shown.map((t) => (
                <Pressable
                  key={t.id}
                  style={[s.tile, { backgroundColor: chipBg(t.color) }]}
                  onPress={() => router.push({ pathname: "/learn/topic/[id]", params: { id: t.id } })}
                >
                  <View style={s.tileIcon}>
                    <VIcon name={t.icon as any} size={22} color={colors.onLight} />
                  </View>
                  <View>
                    <Text style={s.tileTitle}>{t.name}</Text>
                    <Text style={s.tileSub}>{t.subtitle}</Text>
                    <View style={s.tileTrack}>
                      <View style={[s.tileFill, { width: `${t.word_count ? Math.min(100, (t.words_learned / t.word_count) * 100) : 0}%` }]} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: LearnPalette) =>
  StyleSheet.create({
    searchPill: {
      backgroundColor: c.mode === "dark" ? c.cardLight : "#FFFFFF",
      borderRadius: learnRadius.chip,
      paddingHorizontal: 18, height: 48, flexDirection: "row",
      alignItems: "center", gap: 10, marginBottom: 22,
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    searchInput: { flex: 1, color: c.onLight, fontSize: 15, padding: 0 },
    section: { color: c.text, fontSize: 22, fontWeight: "800", marginBottom: 14, marginTop: 4 },
    smallChip: {
      width: 118, height: 118, borderRadius: 22, padding: 12,
      justifyContent: "space-between", marginBottom: 22,
    },
    smallChipIcon: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.55)",
      alignItems: "center", justifyContent: "center",
    },
    smallChipText: { color: c.onLight, fontSize: 14, fontWeight: "800" },
    smallChipSub: { color: "#2A2A34", fontSize: 11, fontWeight: "600", marginTop: 2 },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    tile: {
      width: "48%", minHeight: 168, borderRadius: 22, padding: 14, marginBottom: 12,
      justifyContent: "space-between",
    },
    tileIcon: {
      width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.45)",
      alignItems: "center", justifyContent: "center",
    },
    tileTitle: { color: c.onLight, fontSize: 17, fontWeight: "800", marginBottom: 2 },
    tileSub: { color: "#2A2A34", fontSize: 12, fontWeight: "500", lineHeight: 16, marginBottom: 8 },
    tileTrack: {
      height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.15)", overflow: "hidden",
    },
    tileFill: { height: "100%", backgroundColor: "#0B0B0F", borderRadius: 2 },
  });
