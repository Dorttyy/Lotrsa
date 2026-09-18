import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { api } from "@/src/utils/api";
import { lessonColors, lessonFonts, lessonRadius } from "@/src/lessons/theme";

interface Row { rank: number; name: string; avatar_url?: string; weekly_xp: number; is_me: boolean }
const MEDAL = [lessonColors.gold, "#C0C7D1", "#E09B58"];

export default function LessonsLeaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = useCallback(async () => {
    try { setRows(await api.get<Row[]>("/lessons/leaderboard")); } catch { /* silent */ }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="lessons-leaderboard-screen">
      <View style={styles.head}>
        <Ionicons name="shield" size={30} color={lessonColors.gold} />
        <Text style={styles.title}>Emerald League</Text>
        <Text style={styles.sub}>Top learners this week</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {rows.map((r) => (
          <View key={`${r.rank}-${r.name}`} style={[styles.row, r.is_me && styles.rowMe]} testID={`lessons-lb-${r.rank}`}>
            <View style={[styles.rankWrap, { backgroundColor: r.rank <= 3 ? MEDAL[r.rank - 1] : lessonColors.surfaceSoft }]}>
              <Text style={[styles.rank, { color: r.rank <= 3 ? "#fff" : lessonColors.inkSoft }]}>{r.rank}</Text>
            </View>
            <Avatar name={r.name} url={r.avatar_url} size={40} />
            <Text style={[styles.name, r.is_me && { color: lessonColors.green }]} numberOfLines={1}>{r.name}{r.is_me ? "  (you)" : ""}</Text>
            <Text style={styles.xp}>{r.weekly_xp} XP</Text>
          </View>
        ))}
        {rows.length === 0 && <Text style={styles.empty}>Complete a lesson to join the league!</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lessonColors.bg },
  head: { alignItems: "center", paddingTop: 8, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: lessonColors.border },
  title: { fontFamily: lessonFonts.black, fontSize: 22, color: lessonColors.ink, marginTop: 4 },
  sub: { fontFamily: lessonFonts.semi, fontSize: 13, color: lessonColors.inkSoft, marginTop: 2 },
  body: { padding: 14, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: lessonColors.surface, borderRadius: lessonRadius.md, padding: 12, borderWidth: 2, borderColor: lessonColors.border },
  rowMe: { borderColor: lessonColors.green, backgroundColor: lessonColors.greenSoft },
  rankWrap: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  rank: { fontFamily: lessonFonts.black, fontSize: 14 },
  name: { flex: 1, fontFamily: lessonFonts.bold, fontSize: 15, color: lessonColors.ink },
  xp: { fontFamily: lessonFonts.black, fontSize: 14, color: lessonColors.inkSoft },
  empty: { fontFamily: lessonFonts.semi, fontSize: 14, color: lessonColors.inkSoft, textAlign: "center", marginTop: 30 },
});
