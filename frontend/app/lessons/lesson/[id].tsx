import { Ionicons } from "@/src/ui/icons";
import * as Speech from "expo-speech";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { api } from "@/src/utils/api";
import { ChunkyButton } from "@/src/lessons/ChunkyButton";
import { lessonColors, lessonFonts, lessonRadius, lessonShadow } from "@/src/lessons/theme";

interface Option { text: string; emoji?: string; correct?: boolean }
interface Exercise {
  type: "select" | "listen" | "translate" | "match" | "fill";
  prompt: string;
  options?: Option[];
  audio?: string;
  answer?: string[];
  bank?: string[];
  pairs?: { a: string; b: string }[];
}

const MAX_HEARTS = 5;

export default function LessonPlayer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = (id || "es").split("-")[0];
  const speechLang = lang === "fr" ? "fr-FR" : "es-ES";

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [idx, setIdx] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<"answer" | "checked">("answer");
  const [wasCorrect, setWasCorrect] = useState(false);
  const [finished, setFinished] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);

  // per-exercise answer state
  const [choice, setChoice] = useState<number | null>(null);
  const [built, setBuilt] = useState<string[]>([]);
  const [matchSel, setMatchSel] = useState<{ col: "a" | "b"; i: number } | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [matchWrong, setMatchWrong] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ exercises: Exercise[] }>(`/lessons/lesson/${id}`)
      .then((d) => setExercises(d.exercises))
      .catch(() => {});
  }, [id]);

  const ex = exercises[idx];
  const total = exercises.length;

  const speak = (t?: string) => {
    if (!t) return;
    try { Speech.stop(); Speech.speak(t, { language: speechLang, rate: 0.9 }); } catch { /* noop */ }
  };

  // auto-play listening audio when a listen exercise appears
  useEffect(() => {
    if (ex?.type === "listen") speak(ex.audio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, exercises]);

  const bankShuffled = useMemo(() => ex?.bank || [], [ex]);
  const matchTiles = useMemo(() => {
    if (ex?.type !== "match" || !ex.pairs) return { a: [], b: [] };
    const a = ex.pairs.map((p, i) => ({ t: p.a, i }));
    const b = ex.pairs.map((p, i) => ({ t: p.b, i })).sort(() => Math.random() - 0.5);
    return { a, b };
  }, [ex]);

  const canCheck = (() => {
    if (!ex) return false;
    if (ex.type === "select" || ex.type === "listen" || ex.type === "fill") return choice !== null;
    if (ex.type === "translate") return built.length > 0;
    return false;
  })();

  const evaluate = (): boolean => {
    if (!ex) return false;
    if (ex.type === "select" || ex.type === "listen" || ex.type === "fill") {
      return !!ex.options?.[choice ?? -1]?.correct;
    }
    if (ex.type === "translate") {
      return JSON.stringify(built) === JSON.stringify(ex.answer);
    }
    return false;
  };

  const check = () => {
    const ok = evaluate();
    setWasCorrect(ok);
    if (ok) { setCorrect((c) => c + 1); speak(ex?.audio || ex?.options?.[choice ?? -1]?.text); }
    else { setHearts((h) => Math.max(0, h - 1)); }
    setPhase("checked");
  };

  const next = () => {
    if (idx + 1 >= total) return finish();
    setIdx((i) => i + 1);
    setPhase("answer"); setChoice(null); setBuilt([]);
    setMatched(new Set()); setMatchSel(null); setMatchWrong(null);
  };

  const finish = async () => {
    try {
      const res = await api.post<{ earned_xp: number }>("/lessons/complete", {
        lesson_id: id, correct, total, hearts_left: hearts,
      });
      setEarnedXp(res.earned_xp);
    } catch { setEarnedXp(10); }
    setFinished(true);
  };

  // ----- match interactions -----
  const tapMatch = (col: "a" | "b", i: number) => {
    if (matched.has(i)) return;
    if (!matchSel) { setMatchSel({ col, i }); return; }
    if (matchSel.col === col) { setMatchSel({ col, i }); return; }
    if (matchSel.i === i) {
      const nm = new Set(matched); nm.add(i); setMatched(nm); setMatchSel(null);
      if (nm.size === (ex?.pairs?.length || 0)) {
        setCorrect((c) => c + 1); setWasCorrect(true); setPhase("checked");
      }
    } else {
      setMatchWrong(i); setMatchSel(null);
      setTimeout(() => setMatchWrong(null), 500);
    }
  };

  // ---------- render states ----------
  if (finished) {
    const acc = total ? Math.round((correct / total) * 100) : 0;
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="lessons-complete">
        <View style={styles.doneWrap}>
          <View style={styles.trophyCircle}><Ionicons name="trophy" size={64} color={lessonColors.gold} /></View>
          <Text style={styles.doneTitle}>Lesson complete!</Text>
          <View style={styles.doneStats}>
            <View style={[styles.doneStat, { backgroundColor: lessonColors.goldSoft }]}>
              <Text style={[styles.doneStatVal, { color: lessonColors.gold }]}>+{earnedXp}</Text>
              <Text style={styles.doneStatLbl}>TOTAL XP</Text>
            </View>
            <View style={[styles.doneStat, { backgroundColor: lessonColors.greenSoft }]}>
              <Text style={[styles.doneStatVal, { color: lessonColors.green }]}>{acc}%</Text>
              <Text style={styles.doneStatLbl}>ACCURACY</Text>
            </View>
          </View>
        </View>
        <View style={styles.footerPlain}>
          <ChunkyButton testID="lessons-complete-continue" label="Continue" color={lessonColors.green} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  if (hearts <= 0) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="lessons-outofhearts">
        <View style={styles.doneWrap}>
          <Ionicons name="heart-dislike" size={72} color={lessonColors.heart} />
          <Text style={styles.doneTitle}>Out of hearts</Text>
          <Text style={styles.outSub}>Refill in the Shop with gems, or try again later.</Text>
        </View>
        <View style={styles.footerPlain}>
          <ChunkyButton label="Quit" color={lessonColors.heart} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  if (!ex) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.doneWrap}><Text style={styles.loading}>Loading…</Text></View>
      </SafeAreaView>
    );
  }

  const progress = (idx / total) * 100;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="lessons-player">
      {/* Top: close + progress + hearts */}
      <View style={styles.topRow}>
        <Pressable testID="lessons-player-close" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={26} color={lessonColors.inkFaint} />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.heartRow}>
          <Ionicons name="heart" size={22} color={lessonColors.heart} />
          <Text style={styles.heartText}>{hearts}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.prompt}>{ex.prompt}</Text>

        {ex.type === "listen" && (
          <Pressable testID="lessons-play-audio" style={styles.speakerBig} onPress={() => speak(ex.audio)}>
            <Ionicons name="volume-high" size={36} color="#fff" />
          </Pressable>
        )}

        {/* select / listen / fill => option list */}
        {(ex.type === "select" || ex.type === "listen" || ex.type === "fill") && (
          <View style={ex.type === "select" ? styles.optionGrid : styles.optionList}>
            {ex.options?.map((o, i) => {
              const sel = choice === i;
              const showState = phase === "checked" && sel;
              const grid = ex.type === "select";
              return (
                <Pressable
                  key={i}
                  testID={`lessons-option-${i}`}
                  disabled={phase === "checked"}
                  onPress={() => { setChoice(i); if (ex.type !== "listen") speak(o.text); }}
                  style={[
                    grid ? styles.optGrid : styles.optRow,
                    sel && styles.optSel,
                    showState && (wasCorrect ? styles.optCorrect : styles.optWrong),
                  ]}
                >
                  {o.emoji ? <Text style={styles.optEmoji}>{o.emoji}</Text> : null}
                  <Text style={[styles.optText, sel && { color: lessonColors.blue }]}>{o.text}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* translate => built answer + word bank */}
        {ex.type === "translate" && (
          <>
            <View style={styles.answerArea}>
              {built.map((w, i) => (
                <Pressable key={`${w}-${i}`} onPress={() => setBuilt((b) => b.filter((_, j) => j !== i))} style={styles.tokenFilled}>
                  <Text style={styles.tokenText}>{w}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.bankArea}>
              {bankShuffled.map((w, i) => {
                const used = built.filter((b) => b === w).length >= bankShuffled.filter((x) => x === w).length;
                return (
                  <Pressable key={`${w}-${i}`} testID={`lessons-bank-${i}`} disabled={used || phase === "checked"} onPress={() => setBuilt((b) => [...b, w])} style={[styles.token, used && styles.tokenUsed]}>
                    <Text style={[styles.tokenText, used && { color: lessonColors.inkFaint }]}>{w}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* match => two columns */}
        {ex.type === "match" && (
          <View style={styles.matchRow}>
            {(["a", "b"] as const).map((col) => (
              <View key={col} style={styles.matchCol}>
                {matchTiles[col].map((tile) => {
                  const done = matched.has(tile.i);
                  const sel = matchSel?.col === col && matchSel.i === tile.i;
                  const wrong = matchWrong === tile.i;
                  return (
                    <Pressable
                      key={`${col}-${tile.i}`}
                      testID={`lessons-match-${col}-${tile.i}`}
                      disabled={done}
                      onPress={() => tapMatch(col, tile.i)}
                      style={[styles.matchTile, sel && styles.matchSel, wrong && styles.matchWrong, done && styles.matchDone]}
                    >
                      <Text style={[styles.matchText, done && { color: lessonColors.inkFaint }]}>{tile.t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer: check / continue */}
      {phase === "checked" ? (
        <View style={[styles.footer, wasCorrect ? styles.footerCorrect : styles.footerWrong]}>
          <View style={styles.footerHead}>
            <Ionicons name={wasCorrect ? "checkmark-circle" : "close-circle"} size={26} color={wasCorrect ? lessonColors.greenDark : lessonColors.wrong} />
            <Text style={[styles.footerTitle, { color: wasCorrect ? lessonColors.greenDark : lessonColors.wrong }]}>
              {wasCorrect ? "Nice!" : "Not quite"}
            </Text>
          </View>
          <ChunkyButton testID="lessons-continue" label="Continue" color={wasCorrect ? lessonColors.green : lessonColors.wrong} onPress={next} />
        </View>
      ) : (
        ex.type !== "match" && (
          <View style={styles.footerPlain}>
            <ChunkyButton testID="lessons-check" label="Check" color={canCheck ? lessonColors.green : lessonColors.borderStrong} onPress={check} disabled={!canCheck} />
          </View>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lessonColors.bg },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  progressTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: lessonColors.surfaceSoft, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: lessonColors.green, borderRadius: 7 },
  heartRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  heartText: { fontFamily: lessonFonts.black, fontSize: 16, color: lessonColors.heart },
  content: { padding: 20, paddingBottom: 20, flexGrow: 1 },
  prompt: { fontFamily: lessonFonts.black, fontSize: 23, color: lessonColors.ink, marginBottom: 22, lineHeight: 30 },
  speakerBig: { width: 84, height: 84, borderRadius: 20, backgroundColor: lessonColors.blue, alignItems: "center", justifyContent: "center", marginBottom: 24, ...lessonShadow.card },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  optionList: { gap: 12 },
  optGrid: { width: "47%", flexGrow: 1, minHeight: 120, borderRadius: lessonRadius.lg, borderWidth: 2, borderColor: lessonColors.border, backgroundColor: lessonColors.surface, alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
  optRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: lessonRadius.md, borderWidth: 2, borderColor: lessonColors.border, backgroundColor: lessonColors.surface, padding: 16 },
  optSel: { borderColor: lessonColors.blue, backgroundColor: lessonColors.blueSoft },
  optCorrect: { borderColor: lessonColors.correct, backgroundColor: lessonColors.correctSoft },
  optWrong: { borderColor: lessonColors.wrong, backgroundColor: lessonColors.wrongSoft },
  optEmoji: { fontSize: 40 },
  optText: { fontFamily: lessonFonts.bold, fontSize: 17, color: lessonColors.ink },
  answerArea: { minHeight: 60, flexDirection: "row", flexWrap: "wrap", gap: 8, borderBottomWidth: 2, borderBottomColor: lessonColors.border, paddingBottom: 12, marginBottom: 24 },
  bankArea: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  token: { backgroundColor: lessonColors.surface, borderRadius: lessonRadius.sm, borderWidth: 2, borderColor: lessonColors.border, paddingHorizontal: 16, paddingVertical: 12, ...lessonShadow.card },
  tokenUsed: { backgroundColor: lessonColors.surfaceSoft, borderColor: lessonColors.surfaceSoft },
  tokenFilled: { backgroundColor: lessonColors.surface, borderRadius: lessonRadius.sm, borderWidth: 2, borderColor: lessonColors.border, paddingHorizontal: 16, paddingVertical: 12 },
  tokenText: { fontFamily: lessonFonts.bold, fontSize: 16, color: lessonColors.ink },
  matchRow: { flexDirection: "row", gap: 14 },
  matchCol: { flex: 1, gap: 12 },
  matchTile: { borderRadius: lessonRadius.md, borderWidth: 2, borderColor: lessonColors.border, backgroundColor: lessonColors.surface, paddingVertical: 18, alignItems: "center", ...lessonShadow.card },
  matchSel: { borderColor: lessonColors.blue, backgroundColor: lessonColors.blueSoft },
  matchWrong: { borderColor: lessonColors.wrong, backgroundColor: lessonColors.wrongSoft },
  matchDone: { borderColor: lessonColors.surfaceSoft, backgroundColor: lessonColors.surfaceSoft, opacity: 0.6 },
  matchText: { fontFamily: lessonFonts.bold, fontSize: 16, color: lessonColors.ink },
  footerPlain: { padding: 18, paddingTop: 8 },
  footer: { padding: 18, paddingTop: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  footerCorrect: { backgroundColor: lessonColors.correctSoft },
  footerWrong: { backgroundColor: lessonColors.wrongSoft },
  footerHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  footerTitle: { fontFamily: lessonFonts.black, fontSize: 20 },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 30 },
  trophyCircle: { width: 130, height: 130, borderRadius: 65, backgroundColor: lessonColors.goldSoft, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontFamily: lessonFonts.black, fontSize: 26, color: lessonColors.ink },
  doneStats: { flexDirection: "row", gap: 14, marginTop: 6 },
  doneStat: { borderRadius: lessonRadius.md, paddingVertical: 16, paddingHorizontal: 26, alignItems: "center" },
  doneStatVal: { fontFamily: lessonFonts.black, fontSize: 26 },
  doneStatLbl: { fontFamily: lessonFonts.bold, fontSize: 11, color: lessonColors.inkSoft, letterSpacing: 1, marginTop: 2 },
  outSub: { fontFamily: lessonFonts.semi, fontSize: 14, color: lessonColors.inkSoft, textAlign: "center", lineHeight: 21 },
  loading: { fontFamily: lessonFonts.bold, fontSize: 16, color: lessonColors.inkSoft },
});
