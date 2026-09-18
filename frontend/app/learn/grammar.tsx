import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { GRAMMAR_LESSONS } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

export default function LearnGrammar() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="learn-grammar-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Grammar Guide</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Bite-sized grammar with real-life examples. Tap any lesson to open.
        </Text>
        {GRAMMAR_LESSONS.map((lesson) => (
          <Pressable
            key={lesson.id}
            testID={`learn-grammar-lesson-${lesson.id}`}
            onPress={() => router.push(`/learn/grammar/${lesson.id}`)}
            style={[styles.card, { backgroundColor: lesson.color }]}
          >
            <View style={styles.cardTop}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{lesson.level}</Text>
              </View>
              <Text style={styles.emoji}>{lesson.emoji}</Text>
            </View>
            <Text style={styles.cardTitle}>{lesson.title}</Text>
            <Text style={styles.cardBody}>{lesson.summary}</Text>
            <View style={styles.footerRow}>
              <View style={styles.footPill}>
                <Ionicons name="time-outline" size={12} color="#0B0B0F" />
                <Text style={styles.footText}>{lesson.minutes} min</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#0B0B0F" />
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
  h1: { fontFamily: fonts.displayBold, fontSize: 18, color: "#FFFFFF" },
  body: { padding: 20, gap: 14 },
  subtitle: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    marginBottom: 6,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelBadge: {
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
  emoji: { fontSize: 26 },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: "#0B0B0F",
    marginTop: 4,
  },
  cardBody: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.75,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  footPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  footText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
});
