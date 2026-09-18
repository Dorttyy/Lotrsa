import { VIcon } from "@/src/learn/Icon";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { vocabApi, VocabLessonFull, VocabLessonStep } from "@/src/learn/api";
import { useAuth } from "@/src/context/AuthContext";
import { useLearnTheme } from "@/src/learn/ThemeContext";
import { LearnPalette, learnRadius } from "@/src/learn/theme";

export default function LessonPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useLearnTheme();
  const { user } = useAuth();
  const learningLang = user?.learning_language || undefined;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [lesson, setLesson] = useState<VocabLessonFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const l = await vocabApi.getLesson(id, learningLang);
      setLesson(l);
    } finally {
      setLoading(false);
    }
  }, [id, learningLang]);
  useEffect(() => { load(); }, [load]);

  const step: VocabLessonStep | undefined = lesson?.steps[idx];
  const total = lesson?.steps.length ?? 0;
  const progressPct = total ? ((idx + (answered ? 1 : 0)) / total) * 100 : 0;

  const onNext = async () => {
    if (!lesson) return;
    if (step?.kind === "vocab") {
      // Mark word as learning when we've seen it
      vocabApi.setWordProgress(step.word_id, "learning").catch(() => undefined);
    }
    if (step?.kind === "quiz" && selected) {
      if (selected === step.answer) {
        setCorrect((n) => n + 1);
        vocabApi.setWordProgress(step.word_id, "known").catch(() => undefined);
      }
    }
    // If moving into 'done', complete the lesson
    const nextIdx = idx + 1;
    if (nextIdx >= lesson.steps.length) {
      // Shouldn't happen — done step is terminal
      router.back();
      return;
    }
    if (lesson.steps[nextIdx].kind === "done") {
      try {
        const res = await vocabApi.completeLesson(lesson.id, { step_count: total, correct_count: correct + (step?.kind === "quiz" && selected === step.answer ? 1 : 0) });
        setXpEarned(res.xp_awarded);
      } catch { /* ignore */ }
    }
    setIdx(nextIdx);
    setSelected(null);
    setAnswered(false);
  };

  if (loading || !lesson) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.cardPurple} />
      </View>
    );
  }

  const nextEnabled = step?.kind === "vocab" || (step?.kind === "quiz" && !!selected);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingLeft: insets.left, paddingRight: insets.right }}>
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.roundBtn}>
          <VIcon name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={s.progressWrap}>
          <View style={[s.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30 + insets.bottom }}>
        <Text style={s.lessonTitle}>{lesson.title}</Text>
        <Text style={s.stepCounter}>Step {Math.min(idx + 1, total)} of {total}</Text>

        {step?.kind === "vocab" && (
          <View style={s.vocabCard}>
            <Text style={s.vocabHint}>Vocabulary</Text>
            <Text style={s.vocabTerm}>{step.term}</Text>
            <Text style={s.vocabTrans}>{step.translation}</Text>
            <View style={s.divider} />
            <Text style={s.vocabExample}>{step.example}</Text>
          </View>
        )}

        {step?.kind === "quiz" && (
          <View style={s.quizCard}>
            <Text style={s.quizPrompt}>{step.prompt}</Text>
            <View style={{ gap: 10 }}>
              {step.options.map((opt) => {
                const isSel = selected === opt;
                const isCorrect = answered && opt === step.answer;
                const isWrongSel = answered && isSel && opt !== step.answer;
                return (
                  <Pressable
                    key={opt}
                    disabled={answered}
                    onPress={() => { setSelected(opt); setAnswered(true); }}
                    style={[
                      s.quizOption,
                      isSel && !answered && s.quizOptionSel,
                      isCorrect && s.quizOptionCorrect,
                      isWrongSel && s.quizOptionWrong,
                    ]}
                  >
                    <Text style={[
                      s.quizOptionText,
                      (isCorrect || isWrongSel) && { color: "#0B0B0F" },
                    ]}>{opt}</Text>
                    {isCorrect && <VIcon name="checkmark-circle" size={20} color="#0B0B0F" />}
                    {isWrongSel && <VIcon name="close-circle" size={20} color="#0B0B0F" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step?.kind === "done" && (
          <View style={s.doneCard}>
            <VIcon name="trophy" size={48} color={"#EABA00"} />
            <Text style={s.doneTitle}>Lesson complete!</Text>
            <Text style={s.doneMsg}>You got {correct} correct.</Text>
            <Text style={s.doneXp}>+{xpEarned ?? lesson.xp_reward} XP</Text>
            <Pressable style={s.doneBtn} onPress={() => router.replace("/learn/(tabs)")}>
              <Text style={s.doneBtnText}>Back to home</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {step?.kind !== "done" && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={[s.nextBtn, !nextEnabled && { opacity: 0.4 }]}
            disabled={!nextEnabled}
            onPress={onNext}
          >
            <Text style={s.nextText}>{step?.kind === "quiz" ? "Continue" : "Next"}</Text>
            <VIcon name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: LearnPalette) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 18, paddingBottom: 12, gap: 12,
    },
    roundBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceRaised,
      alignItems: "center", justifyContent: "center",
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    progressWrap: {
      flex: 1, height: 8, borderRadius: 4, backgroundColor: c.surfaceRaised, overflow: "hidden",
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    progressFill: { height: "100%", backgroundColor: c.cardPurple, borderRadius: 4 },
    lessonTitle: { color: c.text, fontSize: 22, fontWeight: "800", marginBottom: 4 },
    stepCounter: { color: c.textDim, fontSize: 12, fontWeight: "700", marginBottom: 18, textTransform: "uppercase", letterSpacing: 1 },
    vocabCard: { backgroundColor: c.cardLime, borderRadius: learnRadius.lg, padding: 22 },
    vocabHint: { color: "#2A2A34", fontSize: 12, fontWeight: "700", opacity: 0.7, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
    vocabTerm: { color: c.onLight, fontSize: 34, fontWeight: "800", marginBottom: 4 },
    vocabTrans: { color: "#2A2A34", fontSize: 16, fontWeight: "600" },
    divider: { height: 1, backgroundColor: "rgba(0,0,0,0.1)", marginVertical: 16 },
    vocabExample: { color: "#2A2A34", fontSize: 14, fontStyle: "italic", lineHeight: 20 },
    quizCard: { backgroundColor: c.mode === "dark" ? c.surfaceRaised : "#FFFFFF", borderRadius: learnRadius.lg, padding: 22, borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border },
    quizPrompt: { color: c.text, fontSize: 18, fontWeight: "800", marginBottom: 18, lineHeight: 24 },
    quizOption: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16,
      backgroundColor: c.mode === "dark" ? c.surface : c.surfaceRaised,
      borderWidth: 2, borderColor: c.mode === "light" ? c.border : "transparent",
    },
    quizOptionSel: { borderColor: c.cardPurple },
    quizOptionCorrect: { backgroundColor: c.cardMintDeep, borderColor: c.cardMintDeep },
    quizOptionWrong: { backgroundColor: c.cardCoral, borderColor: c.cardCoral },
    quizOptionText: { color: c.text, fontSize: 15, fontWeight: "700", flex: 1 },
    doneCard: { alignItems: "center", paddingVertical: 40 },
    doneTitle: { color: c.text, fontSize: 24, fontWeight: "800", marginTop: 12 },
    doneMsg: { color: c.textDim, fontSize: 14, marginTop: 6 },
    doneXp: { color: c.cardPurple, fontSize: 28, fontWeight: "800", marginTop: 12 },
    doneBtn: { marginTop: 24, backgroundColor: c.cardPurple, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14 },
    doneBtnText: { color: "#0B0B0F", fontSize: 16, fontWeight: "800" },
    footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: c.bg },
    nextBtn: {
      backgroundColor: c.onLight, borderRadius: 999, paddingVertical: 16,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    nextText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  });
