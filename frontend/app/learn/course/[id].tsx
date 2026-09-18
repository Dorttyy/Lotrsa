import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { COURSES } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

export default function CourseDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = COURSES.find((c) => c.id === id) || COURSES[0];
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="course-detail-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.topTitle}>Course</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: course.color }]}>
          <Text style={styles.emoji}>{course.emoji}</Text>
          <Text style={styles.heroTitle}>{course.title}</Text>
          <Text style={styles.heroBody}>{course.description}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{course.level}</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="book-outline" size={12} color="#0B0B0F" />
              <Text style={styles.pillText}>{course.lessons} lessons</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="time-outline" size={12} color="#0B0B0F" />
              <Text style={styles.pillText}>{course.minutes} min</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Course outline</Text>
        {course.outline.map((step, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6B6B75" />
          </View>
        ))}

        <Pressable
          testID="course-detail-start"
          onPress={() => router.push("/learn/session")}
          style={styles.startBtn}
        >
          <Text style={styles.startBtnText}>Start course</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </Pressable>
      </ScrollView>
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
  topTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: "#FFF" },
  body: { padding: 20, gap: 12 },
  hero: { borderRadius: 26, padding: 22, gap: 8 },
  emoji: { fontSize: 44 },
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: "#0B0B0F",
    marginTop: 4,
  },
  heroBody: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.75,
    lineHeight: 19,
  },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFF",
    marginTop: 10,
    marginBottom: 4,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: learnColors.surface,
    borderRadius: 18,
    padding: 14,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: learnColors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontFamily: fonts.displayBold, color: "#FFF" },
  stepTitle: { fontFamily: fonts.textBold, fontSize: 14, color: "#FFF" },
  stepBody: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: learnColors.onSurfaceSecondary,
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: learnColors.orange,
    borderRadius: 999,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  startBtnText: { fontFamily: fonts.textBold, fontSize: 15, color: "#FFF" },
});
