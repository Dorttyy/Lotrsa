/**
 * Per-language courses detail page — reference-inspired.
 *
 * Route: /language-courses/[code]  (e.g. "en", "ar", "ko")
 *
 * Mirrors the Screenshot-3-style pages: a curated catalogue for the chosen
 * language across sections — Best Value, Speaking (LiveClass, Pro Partner),
 * Listening (HelloXxx), AI Talk, Words, and Reading. Every card deep-links
 * into a real destination (LiveClass → /pro, HelloWords → /vocab-hub,
 * AI Talk → /chat with AI, etc.) so nothing feels dead.
 */

import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FlagIcon } from "@/src/components/FlagIcon";
import { IconChip } from "@/src/components/IconChip";
import { langName } from "@/src/constants/languages";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, spacing, ThemeColors } from "@/src/theme";

// Curated palette per language (matches AI card palette on the hub).
const LANG_PALETTE: Record<string, { gradient: [string, string]; accent: string }> = {
  ar: { gradient: ["#10723C", "#146945"], accent: "#FBBF24" },
  en: { gradient: ["#2563EB", "#1D4ED8"], accent: "#FBBF24" },
  ja: { gradient: ["#F43F5E", "#BE123C"], accent: "#FFFFFF" },
  ko: { gradient: ["#38BDF8", "#0EA5E9"], accent: "#FBBF24" },
  es: { gradient: ["#F97316", "#EA580C"], accent: "#FFFFFF" },
  zh: { gradient: ["#DC2626", "#B91C1C"], accent: "#FBBF24" },
  fr: { gradient: ["#7C3AED", "#5B21B6"], accent: "#FBBF24" },
  de: { gradient: ["#111827", "#374151"], accent: "#FBBF24" },
  it: { gradient: ["#0E9AE0", "#0A6B9E"], accent: "#FFFFFF" },
  ru: { gradient: ["#3B82F6", "#1E40AF"], accent: "#FBBF24" },
};

type WordPackFilter = "latest" | "artificial" | "business";

export default function LanguageCourses() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [wordFilter, setWordFilter] = useState<WordPackFilter>("latest");

  const lang = (code as string) || "en";
  const name = langName(lang) || "English";
  const palette = LANG_PALETTE[lang] || LANG_PALETTE.en;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="language-courses">
      {/* Header */}
      <View style={styles.header}>
        <IconChip
          testID="lc-back"
          tint="neutral"
          icon="chevron-back"
          size={22}
          onPress={() => router.back()}
        />
        <View style={styles.headerCenter}>
          <FlagIcon code={lang} size={22} />
          <Text style={styles.headerTitle}>{name} Courses</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        {/* ── Best Value banner ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.bestValueBadge}>
            <Ionicons name="star" size={11} color="#DC2626" />
            <Text style={styles.bestValueText}>Best Value</Text>
          </View>
        </View>
        <Pressable
          testID="lc-pro-banner"
          onPress={() => router.push("/pro")}
          style={styles.proBanner}
        >
          <LinearGradient
            colors={["#F59E0B", "#F97316"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.proInner}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.proBannerTitle}>{name} Pro Partner</Text>
              <Text style={styles.proBannerSub}>
                LiveClass + AI Talk + Words · unlimited access
              </Text>
              <View style={styles.buyNowBtn}>
                <Text style={styles.buyNowText}>Buy Now</Text>
              </View>
            </View>
            <Ionicons name="ribbon" size={64} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        </Pressable>

        {/* ── Speaking · Personalized Live Class ────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.eyebrow}>SPEAKING</Text>
          <Text style={styles.sectionTitle}>Personalized Live Class</Text>
        </View>
        <Pressable
          testID="lc-liveclass"
          onPress={() => router.push("/pro")}
          style={styles.wideCard}
        >
          <LinearGradient
            colors={["#F59E0B", "#EF4444"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.wideInner}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.wideBadge}>1-on-1 {name}</Text>
              <Text style={styles.wideTitle}>LiveClass</Text>
              <Text style={styles.wideSub}>
                Real tutors · fluent conversations
              </Text>
              <View style={styles.buyNowBtn}>
                <Text style={styles.buyNowText}>Buy Now</Text>
              </View>
            </View>
            <Ionicons name="school" size={72} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        </Pressable>

        {/* ── Listening · HelloXxx ──────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.eyebrow}>LISTENING</Text>
          <View style={styles.sectionRibbonRow}>
            <Text style={styles.sectionTitle}>Hello{name}</Text>
            <View style={styles.saleRibbon}>
              <Text style={styles.saleRibbonText}>20%OFF</Text>
            </View>
          </View>
          <Text style={styles.sectionSub}>189 lessons · A1 to C1</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.packRow}
        >
          {[
            { level: "C1", title: "Traditions 5 | 2: Game on.",  tag: "#VIP",          duration: "13:21", tint: "#F9A8D4" },
            { level: "A1", title: "Traditions 2 | 25: Goal!",     tag: "#Traditions 2", duration: "10:53", tint: "#93C5FD" },
            { level: "A2", title: "Traditions 3 | 8: Meet up",    tag: "#Traditions 3", duration: "08:44", tint: "#FDE68A" },
            { level: "B1", title: "Traditions 4 | 12: The park",  tag: "#Traditions 4", duration: "11:07", tint: "#7FD1F5" },
          ].map((l, i) => (
            <Pressable
              key={i}
              testID={`lc-listening-${i}`}
              onPress={() => router.push("/vocab-hub")}
              style={styles.lessonCard}
            >
              <LinearGradient
                colors={[l.tint, "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.lessonImage}
              >
                <Ionicons name="football" size={44} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.lessonMeta}>
                <Text style={styles.lessonTitle} numberOfLines={2}>{l.title}</Text>
                <Text style={styles.lessonTag}>{l.tag}</Text>
                <View style={styles.lessonBottomRow}>
                  <View style={styles.levelPill}>
                    <Text style={styles.levelPillText}>{l.level}</Text>
                  </View>
                  <View style={styles.durationChip}>
                    <Ionicons name="headset" size={12} color={colors.onSurfaceSecondary} />
                    <Text style={styles.durationText}>{l.duration}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── AI Talk ───────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.eyebrow}>AI TALK</Text>
          <Text style={styles.sectionTitle}>{name} Ai</Text>
          <Text style={styles.sectionSub}>Speak {name} with AI</Text>
        </View>
        <Pressable
          testID="lc-ai"
          onPress={() => router.push("/vocab-hub")}
          style={styles.wideCard}
        >
          <LinearGradient
            colors={palette.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.wideInner}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.aiChatBubble}>
                <Text style={styles.aiChatBubbleText}>Let's Speak</Text>
              </View>
              <Text style={styles.aiHeadline}>Let's Speak</Text>
              <Text style={[styles.aiHeadlineAccent, { color: palette.accent }]}>{name}</Text>
            </View>
            <Ionicons name="chatbubbles" size={72} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </Pressable>

        {/* ── Words · HelloWords with pack tabs ─────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.eyebrow}>WORDS</Text>
          <View style={styles.sectionRibbonRow}>
            <Text style={styles.sectionTitle}>HelloWords</Text>
            <View style={styles.saleRibbon}>
              <Text style={styles.saleRibbonText}>20%OFF</Text>
            </View>
          </View>
          <View style={styles.subTabs}>
            {(["latest", "artificial", "business"] as WordPackFilter[]).map((f) => {
              const on = wordFilter === f;
              return (
                <Pressable
                  key={f}
                  testID={`lc-word-tab-${f}`}
                  onPress={() => setWordFilter(f)}
                  style={[styles.subTabBtn, on && styles.subTabBtnOn]}
                >
                  <Text style={[styles.subTabText, on && styles.subTabTextOn]}>
                    {f === "latest" ? "Latest" : f === "artificial" ? "Artificial" : "Business"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.packRow}
        >
          {(wordFilter === "latest"
            ? [
                { title: "Museum", count: 12, icon: "business" as const, tint: "#FEF3C7" },
                { title: "AI Tech 1", count: 10, icon: "hardware-chip" as const, tint: "#DBEAFE" },
                { title: "Business Ment", count: 12, icon: "briefcase" as const, tint: "#DCFCE7" },
                { title: "Travel", count: 15, icon: "airplane" as const, tint: "#FCE7F3" },
              ]
            : wordFilter === "artificial"
              ? [
                  { title: "AI Tech 1", count: 10, icon: "hardware-chip" as const, tint: "#DBEAFE" },
                  { title: "AI Tech 2", count: 12, icon: "hardware-chip" as const, tint: "#E1F2EC" },
                  { title: "Robotics", count: 8,  icon: "cog" as const, tint: "#DCFCE7" },
                ]
              : [
                  { title: "Business Ment", count: 12, icon: "briefcase" as const, tint: "#DCFCE7" },
                  { title: "Meetings", count: 10, icon: "people" as const, tint: "#FEF3C7" },
                  { title: "Finance", count: 15, icon: "cash" as const, tint: "#DBEAFE" },
                ]
          ).map((p, i) => (
            <Pressable
              key={i}
              testID={`lc-pack-${i}`}
              onPress={() => router.push("/vocab-hub")}
              style={styles.packCard}
            >
              <View style={[styles.packIconWrap, { backgroundColor: p.tint }]}>
                <Ionicons name={p.icon} size={30} color={colors.onSurface} />
              </View>
              <Text style={styles.packTitle}>{p.title}</Text>
              <Text style={styles.packSub}>{p.count} words</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Reading · Book Club ───────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.eyebrow}>READING</Text>
          <Text style={styles.sectionTitle}>{name} Book Club</Text>
        </View>
        <Pressable
          testID="lc-bookey"
          onPress={() => router.push("/store")}
          style={styles.wideCard}
        >
          <LinearGradient
            colors={["#065F46", "#0A6B9E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.wideInner}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.wideBadge}>{name}Bookey</Text>
              <Text style={styles.wideTitle}>Bookey</Text>
              <Text style={styles.wideSub}>
                Read 1000+ bestsellers · start free
              </Text>
              <View style={styles.buyNowBtn}>
                <Text style={styles.buyNowText}>Subscribe</Text>
              </View>
            </View>
            <Ionicons name="book" size={72} color="rgba(255,255,255,0.4)" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    headerCenter: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    headerTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    section: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: 6,
    },
    sectionHead: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    eyebrow: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      letterSpacing: 1,
    },
    sectionTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 20,
      color: colors.onSurface,
      marginTop: 2,
    },
    sectionSub: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    sectionRibbonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    saleRibbon: {
      backgroundColor: "#FDE68A",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
    },
    saleRibbonText: {
      fontFamily: fonts.displayBold,
      fontSize: 12,
      color: "#EC4899",
    },
    bestValueBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
      backgroundColor: "#FEE2E2",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    bestValueText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: "#DC2626",
    },
    // ── wide cards (pro banner, liveclass, ai, bookey) ──
    proBanner: {
      marginHorizontal: spacing.lg,
    },
    proInner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      borderRadius: 20,
      minHeight: 130,
    },
    proBannerTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 20,
      color: "#FFFFFF",
    },
    proBannerSub: {
      fontFamily: fonts.textBold,
      fontSize: 12.5,
      color: "rgba(255,255,255,0.9)",
      marginTop: 4,
    },
    wideCard: {
      marginHorizontal: spacing.lg,
    },
    wideInner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      borderRadius: 20,
      minHeight: 150,
    },
    wideBadge: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(255,255,255,0.25)",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 11,
    },
    wideTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 26,
      color: "#FFFFFF",
      marginTop: 8,
    },
    wideSub: {
      fontFamily: fonts.textBold,
      fontSize: 12.5,
      color: "rgba(255,255,255,0.9)",
      marginTop: 2,
    },
    buyNowBtn: {
      alignSelf: "flex-start",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 999,
      marginTop: 12,
    },
    buyNowText: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: "#EA580C",
    },
    aiChatBubble: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(255,255,255,0.28)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    aiChatBubbleText: {
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 11,
    },
    aiHeadline: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 26,
      marginTop: 8,
    },
    aiHeadlineAccent: {
      fontFamily: fonts.displayBold,
      fontSize: 26,
    },
    // ── sub tabs (words) ──
    subTabs: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    subTabBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surface,
    },
    subTabBtnOn: {
      backgroundColor: colors.onSurface,
    },
    subTabText: {
      fontFamily: fonts.textBold,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
    },
    subTabTextOn: {
      color: colors.surface,
    },
    // ── word packs ──
    packRow: {
      paddingHorizontal: spacing.lg,
      gap: 12,
    },
    packCard: {
      width: 140,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      alignItems: "center",
      gap: 8,
    },
    packIconWrap: {
      width: 68,
      height: 68,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    packTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.onSurface,
      textAlign: "center",
    },
    packSub: {
      fontFamily: fonts.text,
      fontSize: 11.5,
      color: colors.onSurfaceSecondary,
    },
    // ── listening lesson cards ──
    lessonCard: {
      width: 200,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: "hidden",
    },
    lessonImage: {
      height: 110,
      alignItems: "center",
      justifyContent: "center",
    },
    lessonMeta: {
      padding: 10,
      gap: 6,
    },
    lessonTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: colors.onSurface,
      lineHeight: 17,
    },
    lessonTag: {
      fontFamily: fonts.text,
      fontSize: 11.5,
      color: colors.onSurfaceSecondary,
    },
    lessonBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 2,
    },
    levelPill: {
      backgroundColor: colors.brandTertiary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    levelPillText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.brand,
    },
    durationChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    durationText: {
      fontFamily: fonts.textBold,
      fontSize: 10.5,
      color: colors.onSurfaceSecondary,
    },
  });
