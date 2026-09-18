/**
 * Word of the Day card — shown at the top of the Chats tab.
 *
 * A compact horizontal purple-gradient card that shows today's featured word,
 * translated into the user's learning language. Tap opens a detail modal with
 * the full example sentence, translation, and a "Mark as learned" button
 * (which awards a small XP + ticks the WOTD streak).
 *
 * Backend endpoints used:
 *   GET  /api/wotd/today
 *   POST /api/wotd/today/claim
 */

import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";

import { useTheme } from "@/src/context/ThemeContext";
import { useAuth } from "@/src/context/AuthContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api } from "@/src/utils/api";

interface WordOfDay {
  day_key: string;
  day_index: number;
  lang: string;
  term_en: string;
  term: string;
  translation: string;
  example_en: string;
  example: string;
  claimed: boolean;
  claim_xp: number;
  streak: number;
}

export const WordOfDayCard: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState<WordOfDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<WordOfDay>("/wotd/today");
      setData(res);
    } catch {
      /* silent — widget will simply not render */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only hit the API once auth is hydrated (token restored from storage).
    if (user) load();
  }, [load, user]);

  const doClaim = async () => {
    if (!data || claiming) return;
    setClaiming(true);
    try {
      const res = await api.post<{
        ok: boolean;
        awarded: number;
        streak: number;
        day_key: string;
      }>("/wotd/today/claim", {});
      setData((prev) =>
        prev ? { ...prev, claimed: true, streak: res.streak } : prev,
      );
    } catch {
      /* silent */
    } finally {
      setClaiming(false);
    }
  };

  if (loading || !data) {
    return null; // avoid layout jump — return null when we have nothing to show
  }

  const bilingual = data.lang !== "en" && data.term !== data.term_en;

  return (
    <>
      <Pressable
        testID="wotd-card"
        onPress={() => setDetailOpen(true)}
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}
      >
        <LinearGradient
          colors={["#0E9AE0", "#0A6B9E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.eyebrowRow}>
              <Ionicons name="sparkles" size={11} color="#FFD43D" />
              <Text style={styles.eyebrow}>WORD OF THE DAY</Text>
              {data.streak > 0 ? (
                <View style={styles.streakChip}>
                  <Ionicons name="flame" size={10} color="#FFB800" />
                  <Text style={styles.streakText}>{data.streak}d</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.term} numberOfLines={1}>
              {data.term}
            </Text>
            {bilingual ? (
              <Text style={styles.termEn} numberOfLines={1}>
                {data.term_en}
              </Text>
            ) : null}
            <Text style={styles.translation} numberOfLines={2}>
              {data.translation}
            </Text>
          </View>
          <View style={styles.rightRail}>
            {data.claimed ? (
              <View style={styles.doneBadge}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.cta}>
                <Text style={styles.ctaText}>+{data.claim_xp}</Text>
                <Text style={styles.ctaXp}>XP</Text>
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={16}
              color="rgba(255,255,255,0.7)"
            />
          </View>
        </LinearGradient>
      </Pressable>

      {/* Detail modal */}
      <Modal
        visible={detailOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setDetailOpen(false)}
        />
        <BoundedSheet
          style={[styles.sheet, { paddingBottom: 34 + insets.bottom }]}
          testID="wotd-sheet"
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetEyebrow}>
            <Ionicons name="sparkles" size={12} color={colors.brand} />
            <Text style={styles.sheetEyebrowText}>WORD OF THE DAY</Text>
          </View>
          <Text style={styles.sheetTerm}>{data.term}</Text>
          {bilingual ? (
            <Text style={styles.sheetTermEn}>{data.term_en}</Text>
          ) : null}
          <View style={styles.sheetDivider} />
          <View style={styles.sheetBlock}>
            <Text style={styles.sheetLabel}>Meaning</Text>
            <Text style={styles.sheetValue}>{data.translation}</Text>
          </View>
          <View style={styles.sheetBlock}>
            <Text style={styles.sheetLabel}>In a sentence</Text>
            <Text style={styles.sheetExample}>“{data.example}”</Text>
            {bilingual ? (
              <Text style={styles.sheetExampleEn}>“{data.example_en}”</Text>
            ) : null}
          </View>
          {data.streak > 0 ? (
            <View style={styles.sheetStreak}>
              <Ionicons name="flame" size={14} color="#F59E0B" />
              <Text style={styles.sheetStreakText}>
                {data.streak}-day streak · keep it going!
              </Text>
            </View>
          ) : null}
          <View style={styles.sheetBtnRow}>
            <Pressable
              testID="wotd-practice"
              onPress={() => {
                setDetailOpen(false);
                router.push("/vocab-hub");
              }}
              style={styles.secondaryBtn}
            >
              <Ionicons name="book-outline" size={16} color={colors.brand} />
              <Text style={styles.secondaryBtnText}>Practice more</Text>
            </Pressable>
            {data.claimed ? (
              <View style={[styles.primaryBtn, styles.primaryBtnDone]}>
                <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Learned</Text>
              </View>
            ) : (
              <Pressable
                testID="wotd-claim"
                onPress={doClaim}
                disabled={claiming}
                style={styles.primaryBtn}
              >
                {claiming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>
                      Mark as learned · +{data.claim_xp} XP
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </BoundedSheet>
      </Modal>
    </>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
    },
    eyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    eyebrow: {
      fontFamily: fonts.textBold,
      fontSize: 10.5,
      color: "rgba(255,255,255,0.8)",
      letterSpacing: 0.9,
    },
    streakChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginLeft: 6,
      backgroundColor: "rgba(255, 184, 0, 0.22)",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 999,
    },
    streakText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: "#FFE7A0",
    },
    term: {
      fontFamily: fonts.displayBold,
      fontSize: 20,
      color: "#FFFFFF",
      marginTop: 3,
    },
    termEn: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: "rgba(255,255,255,0.75)",
      marginTop: 1,
    },
    translation: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: "rgba(255,255,255,0.85)",
      marginTop: 4,
    },
    rightRail: {
      alignItems: "center",
      gap: 8,
    },
    cta: {
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },
    ctaText: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: "#FFFFFF",
    },
    ctaXp: {
      fontFamily: fonts.textBold,
      fontSize: 9.5,
      color: "rgba(255,255,255,0.85)",
      letterSpacing: 0.6,
    },
    doneBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.22)",
      alignItems: "center",
      justifyContent: "center",
    },
    // ── detail sheet ───────────────────────────────────────────
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.5)",
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      paddingBottom: 34,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetEyebrow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    sheetEyebrowText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.brand,
      letterSpacing: 0.9,
    },
    sheetTerm: {
      fontFamily: fonts.displayBold,
      fontSize: 32,
      color: colors.onSurface,
      marginTop: 6,
    },
    sheetTermEn: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    sheetDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginVertical: spacing.md,
    },
    sheetBlock: {
      marginBottom: spacing.md,
    },
    sheetLabel: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    sheetValue: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurface,
    },
    sheetExample: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurface,
      lineHeight: 22,
      fontStyle: "italic",
    },
    sheetExampleEn: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      lineHeight: 19,
      fontStyle: "italic",
      marginTop: 4,
    },
    sheetStreak: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.brandTertiary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      alignSelf: "flex-start",
      marginBottom: spacing.md,
    },
    sheetStreakText: {
      fontFamily: fonts.textBold,
      fontSize: 12.5,
      color: colors.brand,
    },
    sheetBtnRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: spacing.sm,
    },
    secondaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.brandTertiary,
    },
    secondaryBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 13.5,
      color: colors.brand,
    },
    primaryBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: colors.brand,
    },
    primaryBtnDone: {
      backgroundColor: colors.success,
    },
    primaryBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: "#FFFFFF",
    },
  });
