import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { GRAMMAR_LESSONS } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

export default function GrammarDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = GRAMMAR_LESSONS.find((l) => l.id === id) || GRAMMAR_LESSONS[0];
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="grammar-detail-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.topTitle}>Grammar</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: lesson.color }]}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{lesson.level}</Text>
          </View>
          <Text style={styles.emoji}>{lesson.emoji}</Text>
          <Text style={styles.heroTitle}>{lesson.title}</Text>
          <Text style={styles.heroSummary}>{lesson.summary}</Text>
        </View>

        <Text style={styles.sectionLabel}>Explanation</Text>
        <View style={styles.card}>
          <Text style={styles.explanation}>{lesson.body}</Text>
        </View>

        <Text style={styles.sectionLabel}>Examples</Text>
        <View style={styles.card}>
          {lesson.examples.map((ex, i) => (
            <View key={i} style={styles.exampleRow}>
              <View style={styles.exampleDot} />
              <Text style={styles.exampleText}>{ex}</Text>
            </View>
          ))}
        </View>

        <Pressable
          testID="grammar-detail-practice"
          onPress={() => router.push("/learn/session")}
          style={styles.practiceBtn}
        >
          <Text style={styles.practiceText}>Practice now</Text>
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
  body: { padding: 20, gap: 14 },
  hero: {
    borderRadius: 26,
    padding: 22,
    gap: 8,
  },
  levelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
  emoji: { fontSize: 40, marginTop: 4 },
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: "#0B0B0F",
    marginTop: 4,
  },
  heroSummary: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.75,
    lineHeight: 19,
  },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFF",
    marginTop: 6,
  },
  card: {
    backgroundColor: learnColors.surface,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  explanation: {
    fontFamily: fonts.textSemi,
    fontSize: 14,
    color: "#FFF",
    lineHeight: 22,
  },
  exampleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  exampleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: learnColors.orange,
    marginTop: 8,
  },
  exampleText: {
    flex: 1,
    fontFamily: fonts.textSemi,
    fontSize: 14,
    color: "#FFF",
    lineHeight: 20,
  },
  practiceBtn: {
    backgroundColor: learnColors.orange,
    borderRadius: 999,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  practiceText: { fontFamily: fonts.textBold, fontSize: 14, color: "#FFF" },
});
