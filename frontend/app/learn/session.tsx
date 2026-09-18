import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { api } from "@/src/utils/api";
import { learnColors } from "@/src/learn/theme";

interface Card {
  vocab_id: string;
  word?: string | null;
  meaning?: string | null;
  level?: string | null;
  language?: string | null;
  is_new?: boolean;
}

export default function LearnSession() {
  const router = useRouter();
  const { language } = useLocalSearchParams<{ language?: string }>();
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const flip = useSharedValue(0);
  const styles = useMemo(() => makeStyles(), []);

  useEffect(() => {
    flip.value = withTiming(flipped ? 1 : 0, { duration: 380 });
  }, [flipped, flip]);

  const frontStyle = useAnimatedStyle(() => {
    const rotate = interpolate(flip.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotate}deg` }],
      opacity: flip.value < 0.5 ? 1 : 0,
    };
  });
  const backStyle = useAnimatedStyle(() => {
    const rotate = interpolate(flip.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotate}deg` }],
      opacity: flip.value >= 0.5 ? 1 : 0,
    };
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ cards: Card[] }>(
          language ? `/learn/session?language=${language}` : "/learn/session",
        );
        setCards(data.cards);
      } catch {
        // Not authenticated / offline — leave cards empty; UI will render the
        // "Session complete!" empty state gracefully.
      } finally {
        setLoading(false);
      }
    })();
  }, [language]);

  const current = cards[idx];

  const grade = async (g: "correct" | "hard" | "wrong") => {
    if (!current || busy) return;
    setBusy(true);
    try {
      await api.post("/learn/review", { vocab_id: current.vocab_id, grade: g });
      if (g === "correct") setCorrectCount((n) => n + 1);
      if (g === "wrong") setWrongCount((n) => n + 1);
    } catch {
      // ignore — continue the session even on network hiccup
    } finally {
      setBusy(false);
      setFlipped(false);
      setIdx(idx + 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={learnColors.yellow} />
      </View>
    );
  }

  if (!current) {
    // Session complete state
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Session complete!</Text>
          <Text style={styles.doneSub}>
            {correctCount} correct · {wrongCount} to revisit
          </Text>
          <Pressable
            testID="learn-session-done-btn"
            onPress={() => router.replace("/learn/dashboard")}
            style={styles.doneBtn}
          >
            <Text style={styles.doneBtnText}>Back to Learn</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          testID="learn-session-close"
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.progress}>
          {idx + 1} / {cards.length}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressBarWrap}>
        <View
          style={[
            styles.progressBar,
            { width: `${((idx + 1) / cards.length) * 100}%` },
          ]}
        />
      </View>

      {/* Flashcard with 3D flip animation */}
      <Pressable
        testID="learn-session-card"
        style={styles.cardWrap}
        onPress={() => setFlipped((f) => !f)}
      >
        <Animated.View style={[styles.card, styles.cardFront, frontStyle]}>
          <View style={styles.badgeRow}>
            {current.is_new ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            ) : null}
            {current.level ? (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  {current.level.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.word}>{current.word}</Text>
          <View style={styles.flipHintRow}>
            <Ionicons name="sync" size={14} color="#0B0B0F" />
            <Text style={styles.tapHint}>Tap card to reveal meaning</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
          <Text style={styles.backEyebrow}>Meaning</Text>
          <Text style={styles.meaning}>{current.meaning}</Text>
          <View style={styles.flipHintRow}>
            <Ionicons name="sync" size={14} color="#FFFFFF" />
            <Text style={[styles.tapHint, { color: "#FFFFFF", opacity: 0.7 }]}>
              Grade your answer below
            </Text>
          </View>
        </Animated.View>
      </Pressable>

      {/* Grade buttons */}
      <View style={styles.gradeRow}>
        <GradeBtn
          testID="learn-session-wrong-btn"
          label="Wrong"
          icon="close"
          color="#F87171"
          disabled={!flipped || busy}
          onPress={() => grade("wrong")}
        />
        <GradeBtn
          testID="learn-session-hard-btn"
          label="Hard"
          icon="hourglass"
          color="#FBBF24"
          disabled={!flipped || busy}
          onPress={() => grade("hard")}
        />
        <GradeBtn
          testID="learn-session-correct-btn"
          label="Correct"
          icon="checkmark"
          color={learnColors.green}
          disabled={!flipped || busy}
          onPress={() => grade("correct")}
        />
      </View>
    </SafeAreaView>
  );
}

const GradeBtn = ({
  label,
  icon,
  color,
  onPress,
  disabled,
  testID,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      gradeStyles.btn,
      { backgroundColor: color },
      (pressed || disabled) && { opacity: 0.6 },
    ]}
  >
    <Ionicons name={icon} size={18} color="#0B0B0F" />
    <Text style={gradeStyles.label}>{label}</Text>
  </Pressable>
);

const gradeStyles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 999,
  },
  label: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: "#0B0B0F",
  },
});

const makeStyles = () =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: learnColors.bg },
    centered: {
      flex: 1,
      backgroundColor: learnColors.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    progress: {
      fontFamily: fonts.textBold,
      color: "#FFFFFF",
      fontSize: 13,
    },
    progressBarWrap: {
      height: 4,
      backgroundColor: learnColors.surfaceRaised,
      marginHorizontal: 20,
      borderRadius: 2,
    },
    progressBar: {
      height: 4,
      borderRadius: 2,
      backgroundColor: learnColors.yellow,
    },
    cardWrap: {
      flex: 1,
      margin: 20,
    },
    card: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 28,
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      backfaceVisibility: "hidden",
    },
    cardFront: {
      backgroundColor: learnColors.yellow,
    },
    cardBack: {
      backgroundColor: "#25252E",
      borderWidth: 1,
      borderColor: learnColors.border,
    },
    backEyebrow: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: learnColors.yellow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    flipHintRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    badgeRow: {
      position: "absolute",
      top: 18,
      left: 18,
      right: 18,
      flexDirection: "row",
      gap: 6,
    },
    newBadge: {
      backgroundColor: "#0B0B0F",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    newBadgeText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },
    levelBadge: {
      backgroundColor: "rgba(0,0,0,0.14)",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    levelBadgeText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: "#0B0B0F",
      letterSpacing: 0.5,
    },
    word: {
      fontFamily: fonts.displayBold,
      fontSize: 40,
      color: "#0B0B0F",
      textAlign: "center",
    },
    meaning: {
      fontFamily: fonts.displayBold,
      fontSize: 22,
      color: "#FFFFFF",
      textAlign: "center",
      lineHeight: 30,
    },
    tapHint: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: "#0B0B0F",
      opacity: 0.55,
    },
    gradeRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    doneEmoji: { fontSize: 72 },
    doneTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: "#FFFFFF",
      marginTop: 6,
    },
    doneSub: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: learnColors.onSurfaceSecondary,
      marginTop: 4,
    },
    doneBtn: {
      backgroundColor: learnColors.yellow,
      borderRadius: 999,
      paddingHorizontal: 26,
      paddingVertical: 14,
      marginTop: 20,
    },
    doneBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: "#0B0B0F",
    },
  });
