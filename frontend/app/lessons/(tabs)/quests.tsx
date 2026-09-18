import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { api } from "@/src/utils/api";
import { lessonColors, lessonFonts, lessonRadius, lessonShadow } from "@/src/lessons/theme";

interface Quest { id: string; title: string; icon: string; progress: number; target: number }

export default function LessonsQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [streak, setStreak] = useState(0);
  const load = useCallback(async () => {
    try {
      const d = await api.get<{ daily: Quest[]; streak: number }>("/lessons/quests");
      setQuests(d.daily); setStreak(d.streak);
    } catch { /* silent */ }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="lessons-quests-screen">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Quests</Text>
        <View style={styles.streakCard}>
          <Ionicons name="flame" size={40} color={lessonColors.streak} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakNum}>{streak} day streak</Text>
            <Text style={styles.streakSub}>Keep it alive — practice every day!</Text>
          </View>
        </View>
        <Text style={styles.section}>Daily quests</Text>
        {quests.map((q) => {
          const pct = Math.min(100, (q.progress / q.target) * 100);
          const done = q.progress >= q.target;
          return (
            <View key={q.id} style={styles.quest} testID={`lessons-quest-${q.id}`}>
              <View style={[styles.qIcon, { backgroundColor: done ? lessonColors.greenSoft : lessonColors.goldSoft }]}>
                <Ionicons name={done ? "checkmark" : (q.icon as any)} size={22} color={done ? lessonColors.green : lessonColors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.qTitle}>{q.title}</Text>
                <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: done ? lessonColors.green : lessonColors.gold }]} /></View>
              </View>
              <Text style={styles.qCount}>{q.progress}/{q.target}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lessonColors.bg },
  body: { padding: 16, gap: 12 },
  title: { fontFamily: lessonFonts.black, fontSize: 28, color: lessonColors.ink },
  streakCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: lessonColors.surface, borderRadius: lessonRadius.lg, padding: 18, borderWidth: 2, borderColor: lessonColors.border, ...lessonShadow.card },
  streakNum: { fontFamily: lessonFonts.black, fontSize: 20, color: lessonColors.ink },
  streakSub: { fontFamily: lessonFonts.semi, fontSize: 13, color: lessonColors.inkSoft, marginTop: 2 },
  section: { fontFamily: lessonFonts.black, fontSize: 18, color: lessonColors.ink, marginTop: 8 },
  quest: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: lessonColors.surface, borderRadius: lessonRadius.md, padding: 14, borderWidth: 2, borderColor: lessonColors.border },
  qIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  qTitle: { fontFamily: lessonFonts.bold, fontSize: 14.5, color: lessonColors.ink, marginBottom: 6 },
  track: { height: 10, borderRadius: 5, backgroundColor: lessonColors.surfaceSoft, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  qCount: { fontFamily: lessonFonts.black, fontSize: 13, color: lessonColors.inkSoft },
});
