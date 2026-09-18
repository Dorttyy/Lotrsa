/**
 * All Courses hub — reference-inspired catalog entry point.
 *
 * The screen replaces the previous Duolingo-style path landing for the
 * "All Courses" tile on the Chats top row. It surfaces the full learning
 * catalogue by language + skill:
 *
 *   1. Header: Back · Learn / Classes tabs · PRO badge
 *   2. Feature-card carousel (HelloWords, LiveClass, Summer campaign)
 *   3. Language selector grid (flags with names)
 *   4. Sale campaign banner
 *   5. Category tabs (All / Speaking / Words / Listening / Reading)
 *   6. Content sections (Arabic Ai, HelloWords, HelloArabic, Bestsellers)
 *
 * Language taps deep-link into the per-language detail page at
 * `/language-courses/[code]` which mirrors the reference's language pages.
 */

import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { FlagIcon } from "@/src/components/FlagIcon";
import { IconChip } from "@/src/components/IconChip";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

// ── Data ──────────────────────────────────────────────────────────────────
type CategoryKey = "all" | "speaking" | "words" | "listening" | "reading";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "speaking", label: "Speaking" },
  { key: "words", label: "Words" },
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
];

// Language rail — 10 curated languages, same set the app supports elsewhere.
interface LangEntry {
  code: string;
  name: string;
  aiTitle: string;
  aiSub: string;
  aiBg: [string, string];
}
const LANGUAGES: LangEntry[] = [
  { code: "ar", name: "Arabic",   aiTitle: "Arabic Ai",    aiSub: "Speak Arabic with AI",    aiBg: ["#10723C", "#146945"] },
  { code: "en", name: "English",  aiTitle: "English Ai",   aiSub: "Speak English with AI",   aiBg: ["#2563EB", "#1D4ED8"] },
  { code: "ja", name: "Japanese", aiTitle: "Japanese Ai",  aiSub: "Speak Japanese with AI",  aiBg: ["#F43F5E", "#BE123C"] },
  { code: "ko", name: "Korean",   aiTitle: "Korean Ai",    aiSub: "Speak Korean with AI",    aiBg: ["#38BDF8", "#0EA5E9"] },
  { code: "es", name: "Spanish",  aiTitle: "Spanish Ai",   aiSub: "Speak Spanish with AI",   aiBg: ["#F97316", "#EA580C"] },
  { code: "zh", name: "Chinese",  aiTitle: "Chinese Ai",   aiSub: "Speak Chinese with AI",   aiBg: ["#DC2626", "#B91C1C"] },
  { code: "fr", name: "French",   aiTitle: "French Ai",    aiSub: "Speak French with AI",    aiBg: ["#7C3AED", "#5B21B6"] },
  { code: "de", name: "German",   aiTitle: "German Ai",    aiSub: "Speak German with AI",    aiBg: ["#111827", "#374151"] },
  { code: "it", name: "Italian",  aiTitle: "Italian Ai",   aiSub: "Speak Italian with AI",   aiBg: ["#0E9AE0", "#0A6B9E"] },
  { code: "ru", name: "Russian",  aiTitle: "Russian Ai",   aiSub: "Speak Russian with AI",   aiBg: ["#3B82F6", "#1E40AF"] },
];

// Feature carousel cards (marketing tiles).
interface FeatureCard {
  key: string;
  title: string;
  subtitle: string;
  colors: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
}
const FEATURE_CARDS: FeatureCard[] = [
  {
    key: "hellowords",
    title: "HelloWords",
    subtitle: "Play words game",
    colors: ["#22C55E", "#16A34A"],
    icon: "text",
    route: "/play",
  },
  {
    key: "liveclass",
    title: "LiveClass",
    subtitle: "Tailored courses for all levels",
    colors: ["#0EA5E9", "#2563EB"],
    icon: "school",
    route: "/pro",
  },
  {
    key: "summer",
    title: "Summer Hello",
    subtitle: "Summer campaign · 20% off",
    colors: ["#FDBA74", "#F97316"],
    icon: "sunny",
  },
];

// HelloWords packs (Words category).
const WORD_PACKS = [
  { key: "museum",   title: "Museum",       count: 12, icon: "business" as const,     tint: "#FEF3C7" },
  { key: "aitech",   title: "AI Tech 1",    count: 10, icon: "hardware-chip" as const, tint: "#DBEAFE" },
  { key: "business", title: "Business Ment", count: 12, icon: "briefcase" as const,   tint: "#DCFCE7" },
  { key: "travel",   title: "Travel",       count: 15, icon: "airplane" as const,     tint: "#FCE7F3" },
];

// ── Screen ────────────────────────────────────────────────────────────────
export default function AllCourses() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<"learn" | "classes">("learn");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [aiLang, setAiLang] = useState<LangEntry>(LANGUAGES[0]);

  const openLanguage = (l: LangEntry) => {
    setAiLang(l);
    router.push({
      pathname: "/language-courses/[code]",
      params: { code: l.code },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="all-courses">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <IconChip
          testID="ac-back"
          tint="neutral"
          icon="chevron-back"
          size={22}
          onPress={() => router.back()}
        />
        <View style={styles.headerTabs}>
          <Pressable
            testID="ac-tab-learn"
            onPress={() => setTab("learn")}
            style={styles.tabBtn}
          >
            <Text style={[styles.tabText, tab === "learn" && styles.tabTextOn]}>
              Learn
            </Text>
            {tab === "learn" && <View style={styles.tabDot} />}
          </Pressable>
          <Pressable
            testID="ac-tab-classes"
            onPress={() => setTab("classes")}
            style={styles.tabBtn}
          >
            <Text style={[styles.tabText, tab === "classes" && styles.tabTextOn]}>
              Classes
            </Text>
            {tab === "classes" && <View style={styles.tabDot} />}
          </Pressable>
        </View>
        <View style={styles.proWrap}>
          {tab === "classes" ? (
            <Pressable
              testID="ac-lang-globe"
              onPress={() => setTab("classes")}
              style={styles.allPill}
            >
              <Ionicons name="globe-outline" size={16} color={colors.onSurface} />
              <Text style={styles.allPillText}>ALL</Text>
            </Pressable>
          ) : (
            <>
              <LinearGradient
                colors={["#67E8F9", "#38BDF8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.proBadge}
              >
                <Text style={styles.proBadgeText}>PRO</Text>
              </LinearGradient>
              <View style={styles.saleDot}>
                <Text style={styles.saleDotText}>sale</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        {tab === "learn" && (
          <>
        {/* ── Feature carousel ───────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featureRow}
          decelerationRate="fast"
          snapToAlignment="start"
        >
          {FEATURE_CARDS.map((f) => (
            <Pressable
              key={f.key}
              testID={`ac-feature-${f.key}`}
              onPress={() => f.route && router.push(f.route as never)}
              style={styles.featureCard}
            >
              <LinearGradient
                colors={f.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featureCardInner}
              >
                <Text style={styles.featureTitle} numberOfLines={2}>
                  {f.title}
                </Text>
                <Text style={styles.featureSub} numberOfLines={2}>
                  {f.subtitle}
                </Text>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={f.icon} size={64} color="rgba(255,255,255,0.35)" />
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Language selector grid ────────────────────────────────── */}
        <View style={styles.langGrid}>
          {LANGUAGES.map((l) => (
            <Pressable
              key={l.code}
              testID={`ac-lang-${l.code}`}
              onPress={() => openLanguage(l)}
              style={styles.langCell}
            >
              <View style={styles.langFlagWrap}>
                <FlagIcon code={l.code} size={54} />
              </View>
              <Text style={styles.langName}>{l.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Page dots (reference decoration) */}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotOn]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* ── Summer sale banner ────────────────────────────────────── */}
        <Pressable
          testID="ac-summer-sale"
          onPress={() => router.push("/store")}
          style={styles.summerBanner}
        >
          <LinearGradient
            colors={["#BAE6FD", "#FDBA74"]}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 1, y: 0.6 }}
            style={styles.summerInner}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.summerLabel1}>Summer Sale</Text>
              <Text style={styles.summerLabel2}>Hello{aiLang.name}</Text>
            </View>
            <View style={styles.summerOff}>
              <Text style={styles.summerOffText}>20%OFF</Text>
            </View>
            <View style={styles.summerMascot}>
              <Ionicons name="happy" size={40} color="#0E9AE0" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Category tabs ─────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((c) => {
            const on = category === c.key;
            return (
              <Pressable
                key={c.key}
                testID={`ac-cat-${c.key}`}
                onPress={() => setCategory(c.key)}
                style={[styles.catBtn, on && styles.catBtnOn]}
              >
                <Text style={[styles.catText, on && styles.catTextOn]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Section: AI Talk (per selected language) ───────────────── */}
        {(category === "all" || category === "speaking") && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{aiLang.aiTitle}</Text>
              <Text style={styles.sectionSub}>{aiLang.aiSub}</Text>
            </View>
            <Pressable
              testID="ac-ai-card"
              onPress={() => openLanguage(aiLang)}
              style={styles.aiCard}
            >
              <LinearGradient
                colors={aiLang.aiBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiInner}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.aiChatBubble}>
                    <Text style={styles.aiChatBubbleText}>
                      {"Let's Speak"}
                    </Text>
                  </View>
                  <Text style={styles.aiHeadline}>{"Let's Speak"}</Text>
                  <Text style={styles.aiHeadlineAccent}>{aiLang.name}</Text>
                </View>
                <View style={styles.aiMascot}>
                  <Ionicons name="chatbubbles" size={70} color="rgba(255,255,255,0.75)" />
                </View>
              </LinearGradient>
            </Pressable>
          </>
        )}

        {/* ── Section: HelloWords packs ─────────────────────────────── */}
        {(category === "all" || category === "words") && (
          <>
            <View style={[styles.section, styles.sectionWithRibbon]}>
              <View>
                <Text style={styles.sectionTitle}>HelloWords</Text>
                <Text style={styles.sectionSub}>Play words game</Text>
              </View>
              <View style={styles.saleRibbon}>
                <Text style={styles.saleRibbonText}>20%OFF</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.packRow}
            >
              {WORD_PACKS.map((p) => (
                <Pressable
                  key={p.key}
                  testID={`ac-pack-${p.key}`}
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
          </>
        )}

        {/* ── Section: Listening lessons ────────────────────────────── */}
        {(category === "all" || category === "listening") && (
          <>
            <View style={[styles.section, styles.sectionWithRibbon]}>
              <View>
                <Text style={styles.sectionTitle}>Hello{aiLang.name}</Text>
                <Text style={styles.sectionSub}>189 lessons from A1 to C1</Text>
              </View>
              <View style={styles.saleRibbon}>
                <Text style={styles.saleRibbonText}>20%OFF</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.packRow}
            >
              {[
                { level: "C1", title: "Traditions 5 | 2: Game on.", tag: "#VIP",         duration: "13:21", tint: "#F9A8D4" },
                { level: "A1", title: "Traditions 2 | 25: Goal!",    tag: "#Traditions 2", duration: "10:53", tint: "#93C5FD" },
                { level: "A2", title: "Traditions 3 | 8: Meet up",    tag: "#Traditions 3", duration: "08:44", tint: "#FDE68A" },
              ].map((l, i) => (
                <Pressable
                  key={i}
                  testID={`ac-lesson-${i}`}
                  onPress={() => openLanguage(aiLang)}
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
          </>
        )}

        {/* ── Section: Bestseller reads ─────────────────────────────── */}
        {(category === "all" || category === "reading") && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{aiLang.name} Bestseller  1000+</Text>
              <Text style={styles.sectionSub}>Start your reading journey!</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.packRow}
            >
              {[
                { title: "IS PARIS BURNING?",  sub: "A narrative history about the Liberation of Paris in 1944", bg: "#DC2626" },
                { title: "WHEN BOOKS WENT TO WAR", sub: "How America used books to win WWII", bg: "#F4E4BC" },
                { title: "The Great Adventure",  sub: "A journey worth taking", bg: "#0EA5E9" },
              ].map((b, i) => (
                <Pressable
                  key={i}
                  testID={`ac-book-${i}`}
                  onPress={() => router.push("/store")}
                  style={styles.bookCard}
                >
                  <View style={[styles.bookCover, { backgroundColor: b.bg }]}>
                    <Text style={styles.bookCoverTitle} numberOfLines={2}>{b.title}</Text>
                  </View>
                  <Text style={styles.bookSub} numberOfLines={2}>{b.sub}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
          </>
        )}

        {/* ═════════════════════ CLASSES TAB ═════════════════════ */}
        {tab === "classes" && (
          <>
            {/* Quick actions row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRow}
            >
              {[
                { key: "liveclass", title: "1v1 LiveClass",     sub: "1-on-1 tutor",       icon: "school" as const,  colors: ["#0EA5E9", "#2563EB"] as [string, string], hot: true },
                { key: "speaking",  title: "Speaking",          sub: "Free-talk mode",     icon: "mic" as const,     colors: ["#FBBF24", "#F59E0B"] as [string, string] },
                { key: "propartner",title: "Pro Partner",       sub: "Real teachers",      icon: "ribbon" as const,  colors: ["#F472B6", "#EC4899"] as [string, string] },
                { key: "hosts",     title: "Popular Host Cl…",  sub: "Trending hosts",     icon: "star" as const,    colors: ["#7FD1F5", "#0A6B9E"] as [string, string] },
              ].map((q) => (
                <Pressable
                  key={q.key}
                  testID={`ac-quick-${q.key}`}
                  onPress={() => {
                    if (q.key === "propartner") router.push("/classes/pro-partner");
                    else if (q.key === "liveclass") router.push("/pro");
                    else if (q.key === "speaking") router.push("/pro/tutors");
                    else router.push("/pro/tutors");
                  }}
                  style={styles.quickCard}
                >
                  <LinearGradient
                    colors={q.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickInner}
                  >
                    {q.hot && (
                      <View style={styles.hotPill}>
                        <Text style={styles.hotPillText}>HOT</Text>
                      </View>
                    )}
                    <Ionicons name={q.icon} size={26} color="#FFFFFF" />
                    <Text style={styles.quickTitle} numberOfLines={1}>
                      {q.title}
                    </Text>
                    <Text style={styles.quickSub} numberOfLines={1}>
                      {q.sub}
                    </Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>

            {/* Speaking section header */}
            <View style={styles.section}>
              <View style={styles.speakingHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Speaking</Text>
                  <Text style={styles.sectionSub}>
                    Free Mode · unlimited languages & language partners
                  </Text>
                </View>
                <Pressable
                  testID="ac-speaking-more"
                  onPress={() => router.push("/pro/tutors")}
                  hitSlop={6}
                >
                  <Text style={styles.moreText}>More ›</Text>
                </Pressable>
              </View>
            </View>

            {/* Tutor grid */}
            <View style={styles.tutorGrid}>
              {[
                { name: "NouranTheEnglishEducator", langs: "English · Arabic",   line: "Businesswoman, Journalist",           tint: "#FEE2E2", flag: "eg" },
                { name: "CHOCO",                    langs: "Japanese",           line: "I'm CHOCO from Japan…",              tint: "#E0F2FE", flag: "jp" },
                { name: "Lyka Li",                  langs: "English",            line: "Hello friends! I'm Li",              tint: "#FCE7F3", flag: "gb" },
                { name: "RenaEmo",                  langs: "Japanese",           line: "Hi, there! Rena from Tokyo Japan…",   tint: "#DBEAFE", flag: "jp" },
                { name: "Maria Cortés",             langs: "Spanish · English",  line: "¡Hola! Speak with confidence!",       tint: "#FEF3C7", flag: "es" },
                { name: "Kim Do-hyun",              langs: "Korean",             line: "안녕! Let's have fun learning Korean.", tint: "#DCFCE7", flag: "kr" },
              ].map((t, i) => (
                <Pressable
                  key={i}
                  testID={`ac-tutor-${i}`}
                  onPress={() => router.push("/pro/tutors")}
                  style={styles.tutorCard}
                >
                  <View style={[styles.tutorAvatar, { backgroundColor: t.tint }]}>
                    <FlagIcon code={t.flag} size={44} />
                  </View>
                  <Text style={styles.tutorName} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.tutorLangs} numberOfLines={1}>{t.langs}</Text>
                  <Text style={styles.tutorLine} numberOfLines={2}>{t.line}</Text>
                  <View style={styles.tutorBtn}>
                    <Text style={styles.tutorBtnText}>Book tutor</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
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
    headerTabs: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.lg,
    },
    tabBtn: {
      alignItems: "center",
    },
    tabText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurfaceSecondary,
    },
    tabTextOn: {
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      fontSize: 16,
    },
    tabDot: {
      width: 24,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.onSurface,
      marginTop: 3,
    },
    proWrap: { position: "relative" },
    proBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
    },
    proBadgeText: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 12,
      letterSpacing: 0.6,
    },
    saleDot: {
      position: "absolute",
      top: -6,
      right: -4,
      backgroundColor: "#EF4444",
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 6,
    },
    saleDotText: {
      color: "#FFFFFF",
      fontFamily: fonts.textBold,
      fontSize: 8.5,
      letterSpacing: 0.3,
    },
    // ── "ALL" globe pill (Classes tab) ──
    allPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    allPillText: {
      fontFamily: fonts.displayBold,
      fontSize: 12,
      color: colors.onSurface,
      letterSpacing: 0.6,
    },
    // ── Classes tab: quick actions row ──
    quickRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: 10,
    },
    quickCard: {
      width: 138,
      height: 110,
    },
    quickInner: {
      flex: 1,
      borderRadius: 18,
      padding: 12,
      gap: 4,
      overflow: "hidden",
    },
    quickTitle: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 14,
      marginTop: 6,
    },
    quickSub: {
      color: "rgba(255,255,255,0.9)",
      fontFamily: fonts.textBold,
      fontSize: 11,
    },
    hotPill: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: "#DC2626",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    hotPillText: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 9,
      letterSpacing: 0.6,
    },
    // ── Speaking section header ──
    speakingHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    moreText: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.brand,
    },
    // ── Tutor grid (Classes tab) ──
    tutorGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.lg - 4,
      rowGap: 12,
      columnGap: 8,
    },
    tutorCard: {
      width: "48%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      alignItems: "flex-start",
      gap: 6,
    },
    tutorAvatar: {
      width: "100%",
      height: 90,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    tutorName: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: colors.onSurface,
      marginTop: 6,
    },
    tutorLangs: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.brand,
    },
    tutorLine: {
      fontFamily: fonts.text,
      fontSize: 11.5,
      color: colors.onSurfaceSecondary,
      lineHeight: 15,
      minHeight: 30,
    },
    tutorBtn: {
      alignSelf: "stretch",
      backgroundColor: colors.brand,
      paddingVertical: 8,
      borderRadius: 999,
      alignItems: "center",
      marginTop: 4,
    },
    tutorBtnText: {
      color: "#FFFFFF",
      fontFamily: fonts.displayBold,
      fontSize: 12.5,
    },
    // ── feature carousel ──────────────────────────────────────
    featureRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: 12,
    },
    featureCard: {
      width: 178,
      height: 220,
    },
    featureCardInner: {
      flex: 1,
      borderRadius: 20,
      padding: 16,
      overflow: "hidden",
    },
    featureTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 20,
      color: "#FFFFFF",
    },
    featureSub: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: "#FFFFFF",
      marginTop: 6,
      opacity: 0.95,
    },
    featureIconWrap: {
      position: "absolute",
      right: -8,
      bottom: -8,
      opacity: 0.9,
    },
    // ── language grid ─────────────────────────────────────────
    langGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      rowGap: spacing.md,
    },
    langCell: {
      width: "20%",
      alignItems: "center",
    },
    langFlagWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    langName: {
      fontFamily: fonts.textBold,
      fontSize: 12.5,
      color: colors.onSurface,
      marginTop: 6,
      textAlign: "center",
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 5,
      marginTop: spacing.sm,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    dotOn: {
      backgroundColor: colors.onSurface,
      width: 18,
    },
    // ── summer banner ──────────────────────────────────────
    summerBanner: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      borderRadius: 20,
      overflow: "hidden",
    },
    summerInner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 8,
    },
    summerLabel1: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: "#EC4899",
    },
    summerLabel2: {
      fontFamily: fonts.displayBold,
      fontSize: 20,
      color: "#FFFFFF",
      marginTop: 2,
    },
    summerOff: {
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
    },
    summerOffText: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: "#EC4899",
    },
    summerMascot: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(255,255,255,0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    // ── category tabs ─────────────────────────────────────
    categoryRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      gap: 6,
    },
    catBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
    },
    catBtnOn: {
      backgroundColor: colors.brandTertiary,
    },
    catText: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    catTextOn: {
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
    },
    // ── section headers ────────────────────────────────────
    section: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    sectionWithRibbon: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.onSurface,
    },
    sectionSub: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    saleRibbon: {
      backgroundColor: "#FDE68A",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
    },
    saleRibbonText: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: "#EC4899",
    },
    // ── AI card ────────────────────────────────────────────
    aiCard: {
      marginHorizontal: spacing.lg,
    },
    aiInner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      borderRadius: 20,
      minHeight: 150,
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
      color: "#FBBF24",
      fontFamily: fonts.displayBold,
      fontSize: 26,
    },
    aiMascot: {
      width: 80,
      height: 80,
      alignItems: "center",
      justifyContent: "center",
    },
    // ── word packs ─────────────────────────────────────
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
      ...shadow.card,
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
    // ── listening lesson cards ─────────────────────────
    lessonCard: {
      width: 200,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      ...shadow.card,
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
    // ── bestseller book cards ─────────────────────────
    bookCard: {
      width: 140,
      gap: 6,
    },
    bookCover: {
      height: 180,
      borderRadius: 12,
      padding: 12,
      justifyContent: "flex-end",
    },
    bookCoverTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 15,
      color: "#FFFFFF",
    },
    bookSub: {
      fontFamily: fonts.text,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      lineHeight: 15,
    },
  });

const shadow = {
  card: {
    boxShadow: "0px 2px 8px rgba(15, 23, 42, 0.06)",
  },
};

// Silence radius (used via inline literals for consistency with reference).
void radius;
