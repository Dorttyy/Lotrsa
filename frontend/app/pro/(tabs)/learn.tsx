import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { proColors, proFonts, proRadius, proShadow } from "@/src/pro/theme";

const PATHS = [
  { icon: "briefcase-outline", title: "Business English", sub: "Meetings, emails & presentations", color: proColors.terracotta, tint: proColors.terracottaTint },
  { icon: "airplane-outline", title: "Travel & Everyday", sub: "Speak confidently anywhere", color: proColors.sage, tint: proColors.sageTint },
  { icon: "school-outline", title: "Exam Prep", sub: "IELTS · TOEFL · JLPT · HSK", color: proColors.gold, tint: "#F6EFDD" },
  { icon: "chatbubbles-outline", title: "Free Conversation", sub: "Fluency through real talk", color: proColors.terracotta, tint: proColors.terracottaTint },
];

const LESSONS = [
  { title: "Ordering at a café", level: "Beginner", mins: 15 },
  { title: "Job interview basics", level: "Intermediate", mins: 25 },
  { title: "Debating opinions", level: "Advanced", mins: 30 },
];

export default function ProLearn() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="pro-learn-screen">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>PRO · CURRICULUM</Text>
          <Text style={styles.title}>What will you{"\n"}master today?</Text>
        </View>

        <Text style={styles.section}>Learning paths</Text>
        <View style={styles.grid}>
          {PATHS.map((p) => (
            <Pressable
              key={p.title}
              testID={`pro-path-${p.title}`}
              style={styles.pathCard}
              onPress={() => router.push("/pro/tutors")}
            >
              <View style={[styles.pathIcon, { backgroundColor: p.tint }]}>
                <Ionicons name={p.icon as any} size={22} color={p.color} />
              </View>
              <Text style={styles.pathTitle}>{p.title}</Text>
              <Text style={styles.pathSub}>{p.sub}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Guided lessons</Text>
        <View style={styles.lessonList}>
          {LESSONS.map((l, i) => (
            <Pressable
              key={l.title}
              testID={`pro-lesson-${i}`}
              style={styles.lessonRow}
              onPress={() => router.push("/pro/tutors")}
            >
              <View style={styles.lessonNum}>
                <Text style={styles.lessonNumText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lessonTitle}>{l.title}</Text>
                <Text style={styles.lessonMeta}>
                  {l.level} · {l.mins} min
                </Text>
              </View>
              <Ionicons name="play-circle" size={30} color={proColors.terracotta} />
            </Pressable>
          ))}
        </View>

        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Not sure where to start?</Text>
            <Text style={styles.bannerSub}>Take a 3-minute level check with a tutor.</Text>
          </View>
          <Pressable style={styles.bannerBtn} onPress={() => router.push("/pro/home")}>
            <Text style={styles.bannerBtnText}>Start</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: proColors.bg },
  body: { paddingBottom: 40 },
  header: { paddingHorizontal: 22, paddingTop: 8 },
  kicker: { fontFamily: proFonts.sansSemi, fontSize: 11, letterSpacing: 2, color: proColors.terracotta },
  title: { fontFamily: proFonts.serifBold, fontSize: 28, color: proColors.ink, marginTop: 4, lineHeight: 34 },
  section: { fontFamily: proFonts.serifBold, fontSize: 20, color: proColors.ink, paddingHorizontal: 22, marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14, paddingHorizontal: 22 },
  pathCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  pathIcon: {
    width: 46,
    height: 46,
    borderRadius: proRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  pathTitle: { fontFamily: proFonts.sansBold, fontSize: 15, color: proColors.ink },
  pathSub: { fontFamily: proFonts.sans, fontSize: 12, color: proColors.inkSoft, marginTop: 3, lineHeight: 17 },
  lessonList: { paddingHorizontal: 22, gap: 12 },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  lessonNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: proColors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonNumText: { fontFamily: proFonts.sansBold, fontSize: 14, color: proColors.sage },
  lessonTitle: { fontFamily: proFonts.sansBold, fontSize: 15, color: proColors.ink },
  lessonMeta: { fontFamily: proFonts.sans, fontSize: 12, color: proColors.inkSoft, marginTop: 2 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: proColors.ink,
    borderRadius: proRadius.xl,
    marginHorizontal: 22,
    marginTop: 24,
    padding: 18,
  },
  bannerTitle: { fontFamily: proFonts.serifBold, fontSize: 17, color: "#FFFFFF" },
  bannerSub: { fontFamily: proFonts.sans, fontSize: 12.5, color: "rgba(255,255,255,0.72)", marginTop: 3 },
  bannerBtn: {
    backgroundColor: proColors.terracotta,
    borderRadius: proRadius.md,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  bannerBtnText: { fontFamily: proFonts.sansBold, fontSize: 14, color: proColors.onAccent },
});
