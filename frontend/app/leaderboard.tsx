/**
 * Weekly XP Leaderboard — Friends & Global tabs.
 *
 * XP is earned from vocab lessons, learned words and Word-of-the-Day claims
 * during the current week (Mon–Sun UTC). Top 3 get a podium; the caller's
 * own rank is pinned in a footer bar even when outside the top 50.
 */

import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { IconChip } from "@/src/components/IconChip";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, User } from "@/src/utils/api";

interface Entry {
  rank: number;
  xp: number;
  user: User;
}

interface WeeklyBoard {
  scope: "global" | "friends";
  week_start: string;
  week_end: string;
  entries: Entry[];
  me: { rank: number | null; xp: number; user: User };
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const { loading: authLoading } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [scope, setScope] = useState<"friends" | "global">("global");
  const [board, setBoard] = useState<WeeklyBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (s: "friends" | "global") => {
    try {
      const data = await api.get<WeeklyBoard>(`/leaderboard/weekly?scope=${s}`);
      setBoard(data);
    } catch {
      // keep previous board on failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return; // wait for the token to be restored
      load(scope);
    }, [authLoading, load, scope]),
  );

  const switchScope = (s: "friends" | "global") => {
    if (s === scope) return;
    setScope(s);
    setLoading(true);
  };

  const entries = board?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  const renderRow = ({ item }: { item: Entry }) => (
    <View style={styles.row} testID={`lb-row-${item.rank}`}>
      <Text style={styles.rowRank}>{item.rank}</Text>
      <Avatar
        name={item.user.name}
        url={item.user.avatar_url}
        size={40}
        flagCode={countryToCode(item.user.country)}
        frame={item.user.active_frame}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.user.name}
          {item.user.is_vip ? " 👑" : ""}
        </Text>
      </View>
      <View style={styles.xpPill}>
        <Ionicons name="flash" size={12} color={colors.brand} />
        <Text style={styles.xpText}>{item.xp} XP</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="leaderboard-screen">
      {/* Header */}
      <View style={styles.header}>
        <IconChip
          testID="lb-back"
          tint="neutral"
          icon="chevron-back"
          size={22}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Weekly Leaderboard</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Scope tabs */}
      <View style={styles.tabs}>
        {(["friends", "global"] as const).map((s) => {
          const on = scope === s;
          return (
            <Pressable
              key={s}
              testID={`lb-tab-${s}`}
              onPress={() => switchScope(s)}
              style={[styles.tabBtn, on && styles.tabBtnOn]}
            >
              <Ionicons
                name={s === "friends" ? "people" : "earth"}
                size={15}
                color={on ? colors.onBrand : colors.onSurfaceSecondary}
              />
              <Text style={[styles.tabText, on && styles.tabTextOn]}>
                {s === "friends" ? "Friends" : "Global"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(e) => e.user.id}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(scope);
              }}
              tintColor={colors.brand}
            />
          }
          ListHeaderComponent={
            <>
              {podium.length > 0 ? (
                <View style={styles.podiumCard}>
                  {/* order: 2nd — 1st — 3rd */}
                  {[1, 0, 2].map((idx) => {
                    const e = podium[idx];
                    if (!e)
                      return <View key={`empty-${idx}`} style={styles.podiumSlot} />;
                    const isFirst = idx === 0;
                    return (
                      <View
                        key={e.user.id}
                        style={styles.podiumSlot}
                        testID={`lb-podium-${e.rank}`}
                      >
                        <Text style={styles.medal}>{MEDALS[e.rank - 1]}</Text>
                        <Avatar
                          name={e.user.name}
                          url={e.user.avatar_url}
                          size={isFirst ? 68 : 54}
                          flagCode={countryToCode(e.user.country)}
                          frame={e.user.active_frame}
                        />
                        <Text style={styles.podiumName} numberOfLines={1}>
                          {e.user.name}
                        </Text>
                        <View style={styles.podiumXp}>
                          <Ionicons name="flash" size={11} color={colors.brand} />
                          <Text style={styles.podiumXpText}>{e.xp}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyWrap} testID="lb-empty">
                  <Ionicons
                    name="trophy-outline"
                    size={44}
                    color={colors.onSurfaceSecondary}
                  />
                  <Text style={styles.emptyTitle}>No XP yet this week</Text>
                  <Text style={styles.emptySub}>
                    Complete vocab lessons or claim the Word of the Day to climb
                    the board!
                  </Text>
                  <Pressable
                    testID="lb-empty-cta"
                    onPress={() => router.push("/vocab-hub")}
                    style={styles.emptyBtn}
                  >
                    <Text style={styles.emptyBtnText}>Start learning</Text>
                  </Pressable>
                </View>
              )}
            </>
          }
        />
      )}

      {/* My rank footer — always visible once loading finishes */}
      {!loading && (
        <View style={styles.meBar} testID="lb-me-bar">
          <Text style={styles.meRank}>
            {board?.me.rank ? `#${board.me.rank}` : "—"}
          </Text>
          <Avatar
            name={board?.me.user?.name}
            url={board?.me.user?.avatar_url}
            size={36}
            flagCode={countryToCode(board?.me.user?.country)}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.meName} numberOfLines={1}>
              You
            </Text>
            <Text style={styles.meHint} numberOfLines={1}>
              {board?.me.rank
                ? "Keep going — every lesson counts!"
                : "Earn XP this week to get ranked"}
            </Text>
          </View>
          <View style={styles.xpPill}>
            <Ionicons name="flash" size={12} color={colors.brand} />
            <Text style={styles.xpText}>{board?.me.xp ?? 0} XP</Text>
          </View>
        </View>
      )}
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
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    tabs: {
      flexDirection: "row",
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 999,
      padding: 4,
      gap: 4,
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      borderRadius: 999,
    },
    tabBtnOn: { backgroundColor: colors.brand },
    tabText: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
    tabTextOn: { color: colors.onBrand },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    podiumCard: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-around",
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    podiumSlot: {
      alignItems: "center",
      gap: 4,
      width: 96,
    },
    medal: { fontSize: 20 },
    podiumName: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: colors.onSurface,
      maxWidth: 90,
    },
    podiumXp: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.brandTertiary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    podiumXpText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.brand,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginBottom: 8,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    rowRank: {
      width: 26,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    rowName: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurface,
    },
    xpPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.brandTertiary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    xpText: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: colors.brand,
    },
    meBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderWidth: 1.5,
      borderColor: colors.brand,
    },
    meRank: {
      fontFamily: fonts.displayBold,
      fontSize: 15,
      color: colors.brand,
      minWidth: 30,
      textAlign: "center",
    },
    meName: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurface,
    },
    meHint: {
      fontFamily: fonts.text,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
    },
    emptyWrap: {
      alignItems: "center",
      gap: 8,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 16,
      color: colors.onSurface,
    },
    emptySub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    emptyBtn: {
      marginTop: 6,
      backgroundColor: colors.brand,
      paddingHorizontal: 22,
      paddingVertical: 10,
      borderRadius: 999,
    },
    emptyBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onBrand,
    },
  });
