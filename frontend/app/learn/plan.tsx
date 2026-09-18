import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { useAuth } from "@/src/context/AuthContext";
import { fonts } from "@/src/theme";
import { LearnDock, useLearnDockPadding } from "@/src/learn/LearnDock";
import { learnColors } from "@/src/learn/theme";

/**
 * Learning Plan / Today — greeting header + Today↔Learning-plan toggle,
 * weekly-goal setter, big purple "Assess" card, then a lessons grid
 * (yellow + green mini-cards). Matches the reference screenshot pixel-close.
 */
export default function LearnPlan() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<"today" | "plan">("today");
  const dockPad = useLearnDockPadding();
  const shortName = (user?.name || "friend").split(" ")[0].slice(0, 8);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {/* Top bar — streak + avatar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <Pressable
          testID="learn-plan-settings"
          onPress={() => router.push("/learn/settings")}
          style={styles.streakChip}
          hitSlop={8}
        >
          <Ionicons name="settings-outline" size={16} color="#FFF" />
        </Pressable>
        <Pressable
          testID="learn-plan-streak"
          onPress={() => router.push("/learn/stats")}
          style={styles.streakChip}
          hitSlop={8}
        >
          <Text style={{ fontSize: 15 }}>🔥</Text>
        </Pressable>
        <View style={styles.avatarChip}>
          <Text style={styles.avatarEmoji}>🙂</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: dockPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hi}>Hi, {shortName}</Text>

        {/* Today ↔ Learning plan pill toggle */}
        <View style={styles.toggle}>
          <Pressable
            testID="learn-plan-tab-today"
            onPress={() => setTab("today")}
            style={[
              styles.toggleBtn,
              tab === "today" && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                tab === "today" && { color: "#FFFFFF" },
              ]}
            >
              Today
            </Text>
          </Pressable>
          <Pressable
            testID="learn-plan-tab-plan"
            onPress={() => setTab("plan")}
            style={[
              styles.toggleBtn,
              tab === "plan" && styles.toggleBtnActive,
              { backgroundColor: "transparent" },
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                tab === "plan" && { color: "#FFFFFF" },
              ]}
            >
              Learning plan
            </Text>
          </Pressable>
        </View>

        {/* Weekly goal pill */}
        <Pressable
          testID="learn-plan-set-goal"
          onPress={() => router.push("/learn/set-goal")}
          style={styles.goalPill}
        >
          <View style={styles.goalIcon}>
            <Ionicons name="flag" size={16} color="#B0B0BD" />
          </View>
          <Text style={styles.goalText}>Set your weekly goal</Text>
          <View style={styles.goalTrend}>
            <Ionicons name="bar-chart" size={15} color="#FFF" />
          </View>
        </Pressable>

        {/* Assess card */}
        <View style={styles.assessCard} testID="learn-plan-assess-card">
          <Text style={styles.assessLabel}>Assess</Text>
          <Text style={styles.assessTitle}>
            Answer a few questions to find your level
          </Text>
          <Text style={styles.assessAttr}>Siam Joy</Text>
          <Pressable
            testID="learn-plan-find-level"
            onPress={() => router.push("/learn/assessment")}
            style={styles.findLevelBtn}
          >
            <Text style={styles.findLevelText}>Find level</Text>
          </Pressable>
          <Text style={styles.assessMascot}>🌟</Text>
        </View>

        {/* Lesson mini-cards row */}
        <View style={styles.lessonRow}>
          <Pressable
            testID="learn-plan-lesson-1"
            onPress={() => router.push("/learn/session")}
            style={[styles.lessonCard, { backgroundColor: learnColors.yellow }]}
          >
            <View style={styles.lessonLock}>
              <Ionicons name="lock-open" size={12} color="#0B0B0F" />
            </View>
            <Text style={styles.lessonNo}>Lesson 1</Text>
            <Text style={styles.lessonTitle}>¡Mucho gusto!</Text>
            <Text style={styles.lessonPart}>Part 1</Text>
          </Pressable>
          <Pressable
            testID="learn-plan-lesson-2"
            onPress={() => router.push("/learn/session")}
            style={[styles.lessonCard, { backgroundColor: learnColors.green }]}
          >
            <View style={styles.lessonLock}>
              <Ionicons name="lock-closed" size={12} color="#0B0B0F" />
            </View>
            <Text style={styles.lessonNo}>Lesson 2</Text>
            <Text style={styles.lessonTitle}>¡Mucho gusto!</Text>
            <Text style={styles.lessonPart}>Part 1</Text>
          </Pressable>
        </View>

        <Pressable
          testID="learn-plan-my-language-btn"
          onPress={() => router.push("/learn/languages")}
          style={styles.langNavRow}
        >
          <View style={styles.langNavIcon}>
            <MaterialCommunityIcons name="translate" size={18} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.langNavTitle}>My Language</Text>
            <Text style={styles.langNavSub}>Change your target language</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#B0B0BD" />
        </Pressable>
      </ScrollView>

      <LearnDock active="plan" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: learnColors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  streakChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 17 },
  body: { paddingHorizontal: 20, gap: 16 },
  hi: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: "#FFFFFF",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: learnColors.surface,
    borderRadius: 999,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: learnColors.orange },
  toggleText: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: "#B0B0BD",
  },
  goalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: learnColors.surface,
    borderRadius: 999,
    padding: 6,
    paddingRight: 6,
  },
  goalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: learnColors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  goalText: {
    flex: 1,
    fontFamily: fonts.textSemi,
    color: learnColors.onSurfaceSecondary,
    fontSize: 13,
  },
  goalTrend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: learnColors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  assessCard: {
    backgroundColor: "#DABFFF",
    borderRadius: 28,
    padding: 22,
    minHeight: 220,
    gap: 6,
    overflow: "hidden",
    position: "relative",
  },
  assessLabel: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.75,
  },
  assessTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: "#0B0B0F",
    lineHeight: 28,
    maxWidth: "68%",
    marginTop: 4,
  },
  assessAttr: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: "#0B0B0F",
    opacity: 0.55,
    marginTop: 8,
  },
  findLevelBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0B0B0F",
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 10,
  },
  findLevelText: { fontFamily: fonts.textBold, color: "#FFF", fontSize: 13 },
  assessMascot: {
    position: "absolute",
    right: 20,
    bottom: 24,
    fontSize: 76,
  },
  lessonRow: { flexDirection: "row", gap: 14 },
  lessonCard: {
    flex: 1,
    borderRadius: 22,
    padding: 16,
    minHeight: 130,
    gap: 4,
  },
  lessonLock: {
    alignSelf: "flex-end",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lessonNo: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: "#0B0B0F",
    opacity: 0.75,
    marginTop: 6,
  },
  lessonTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: "#0B0B0F",
    marginTop: 2,
  },
  lessonPart: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: "#0B0B0F",
    opacity: 0.7,
  },
  langNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: learnColors.surface,
    borderRadius: 18,
    padding: 14,
    marginTop: 4,
  },
  langNavIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: learnColors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  langNavTitle: { fontFamily: fonts.textBold, fontSize: 14, color: "#FFF" },
  langNavSub: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: learnColors.onSurfaceSecondary,
    marginTop: 2,
  },
});
