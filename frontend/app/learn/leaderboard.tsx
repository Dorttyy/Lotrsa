import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { LEADERBOARD } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

export default function LearnLeaderboard() {
  const router = useRouter();
  const sorted = [...LEADERBOARD].sort((a, b) => b.xp - a.xp);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="lb-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.h1}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.subtitle}>
          <Ionicons name="trophy" size={14} color={learnColors.orange} />
          <Text style={styles.subtitleText}>This week · resets in 3 days</Text>
        </View>

        {/* Top 3 podium */}
        <View style={styles.podium}>
          {[top3[1], top3[0], top3[2]].map((u, i) => {
            if (!u) return null;
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const heights = [110, 140, 90];
            const colors = ["#DABFFF", learnColors.yellow, learnColors.green];
            return (
              <View key={u.id} style={styles.podiumCol}>
                <View style={styles.podiumAvatar}>
                  <Text style={styles.podiumEmoji}>{u.emoji}</Text>
                </View>
                <Text style={styles.podiumName}>{u.name}</Text>
                <Text style={styles.podiumXP}>{u.xp} XP</Text>
                <View
                  style={[
                    styles.podiumBar,
                    { backgroundColor: colors[i], height: heights[i] },
                  ]}
                >
                  <Text style={styles.podiumRank}>{rank}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Rest of leaderboard */}
        <View style={styles.list}>
          {rest.map((u, i) => (
            <View
              key={u.id}
              testID={`lb-row-${u.id}`}
              style={[
                styles.row,
                u.isYou && { backgroundColor: "rgba(255,92,31,0.14)", borderColor: learnColors.orange },
              ]}
            >
              <Text style={styles.rank}>{i + 4}</Text>
              <View style={styles.avatarSm}>
                <Text style={styles.avatarSmEmoji}>{u.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, u.isYou && { color: learnColors.orange }]}>
                  {u.name} {u.country}
                </Text>
              </View>
              <Text style={styles.xp}>{u.xp} XP</Text>
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
  body: { padding: 20, gap: 20 },
  subtitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  subtitleText: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: learnColors.onSurfaceSecondary,
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 8,
    marginTop: 8,
  },
  podiumCol: { alignItems: "center", flex: 1 },
  podiumAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumEmoji: { fontSize: 30 },
  podiumName: {
    fontFamily: fonts.textBold,
    color: "#FFF",
    fontSize: 13,
    marginTop: 4,
  },
  podiumXP: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
    color: learnColors.onSurfaceSecondary,
  },
  podiumBar: {
    width: "90%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: 8,
    alignItems: "center",
    paddingTop: 10,
  },
  podiumRank: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: "#0B0B0F",
  },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: learnColors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  rank: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: learnColors.onSurfaceSecondary,
    width: 22,
  },
  avatarSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: learnColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmEmoji: { fontSize: 20 },
  name: { fontFamily: fonts.textBold, fontSize: 13, color: "#FFF" },
  xp: { fontFamily: fonts.textBold, fontSize: 12, color: "#FFF" },
});
