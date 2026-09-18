import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { ACHIEVEMENTS } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

export default function LearnAchievements() {
  const router = useRouter();
  const earned = ACHIEVEMENTS.filter((a) => a.earned).length;
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="ach-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Achievements</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Text style={styles.summaryNum}>{earned}</Text>
          <Text style={styles.summaryLabel}>of {ACHIEVEMENTS.length} earned</Text>
        </View>
        <View style={styles.grid}>
          {ACHIEVEMENTS.map((a) => (
            <View
              key={a.id}
              testID={`ach-${a.id}`}
              style={[
                styles.card,
                { backgroundColor: a.earned ? a.color : learnColors.surface },
              ]}
            >
              <Text style={[styles.emoji, !a.earned && { opacity: 0.5 }]}>{a.icon}</Text>
              <Text style={[styles.title, { color: a.earned ? "#0B0B0F" : "#FFF" }]}>
                {a.title}
              </Text>
              <Text
                style={[
                  styles.desc,
                  { color: a.earned ? "#0B0B0F" : learnColors.onSurfaceSecondary },
                ]}
              >
                {a.description}
              </Text>
              {a.progress && !a.earned && (
                <View style={styles.progressWrap}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${(a.progress.current / a.progress.total) * 100}%`,
                      },
                    ]}
                  />
                  <Text style={styles.progressText}>
                    {a.progress.current}/{a.progress.total}
                  </Text>
                </View>
              )}
              {a.earned && (
                <View style={styles.earnedPill}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              )}
            </View>
          ))}
        </View>
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
  body: { padding: 20, gap: 16 },
  summary: {
    backgroundColor: learnColors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  summaryNum: {
    fontFamily: fonts.displayBold,
    fontSize: 48,
    color: learnColors.orange,
  },
  summaryLabel: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: learnColors.onSurfaceSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    flexBasis: "47%",
    borderRadius: 18,
    padding: 14,
    gap: 6,
    position: "relative",
    minHeight: 130,
  },
  emoji: { fontSize: 32 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    marginTop: 4,
  },
  desc: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    lineHeight: 15,
  },
  progressWrap: {
    marginTop: 6,
    backgroundColor: learnColors.surfaceHigh,
    borderRadius: 8,
    height: 16,
    justifyContent: "center",
    overflow: "hidden",
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: learnColors.orange,
  },
  progressText: {
    fontFamily: fonts.textBold,
    fontSize: 10,
    color: "#FFF",
    textAlign: "center",
  },
  earnedPill: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
});
