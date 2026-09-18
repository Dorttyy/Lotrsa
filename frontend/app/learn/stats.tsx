import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { learnColors } from "@/src/learn/theme";

const WEEK_DATA = [
  { day: "M", xp: 45 },
  { day: "T", xp: 68 },
  { day: "W", xp: 30 },
  { day: "T", xp: 92 },
  { day: "F", xp: 55 },
  { day: "S", xp: 72 },
  { day: "S", xp: 40 },
];

export default function LearnStats() {
  const router = useRouter();
  const weekXP = WEEK_DATA.reduce((a, b) => a + b.xp, 0);
  const maxXP = Math.max(...WEEK_DATA.map((d) => d.xp));
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="stats-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Your progress</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Big stat cards */}
        <View style={styles.gridRow}>
          <StatCard
            color={learnColors.yellow}
            label="Current streak"
            value="7"
            unit="days"
            icon="flame"
          />
          <StatCard
            color={"#DABFFF"}
            label="Total XP"
            value="1,745"
            unit="points"
            icon="star"
          />
        </View>
        <View style={styles.gridRow}>
          <StatCard
            color={learnColors.green}
            label="Words learned"
            value="142"
            unit="lifetime"
            icon="book"
          />
          <StatCard
            color={learnColors.orange}
            label="Sessions"
            value="58"
            unit="completed"
            icon="checkmark-done"
            darkText
          />
        </View>

        {/* Weekly chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>This week</Text>
            <Text style={styles.chartXp}>{weekXP} XP</Text>
          </View>
          <View style={styles.chart}>
            {WEEK_DATA.map((d, i) => (
              <View key={i} style={styles.chartCol}>
                <View
                  style={[
                    styles.chartBar,
                    { height: (d.xp / maxXP) * 100, backgroundColor: learnColors.orange },
                  ]}
                />
                <Text style={styles.chartDay}>{d.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Milestones */}
        <Text style={styles.section}>Next milestones</Text>
        <MilestoneRow icon="🎯" title="Reach 2,000 XP" progress={87} color="#DABFFF" />
        <MilestoneRow icon="🔥" title="14-day streak" progress={50} color={learnColors.yellow} />
        <MilestoneRow icon="📚" title="200 words mastered" progress={71} color={learnColors.green} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({
  color,
  label,
  value,
  unit,
  icon,
  darkText,
}: {
  color: string;
  label: string;
  value: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  darkText?: boolean;
}) => (
  <View style={[styles.stat, { backgroundColor: color }]}>
    <View style={styles.statIcon}>
      <Ionicons name={icon} size={16} color="#0B0B0F" />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statUnit}>{unit}</Text>
    <Text style={[styles.statLabel, darkText && { color: "#0B0B0F" }]}>{label}</Text>
  </View>
);

const MilestoneRow = ({
  icon,
  title,
  progress,
  color,
}: {
  icon: string;
  title: string;
  progress: number;
  color: string;
}) => (
  <View style={styles.mile}>
    <Text style={{ fontSize: 26 }}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text style={styles.mileTitle}>{title}</Text>
      <View style={styles.mileBarWrap}>
        <View style={[styles.mileBar, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
    </View>
    <Text style={styles.milePct}>{progress}%</Text>
  </View>
);

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
  h1: { fontFamily: fonts.displayBold, fontSize: 18, color: "#FFF" },
  body: { padding: 20, gap: 12 },
  gridRow: { flexDirection: "row", gap: 12 },
  stat: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    gap: 4,
    minHeight: 130,
  },
  statIcon: {
    alignSelf: "flex-start",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: "#0B0B0F",
    marginTop: 4,
  },
  statUnit: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: "#0B0B0F",
    opacity: 0.7,
  },
  statLabel: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: "#0B0B0F",
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: learnColors.surface,
    borderRadius: 20,
    padding: 18,
  },
  chartHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  chartTitle: { fontFamily: fonts.displayBold, fontSize: 15, color: "#FFF" },
  chartXp: { fontFamily: fonts.textBold, fontSize: 13, color: learnColors.orange },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 110,
    gap: 6,
  },
  chartCol: { alignItems: "center", flex: 1 },
  chartBar: { width: "70%", borderRadius: 6, minHeight: 8 },
  chartDay: {
    fontFamily: fonts.textBold,
    fontSize: 11,
    color: learnColors.onSurfaceSecondary,
    marginTop: 6,
  },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFF",
    marginTop: 6,
  },
  mile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: learnColors.surface,
    borderRadius: 18,
    padding: 14,
  },
  mileTitle: { fontFamily: fonts.textBold, fontSize: 13, color: "#FFF" },
  mileBarWrap: {
    marginTop: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: learnColors.surfaceHigh,
    overflow: "hidden",
  },
  mileBar: { height: 6, borderRadius: 3 },
  milePct: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: learnColors.orange,
  },
});
