import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/utils/api";
import { lessonColors, lessonFonts, lessonRadius, lessonShadow } from "@/src/lessons/theme";

interface Profile { xp: number; streak: number; gems: number; completed: string[]; hearts: number }

export default function LessonsProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const load = useCallback(async () => {
    try { setP(await api.get<Profile>("/lessons/me")); } catch { /* silent */ }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = [
    { icon: "flame", label: "Day streak", value: p?.streak ?? 0, color: lessonColors.streak },
    { icon: "flash", label: "Total XP", value: p?.xp ?? 0, color: lessonColors.gold },
    { icon: "checkmark-done", label: "Lessons", value: p?.completed?.length ?? 0, color: lessonColors.green },
    { icon: "diamond", label: "Gems", value: p?.gems ?? 0, color: lessonColors.gem },
  ];
  const badges = [
    { icon: "rocket", label: "First steps", on: (p?.completed?.length ?? 0) >= 1, color: lessonColors.coral },
    { icon: "flame", label: "On fire", on: (p?.streak ?? 0) >= 3, color: lessonColors.streak },
    { icon: "trophy", label: "XP 100", on: (p?.xp ?? 0) >= 100, color: lessonColors.gold },
    { icon: "star", label: "Scholar", on: (p?.completed?.length ?? 0) >= 5, color: lessonColors.purple },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="lessons-profile-screen">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Avatar name={user?.name} url={user?.avatar_url} size={80} />
          <Text style={styles.name}>{user?.name || "Learner"}</Text>
          <Text style={styles.sub}>Learning · Spanish</Text>
        </View>
        <View style={styles.grid}>
          {stats.map((st) => (
            <View key={st.label} style={styles.statCard} testID={`lessons-stat-${st.label}`}>
              <Ionicons name={st.icon as any} size={22} color={st.color} />
              <Text style={styles.statValue}>{st.value}</Text>
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.section}>Achievements</Text>
        <View style={styles.grid}>
          {badges.map((b) => (
            <View key={b.label} style={[styles.badge, !b.on && styles.badgeOff]}>
              <Ionicons name={b.icon as any} size={26} color={b.on ? b.color : lessonColors.inkFaint} />
              <Text style={[styles.badgeLabel, { color: b.on ? lessonColors.ink : lessonColors.inkFaint }]}>{b.label}</Text>
            </View>
          ))}
        </View>
        <Pressable testID="lessons-profile-exit" style={styles.exit} onPress={() => router.replace("/(tabs)/chats")}>
          <Ionicons name="exit-outline" size={18} color={lessonColors.green} />
          <Text style={styles.exitText}>Back to main app</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lessonColors.bg },
  body: { padding: 16, gap: 8 },
  head: { alignItems: "center", gap: 6, paddingVertical: 10 },
  name: { fontFamily: lessonFonts.black, fontSize: 24, color: lessonColors.ink, marginTop: 6 },
  sub: { fontFamily: lessonFonts.semi, fontSize: 13, color: lessonColors.inkSoft },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 },
  statCard: { width: "47%", flexGrow: 1, backgroundColor: lessonColors.surface, borderRadius: lessonRadius.md, padding: 16, borderWidth: 2, borderColor: lessonColors.border, gap: 4, ...lessonShadow.card },
  statValue: { fontFamily: lessonFonts.black, fontSize: 24, color: lessonColors.ink },
  statLabel: { fontFamily: lessonFonts.semi, fontSize: 12.5, color: lessonColors.inkSoft },
  section: { fontFamily: lessonFonts.black, fontSize: 18, color: lessonColors.ink, marginTop: 18 },
  badge: { width: "47%", flexGrow: 1, alignItems: "center", gap: 6, backgroundColor: lessonColors.surface, borderRadius: lessonRadius.md, paddingVertical: 20, borderWidth: 2, borderColor: lessonColors.border },
  badgeOff: { opacity: 0.55 },
  badgeLabel: { fontFamily: lessonFonts.bold, fontSize: 13 },
  exit: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22, paddingVertical: 14, borderRadius: lessonRadius.md, borderWidth: 2, borderColor: lessonColors.greenSoft },
  exitText: { fontFamily: lessonFonts.black, fontSize: 14, color: lessonColors.green },
});
