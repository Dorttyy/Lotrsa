import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { api } from "@/src/utils/api";
import { ChunkyButton } from "@/src/lessons/ChunkyButton";
import { lessonColors, lessonFonts, lessonRadius, lessonShadow } from "@/src/lessons/theme";

export default function LessonsShop() {
  const [gems, setGems] = useState(0);
  const [hearts, setHearts] = useState(5);
  const load = useCallback(async () => {
    try { const p = await api.get<{ gems: number; hearts: number }>("/lessons/me"); setGems(p.gems); setHearts(p.hearts); } catch { /* silent */ }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refill = async () => {
    try { const r = await api.post<{ hearts: number; gems: number }>("/lessons/hearts/refill"); setHearts(r.hearts); setGems(r.gems); }
    catch (e) { Alert.alert("Shop", e instanceof Error ? e.message : "Could not refill"); }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="lessons-shop-screen">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <Text style={styles.title}>Shop</Text>
          <View style={styles.gemPill}><Ionicons name="diamond" size={16} color={lessonColors.gem} /><Text style={styles.gemText}>{gems}</Text></View>
        </View>

        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: lessonColors.wrongSoft }]}><Ionicons name="heart" size={30} color={lessonColors.heart} /></View>
          <Text style={styles.cardTitle}>Refill hearts</Text>
          <Text style={styles.cardSub}>You have {hearts}/5 hearts. Refill to full for 15 gems.</Text>
          <ChunkyButton testID="lessons-shop-refill" label={hearts >= 5 ? "Hearts full" : "Refill • 15 💎"} color={hearts >= 5 ? lessonColors.borderStrong : lessonColors.heart} onPress={refill} disabled={hearts >= 5} />
        </View>

        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: lessonColors.blueSoft }]}><Ionicons name="snow" size={30} color={lessonColors.blue} /></View>
          <Text style={styles.cardTitle}>Streak freeze</Text>
          <Text style={styles.cardSub}>Protect your streak for one day off. (Coming soon)</Text>
          <ChunkyButton label="Equip • 20 💎" color={lessonColors.blue} onPress={() => Alert.alert("Streak freeze", "Coming soon!")} />
        </View>

        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: lessonColors.goldSoft }]}><Ionicons name="flash" size={30} color={lessonColors.gold} /></View>
          <Text style={styles.cardTitle}>Double XP boost</Text>
          <Text style={styles.cardSub}>Earn 2× XP for your next 15 minutes. (Coming soon)</Text>
          <ChunkyButton label="Activate • 30 💎" color={lessonColors.gold} textColor={lessonColors.ink} onPress={() => Alert.alert("Double XP", "Coming soon!")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lessonColors.bg },
  body: { padding: 16, gap: 14 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: lessonFonts.black, fontSize: 28, color: lessonColors.ink },
  gemPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: lessonColors.blueSoft, borderRadius: lessonRadius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  gemText: { fontFamily: lessonFonts.black, fontSize: 15, color: lessonColors.gem },
  card: { backgroundColor: lessonColors.surface, borderRadius: lessonRadius.lg, padding: 18, borderWidth: 2, borderColor: lessonColors.border, gap: 8, ...lessonShadow.card },
  icon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: lessonFonts.black, fontSize: 18, color: lessonColors.ink, marginTop: 4 },
  cardSub: { fontFamily: lessonFonts.semi, fontSize: 13, color: lessonColors.inkSoft, lineHeight: 19, marginBottom: 6 },
});
