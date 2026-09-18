import { VIcon } from "@/src/learn/Icon";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { vocabApi, VocabChallenge, VocabContinue, VocabStats, VocabTopic } from "@/src/learn/api";
import { useLearnTheme } from "@/src/learn/ThemeContext";
import { LearnPalette, learnRadius } from "@/src/learn/theme";

function iconForChallenge(name: string): string {
  const v = (name || "reader-outline") as string;
  return v;
}

export default function VocabHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, mode, toggle } = useLearnTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [stats, setStats] = useState<VocabStats | null>(null);
  const [cont, setCont] = useState<VocabContinue | null>(null);
  const [topics, setTopics] = useState<VocabTopic[]>([]);
  const [challenges, setChallenges] = useState<VocabChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [st, co, tp, ch] = await Promise.all([
        vocabApi.myStats(),
        vocabApi.myContinue().catch(() => null),
        vocabApi.listTopics(),
        vocabApi.listChallenges(),
      ]);
      setStats(st);
      setCont(co);
      setTopics(tp);
      setChallenges(ch);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const level = stats?.level ?? 1;
  const xpProgress = stats?.progress ?? 0;
  const streak = stats?.streak ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingLeft: insets.left, paddingRight: insets.right }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 40,
          paddingHorizontal: 18,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cardPurple} />}
      >
        <View style={s.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.hello}>Hey there 👋</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 10 }}>
              <View style={s.miniPill}>
                <VIcon name="flame" size={14} color={colors.coral} />
                <Text style={s.miniPillText}>{streak}d streak</Text>
              </View>
              <View style={s.miniPill}>
                <VIcon name="star" size={14} color="#EABA00" />
                <Text style={s.miniPillText}>Lv {level}</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={toggle} style={s.themeBtn} hitSlop={8}>
            <VIcon name={mode === "dark" ? "sunny" : "moon"} size={18} color={colors.text} />
          </Pressable>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.cardPurple} />
          </View>
        ) : (
          <>
            {/* In-progress card */}
            {cont && (
              <View style={s.progressCard}>
                <View style={s.tagPill}>
                  <Text style={s.tagPillText}>{cont.tag}</Text>
                </View>
                <Text style={s.progressTitle}>{cont.title}</Text>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.max(6, Math.min(100, (cont.progress || xpProgress) * 100))}%` }]} />
                </View>
                <Pressable
                  style={({ pressed }) => [s.continueBtn, pressed && { opacity: 0.9 }]}
                  onPress={() => router.push({ pathname: "/learn/lesson/[id]", params: { id: cont.id } })}
                >
                  <VIcon name="play" size={16} color="#FFFFFF" />
                  <Text style={s.continueText}>Continue lesson</Text>
                </Pressable>
              </View>
            )}

            <Text style={s.section}>Explore topics</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16, gap: 12 }}
              style={{ marginHorizontal: -18, paddingHorizontal: 18 }}
            >
              {topics.slice(0, 8).map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => router.push({ pathname: "/learn/topic/[id]", params: { id: t.id } })}
                  style={[s.topicChip, { backgroundColor: t.color === "purple" ? colors.cardPurpleSoft : t.color === "lime" ? colors.cardLime : colors.cardMint }]}
                >
                  <View style={s.topicIconWrap}>
                    <VIcon name={t.icon as any} size={22} color={colors.onLight} />
                  </View>
                  <View>
                    <Text style={s.topicName}>{t.name}</Text>
                    <Text style={s.topicMeta}>{t.words_learned}/{t.word_count} words</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.section}>Challenges</Text>
            <View style={{ gap: 12 }}>
              {challenges.map((c) => (
                <Pressable key={c.id} style={s.challengeCard}>
                  <View style={s.challengeIconBox}>
                    <VIcon name={iconForChallenge(c.icon)} size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.challengeTitle}>{c.title}</Text>
                    <View style={s.challengeTrack}>
                      <View style={[s.challengeFill, { width: `${Math.min(100, c.progress * 100)}%` }]} />
                    </View>
                    <Text style={s.challengeSub}>
                      {c.current}/{c.target} · {c.days_left} days left {c.completed ? "· \u2714" : ""}
                    </Text>
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
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    hello: { color: c.text, fontSize: 22, fontWeight: "800" },
    miniPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.surfaceRaised,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: c.mode === "light" ? 1 : 0,
      borderColor: c.border,
    },
    miniPillText: { color: c.text, fontSize: 12, fontWeight: "700" },
    themeBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.surfaceRaised, alignItems: "center", justifyContent: "center",
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    progressCard: {
      backgroundColor: c.cardPurple,
      borderRadius: learnRadius.lg,
      padding: 18,
      marginBottom: 22,
    },
    tagPill: {
      alignSelf: "flex-start", backgroundColor: "#F2F2F4",
      borderRadius: learnRadius.chip, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14,
    },
    tagPillText: { color: c.onLight, fontSize: 12, fontWeight: "600" },
    progressTitle: { color: c.onLight, fontSize: 22, fontWeight: "800", lineHeight: 28, marginBottom: 14 },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: "#F2F2F4", overflow: "hidden", marginBottom: 18 },
    progressFill: { height: "100%", backgroundColor: c.onLight, borderRadius: 3 },
    continueBtn: {
      backgroundColor: c.onLight, borderRadius: learnRadius.chip, paddingVertical: 14,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    continueText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
    section: { color: c.text, fontSize: 20, fontWeight: "800", marginTop: 4, marginBottom: 14 },
    topicChip: {
      width: 138, height: 138, borderRadius: 22,
      padding: 12, justifyContent: "space-between", marginBottom: 22,
    },
    topicIconWrap: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.55)",
      alignItems: "center", justifyContent: "center",
    },
    topicName: { color: c.onLight, fontSize: 14, fontWeight: "800" },
    topicMeta: { color: "#2A2A34", fontSize: 11, fontWeight: "600", marginTop: 2 },
    challengeCard: {
      flexDirection: "row", alignItems: "center", backgroundColor: c.cardCoral,
      borderRadius: learnRadius.chip, paddingHorizontal: 14, paddingVertical: 14, gap: 14,
    },
    challengeIconBox: {
      width: 40, height: 40, borderRadius: 12, backgroundColor: "#0B0B0F",
      alignItems: "center", justifyContent: "center",
    },
    challengeTitle: { color: "#0B0B0F", fontSize: 16, fontWeight: "800" },
    challengeTrack: {
      height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.15)", overflow: "hidden", marginTop: 8,
    },
    challengeFill: { height: "100%", backgroundColor: "#0B0B0F", borderRadius: 2 },
    challengeSub: { color: "#0B0B0F", fontSize: 12, fontWeight: "600", opacity: 0.85, marginTop: 4 },
  });
