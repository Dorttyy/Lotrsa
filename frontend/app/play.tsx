/**
 * Play — mini-games hub for language learning.
 *
 * Currently offers "Flag Match": user is shown a country flag and must pick
 * the correct language from 4 options. Fast, fun, uses the app's existing
 * flag + language data. Score rolls into the vocab XP pool so daily play
 * counts toward the user's level.
 *
 * Future games (Word Match, Guess the Word) can slot into this hub without
 * changing navigation.
 */

import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { FlagIcon } from "@/src/components/FlagIcon";
import { LANGUAGES } from "@/src/constants/languages";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api } from "@/src/utils/api";

// ── constants ──────────────────────────────────────────────────────────────
const QUESTIONS_PER_ROUND = 10;
const XP_PER_CORRECT = 2;

interface Question {
  answer: string;
  options: string[];
  flag: string;
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildRound = (): Question[] => {
  const pool = shuffle(LANGUAGES).slice(0, QUESTIONS_PER_ROUND);
  return pool.map((correct) => {
    const distractors = shuffle(LANGUAGES.filter((l) => l.code !== correct.code))
      .slice(0, 3)
      .map((l) => l.name);
    return {
      answer: correct.name,
      flag: correct.code,
      options: shuffle([correct.name, ...distractors]),
    };
  });
};

// ── screen ─────────────────────────────────────────────────────────────────
export default function PlayHub() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [flagOpen, setFlagOpen] = useState(false);
  const [round, setRound] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const startFlagMatch = () => {
    setRound(buildRound());
    setIdx(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
    setFlagOpen(true);
  };

  const closeGame = () => {
    setFlagOpen(false);
    setSelected(null);
    setFinished(false);
  };

  const currentQ = round[idx];

  const pick = (option: string) => {
    if (selected) return;
    setSelected(option);
    if (option === currentQ.answer) setScore((s) => s + 1);
  };

  const next = async () => {
    if (idx + 1 >= round.length) {
      setFinished(true);
      // Award XP to the shared vocab pool (best-effort; game works offline too).
      const totalXp = score * XP_PER_CORRECT;
      if (totalXp > 0) {
        try {
          await api.post("/vocab/lessons/play-flag-match/complete", {
            step_count: round.length,
            correct_count: score,
          });
        } catch {
          /* silent — game score is local + best-effort remote XP */
        }
      }
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
  };

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "bottom"]}
      testID="play-hub"
    >
      <View style={styles.header}>
        <Pressable
          testID="play-back"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.headerIcon}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Play</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero */}
        <LinearGradient
          colors={["#22C55E", "#38B6F1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>MINI GAMES</Text>
            <Text style={styles.heroTitle}>Learn by playing</Text>
            <Text style={styles.heroSub}>
              Quick 60-second rounds. Earn XP with every correct answer.
            </Text>
          </View>
          <Ionicons
            name="game-controller"
            size={64}
            color="rgba(255,255,255,0.28)"
          />
        </LinearGradient>

        {/* Featured game — Flag Match */}
        <Text style={styles.section}>Featured</Text>
        <Pressable
          testID="game-flag-match"
          onPress={startFlagMatch}
          style={styles.gameCard}
        >
          <LinearGradient
            colors={["#0E9AE0", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gameGrad}
          >
            <View style={styles.gameIconWrap}>
              <Ionicons name="flag" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gameTitle}>Flag Match</Text>
              <Text style={styles.gameSub}>
                Match flags to their languages · 10 questions
              </Text>
              <View style={styles.gameMetaRow}>
                <View style={styles.gameChip}>
                  <Ionicons name="flash" size={11} color="#FFE7A0" />
                  <Text style={styles.gameChipText}>+2 XP each</Text>
                </View>
                <View style={styles.gameChip}>
                  <Ionicons name="time-outline" size={11} color="#FFFFFF" />
                  <Text style={styles.gameChipText}>~1 min</Text>
                </View>
              </View>
            </View>
            <Ionicons name="play" size={22} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>

        {/* Coming soon */}
        <Text style={styles.section}>Coming soon</Text>
        <View style={styles.comingRow}>
          {[
            { icon: "swap-horizontal" as const, title: "Word Match", sub: "Pair words to translations", bg: "#FEF3C7", tint: "#F59E0B" },
            { icon: "mic" as const, title: "Speak & Match", sub: "Say the word to score", bg: "#DCFCE7", tint: "#22C55E" },
            { icon: "grid" as const, title: "Word Grid", sub: "Find hidden words", bg: "#DBEAFE", tint: "#3B82F6" },
          ].map((c) => (
            <View key={c.title} style={styles.comingCard}>
              <View style={[styles.comingIcon, { backgroundColor: c.bg }]}>
                <Ionicons name={c.icon} size={22} color={c.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.comingTitle}>{c.title}</Text>
                <Text style={styles.comingSub}>{c.sub}</Text>
              </View>
              <View style={styles.soonPill}>
                <Text style={styles.soonText}>SOON</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Flag Match game */}
      <Modal
        visible={flagOpen}
        animationType="slide"
        onRequestClose={closeGame}
      >
        <SafeAreaView style={styles.gameScreen} edges={["top", "bottom"]}>
          <View style={styles.gameHeader}>
            <Pressable
              testID="game-close"
              onPress={closeGame}
              hitSlop={10}
              style={styles.headerIcon}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((idx + (finished ? 1 : 0)) / round.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {finished ? round.length : idx + 1} / {round.length}
              </Text>
            </View>
            <View style={styles.scoreChip}>
              <Ionicons name="star" size={13} color="#FFD43D" />
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          </View>

          {finished ? (
            <View style={styles.finishBody}>
              <Ionicons name="trophy" size={64} color="#FFD43D" />
              <Text style={styles.finishTitle}>Well played!</Text>
              <Text style={styles.finishScore}>
                {score} / {round.length}
              </Text>
              <Text style={styles.finishSub}>
                +{score * XP_PER_CORRECT} XP added to your Vocab pool.
              </Text>
              <Pressable
                testID="game-play-again"
                onPress={startFlagMatch}
                style={styles.finishBtn}
              >
                <Ionicons name="refresh" size={17} color="#0E7D3F" />
                <Text style={styles.finishBtnText}>Play again</Text>
              </Pressable>
              <Pressable
                testID="game-exit"
                onPress={closeGame}
                style={styles.finishBtnGhost}
              >
                <Text style={styles.finishBtnGhostText}>Exit</Text>
              </Pressable>
            </View>
          ) : (
            currentQ && (
              <View style={styles.gameBody}>
                <Text style={styles.gameQuestion}>
                  Which language uses this flag?
                </Text>
                <View style={styles.flagStage}>
                  <FlagIcon code={currentQ.flag} size={140} />
                </View>
                <View style={styles.optionCol}>
                  {currentQ.options.map((opt) => {
                    const isSelected = selected === opt;
                    const isCorrect = opt === currentQ.answer;
                    const showCorrect = selected !== null && isCorrect;
                    const showWrong = isSelected && !isCorrect;
                    return (
                      <Pressable
                        key={opt}
                        testID={`game-option-${opt}`}
                        onPress={() => pick(opt)}
                        style={[
                          styles.option,
                          showCorrect && styles.optionCorrect,
                          showWrong && styles.optionWrong,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            (showCorrect || showWrong) && styles.optionTextInverted,
                          ]}
                        >
                          {opt}
                        </Text>
                        {showCorrect ? (
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        ) : showWrong ? (
                          <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                {selected ? (
                  <Pressable
                    testID="game-next"
                    onPress={next}
                    style={styles.nextBtn}
                  >
                    <Text style={styles.nextBtnText}>
                      {idx + 1 === round.length ? "See results" : "Next"}
                    </Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </Pressable>
                ) : null}
              </View>
            )
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
    },
    heroEyebrow: {
      color: "rgba(255,255,255,0.85)",
      fontFamily: fonts.textBold,
      fontSize: 11,
      letterSpacing: 0.8,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 22,
      marginTop: 4,
    },
    heroSub: {
      color: "rgba(255,255,255,0.9)",
      fontFamily: fonts.text,
      fontSize: 12.5,
      marginTop: 4,
    },
    section: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.onSurface,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    gameCard: {
      marginHorizontal: spacing.lg,
    },
    gameGrad: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
    },
    gameIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "rgba(255,255,255,0.22)",
      alignItems: "center",
      justifyContent: "center",
    },
    gameTitle: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 17,
    },
    gameSub: {
      color: "rgba(255,255,255,0.88)",
      fontFamily: fonts.text,
      fontSize: 12.5,
      marginTop: 2,
    },
    gameMetaRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 8,
    },
    gameChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(0,0,0,0.18)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    gameChipText: {
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 11,
    },
    comingRow: {
      paddingHorizontal: spacing.lg,
      gap: 10,
    },
    comingCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    comingIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    comingTitle: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurface,
    },
    comingSub: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    soonPill: {
      backgroundColor: colors.surfaceTertiary,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 999,
    },
    soonText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: colors.onSurfaceSecondary,
      letterSpacing: 0.6,
    },
    // ── in-game ────────────────────────────────────────────────
    gameScreen: {
      flex: 1,
      backgroundColor: "#0F172A",
    },
    gameHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: spacing.md,
    },
    progressWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.12)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#22C55E",
      borderRadius: 3,
    },
    progressText: {
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 12,
    },
    scoreChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.14)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    scoreText: {
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 12.5,
    },
    gameBody: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    gameQuestion: {
      color: "rgba(255,255,255,0.85)",
      fontFamily: fonts.textBold,
      fontSize: 14,
      textAlign: "center",
    },
    flagStage: {
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
      padding: 18,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: 100,
    },
    optionCol: {
      alignSelf: "stretch",
      gap: 10,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 14,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    optionCorrect: {
      backgroundColor: "#22C55E",
    },
    optionWrong: {
      backgroundColor: "#EF4444",
    },
    optionText: {
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 15,
    },
    optionTextInverted: {
      color: "#FFFFFF",
    },
    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#0E9AE0",
      paddingHorizontal: 22,
      paddingVertical: 14,
      borderRadius: 999,
      marginTop: spacing.xl,
    },
    nextBtnText: {
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 15,
    },
    finishBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      gap: 10,
    },
    finishTitle: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 24,
    },
    finishScore: {
      color: "#22C55E",
      fontFamily: fonts.displayBold,
      fontSize: 42,
    },
    finishSub: {
      color: "rgba(255,255,255,0.75)",
      fontFamily: fonts.text,
      fontSize: 13,
      textAlign: "center",
    },
    finishBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#DCFCE7",
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 999,
      marginTop: spacing.md,
    },
    finishBtnText: {
      color: "#0E7D3F",
      fontFamily: fonts.textBold,
      fontSize: 15,
    },
    finishBtnGhost: {
      paddingHorizontal: 22,
      paddingVertical: 10,
    },
    finishBtnGhostText: {
      color: "rgba(255,255,255,0.75)",
      fontFamily: fonts.textBold,
      fontSize: 14,
    },
  });
