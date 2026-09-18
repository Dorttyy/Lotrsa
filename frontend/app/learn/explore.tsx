import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { LearnDock, useLearnDockPadding } from "@/src/learn/LearnDock";
import { learnColors } from "@/src/learn/theme";

/**
 * Learn / Explore — the discovery hub.
 * Big colorful cards route the user to focused learning surfaces (Courses,
 * All Chat Partner, Grammar Guide, …). Layout matches the reference: dark
 * shell, a "fire streak" chip + avatar in the top-right, and big rounded
 * cards with a hand-drawn wavy line pattern as decoration.
 */
export default function LearnExplore() {
  const router = useRouter();
  const dockPad = useLearnDockPadding();
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Text style={styles.h1}>Explore</Text>
        <View style={styles.rightGroup}>
          <View style={styles.streakChip}>
            <Text style={{ fontSize: 15 }}>🔥</Text>
          </View>
          <View style={styles.avatarChip}>
            <Text style={styles.avatarEmoji}>🙂</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: dockPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          testID="learn-explore-search"
          style={styles.searchChip}
          onPress={() => router.push("/learn/vocabulary")}
        >
          <Ionicons name="search" size={18} color="#FFFFFF" />
        </Pressable>

        <ExploreCard
          testID="learn-explore-courses"
          color="#DABFFF"
          title="Courses"
          body="Curated courses across travel, career, everyday chat and pure grammar."
          icon={<MaterialCommunityIcons name="school" size={22} color="#2B1D51" />}
          onPress={() => router.push("/learn/courses")}
        />
        <ExploreCard
          testID="learn-explore-chat-partner"
          color={learnColors.yellow}
          title="AI Chat Partner"
          body="Real-time chat with Lupe, your AI tutor. Corrections included."
          icon={
            <MaterialCommunityIcons name="chip" size={22} color="#0B0B0F" />
          }
          onPress={() => router.push("/learn/tutor")}
        />
        <ExploreCard
          testID="learn-explore-grammar"
          color={learnColors.green}
          title="Grammar Guide"
          body="Simple grammar explanations with clear, easy-to-understand examples."
          icon={
            <MaterialCommunityIcons
              name="puzzle-outline"
              size={22}
              color="#0B0B0F"
            />
          }
          onPress={() => router.push("/learn/grammar")}
        />
        <ExploreCard
          testID="learn-explore-library"
          color="#7DD3FC"
          title="Reading Library"
          body="Short stories with built-in glossaries — level up your comprehension."
          icon={
            <MaterialCommunityIcons name="book-open-page-variant" size={22} color="#0B0B0F" />
          }
          onPress={() => router.push("/learn/library")}
        />
        <ExploreCard
          testID="learn-explore-pronunciation"
          color={learnColors.orange}
          title="Pronunciation"
          body="Practice phrases with instant pronunciation feedback."
          icon={
            <MaterialCommunityIcons name="microphone" size={22} color="#FFFFFF" />
          }
          onPress={() => router.push("/learn/pronunciation")}
        />
        <ExploreCard
          testID="learn-explore-writing"
          color="#F9A8D4"
          title="Writing Practice"
          body="Timed prompts + AI feedback to sharpen your writing."
          icon={
            <MaterialCommunityIcons name="pencil" size={22} color="#0B0B0F" />
          }
          onPress={() => router.push("/learn/writing")}
        />
        <ExploreCard
          testID="learn-explore-leaderboard"
          color="#DABFFF"
          title="Leaderboard"
          body="See how you stack up this week — climb the ranks with more XP."
          icon={
            <MaterialCommunityIcons name="trophy" size={22} color="#0B0B0F" />
          }
          onPress={() => router.push("/learn/leaderboard")}
        />
      </ScrollView>

      <LearnDock active="explore" />
    </SafeAreaView>
  );
}

const ExploreCard = ({
  color,
  title,
  body,
  icon,
  onPress,
  testID,
}: {
  color: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  onPress: () => void;
  testID: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={[styles.card, { backgroundColor: color }]}
  >
    <View style={styles.iconChip}>{icon}</View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardBody}>{body}</Text>
    {/* Decorative wavy line motif (approximated with view + border-radius) */}
    <View
      pointerEvents="none"
      style={[
        styles.wave,
        { backgroundColor: "rgba(0,0,0,0.06)" },
      ]}
    />
  </Pressable>
);

// Shared floating dock — imported from @/src/learn/LearnDock so every learn
// screen renders exactly the same component. Kept re-exported here for
// backwards-compat with existing imports elsewhere in the learn stack.
export { LearnDock } from "@/src/learn/LearnDock";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: learnColors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  rightGroup: { flexDirection: "row", gap: 8 },
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
  body: {
    paddingHorizontal: 20,
    gap: 16,
  },
  searchChip: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  card: {
    borderRadius: 28,
    padding: 22,
    minHeight: 190,
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  iconChip: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: "#0B0B0F",
    marginTop: 4,
  },
  cardBody: {
    fontFamily: fonts.textSemi,
    fontSize: 14,
    color: "#0B0B0F",
    lineHeight: 20,
    opacity: 0.75,
  },
  wave: {
    position: "absolute",
    bottom: -30,
    right: -50,
    width: 260,
    height: 70,
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    transform: [{ rotate: "-6deg" }],
    opacity: 0.5,
  },
});
