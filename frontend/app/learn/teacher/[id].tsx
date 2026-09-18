import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts } from "@/src/theme";
import { TEACHERS } from "@/src/learn/data";
import { learnColors } from "@/src/learn/theme";

export default function TeacherDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = TEACHERS.find((x) => x.id === id) || TEACHERS[0];
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          testID="teacher-back"
          onPress={() => router.back()}
          style={styles.iconChip}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.topTitle}>Teacher</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: t.bg }]}>
          <Text style={styles.avatar}>{t.emoji}</Text>
          <Text style={styles.name}>{t.name}</Text>
          <Text style={styles.country}>{t.country}</Text>
          <View style={styles.metaRow}>
            <View style={styles.pill}>
              <Ionicons name="star" size={12} color="#0B0B0F" />
              <Text style={styles.pillText}>{t.rating}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t.reviews} reviews</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t.price}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}><Text style={styles.text}>{t.bio}</Text></View>

        <Text style={styles.sectionLabel}>Languages</Text>
        <View style={styles.tagRow}>
          {t.languages.map((l) => (
            <View key={l} style={styles.tag}><Text style={styles.tagText}>{l}</Text></View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Specialties</Text>
        <View style={styles.tagRow}>
          {t.specialties.map((s) => (
            <View key={s} style={[styles.tag, { backgroundColor: learnColors.surfaceHigh }]}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
        </View>

        <Pressable testID="teacher-book" style={styles.book}>
          <Text style={styles.bookText}>Book a trial class</Text>
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
  topTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: "#FFF" },
  body: { padding: 20, gap: 14 },
  hero: { borderRadius: 26, padding: 22, gap: 6, alignItems: "center" },
  avatar: { fontSize: 60 },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: "#0B0B0F",
    marginTop: 6,
  },
  country: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#0B0B0F",
    opacity: 0.7,
  },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontFamily: fonts.textBold, fontSize: 11, color: "#0B0B0F" },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: "#FFF",
    marginTop: 8,
  },
  card: {
    backgroundColor: learnColors.surface,
    borderRadius: 18,
    padding: 16,
  },
  text: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: "#FFF",
    lineHeight: 20,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: learnColors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { fontFamily: fonts.textBold, fontSize: 12, color: "#FFF" },
  book: {
    backgroundColor: learnColors.orange,
    borderRadius: 999,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  bookText: { fontFamily: fonts.textBold, fontSize: 15, color: "#FFF" },
});
