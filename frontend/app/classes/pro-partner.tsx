/**
 * Pro Partner detail — reference-inspired 3-page scroll experience.
 *
 * Sections (top to bottom):
 *   1. Blue hero: "15-minute immersive sessions"
 *   2. Language partners card
 *   3. "Talk about what you want" 2×2 grid
 *   4. "Three-step learning method" numbered card
 *   5. "Meet Your Real-Life Teachers" spotlight
 *   6. "Solutions you could consider" 2×2 grid
 *   7. "Professional curriculum" tag chips
 *   8. Bottom docked "Consult · Find your Pro Partner" CTA bar
 */

import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { IconChip } from "@/src/components/IconChip";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, spacing, ThemeColors } from "@/src/theme";

export default function ProPartner() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="pro-partner">
      {/* Header */}
      <View style={styles.header}>
        <IconChip
          testID="pp-back"
          tint="neutral"
          icon="chevron-back"
          size={22}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Pro Partner</Text>
        <IconChip
          testID="pp-share"
          tint="neutral"
          icon="share-outline"
          size={19}
          onPress={() => { /* placeholder */ }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* Hero */}
        <LinearGradient
          colors={["#2563EB", "#1D4ED8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroSuper}>15-minute</Text>
          <Text style={styles.heroTitle}>immersive</Text>
          <Text style={styles.heroTitle}>sessions</Text>
          <View style={styles.heroChip}>
            <Ionicons name="time" size={12} color="#FFFFFF" />
            <Text style={styles.heroChipText}>Bite-sized · everyday</Text>
          </View>
        </LinearGradient>

        {/* Language partners */}
        <View style={styles.partnerCard}>
          <View style={styles.partnerBadge}>
            <Text style={styles.partnerBadgeText}>TEFL Certified</Text>
          </View>
          <Text style={styles.partnerTitle}>
            Carefully selected language partners
          </Text>
          <Text style={styles.partnerSub}>
            Every partner is vetted for fluency, patience, and lesson
            expertise so your 15-minutes are always productive.
          </Text>
          <View style={styles.partnerFace}>
            <Ionicons name="person-circle" size={72} color={colors.brand} />
          </View>
        </View>

        {/* Talk about what you want — 2x2 */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Talk about what you want</Text>
        </View>
        <View style={styles.talkGrid}>
          {[
            { title: "Interests",         icon: "heart" as const,         bg: "#FEE2E2", fg: "#DC2626" },
            { title: "Real-life English", icon: "chatbubbles" as const,   bg: "#DBEAFE", fg: "#2563EB" },
            { title: "Everyday English",  icon: "cafe" as const,          bg: "#FEF3C7", fg: "#D97706" },
            { title: "Free talk",         icon: "mic" as const,           bg: "#DCFCE7", fg: "#0E9AE0" },
          ].map((c) => (
            <View key={c.title} style={styles.talkCard}>
              <View style={[styles.talkIcon, { backgroundColor: c.bg }]}>
                <Ionicons name={c.icon} size={22} color={c.fg} />
              </View>
              <Text style={styles.talkText}>{c.title}</Text>
            </View>
          ))}
        </View>

        {/* Three-step method */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            Follow our three-step learning method
          </Text>
        </View>
        <LinearGradient
          colors={["#3B82F6", "#1D4ED8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.stepsCard}
        >
          {[
            { n: 1, text: "Listen to the lesson podcasts",                              icon: "headset" as const },
            { n: 2, text: "Enjoy your live lesson with a real English Teacher",         icon: "videocam" as const },
            { n: 3, text: "Reinforce by reading its own English Times article",         icon: "newspaper" as const },
          ].map((s) => (
            <View key={s.n} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
              <View style={styles.stepIcon}>
                <Ionicons name={s.icon} size={22} color="#FFFFFF" />
              </View>
            </View>
          ))}
        </LinearGradient>

        {/* Meet teachers */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Meet Your Real-Life Teachers</Text>
        </View>
        <LinearGradient
          colors={["#FDBA74", "#F97316"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.teacherCard}
        >
          <View style={styles.teacherAvatar}>
            <Ionicons name="person-circle" size={70} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teacherName}>John Everly</Text>
            <Text style={styles.teacherRole}>Senior English Coach · 10y</Text>
            <Text style={styles.teacherLine}>
              Loves teaching business English and travel talk. Always keeps
              class energetic.
            </Text>
          </View>
        </LinearGradient>

        {/* Solutions grid */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Solutions you could consider</Text>
          <View style={styles.tagPurple}>
            <Text style={styles.tagPurpleText}>Advanced learning methods</Text>
          </View>
        </View>
        <View style={styles.talkGrid}>
          {[
            { title: "Modern audio & video classrooms",       icon: "videocam" as const,        bg: "#E2F3FC", fg: "#0A6B9E" },
            { title: "Live chat with native teachers",         icon: "chatbubbles" as const,    bg: "#DBEAFE", fg: "#2563EB" },
            { title: "Attentive Customer Services",            icon: "headset" as const,        bg: "#FEF3C7", fg: "#D97706" },
            { title: "Expansive self-study support materials", icon: "book" as const,           bg: "#DCFCE7", fg: "#0E9AE0" },
          ].map((c) => (
            <View key={c.title} style={styles.talkCard}>
              <View style={[styles.talkIcon, { backgroundColor: c.bg }]}>
                <Ionicons name={c.icon} size={22} color={c.fg} />
              </View>
              <Text style={styles.talkText} numberOfLines={2}>{c.title}</Text>
            </View>
          ))}
        </View>

        {/* Curriculum */}
        <View style={styles.sectionHead}>
          <View style={styles.tagPurple}>
            <Text style={styles.tagPurpleText}>
              Professional curriculum study system
            </Text>
          </View>
        </View>
        <View style={styles.chipsRow}>
          {[
            "CEFR benchmarking system",
            "A1-C2 incremental progression",
            "800+ scenario experiential study",
          ].map((c) => (
            <View key={c} style={styles.orangeChip}>
              <Text style={styles.orangeChipText}>{c}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Docked CTA bar */}
      <View style={styles.dockBar}>
        <Pressable
          testID="pp-consult"
          onPress={() => router.push("/pro")}
          style={styles.consultBtn}
        >
          <Ionicons name="chatbubble-ellipses" size={22} color={colors.brand} />
          <Text style={styles.consultText}>Consult</Text>
        </Pressable>
        <Pressable
          testID="pp-find"
          onPress={() => router.push("/pro/tutors")}
          style={styles.findBtn}
        >
          <Text style={styles.findText}>Find your Pro Partner</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: colors.onSurface,
    },
    // ── Hero ──
    hero: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.xl,
      borderRadius: 22,
      minHeight: 170,
      justifyContent: "center",
    },
    heroSuper: {
      color: "rgba(255,255,255,0.8)",
      fontFamily: fonts.displayBold,
      fontSize: 15,
      marginBottom: 4,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 32,
      lineHeight: 36,
    },
    heroChip: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(255,255,255,0.22)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: 12,
    },
    heroChipText: {
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 11.5,
    },
    // ── Partner card ──
    partnerCard: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      backgroundColor: "#0EA5E9",
      borderRadius: 22,
      padding: 20,
      overflow: "hidden",
    },
    partnerBadge: {
      alignSelf: "flex-start",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    partnerBadgeText: {
      color: "#0284C7",
      fontFamily: fonts.displayBold,
      fontSize: 11,
    },
    partnerTitle: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 18,
      marginTop: 12,
    },
    partnerSub: {
      color: "rgba(255,255,255,0.9)",
      fontFamily: fonts.text,
      fontSize: 13,
      marginTop: 6,
      lineHeight: 18,
    },
    partnerFace: {
      alignSelf: "flex-end",
      marginTop: 8,
    },
    // ── Section head ──
    sectionHead: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
      gap: 8,
    },
    sectionTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 20,
      color: colors.onSurface,
    },
    tagPurple: {
      alignSelf: "flex-start",
      backgroundColor: colors.brandTertiary,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
    },
    tagPurpleText: {
      color: colors.brand,
      fontFamily: fonts.displayBold,
      fontSize: 12.5,
    },
    // ── 2x2 grid ──
    talkGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.lg - 4,
      rowGap: 10,
      columnGap: 8,
    },
    talkCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      width: "48%",
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
    },
    talkIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    talkText: {
      flex: 1,
      fontFamily: fonts.textBold,
      fontSize: 12.5,
      color: colors.onSurface,
    },
    // ── Steps card ──
    stepsCard: {
      marginHorizontal: spacing.lg,
      borderRadius: 22,
      padding: 18,
      gap: 12,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    stepNum: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    stepNumText: {
      color: "#1D4ED8",
      fontFamily: fonts.displayBold,
      fontSize: 15,
    },
    stepText: {
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 13,
      lineHeight: 18,
    },
    stepIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    // ── Teacher card ──
    teacherCard: {
      marginHorizontal: spacing.lg,
      borderRadius: 22,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    teacherAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    teacherName: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 16,
    },
    teacherRole: {
      color: "rgba(255,255,255,0.9)",
      fontFamily: fonts.textBold,
      fontSize: 11.5,
      marginTop: 2,
    },
    teacherLine: {
      color: "rgba(255,255,255,0.95)",
      fontFamily: fonts.text,
      fontSize: 12.5,
      marginTop: 6,
      lineHeight: 17,
    },
    // ── Chips row ──
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.lg,
      gap: 8,
    },
    orangeChip: {
      backgroundColor: "#FFEDD5",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    orangeChipText: {
      color: "#EA580C",
      fontFamily: fonts.textBold,
      fontSize: 12.5,
    },
    // ── Dock CTA ──
    dockBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: spacing.lg,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    consultBtn: {
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      paddingHorizontal: 8,
    },
    consultText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.brand,
    },
    findBtn: {
      flex: 1,
      backgroundColor: colors.brand,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: "center",
    },
    findText: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 15,
    },
  });
