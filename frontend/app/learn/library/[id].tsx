import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { STORIES } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

export default function StoryDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const story = STORIES.find((s) => s.id === id) || STORIES[0];
  const [showGloss, setShowGloss] = useState(true);
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="story-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.topTitle}>Story</Text>
        <Pressable
          testID="story-toggle-gloss"
          onPress={() => setShowGloss((v) => !v)}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name={showGloss ? "eye" : "eye-off"} size={18} color="#FFF" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: story.color }]}>
          <Text style={styles.emoji}>{story.emoji}</Text>
          <Text style={styles.title}>{story.title}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{story.level}</Text>
          </View>
        </View>
        <View style={styles.textCard}>
          <Text style={styles.body2}>{story.body}</Text>
        </View>
        {showGloss && (
          <>
            <Text style={styles.sectionLabel}>Glossary</Text>
            <View style={styles.gloss}>
              {story.glossary.map((g, i) => (
                <View key={i} style={styles.glossRow}>
                  <Text style={styles.glossWord}>{g.word}</Text>
                  <Text style={styles.glossMeaning}>{g.meaning}</Text>
                </View>
              ))}
            </View>
          </>
        )}
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
  hero: { borderRadius: 26, padding: 22, alignItems: "center", gap: 6 },
  emoji: { fontSize: 46 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: "#0B0B0F",
    textAlign: "center",
    marginTop: 4,
  },
  pill: {
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  pillText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
  textCard: {
    backgroundColor: learnColors.surface,
    borderRadius: 20,
    padding: 18,
  },
  body2: {
    fontFamily: fonts.textSemi,
    fontSize: 15,
    color: "#FFF",
    lineHeight: 24,
  },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFF",
    marginTop: 4,
  },
  gloss: {
    backgroundColor: learnColors.surface,
    borderRadius: 18,
    padding: 4,
  },
  glossRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: learnColors.border,
  },
  glossWord: { fontFamily: fonts.textBold, color: "#FFF", fontSize: 13 },
  glossMeaning: {
    fontFamily: fonts.textSemi,
    color: learnColors.onSurfaceSecondary,
    fontSize: 13,
  },
});
