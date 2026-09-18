import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { COURSES } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

const CATEGORIES = ["All", "Travel", "Career", "Everyday", "Grammar"];

export default function LearnCourses() {
  const router = useRouter();
  const [cat, setCat] = useState("All");
  const list = cat === "All" ? COURSES : COURSES.filter((c) => c.category === cat);
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="learn-courses-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Courses</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        horizontal
        contentContainerStyle={styles.chipRow}
        showsHorizontalScrollIndicator={false}
      >
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            testID={`learn-courses-cat-${c}`}
            onPress={() => setCat(c)}
            style={[styles.chip, cat === c && styles.chipActive]}
          >
            <Text style={[styles.chipText, cat === c && styles.chipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {list.map((c) => (
          <Pressable
            key={c.id}
            testID={`learn-course-${c.id}`}
            onPress={() => router.push(`/learn/course/${c.id}`)}
            style={[styles.card, { backgroundColor: c.color }]}
          >
            <View style={styles.cardTop}>
              <View style={styles.levelBadge}><Text style={styles.levelText}>{c.level}</Text></View>
              <Text style={styles.emoji}>{c.emoji}</Text>
            </View>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardBody}>{c.description}</Text>
            <View style={styles.footRow}>
              <View style={styles.footPill}>
                <Ionicons name="book-outline" size={12} color="#0B0B0F" />
                <Text style={styles.footText}>{c.lessons} lessons</Text>
              </View>
              <View style={styles.footPill}>
                <Ionicons name="time-outline" size={12} color="#0B0B0F" />
                <Text style={styles.footText}>{c.minutes}m</Text>
              </View>
            </View>
          </Pressable>
        ))}
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
  h1: { fontFamily: fonts.displayBold, fontSize: 18, color: "#FFF" },
  chipRow: { paddingHorizontal: 20, gap: 8, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: learnColors.surface,
  },
  chipActive: { backgroundColor: learnColors.orange },
  chipText: { fontFamily: fonts.textBold, fontSize: 12, color: "#B0B0BD" },
  chipTextActive: { color: "#FFF" },
  body: { padding: 20, gap: 14 },
  card: { borderRadius: 22, padding: 18, gap: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelBadge: {
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
  emoji: { fontSize: 32 },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: "#0B0B0F" },
  cardBody: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.75,
    lineHeight: 18,
  },
  footRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  footPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  footText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
});
