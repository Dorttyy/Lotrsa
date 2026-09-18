import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { fonts } from "@/src/theme";
import { learnColors } from "@/src/learn/theme";

interface Question {
  id: string;
  prompt: string;
  options: { key: string; label: string; level: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "How would you say Hello, my name is Alex.?",
    options: [
      { key: "a", label: "Hola, me llamo Alex.", level: 2 },
      { key: "b", label: "Hola, es Alex.", level: 1 },
      { key: "c", label: "Buenos días, Alex es.", level: 0 },
      { key: "d", label: "I don't know yet", level: 0 },
    ],
  },
  {
    id: "q2",
    prompt: "Which sentence uses the past tense correctly?",
    options: [
      { key: "a", label: "Yo comer una manzana ayer.", level: 0 },
      { key: "b", label: "Yo comí una manzana ayer.", level: 2 },
      { key: "c", label: "Yo como una manzana ayer.", level: 1 },
      { key: "d", label: "I don't know yet", level: 0 },
    ],
  },
  {
    id: "q3",
    prompt: "Pick the natural way to order a coffee.",
    options: [
      { key: "a", label: "Me da un café, por favor.", level: 2 },
      { key: "b", label: "Café dame ahora.", level: 0 },
      { key: "c", label: "Yo quiero café tal vez.", level: 1 },
      { key: "d", label: "I don't know yet", level: 0 },
    ],
  },
  {
    id: "q4",
    prompt: "Which reflects a formal register?",
    options: [
      { key: "a", label: "¿Cómo estás, tío?", level: 1 },
      { key: "b", label: "¿Cómo se encuentra usted?", level: 2 },
      { key: "c", label: "¿Qué pasa?", level: 0 },
      { key: "d", label: "I don't know yet", level: 0 },
    ],
  },
];

const LEVELS = [
  { min: 0, label: "A1 · Beginner", color: learnColors.green, emoji: "🌱" },
  { min: 3, label: "A2 · Elementary", color: learnColors.yellow, emoji: "🌿" },
  { min: 5, label: "B1 · Intermediate", color: "#DABFFF", emoji: "🌳" },
  { min: 7, label: "B2 · Advanced", color: learnColors.orange, emoji: "🚀" },
];

function scoreToLevel(score: number) {
  return LEVELS.reduce((acc, l) => (score >= l.min ? l : acc), LEVELS[0]);
}

export default function LearnAssessment() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const progress = useSharedValue(0);

  const total = QUESTIONS.length;
  const q = QUESTIONS[idx];

  const progressBar = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const answer = (key: string, level: number) => {
    if (answered[q.id]) return; // already answered
    setAnswered({ ...answered, [q.id]: key });
    const newScore = score + level;
    setScore(newScore);
    setTimeout(() => {
      if (idx + 1 >= total) {
        progress.value = withTiming(100, { duration: 400 });
        setDone(true);
      } else {
        setIdx(idx + 1);
        progress.value = withTiming(((idx + 2) / total) * 100, {
          duration: 400,
        });
      }
    }, 380);
  };

  const result = useMemo(() => scoreToLevel(score), [score]);

  if (done) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <Pressable
            testID="learn-assessment-close"
            onPress={() => router.replace("/learn/dashboard")}
            style={styles.iconChip}
            hitSlop={8}
          >
            <Ionicons name="close" size={20} color="#FFF" />
          </Pressable>
          <Text style={styles.h1}>Your level</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.resultBody}>
          <View
            style={[styles.resultCard, { backgroundColor: result.color }]}
          >
            <Text style={styles.resultEmoji}>{result.emoji}</Text>
            <Text style={styles.resultLevel}>{result.label}</Text>
            <Text style={styles.resultSub}>
              Based on {total} answers · {score}/{total * 2} points
            </Text>
          </View>
          <Text style={styles.body}>
            We&apos;ve calibrated your learning plan to this level. You can retake
            the assessment anytime from the Plan tab.
          </Text>
          <Pressable
            testID="learn-assessment-next"
            onPress={() => router.replace("/learn/plan")}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>See my plan</Text>
          </Pressable>
          <Pressable
            testID="learn-assessment-retry"
            onPress={() => {
              setIdx(0);
              setScore(0);
              setAnswered({});
              setDone(false);
              progress.value = 0;
            }}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Retake</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="learn-assessment-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>
          {idx + 1} / {total}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBarWrap}>
        <Animated.View style={[styles.progressBar, progressBar]} />
      </View>

      <Animated.View
        key={q.id}
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(120)}
        style={styles.qWrap}
      >
        <Text style={styles.prompt}>{q.prompt}</Text>
        <View style={styles.options}>
          {q.options.map((opt) => {
            const chosen = answered[q.id] === opt.key;
            return (
              <Pressable
                key={opt.key}
                testID={`learn-assessment-opt-${opt.key}`}
                onPress={() => answer(opt.key, opt.level)}
                style={[
                  styles.option,
                  chosen && {
                    borderColor: learnColors.orange,
                    backgroundColor: "rgba(255,92,31,0.14)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    chosen && { color: "#FFF", fontFamily: fonts.textBold },
                  ]}
                >
                  {opt.label}
                </Text>
                {chosen && (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: learnColors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  progressBarWrap: {
    height: 6,
    marginHorizontal: 20,
    borderRadius: 3,
    backgroundColor: learnColors.surfaceRaised,
    overflow: "hidden",
    marginTop: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: learnColors.orange,
    borderRadius: 3,
  },
  qWrap: {
    flex: 1,
    padding: 20,
    gap: 18,
  },
  prompt: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: "#FFFFFF",
    lineHeight: 30,
    marginTop: 10,
  },
  options: { gap: 10, marginTop: 6 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    backgroundColor: learnColors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
    justifyContent: "space-between",
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.textSemi,
    fontSize: 14,
    color: "#FFFFFF",
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: learnColors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBody: { padding: 20, gap: 16 },
  resultCard: {
    borderRadius: 28,
    padding: 30,
    alignItems: "center",
    gap: 8,
  },
  resultEmoji: { fontSize: 60 },
  resultLevel: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: "#0B0B0F",
    marginTop: 6,
  },
  resultSub: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.75,
  },
  body: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 20,
  },
  primaryBtn: {
    backgroundColor: learnColors.orange,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  secondaryBtn: {
    backgroundColor: learnColors.surface,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
