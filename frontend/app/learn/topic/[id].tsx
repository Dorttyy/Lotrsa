import { VIcon } from "@/src/learn/Icon";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { vocabApi, VocabTopic, VocabWord } from "@/src/learn/api";
import { useAuth } from "@/src/context/AuthContext";
import { useLearnTheme } from "@/src/learn/ThemeContext";
import { LearnPalette, learnRadius } from "@/src/learn/theme";

type Mode = "flashcards" | "list";

export default function TopicDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useLearnTheme();
  const { user } = useAuth();
  const learningLang = user?.learning_language || undefined;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [topic, setTopic] = useState<VocabTopic | null>(null);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("flashcards");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flip = useMemo(() => new Animated.Value(0), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, w] = await Promise.all([vocabApi.getTopic(id), vocabApi.listWords(id, learningLang)]);
      setTopic(t);
      setWords(w);
      // Start at first non-known word
      const first = w.findIndex((x) => x.status !== "known");
      setIdx(first >= 0 ? first : 0);
    } finally {
      setLoading(false);
    }
  }, [id, learningLang]);
  useEffect(() => { load(); }, [load]);

  const current = words[idx];

  const doFlip = () => {
    Animated.timing(flip, {
      toValue: flipped ? 0 : 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  const mark = async (status: "known" | "learning") => {
    if (!current) return;
    try {
      await vocabApi.setWordProgress(current.id, status);
      setWords((prev) => prev.map((w, i) => (i === idx ? { ...w, status } : w)));
    } catch { /* ignore */ }
    // Advance
    setFlipped(false);
    flip.setValue(0);
    setIdx((i) => Math.min(i + 1, words.length - 1));
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.cardPurple} />
      </View>
    );
  }
  if (!topic) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textDim }}>Topic not found.</Text>
      </View>
    );
  }

  const progressPct = topic.word_count ? (topic.words_learned / topic.word_count) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: insets.bottom }}>
      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.roundBtn}>
          <VIcon name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{topic.name}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ paddingHorizontal: 18 }}>
        <View style={s.topicHero}>
          <View style={s.heroIconWrap}>
            <VIcon name={topic.icon as any} size={26} color={colors.onLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroSub}>{topic.subtitle}</Text>
            <Text style={s.heroStats}>{topic.words_learned} / {topic.word_count} words learned</Text>
            <View style={s.heroTrack}>
              <View style={[s.heroFill, { width: `${Math.min(100, progressPct)}%` }]} />
            </View>
          </View>
        </View>

        <View style={s.modeRow}>
          <Pressable
            onPress={() => setMode("flashcards")}
            style={[s.modeBtn, mode === "flashcards" && s.modeBtnActive]}
          >
            <VIcon name="albums-outline" size={16} color={mode === "flashcards" ? "#0B0B0F" : colors.text} />
            <Text style={[s.modeText, mode === "flashcards" && s.modeTextActive]}>Flashcards</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("list")}
            style={[s.modeBtn, mode === "list" && s.modeBtnActive]}
          >
            <VIcon name="list-outline" size={16} color={mode === "list" ? "#0B0B0F" : colors.text} />
            <Text style={[s.modeText, mode === "list" && s.modeTextActive]}>All words</Text>
          </Pressable>
        </View>
      </View>

      {mode === "flashcards" ? (
        <View style={s.flashArea}>
          {current ? (
            <>
              <Text style={s.stepCounter}>Card {idx + 1} of {words.length}</Text>
              <Pressable onPress={doFlip} style={s.cardStack}>
                <Animated.View style={[s.cardFace, { transform: [{ rotateY: frontRotate }] }]}>
                  <Text style={s.cardHint}>Tap to flip</Text>
                  <Text style={s.cardTerm}>{current.term}</Text>
                  <Text style={s.cardExample}>{current.example}</Text>
                </Animated.View>
                <Animated.View style={[s.cardFace, s.cardBack, { transform: [{ rotateY: backRotate }] }]}>
                  <Text style={s.cardHint}>Meaning</Text>
                  <Text style={s.cardTranslation}>{current.translation}</Text>
                  {current.source_term && current.source_term !== current.term ? (
                    <Text style={s.cardSource}>{current.source_term}</Text>
                  ) : null}
                </Animated.View>
              </Pressable>
              <View style={s.actionRow}>
                <Pressable style={[s.actionBtn, { backgroundColor: colors.cardCoral }]} onPress={() => mark("learning")}>
                  <VIcon name="refresh" size={16} color="#FFFFFF" />
                  <Text style={s.actionText}>Practice again</Text>
                </Pressable>
                <Pressable style={[s.actionBtn, { backgroundColor: colors.cardMintDeep }]} onPress={() => mark("known")}>
                  <VIcon name="checkmark" size={16} color="#0B0B0F" />
                  <Text style={[s.actionText, { color: "#0B0B0F" }]}>Got it</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <VIcon name="trophy-outline" size={48} color={colors.cardPurple} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 12 }}>All done!</Text>
              <Text style={{ color: colors.textDim, marginTop: 4 }}>Come back tomorrow to review.</Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {words.map((w) => (
            <View key={w.id} style={s.wordRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.wordTerm}>{w.term}</Text>
                <Text style={s.wordTranslation}>{w.translation}</Text>
              </View>
              <StatusPill status={w.status} colors={colors} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function StatusPill({ status, colors }: { status: string; colors: LearnPalette }) {
  const bg = status === "known" ? colors.cardMintDeep : status === "learning" ? colors.cardCoral : colors.surfaceRaised;
  const fg = status === "new" ? colors.text : "#0B0B0F";
  const label = status === "known" ? "Known" : status === "learning" ? "Learning" : "New";
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: LearnPalette) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 18, paddingBottom: 10,
    },
    roundBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceRaised,
      alignItems: "center", justifyContent: "center",
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: "800" },
    topicHero: {
      flexDirection: "row", gap: 14, alignItems: "center",
      backgroundColor: c.cardPurpleSoft, borderRadius: 22, padding: 16, marginBottom: 16,
    },
    heroIconWrap: {
      width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.55)",
      alignItems: "center", justifyContent: "center",
    },
    heroSub: { color: "#2A2A34", fontSize: 13, fontWeight: "600" },
    heroStats: { color: c.onLight, fontSize: 15, fontWeight: "800", marginTop: 3 },
    heroTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.15)", overflow: "hidden", marginTop: 8 },
    heroFill: { height: "100%", backgroundColor: "#0B0B0F" },
    modeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
    modeBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      paddingVertical: 10, borderRadius: 999, backgroundColor: c.surfaceRaised,
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    modeBtnActive: { backgroundColor: c.cardPurple, borderColor: c.cardPurple },
    modeText: { color: c.text, fontSize: 13, fontWeight: "700" },
    modeTextActive: { color: "#0B0B0F" },
    flashArea: { flex: 1, paddingHorizontal: 18, paddingTop: 6 },
    stepCounter: { color: c.textDim, fontSize: 12, fontWeight: "700", marginBottom: 10, textAlign: "center" },
    cardStack: { flex: 1, alignItems: "stretch", justifyContent: "center", marginBottom: 20 },
    cardFace: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: c.cardLime, borderRadius: learnRadius.lg, padding: 24,
      alignItems: "center", justifyContent: "center",
      backfaceVisibility: "hidden",
    },
    cardBack: { backgroundColor: c.cardPurple },
    cardHint: { color: "#2A2A34", fontSize: 12, fontWeight: "700", marginBottom: 12, opacity: 0.75, textTransform: "uppercase", letterSpacing: 1 },
    cardTerm: { color: c.onLight, fontSize: 34, fontWeight: "800", textAlign: "center", marginBottom: 12 },
    cardExample: { color: "#2A2A34", fontSize: 14, fontStyle: "italic", textAlign: "center" },
    cardTranslation: { color: c.onLight, fontSize: 26, fontWeight: "800", textAlign: "center" },
    cardSource: { color: "#2A2A34", fontSize: 15, fontStyle: "italic", textAlign: "center", marginTop: 8, opacity: 0.75 },
    actionRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    actionBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      paddingVertical: 14, borderRadius: 999,
    },
    actionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
    wordRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: c.surfaceRaised, borderRadius: 16, padding: 14, marginBottom: 8,
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    wordTerm: { color: c.text, fontSize: 16, fontWeight: "800" },
    wordTranslation: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
