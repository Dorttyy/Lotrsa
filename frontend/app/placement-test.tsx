/**
 * Language Placement Test — 10 questions, easy → hard.
 *
 * Flow: intro → quiz (one question at a time, progress bar) → result.
 * The backend grades the attempt server-side and auto-applies the level to
 * the user profile; Vocab Hub then pre-selects that level.
 */

import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconChip } from "@/src/components/IconChip";
import { useTheme } from "@/src/context/ThemeContext";
import {
  PlacementQuestion,
  PlacementResult,
  vocabApi,
} from "@/src/learn/api";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";

type Stage = "intro" | "quiz" | "result";

const LEVEL_META: Record<string, { icon: string; blurb: string; colors: [string, string] }> = {
  Beginner: {
    icon: "leaf",
    blurb: "Start with everyday words and simple phrases.",
    colors: ["#38B6F1", "#0E82C4"],
  },
  Intermediate: {
    icon: "trending-up",
    blurb: "You handle daily conversations — time to go deeper.",
    colors: ["#60A5FA", "#2563EB"],
  },
  Advanced: {
    icon: "rocket",
    blurb: "Impressive! Nuanced vocabulary awaits you.",
    colors: ["#38B6F1", "#0E82C4"],
  },
};

export default function PlacementTest() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [stage, setStage] = useState<Stage>("intro");
  const [loading, setLoading] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vocabApi.placementQuestions();
      setAttemptId(data.attempt_id);
      setQuestions(data.questions);
      setQIndex(0);
      setAnswers({});
      setSelected(null);
      setStage("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the test.");
    } finally {
      setLoading(false);
    }
  };

  const next = async () => {
    if (!selected) return;
    const q = questions[qIndex];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
      return;
    }
    // Last question — submit.
    setLoading(true);
    setError(null);
    try {
      const res = await vocabApi.placementSubmit(attemptId!, newAnswers);
      setResult(res);
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit the test.");
    } finally {
      setLoading(false);
    }
  };

  const q = questions[qIndex];
  const progress = questions.length ? (qIndex + (selected ? 1 : 0)) / questions.length : 0;
  const meta = result ? LEVEL_META[result.level] ?? LEVEL_META.Beginner : null;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="placement-screen">
      <View style={styles.header}>
        <IconChip
          testID="pt-back"
          tint="neutral"
          icon="chevron-back"
          size={22}
          onPress={() => router.back()}
        />
        <AppTitle variant="navigation" testID="placement-test-header-title" style={styles.headerTitle}>Placement Test</AppTitle>
        <View style={{ width: 36 }} />
      </View>

      {stage === "intro" && (
        <ScrollView contentContainerStyle={styles.introWrap}>
          <LinearGradient
            colors={["#0E9AE0", "#0A6B9E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.introHero}
          >
            <Ionicons name="school" size={44} color="#FFFFFF" />
            <Text style={styles.introTitle}>Find your level</Text>
            <Text style={styles.introSub}>
              Answer 10 quick questions and we&apos;ll place you at the right
              level — Beginner, Intermediate or Advanced.
            </Text>
          </LinearGradient>
          <View style={styles.bulletCard}>
            {[
              { icon: "time" as const, text: "Takes about 2 minutes" },
              { icon: "trending-up" as const, text: "Questions get harder as you go" },
              { icon: "checkmark-circle" as const, text: "Your Vocab level is set automatically" },
            ].map((b) => (
              <View key={b.icon} style={styles.bulletRow}>
                <Ionicons name={b.icon} size={18} color={colors.brand} />
                <Text style={styles.bulletText}>{b.text}</Text>
              </View>
            ))}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            testID="pt-start"
            onPress={start}
            disabled={loading}
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.primaryBtnText}>Start the test</Text>
            )}
          </Pressable>
        </ScrollView>
      )}

      {stage === "quiz" && q && (
        <ScrollView contentContainerStyle={styles.quizWrap}>
          {/* Progress */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${Math.max(4, progress * 100)}%` }]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {qIndex + 1}/{questions.length}
            </Text>
          </View>

          <View style={styles.tierPill}>
            <Text style={styles.tierPillText}>
              {q.tier === "easy" ? "Warm-up" : q.tier === "medium" ? "Getting harder" : "Challenge"}
            </Text>
          </View>
          <Text style={styles.prompt} testID="pt-prompt">
            {q.prompt}
          </Text>

          <View style={styles.options}>
            {q.options.map((opt, i) => {
              const on = selected === opt;
              return (
                <Pressable
                  key={opt}
                  testID={`pt-option-${i}`}
                  onPress={() => setSelected(opt)}
                  style={[styles.option, on && styles.optionOn]}
                >
                  <View style={[styles.optionDot, on && styles.optionDotOn]}>
                    {on && <Ionicons name="checkmark" size={13} color={colors.onBrand} />}
                  </View>
                  <Text style={[styles.optionText, on && styles.optionTextOn]}>
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            testID="pt-next"
            onPress={next}
            disabled={!selected || loading}
            style={[styles.primaryBtn, (!selected || loading) && { opacity: 0.5 }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {qIndex + 1 === questions.length ? "Finish" : "Next"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      )}

      {stage === "result" && result && meta && (
        <ScrollView contentContainerStyle={styles.introWrap}>
          <LinearGradient
            colors={meta.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.introHero}
          >
            <Ionicons name={meta.icon as never} size={44} color="#FFFFFF" />
            <Text style={styles.resultEyebrow}>Your level</Text>
            <Text style={styles.resultLevel} testID="pt-result-level">
              {result.level}
            </Text>
            <Text style={styles.introSub}>{meta.blurb}</Text>
          </LinearGradient>

          <View style={styles.scoreCard} testID="pt-result-score">
            <Text style={styles.scoreBig}>
              {result.score}/{result.total}
            </Text>
            <Text style={styles.scoreLabel}>correct answers</Text>
          </View>

          <View style={styles.appliedRow}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.appliedText}>
              Level applied to your Vocab Hub automatically
            </Text>
          </View>

          <Pressable
            testID="pt-open-vocab"
            onPress={() => router.replace("/vocab-hub")}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Open Vocab Hub</Text>
          </Pressable>
          <Pressable testID="pt-retake" onPress={start} style={styles.ghostBtn}>
            <Text style={styles.ghostBtnText}>Retake the test</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    introWrap: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    introHero: {
      borderRadius: radius.lg,
      padding: spacing.xl,
      alignItems: "center",
      gap: 8,
    },
    introTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 22,
      color: "#FFFFFF",
    },
    introSub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: "rgba(255,255,255,0.92)",
      textAlign: "center",
      lineHeight: 19,
    },
    bulletCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: 12,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    bulletText: {
      fontFamily: fonts.text,
      fontSize: 13.5,
      color: colors.onSurface,
      flex: 1,
    },
    primaryBtn: {
      backgroundColor: colors.brand,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: spacing.sm,
    },
    primaryBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onBrand,
    },
    ghostBtn: {
      alignItems: "center",
      paddingVertical: 10,
    },
    ghostBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
    errorText: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: colors.error,
      textAlign: "center",
    },
    quizWrap: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    progressTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    progressFill: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.brand,
    },
    progressLabel: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      minWidth: 36,
      textAlign: "right",
    },
    tierPill: {
      alignSelf: "flex-start",
      backgroundColor: colors.brandTertiary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    tierPillText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.brand,
    },
    prompt: {
      fontFamily: fonts.displayBold,
      fontSize: 20,
      color: colors.onSurface,
      lineHeight: 28,
    },
    options: { gap: 10 },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    optionOn: {
      borderColor: colors.brand,
      backgroundColor: colors.brandTertiary,
    },
    optionDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.onSurfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    optionDotOn: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    optionText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurface,
      flex: 1,
    },
    optionTextOn: { color: colors.brand },
    resultEyebrow: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: "rgba(255,255,255,0.85)",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    resultLevel: {
      fontFamily: fonts.displayBold,
      fontSize: 32,
      color: "#FFFFFF",
    },
    scoreCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      alignItems: "center",
      gap: 2,
    },
    scoreBig: {
      fontFamily: fonts.displayBold,
      fontSize: 30,
      color: colors.onSurface,
    },
    scoreLabel: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
    },
    appliedRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    appliedText: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
  });
