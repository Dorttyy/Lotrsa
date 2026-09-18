import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { api } from "@/src/utils/api";
import { proColors, proFonts, proRadius, proShadow } from "@/src/pro/theme";

interface Progress {
  lessons_completed: number;
  minutes_practiced: number;
  tutors_met: number;
  day_streak: number;
  words_learned: number;
}

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

export default function ProProgress() {
  const [data, setData] = useState<Progress | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get<Progress>("/pro/progress");
      setData(d);
    } catch {
      // silent
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const streak = data?.day_streak ?? 0;

  const stats = [
    { icon: "school", label: "Lessons", value: data?.lessons_completed ?? 0, color: proColors.terracotta, tint: proColors.terracottaTint },
    { icon: "time", label: "Minutes", value: data?.minutes_practiced ?? 0, color: proColors.sage, tint: proColors.sageTint },
    { icon: "people", label: "Tutors met", value: data?.tutors_met ?? 0, color: proColors.gold, tint: "#F6EFDD" },
    { icon: "sparkles", label: "Words", value: data?.words_learned ?? 0, color: proColors.terracotta, tint: proColors.terracottaTint },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="pro-progress-screen">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>PRO · YOUR JOURNEY</Text>
          <Text style={styles.title}>Progress</Text>
        </View>

        {/* Streak card */}
        <View style={styles.streakCard}>
          <View style={styles.streakTop}>
            <View>
              <Text style={styles.streakNum}>{streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
            <Ionicons name="flame" size={40} color={proColors.terracotta} />
          </View>
          <View style={styles.weekRow}>
            {WEEK.map((d, i) => {
              const done = i < streak;
              return (
                <View key={i} style={styles.dayCol}>
                  <View style={[styles.dayDot, done && styles.dayDotDone]}>
                    {done && <Ionicons name="checkmark" size={13} color={proColors.onAccent} />}
                  </View>
                  <Text style={styles.dayLabel}>{d}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Stat grid */}
        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard} testID={`pro-stat-${s.label}`}>
              <View style={[styles.statIcon, { backgroundColor: s.tint }]}>
                <Ionicons name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Milestone */}
        <Text style={styles.section}>Next milestone</Text>
        <View style={styles.milestone}>
          <Ionicons name="trophy" size={26} color={proColors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.milestoneTitle}>Reach 10 completed lessons</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.min(100, ((data?.lessons_completed ?? 0) / 10) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.milestoneMeta}>
              {data?.lessons_completed ?? 0} / 10 lessons
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: proColors.bg },
  body: { paddingBottom: 40 },
  header: { paddingHorizontal: 22, paddingTop: 8 },
  kicker: { fontFamily: proFonts.sansSemi, fontSize: 11, letterSpacing: 2, color: proColors.terracotta },
  title: { fontFamily: proFonts.serifBold, fontSize: 28, color: proColors.ink, marginTop: 2 },
  streakCard: {
    backgroundColor: proColors.surface,
    borderRadius: proRadius.xl,
    marginHorizontal: 22,
    marginTop: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.card,
  },
  streakTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  streakNum: { fontFamily: proFonts.serifBold, fontSize: 44, color: proColors.ink },
  streakLabel: { fontFamily: proFonts.sansSemi, fontSize: 13, color: proColors.inkSoft, marginTop: -4 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  dayCol: { alignItems: "center", gap: 6 },
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: proColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDotDone: { backgroundColor: proColors.terracotta },
  dayLabel: { fontFamily: proFonts.sansSemi, fontSize: 11, color: proColors.inkFaint },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14, paddingHorizontal: 22, marginTop: 18 },
  statCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: proRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: { fontFamily: proFonts.serifBold, fontSize: 26, color: proColors.ink },
  statLabel: { fontFamily: proFonts.sans, fontSize: 12.5, color: proColors.inkSoft, marginTop: 1 },
  section: { fontFamily: proFonts.serifBold, fontSize: 20, color: proColors.ink, paddingHorizontal: 22, marginTop: 24, marginBottom: 12 },
  milestone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.xl,
    marginHorizontal: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  milestoneTitle: { fontFamily: proFonts.sansBold, fontSize: 14.5, color: proColors.ink },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: proColors.surfaceMuted,
    marginTop: 8,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: proColors.sage, borderRadius: 4 },
  milestoneMeta: { fontFamily: proFonts.sans, fontSize: 12, color: proColors.inkSoft, marginTop: 6 },
});
