import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { WORD_OF_DAY } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

export default function WordOfDay() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const w = WORD_OF_DAY;
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="wod-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Word of the Day</Text>
        <Pressable
          testID="wod-save"
          onPress={() => setSaved((s) => !s)}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={saved ? learnColors.orange : "#FFF"}
          />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: w.color }]}>
          <Text style={styles.emoji}>{w.emoji}</Text>
          <Text style={styles.word}>{w.word}</Text>
          <Text style={styles.ipa}>{w.ipa}</Text>
          <Text style={styles.lang}>{w.language}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Meaning</Text>
          <Text style={styles.meaning}>{w.meaning}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Example</Text>
          <Text style={styles.example}>“{w.example}”</Text>
          <Text style={styles.translation}>{w.exampleTranslation}</Text>
        </View>

        <Pressable
          testID="wod-practice"
          onPress={() => router.push("/learn/session")}
          style={styles.practice}
        >
          <Text style={styles.practiceText}>Add to flashcards</Text>
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
  h1: { fontFamily: fonts.displayBold, fontSize: 18, color: "#FFF" },
  body: { padding: 20, gap: 14 },
  hero: { borderRadius: 28, padding: 26, alignItems: "center", gap: 6 },
  emoji: { fontSize: 50 },
  word: {
    fontFamily: fonts.displayBold,
    fontSize: 38,
    color: "#0B0B0F",
    marginTop: 8,
    fontStyle: "italic",
  },
  ipa: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.7,
  },
  lang: {
    fontFamily: fonts.textBold,
    fontSize: 11,
    color: "#0B0B0F",
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: learnColors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  label: {
    fontFamily: fonts.textBold,
    fontSize: 11,
    color: learnColors.orange,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  meaning: {
    fontFamily: fonts.textSemi,
    fontSize: 16,
    color: "#FFF",
    lineHeight: 24,
    marginTop: 2,
  },
  example: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: "#FFF",
    fontStyle: "italic",
    marginTop: 2,
  },
  translation: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
    marginTop: 4,
  },
  practice: {
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
