import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconChip } from "@/src/components/IconChip";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, Moment } from "@/src/utils/api";

const SIZES = [
  { n: 500, save: null },
  { n: 1000, save: "Save 16%" },
  { n: 2000, save: "Save 16%" },
  { n: 3000, save: "Save 23%" },
];
const PRICE: Record<number, number> = { 500: 239, 1000: 429, 2000: 799, 3000: 1099 };
const PROFILE_PRICE: Record<number, number> = { 500: 159, 1000: 299, 2000: 549, 3000: 799 };

const notify = (t: string, m: string) => {
  if (Platform.OS === "web") window.alert(`${t}\n\n${m}`);
  else Alert.alert(t, m);
};

/** Boost Center — Moments Boost / Profile Boost (HelloTalk style). */
export default function BoostCenter() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<"moments" | "profile">("moments");
  const [myMoments, setMyMoments] = useState<Moment[]>([]);
  const [selMoment, setSelMoment] = useState<string | null>(null);
  const [audience, setAudience] = useState<"default" | "custom">("default");
  const [size, setSize] = useState(500);
  const [agree, setAgree] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<Moment[]>(`/moments?user_id=${user.id}`)
      .then((ms) => {
        setMyMoments(ms);
        if (ms[0]) setSelMoment(ms[0].id);
      })
      .catch(() => {});
  }, [user]);

  const isMoments = tab === "moments";
  const price = (isMoments ? PRICE : PROFILE_PRICE)[size];

  const [buying, setBuying] = useState(false);

  const buy = async () => {
    if (buying) return;
    if (isMoments && !selMoment) {
      notify("Boost", "Select a moment to boost first.");
      return;
    }
    if (!agree) {
      notify("Boost", "Please agree to the Boost Agreement first.");
      return;
    }
    setBuying(true);
    try {
      const res = await api.post<{ coins: number }>("/market/boost", {
        kind: isMoments ? "moment" : "profile",
        size,
        moment_id: isMoments ? selMoment : undefined,
      });
      notify(
        "Boost started! 🚀",
        (isMoments
          ? `Your moment is now pinned to the top of Moments for 24h.`
          : `Your profile is now pinned to the top of Find Partners for 24h.`) +
          `\nRemaining coins: ${res.coins}`,
      );
      router.back();
    } catch (e) {
      notify("Boost", e instanceof Error ? e.message : "Purchase failed.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.surfaceSecondary }]}
      edges={["top", "bottom"]}
      testID="boost-center-screen"
    >
      <View style={styles.header}>
        <IconChip
          testID="bc-close"
          tint="brand"
          icon="close"
          size={20}
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Boost Center</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.tabsRow}>
        {(["moments", "profile"] as const).map((t) => (
          <Pressable
            key={t}
            testID={`bc-tab-${t}`}
            style={[styles.tab, tab === t && styles.tabOn]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === "moments" ? "Moments Boost" : "Profile Boost"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.tickerCard}>
          <Text style={styles.tickerText}>
            {isMoments ? (
              <>
                M*y received <Text style={styles.tickerNum}>59</Text> likes through
                Moments Boost
              </>
            ) : (
              <>
                J*e used Profile Boost to add <Text style={[styles.tickerNum, { color: colors.brand }]}>36</Text> new Chats
              </>
            )}
          </Text>
          <Text style={styles.tickerTime}>{isMoments ? "2 hours ago" : "12 minutes ago"}</Text>
        </View>

        {isMoments ? (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Select Moments</Text>
              <View style={styles.rowMini}>
                <Text style={styles.dimText}>All</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.onSurfaceSecondary} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 12 }}>
              {myMoments.length === 0 ? (
                <Text style={styles.dimText}>Post a moment first to boost it.</Text>
              ) : (
                myMoments.slice(0, 6).map((m, i) => {
                  const on = selMoment === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      testID={`bc-moment-${m.id}`}
                      style={[styles.momentCard, on && styles.momentCardOn]}
                      onPress={() => setSelMoment(m.id)}
                    >
                      {on && (
                        <View style={styles.hotBadge}>
                          <Text style={styles.hotText}>Hot</Text>
                        </View>
                      )}
                      <Text style={styles.momentText} numberOfLines={3}>
                        {m.text || (m.audio_url ? "🎙 Voice moment" : "📷 Photo moment")}
                      </Text>
                      <View style={styles.momentStats}>
                        <Ionicons name="eye-outline" size={13} color={colors.onSurfaceSecondary} />
                        <Text style={styles.statText}>{197 + i * 90}</Text>
                        <Ionicons name="thumbs-up-outline" size={12} color={colors.onSurfaceSecondary} />
                        <Text style={styles.statText}>{m.like_count}</Text>
                        <Ionicons name="chatbubble-outline" size={12} color={colors.onSurfaceSecondary} />
                        <Text style={styles.statText}>{m.comment_count}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        ) : (
          <LinearGradient colors={["#4FA3F7", "#2F6BF0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileBanner}>
            <Text style={styles.bannerTitle}>Profile Boost</Text>
            <Text style={styles.bannerText}>
              Based on your selected package, your profile will be boosted to more
              active users and placed at the top of the [Find Partners] list,
              making it easier for them to discover you!
            </Text>
          </LinearGradient>
        )}

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Target Audience</Text>
            <View style={styles.rowMini}>
              <Text style={styles.dimText}>History</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.onSurfaceSecondary} />
            </View>
          </View>
          <View style={styles.audRow}>
            {(["default", "custom"] as const).map((a) => (
              <Pressable
                key={a}
                testID={`bc-aud-${a}`}
                style={[
                  styles.audPill,
                  audience === a &&
                    (isMoments ? styles.audPillOnPink : styles.audPillOnPurple),
                ]}
                onPress={() => setAudience(a)}
              >
                <Text
                  style={[
                    styles.audText,
                    audience === a && {
                      color: colors.brand,
                    },
                  ]}
                >
                  {a === "default" ? "Default" : "Custom"}{" "}
                  <Ionicons name="help-circle" size={13} color={colors.onSurfaceSecondary} />
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.rowBetween, { marginTop: 14 }]}>
            <Text style={styles.cardTitle}>{isMoments ? "Post Style" : "Frame Style"}</Text>
            <View style={styles.rowMini}>
              <View style={[styles.styleDot, { backgroundColor: colors.brand }]} />
              <Text style={{ fontSize: 16 }}>{isMoments ? "🎆" : "🌹"}</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.onSurfaceSecondary} />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.rowMini}>
          <Text style={styles.footTitle}>Select Audience Size</Text>
          <Ionicons name="help-circle" size={14} color={colors.onSurfaceSecondary} />
        </View>
        <View style={styles.sizeRow}>
          {SIZES.map((s) => {
            const on = size === s.n;
            return (
              <Pressable
                key={s.n}
                testID={`bc-size-${s.n}`}
                style={[
                  styles.sizeChip,
                  on && {
                    borderColor: colors.brand,
                    backgroundColor: colors.brandTertiary,
                  },
                ]}
                onPress={() => setSize(s.n)}
              >
                <Text
                  style={[
                    styles.sizeText,
                    on && { color: colors.brand },
                  ]}
                >
                  {s.n}
                </Text>
                {s.save ? <Text style={styles.saveText}>{s.save}</Text> : null}
              </Pressable>
            );
          })}
        </View>
        <View>
          <View style={styles.trialBadge}>
            <Text style={styles.trialText}>Trial Price</Text>
          </View>
          <Pressable testID="bc-buy" onPress={buy}>
            <LinearGradient
              colors={isMoments ? ["#FF5FA2", "#B44BF0"] : ["#B44BF0", "#4FA3F7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buyBtn}
            >
              <Text style={styles.buyText}>🪙 {price} Coins</Text>
              <Text style={styles.buyOld}>{price + 100} Coins</Text>
            </LinearGradient>
          </Pressable>
        </View>
        {isMoments && (
          <Pressable testID="bc-agree" style={styles.agreeRow} onPress={() => setAgree(!agree)}>
            <View style={[styles.agreeCircle, agree && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
              {agree && <Ionicons name="checkmark" size={11} color={colors.onBrand} />}
            </View>
            <Text style={styles.agreeText}>
              I have read and agree to the{" "}
              <Text style={{ color: colors.brand }}>Moments Boost Agreement</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    tabsRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    tab: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: radius.pill },
    tabOn: { backgroundColor: colors.brandTertiary },
    tabText: { fontFamily: fonts.textSemi, fontSize: 15, color: colors.onSurfaceSecondary },
    tabTextOn: { fontFamily: fonts.textBold, color: colors.onSurface },
    body: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.md },
    tickerCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 8,
    },
    tickerText: { flex: 1, fontFamily: fonts.text, fontSize: 13.5, color: colors.onSurface },
    tickerNum: { color: colors.brand, fontFamily: fonts.textBold },
    tickerTime: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rowMini: { flexDirection: "row", alignItems: "center", gap: 4 },
    cardTitle: { fontFamily: fonts.displayBold, fontSize: 16.5, color: colors.onSurface },
    dimText: { fontFamily: fonts.text, fontSize: 13.5, color: colors.onSurfaceSecondary },
    momentCard: {
      width: 210,
      minHeight: 120,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 12,
      justifyContent: "space-between",
    },
    momentCardOn: { borderColor: colors.brand, backgroundColor: colors.brandTertiary },
    hotBadge: {
      position: "absolute",
      top: -1,
      right: -1,
      backgroundColor: colors.brand,
      borderTopRightRadius: 14,
      borderBottomLeftRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    hotText: { fontFamily: fonts.textBold, fontSize: 11, color: colors.onBrand },
    momentText: { fontFamily: fonts.textSemi, fontSize: 15, color: colors.onSurface, marginTop: 8 },
    momentStats: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
    statText: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, marginRight: 6 },
    profileBanner: { borderRadius: radius.lg, padding: spacing.lg },
    bannerTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: "#FFFFFF" },
    bannerText: { fontFamily: fonts.text, fontSize: 12.5, color: "rgba(255,255,255,0.9)", marginTop: 6, lineHeight: 18, paddingRight: 60 },
    audRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    audPill: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
    },
    audPillOnPink: { backgroundColor: colors.brandTertiary },
    audPillOnPurple: { backgroundColor: colors.brandTertiary },
    audText: { fontFamily: fonts.textBold, fontSize: 14.5, color: colors.onSurfaceSecondary },
    styleDot: { width: 7, height: 7, borderRadius: 4 },
    footer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: spacing.lg,
      gap: 12,
    },
    footTitle: { fontFamily: fonts.displayBold, fontSize: 15.5, color: colors.onSurface },
    sizeRow: { flexDirection: "row", gap: 8 },
    sizeChip: {
      flex: 1,
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "transparent",
      backgroundColor: colors.surfaceSecondary,
      paddingVertical: 10,
    },
    sizeText: { fontFamily: fonts.textBold, fontSize: 15.5, color: colors.onSurfaceSecondary },
    saveText: { fontFamily: fonts.text, fontSize: 11, color: colors.onSurfaceSecondary, marginTop: 1 },
    trialBadge: {
      position: "absolute",
      top: -9,
      right: 8,
      zIndex: 2,
      backgroundColor: colors.brand,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    trialText: { fontFamily: fonts.textBold, fontSize: 10.5, color: colors.onBrand },
    buyBtn: {
      borderRadius: radius.pill,
      alignItems: "center",
      paddingVertical: 11,
    },
    buyText: { fontFamily: fonts.textBold, fontSize: 16.5, color: "#FFFFFF" },
    buyOld: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: "rgba(255,255,255,0.75)",
      textDecorationLine: "line-through",
    },
    agreeRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
    agreeCircle: {
      width: 17,
      height: 17,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    agreeText: { fontFamily: fonts.text, fontSize: 12.5, color: colors.onSurfaceSecondary },
  });
