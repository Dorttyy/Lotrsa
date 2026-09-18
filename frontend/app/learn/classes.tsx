import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { TEACHERS as SHARED_TEACHERS } from "@/src/learn/data";
import { fonts } from "@/src/theme";
import { LearnDock, useLearnDockPadding } from "@/src/learn/LearnDock";
import { learnColors } from "@/src/learn/theme";

/**
 * Live Classes hub. Two tab modes:
 *  - "list"  → filter chips + booked/available class cards
 *  - "start" → assessment prompt + Learning-plan pill + Meet the teachers grid
 * A user with a defined level lands directly on "list"; a fresh user gets
 * "start" so they can find their level first.
 */

const CLASSES = [
  {
    id: "c1",
    color: learnColors.orange,
    onColor: "#FFFFFF",
    darkText: false,
    title: "Let's get started!",
    module: "Core Module 1",
    level: "A1",
    teacher: "Maria Luisa",
    time: "Today 4:00 PM",
    duration: "55 min",
    ctaLabel: "Book free class",
  },
  {
    id: "c2",
    color: learnColors.yellow,
    onColor: "#0B0B0F",
    darkText: true,
    title: "Talking About Travel",
    module: "Core Module 2",
    level: "B1",
    teacher: "Emily Carter",
    time: "Today 5:00 PM",
    duration: "1h",
    ctaLabel: "Book class",
  },
  {
    id: "c3",
    color: "#DABFFF",
    onColor: "#0B0B0F",
    darkText: true,
    title: "Everyday Small Talk",
    module: "Core Module 3",
    level: "A2",
    teacher: "Diego Ramos",
    time: "Tomorrow 10:00 AM",
    duration: "50 min",
    ctaLabel: "Book class",
  },
];

export default function LearnClasses() {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "start">("start");
  const [filter, setFilter] = useState<"solo" | "group">("group");
  const dockPad = useLearnDockPadding();

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Text style={styles.h1}>Live classes</Text>
        <Pressable
          testID="learn-classes-toggle-mode"
          onPress={() => setMode(mode === "list" ? "start" : "list")}
          style={styles.avatarChip}
        >
          <Ionicons
            name={mode === "list" ? "sparkles" : "list"}
            size={16}
            color="#FFF"
          />
        </Pressable>
      </View>

      {mode === "list" ? (
        <>
          {/* Filter chip row */}
          <View style={styles.chipRow}>
            <Pressable
              testID="learn-classes-filter-solo"
              onPress={() => setFilter("solo")}
              style={[styles.chip, filter === "solo" && styles.chipOrange]}
            >
              <Ionicons
                name="person"
                size={17}
                color={filter === "solo" ? "#FFF" : "#B0B0BD"}
              />
            </Pressable>
            <Pressable
              testID="learn-classes-filter-group"
              onPress={() => setFilter("group")}
              style={[styles.chip, filter === "group" && styles.chipOrange]}
            >
              <Ionicons
                name="people"
                size={17}
                color={filter === "group" ? "#FFF" : "#B0B0BD"}
              />
            </Pressable>
            <View style={styles.chip}>
              <MaterialCommunityIcons name="tune-vertical" size={17} color="#B0B0BD" />
            </View>
            <View style={styles.chipWide}>
              <Text style={styles.chipText}>Levels</Text>
            </View>
            <View style={styles.chipWide}>
              <Text style={styles.chipText}>Days</Text>
            </View>
            <View style={styles.chipWide}>
              <Text style={styles.chipText}>Time</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: dockPad }]}
            showsVerticalScrollIndicator={false}
          >
            {CLASSES.map((c) => (
              <View
                key={c.id}
                testID={`learn-class-card-${c.id}`}
                style={[styles.classCard, { backgroundColor: c.color }]}
              >
                <View style={styles.classHeader}>
                  <Text
                    style={[
                      styles.classTitle,
                      { color: c.darkText ? "#0B0B0F" : "#FFFFFF" },
                    ]}
                  >
                    {c.title}
                  </Text>
                  <View
                    style={[
                      styles.levelBadge,
                      { backgroundColor: c.darkText ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.25)" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelBadgeText,
                        { color: c.darkText ? "#0B0B0F" : "#FFFFFF" },
                      ]}
                    >
                      {c.level}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.moduleLabel,
                    { color: c.darkText ? "#0B0B0F" : "#FFFFFF" },
                  ]}
                >
                  {c.module}
                </Text>

                <View style={styles.teacherRow}>
                  <View style={styles.teacherAvatar}>
                    <Text style={{ fontSize: 20 }}>👩‍🏫</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.teacherName,
                        { color: c.darkText ? "#0B0B0F" : "#FFFFFF" },
                      ]}
                    >
                      {c.teacher}
                    </Text>
                    <View style={styles.timeRow}>
                      <Text
                        style={[
                          styles.classTime,
                          { color: c.darkText ? "#0B0B0F" : "#FFFFFF" },
                        ]}
                      >
                        {c.time}
                      </Text>
                      <View
                        style={[
                          styles.durationPill,
                          { backgroundColor: c.darkText ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.25)" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.durationText,
                            { color: c.darkText ? "#0B0B0F" : "#FFFFFF" },
                          ]}
                        >
                          {c.duration}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Pressable
                  testID={`learn-class-book-${c.id}`}
                  style={styles.bookBtn}
                >
                  <Text style={styles.bookBtnText}>{c.ctaLabel}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: dockPad }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Level finder card */}
          <View
            style={[styles.startCard, { backgroundColor: "#DABFFF" }]}
            testID="learn-classes-start-card"
          >
            <View style={styles.startHeader}>
              <Text style={styles.startLabel}>Start</Text>
              <View style={styles.startIconChip}>
                <Ionicons name="bar-chart" size={16} color="#0B0B0F" />
              </View>
            </View>
            <Text style={styles.startTitle}>
              Find the right level and book your first free group class
            </Text>
            <Text style={styles.startAttr}>Siam Joy</Text>
            <Pressable
              testID="learn-classes-find-level"
              onPress={() => router.push("/learn/assessment")}
              style={styles.findLevelBtn}
            >
              <Text style={styles.findLevelText}>Find level</Text>
            </Pressable>
            <Text style={styles.mascotEmoji}>🌟</Text>
          </View>

          {/* Learning plan pill */}
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Learning plan</Text>
            <View style={styles.planAllChip}>
              <Text style={styles.planAllText}>All</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Meet the teachers</Text>
          <View style={styles.teacherGrid}>
            {SHARED_TEACHERS.map((t) => (
              <Pressable
                key={t.id}
                testID={`learn-teacher-${t.id}`}
                onPress={() => router.push(`/learn/teacher/${t.id}`)}
                style={styles.teacherCard}
              >
                <View style={[styles.teacherPhoto, { backgroundColor: t.bg }]}>
                  <Text style={{ fontSize: 44 }}>{t.emoji}</Text>
                </View>
                <Text style={styles.teacherCardName}>{t.name}</Text>
                <Text style={styles.teacherCardSub}>{t.country} · ⭐ {t.rating}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <LearnDock active="classes" />
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
    paddingTop: 8,
    paddingBottom: 12,
  },
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  avatarChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  chip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOrange: {
    backgroundColor: learnColors.orange,
  },
  chipWide: {
    height: 36,
    borderRadius: 18,
    backgroundColor: learnColors.surfaceRaised,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: "#B0B0BD",
  },
  body: {
    paddingHorizontal: 20,
    gap: 16,
  },
  classCard: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
  },
  classHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  classTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    flex: 1,
  },
  levelBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontFamily: fonts.textBold,
    fontSize: 12,
  },
  moduleLabel: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    opacity: 0.85,
  },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  teacherAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  teacherName: {
    fontFamily: fonts.textBold,
    fontSize: 14,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  classTime: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
  },
  durationPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: fonts.textBold,
    fontSize: 11,
  },
  bookBtn: {
    backgroundColor: "#0B0B0F",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  bookBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  startCard: {
    borderRadius: 28,
    padding: 22,
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  startHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  startLabel: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.7,
  },
  startIconChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  startTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: "#0B0B0F",
    marginTop: 6,
    lineHeight: 28,
    maxWidth: "68%",
  },
  startAttr: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: "#0B0B0F",
    opacity: 0.6,
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
  findLevelText: {
    fontFamily: fonts.textBold,
    color: "#FFF",
    fontSize: 13,
  },
  mascotEmoji: {
    position: "absolute",
    right: 20,
    bottom: 22,
    fontSize: 80,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: learnColors.surface,
    borderRadius: 999,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: 6,
  },
  planLabel: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
  },
  planAllChip: {
    backgroundColor: learnColors.surfaceHigh,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  planAllText: {
    fontFamily: fonts.textBold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFFFFF",
    marginTop: 12,
  },
  teacherGrid: {
    flexDirection: "row",
    gap: 14,
  },
  teacherCard: {
    flex: 1,
    backgroundColor: learnColors.surface,
    borderRadius: 20,
    padding: 12,
    alignItems: "flex-start",
    gap: 10,
  },
  teacherPhoto: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherCardName: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  teacherCardSub: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: learnColors.onSurfaceSecondary,
    marginTop: 2,
  },
});
