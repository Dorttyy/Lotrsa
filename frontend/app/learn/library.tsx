import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { STORIES } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

export default function LearnLibrary() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="library-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Reading Library</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Short stories, big vocab wins. Each comes with a glossary.</Text>
        {STORIES.map((s) => (
          <Pressable
            key={s.id}
            testID={`library-story-${s.id}`}
            onPress={() => router.push(`/learn/library/${s.id}`)}
            style={[styles.card, { backgroundColor: s.color }]}
          >
            <View style={styles.top}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{s.level}</Text>
              </View>
              <Text style={styles.emoji}>{s.emoji}</Text>
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.summary}>{s.summary}</Text>
            <View style={styles.footer}>
              <View style={styles.pill}>
                <Ionicons name="time-outline" size={12} color="#0B0B0F" />
                <Text style={styles.pillText}>{s.minutes} min read</Text>
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
  h1: { fontFamily: fonts.displayBold, fontSize: 18, color: "#FFF" },
  body: { padding: 20, gap: 14 },
  subtitle: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    marginBottom: 4,
  },
  card: { borderRadius: 22, padding: 18, gap: 8 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelBadge: {
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
  emoji: { fontSize: 32 },
  title: { fontFamily: fonts.displayBold, fontSize: 20, color: "#0B0B0F" },
  summary: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.75,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
});
