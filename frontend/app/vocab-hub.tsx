/**
 * Vocab Hub — the "Vocab" app on the Chat page top row.
 *
 * Beautiful language-first vocabulary learning entry point:
 *   1. Language switcher (7 popular languages, backend-supported)
 *   2. Streak / level / continue-lesson card
 *   3. Level cards (Beginner · Intermediate · Advanced) with progress
 *   4. Curated lessons for the selected language + level
 *   5. Bottom explore rail (topics) so the user can still drill into topics
 *
 * Backend routes used (existing, no schema change):
 *   GET  /api/vocab/languages
 *   POST /api/vocab/me/language
 *   GET  /api/vocab/me/stats
 *   GET  /api/vocab/me/continue
 *   GET  /api/vocab/lessons?level=Beginner|Intermediate|Advanced
 *   GET  /api/vocab/topics
 */

import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FlagIcon } from "@/src/components/FlagIcon";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  SupportedVocabLanguage,
  vocabApi,
  VocabContinue,
  VocabLesson,
  VocabStats,
  VocabTopic,
} from "@/src/learn/api";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

// ── constants ──────────────────────────────────────────────────────────────
type LevelKey = "Beginner" | "Intermediate" | "Advanced";

const LEVEL_ORDER: LevelKey[] = ["Beginner", "Intermediate", "Advanced"];

interface LevelMeta {
  key: LevelKey;
  title: string;
  subtitle: string;
  gradient: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
}

const LEVEL_META: Record<LevelKey, LevelMeta> = {
  Beginner: {
    key: "Beginner",
    title: "Beginner",
    subtitle: "Foundation words · everyday phrases",
    gradient: ["#0E82C4", "#0A6B9E"],
    icon: "leaf-outline",
  },
  Intermediate: {
    key: "Intermediate",
    title: "Intermediate",
    subtitle: "Real conversations · daily use",
    gradient: ["#EC4899", "#F59E0B"],
    icon: "flame-outline",
  },
  Advanced: {
    key: "Advanced",
    title: "Advanced",
    subtitle: "Fluent-level vocab · nuance",
    gradient: ["#0EA5E9", "#22C55E"],
    icon: "rocket-outline",
  },
};

// Native-name overrides so each pill reads in-language.
const NATIVE_NAMES: Record<string, string> = {
  en: "English",
  ko: "한국어",
  zh: "中文",
  ja: "日本語",
  ar: "العربية",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ru: "Русский",
  tr: "Türkçe",
  hi: "हिन्दी",
  bn: "বাংলা",
  vi: "Tiếng Việt",
};

// ── screen ─────────────────────────────────────────────────────────────────
export default function VocabHub() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Local fallback list so the switcher never renders empty (matches backend
  // SUPPORTED_LANGUAGES order). The API result overrides this once loaded.
  const FALLBACK_LANGS: SupportedVocabLanguage[] = useMemo(
    () => [
      { code: "en", name: "English" },
      { code: "ko", name: "Korean" },
      { code: "zh", name: "Chinese (Simplified)" },
      { code: "ja", name: "Japanese" },
      { code: "ar", name: "Arabic" },
      { code: "es", name: "Spanish" },
      { code: "pt", name: "Portuguese" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" },
      { code: "it", name: "Italian" },
      { code: "ru", name: "Russian" },
      { code: "tr", name: "Turkish" },
      { code: "hi", name: "Hindi" },
      { code: "bn", name: "Bengali" },
      { code: "vi", name: "Vietnamese" },
    ],
    [],
  );

  const [langs, setLangs] =
    useState<SupportedVocabLanguage[]>(FALLBACK_LANGS);
  const [currentLang, setCurrentLang] = useState<string>("en");
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [cont, setCont] = useState<VocabContinue | null>(null);
  const [lessonsByLevel, setLessonsByLevel] = useState<
    Record<LevelKey, VocabLesson[]>
  >({ Beginner: [], Intermediate: [], Advanced: [] });
  const [topics, setTopics] = useState<VocabTopic[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LevelKey>("Beginner");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingLang, setSavingLang] = useState(false);

  const load = useCallback(async () => {
    // Fire each request individually so a partial failure doesn't blank the
    // whole screen — the empty fallback keeps the shell usable.
    const results = await Promise.allSettled([
      vocabApi.listLanguages(),
      vocabApi.myStats(),
      vocabApi.myContinue(),
      vocabApi.listLessons({ level: "Beginner" }),
      vocabApi.listLessons({ level: "Intermediate" }),
      vocabApi.listLessons({ level: "Advanced" }),
      vocabApi.listTopics(),
    ]);
    const [langRes, stRes, coRes, begRes, midRes, advRes, tpRes] = results;

    if (langRes.status === "fulfilled") {
      if (langRes.value.supported?.length) setLangs(langRes.value.supported);
      if (langRes.value.current) setCurrentLang(langRes.value.current);
    }
    if (stRes.status === "fulfilled") {
      setStats(stRes.value);
      // Placement result becomes the hub's default level.
      if (
        stRes.value.placement_level &&
        LEVEL_ORDER.includes(stRes.value.placement_level as LevelKey)
      ) {
        setSelectedLevel(stRes.value.placement_level as LevelKey);
      }
    }
    if (coRes.status === "fulfilled") setCont(coRes.value);
    setLessonsByLevel({
      Beginner: begRes.status === "fulfilled" ? begRes.value : [],
      Intermediate: midRes.status === "fulfilled" ? midRes.value : [],
      Advanced: advRes.status === "fulfilled" ? advRes.value : [],
    });
    if (tpRes.status === "fulfilled") setTopics(tpRes.value);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Only fire once auth is hydrated; unauth users see the fallback shell.
      if (user) load();
      else setLoading(false);
    }, [load, user]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const pickLanguage = async (code: string) => {
    if (code === currentLang || savingLang) return;
    setSavingLang(true);
    setCurrentLang(code); // optimistic
    try {
      await vocabApi.setLanguage(code);
    } catch {
      // revert on failure
      setCurrentLang(currentLang);
    } finally {
      setSavingLang(false);
    }
  };

  const currentLangName =
    NATIVE_NAMES[currentLang] ||
    langs.find((l) => l.code === currentLang)?.name ||
    "English";

  // ── derived UI values ──────────────────────────────────────────────────
  const levelSummaries = useMemo(() => {
    const out: Record<LevelKey, { total: number; done: number }> = {
      Beginner: { total: 0, done: 0 },
      Intermediate: { total: 0, done: 0 },
      Advanced: { total: 0, done: 0 },
    };
    for (const lvl of LEVEL_ORDER) {
      const items = lessonsByLevel[lvl] || [];
      out[lvl].total = items.length;
      out[lvl].done = items.filter((l) => l.completed).length;
    }
    return out;
  }, [lessonsByLevel]);

  const currentLevelLessons = lessonsByLevel[selectedLevel] || [];
  const topicById = useMemo(
    () => Object.fromEntries(topics.map((t) => [t.id, t])),
    [topics],
  );

  const openLesson = (id: string) =>
    router.push({ pathname: "/learn/lesson/[id]", params: { id } });

  const openTopic = (id: string) =>
    router.push({ pathname: "/learn/topic/[id]", params: { id } });

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "bottom"]}
      testID="vocab-hub-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          testID="vh-back"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.headerIcon}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Vocab</Text>
        <View style={styles.headerRight}>
          <Pressable
            testID="vh-leaderboard"
            onPress={() => router.push("/leaderboard")}
            hitSlop={10}
            style={styles.headerIcon}
          >
            <Ionicons name="podium-outline" size={22} color={colors.onSurface} />
          </Pressable>
          <Pressable
            testID="vh-search"
            onPress={() => router.push("/learn/vocabulary")}
            hitSlop={10}
            style={styles.headerIcon}
          >
            <Ionicons name="list-outline" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
        >
          {/* ── Language switcher ────────────────────────────────────── */}
          <Text style={styles.eyebrow}>I want to learn</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.langRow}
          >
            {langs.map((l) => {
              const on = l.code === currentLang;
              return (
                <Pressable
                  key={l.code}
                  testID={`vh-lang-${l.code}`}
                  onPress={() => pickLanguage(l.code)}
                  style={[styles.langPill, on && styles.langPillOn]}
                >
                  <View style={[styles.langFlagWrap, on && styles.langFlagWrapOn]}>
                    <FlagIcon code={l.code} size={on ? 44 : 36} />
                  </View>
                  <Text
                    style={[styles.langName, on && styles.langNameOn]}
                    numberOfLines={1}
                  >
                    {NATIVE_NAMES[l.code] || l.name}
                  </Text>
                  {on && <View style={styles.langDot} />}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Hero stats banner ─────────────────────────────────────── */}
          <LinearGradient
            colors={["#0E9AE0", "#0A6B9E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>Learning</Text>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {currentLangName}
              </Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroChip}>
                  <Ionicons name="flame" size={13} color="#FFF" />
                  <Text style={styles.heroChipText}>
                    {stats?.streak ?? 0}d streak
                  </Text>
                </View>
                <View style={styles.heroChip}>
                  <Ionicons name="star" size={13} color="#FFD43D" />
                  <Text style={styles.heroChipText}>Lv {stats?.level ?? 1}</Text>
                </View>
                <View style={styles.heroChip}>
                  <Ionicons name="ribbon" size={13} color="#FFF" />
                  <Text style={styles.heroChipText}>
                    {stats?.words_learned ?? 0} words
                  </Text>
                </View>
              </View>
              <View style={styles.heroTrack}>
                <View
                  style={[
                    styles.heroFill,
                    { width: `${Math.max(6, (stats?.progress ?? 0) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.heroXp}>
                {stats?.xp_in_level ?? 0} / {stats?.xp_to_next ?? 100} XP
              </Text>
            </View>
          </LinearGradient>

          {/* ── Placement test entry ──────────────────────────────────── */}
          <Pressable
            testID="vh-placement"
            onPress={() => router.push("/placement-test")}
            style={styles.placementCard}
          >
            <View style={styles.placementIcon}>
              <Ionicons name="school" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placementTitle}>
                {stats?.placement_level
                  ? `Your level: ${stats.placement_level}`
                  : "Find your level"}
              </Text>
              <Text style={styles.placementSub} numberOfLines={1}>
                {stats?.placement_level
                  ? "Retake the 10-question placement test"
                  : "Take the quick 10-question placement test"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.onSurfaceSecondary}
            />
          </Pressable>

          {/* ── Continue card ─────────────────────────────────────────── */}
          {cont && (
            <Pressable
              testID="vh-continue"
              onPress={() => openLesson(cont.id)}
              style={styles.continueCard}
            >
              <View style={styles.continueIcon}>
                <Ionicons name="play" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.continueEyebrow}>Continue where you left off</Text>
                <Text style={styles.continueTitle} numberOfLines={1}>
                  {cont.title}
                </Text>
                <View style={styles.continueTrack}>
                  <View
                    style={[
                      styles.continueFill,
                      { width: `${Math.max(4, (cont.progress || 0) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceSecondary} />
            </Pressable>
          )}

          {/* ── Level cards ───────────────────────────────────────────── */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Choose your level</Text>
            <Text style={styles.sectionHint}>Basic → Advanced</Text>
          </View>
          <View style={styles.levelStack}>
            {LEVEL_ORDER.map((lvl) => {
              const meta = LEVEL_META[lvl];
              const sum = levelSummaries[lvl];
              const on = selectedLevel === lvl;
              const pct = sum.total ? sum.done / sum.total : 0;
              return (
                <Pressable
                  key={lvl}
                  testID={`vh-level-${lvl}`}
                  onPress={() => setSelectedLevel(lvl)}
                  style={{ marginBottom: spacing.md }}
                >
                  <LinearGradient
                    colors={meta.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.levelCard,
                      on && styles.levelCardOn,
                    ]}
                  >
                    <View style={styles.levelIconWrap}>
                      <Ionicons name={meta.icon} size={26} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.levelTitle}>{meta.title}</Text>
                      <Text style={styles.levelSubtitle} numberOfLines={1}>
                        {meta.subtitle}
                      </Text>
                      <View style={styles.levelTrack}>
                        <View
                          style={[
                            styles.levelFill,
                            { width: `${Math.max(4, pct * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.levelCount}>
                        {sum.done} / {sum.total} lessons · {Math.round(pct * 100)}%
                      </Text>
                    </View>
                    {on ? (
                      <View style={styles.levelSelectedDot}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          {/* ── Lessons for selected level ────────────────────────────── */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>
              {selectedLevel} lessons
            </Text>
            <Text style={styles.sectionHint}>
              {currentLevelLessons.length} available
            </Text>
          </View>
          {currentLevelLessons.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="sparkles-outline"
                size={20}
                color={colors.onSurfaceSecondary}
              />
              <Text style={styles.emptyText}>No lessons at this level yet.</Text>
            </View>
          ) : (
            <View style={styles.lessonList}>
              {currentLevelLessons.map((les) => {
                const t = topicById[les.topic_id];
                const tint =
                  t?.color === "purple"
                    ? colors.brandTertiary
                    : t?.color === "lime"
                      ? "rgba(163, 230, 53, 0.18)"
                      : "rgba(52, 211, 153, 0.18)";
                return (
                  <Pressable
                    key={les.id}
                    testID={`vh-lesson-${les.id}`}
                    onPress={() => openLesson(les.id)}
                    style={styles.lessonCard}
                  >
                    <View style={[styles.lessonIconWrap, { backgroundColor: tint }]}>
                      <Ionicons
                        name={(t?.icon as any) || "book-outline"}
                        size={20}
                        color={colors.brand}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonTitle} numberOfLines={1}>
                        {les.title}
                      </Text>
                      <Text style={styles.lessonSub} numberOfLines={2}>
                        {les.description}
                      </Text>
                      <View style={styles.lessonMetaRow}>
                        <View style={styles.metaChip}>
                          <Ionicons
                            name="time-outline"
                            size={11}
                            color={colors.onSurfaceSecondary}
                          />
                          <Text style={styles.metaText}>{les.minutes}m</Text>
                        </View>
                        <View style={styles.metaChip}>
                          <Ionicons name="flash" size={11} color="#EAB308" />
                          <Text style={styles.metaText}>+{les.xp_reward} XP</Text>
                        </View>
                        {t ? (
                          <View style={styles.metaChip}>
                            <Ionicons
                              name="pricetag-outline"
                              size={11}
                              color={colors.onSurfaceSecondary}
                            />
                            <Text style={styles.metaText}>{t.name}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    {les.completed ? (
                      <View style={styles.doneBadge}>
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                      </View>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.onSurfaceSecondary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── Explore topics rail ───────────────────────────────────── */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Explore by topic</Text>
            <Pressable
              testID="vh-topics-all"
              onPress={() => router.push("/learn/(tabs)")}
              hitSlop={6}
            >
              <Text style={styles.sectionLink}>See all</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicRow}
          >
            {topics.slice(0, 10).map((t) => {
              const bg =
                t.color === "purple"
                  ? "#E1F2EC"
                  : t.color === "lime"
                    ? "#DDF9C0"
                    : "#D3F4E2";
              return (
                <Pressable
                  key={t.id}
                  testID={`vh-topic-${t.id}`}
                  onPress={() => openTopic(t.id)}
                  style={[styles.topicChip, { backgroundColor: bg }]}
                >
                  <View style={styles.topicIconWrap}>
                    <Ionicons name={t.icon as any} size={22} color="#1A1A2E" />
                  </View>
                  <Text style={styles.topicName} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text style={styles.topicMeta}>
                    {t.words_learned}/{t.word_count} words
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────
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
    headerIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    eyebrow: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.7,
      marginLeft: spacing.lg,
      marginTop: spacing.sm,
      marginBottom: 8,
    },
    langRow: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: 10,
    },
    langPill: {
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 18,
      backgroundColor: colors.surface,
      minWidth: 72,
    },
    langPillOn: {
      backgroundColor: colors.brandTertiary,
    },
    langFlagWrap: {
      padding: 3,
      borderRadius: 999,
      backgroundColor: "transparent",
    },
    langFlagWrapOn: {
      padding: 3,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.brand,
    },
    langName: {
      marginTop: 6,
      fontFamily: fonts.textBold,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
      maxWidth: 80,
      textAlign: "center",
    },
    langNameOn: {
      color: colors.brand,
    },
    langDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.brand,
      marginTop: 4,
    },
    hero: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
    },
    heroEyebrow: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: "rgba(255,255,255,0.75)",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    heroTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 26,
      color: "#FFFFFF",
      marginTop: 2,
    },
    heroMetaRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
      marginBottom: 14,
    },
    heroChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.16)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    heroChipText: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: "#FFFFFF",
    },
    heroTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.22)",
      overflow: "hidden",
    },
    heroFill: {
      height: "100%",
      backgroundColor: "#FFFFFF",
      borderRadius: 3,
    },
    heroXp: {
      marginTop: 8,
      fontFamily: fonts.text,
      fontSize: 12,
      color: "rgba(255,255,255,0.85)",
    },
    continueCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    placementCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.brandTertiary,
    },
    placementIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#F59E0B",
      alignItems: "center",
      justifyContent: "center",
    },
    placementTitle: {
      fontFamily: fonts.textBold,
      fontSize: 14.5,
      color: colors.onSurface,
    },
    placementSub: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginTop: 1,
    },
    continueIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    continueEyebrow: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    continueTitle: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurface,
      marginTop: 2,
    },
    continueTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceTertiary,
      overflow: "hidden",
      marginTop: 8,
    },
    continueFill: {
      height: "100%",
      backgroundColor: colors.brand,
      borderRadius: 2,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.onSurface,
    },
    sectionHint: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
    },
    sectionLink: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.brand,
    },
    levelStack: {
      paddingHorizontal: spacing.lg,
    },
    levelCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      borderRadius: radius.lg,
      padding: spacing.md + 2,
    },
    levelCardOn: {
      borderWidth: 2,
      borderColor: "#FFFFFF",
    },
    levelIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "rgba(255,255,255,0.22)",
      alignItems: "center",
      justifyContent: "center",
    },
    levelTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: "#FFFFFF",
    },
    levelSubtitle: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: "rgba(255,255,255,0.88)",
      marginTop: 2,
    },
    levelTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.28)",
      overflow: "hidden",
      marginTop: 10,
    },
    levelFill: {
      height: "100%",
      backgroundColor: "#FFFFFF",
      borderRadius: 3,
    },
    levelCount: {
      marginTop: 6,
      fontFamily: fonts.textBold,
      fontSize: 11.5,
      color: "rgba(255,255,255,0.95)",
    },
    levelSelectedDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(255,255,255,0.28)",
      borderWidth: 1.5,
      borderColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    lessonList: {
      paddingHorizontal: spacing.lg,
      gap: 10,
    },
    lessonCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    lessonIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    lessonTitle: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurface,
    },
    lessonSub: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
      lineHeight: 17,
    },
    lessonMetaRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 8,
      flexWrap: "wrap",
    },
    metaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    metaText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
    },
    doneBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.md,
    },
    emptyText: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
    topicRow: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      gap: 10,
    },
    topicChip: {
      width: 128,
      borderRadius: 20,
      padding: 12,
      gap: 8,
    },
    topicIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    topicName: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: "#1A1A2E",
    },
    topicMeta: {
      fontFamily: fonts.textBold,
      fontSize: 10.5,
      color: "#2E2E42",
      opacity: 0.8,
    },
  });
