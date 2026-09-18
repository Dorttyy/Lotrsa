import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, Moment, User } from "@/src/utils/api";

const PURPLE = "#0E9AE0";

interface RankEntry {
  user: User;
  points: number;
}

/** Moments points: 20/post + 10/like + 5/comment. Activity points: 30/post
 * (how actively they publish) + 50 bonus while online. */
const aggregate = (moments: Moment[], mode: "moments" | "activity"): RankEntry[] => {
  const map = new Map<string, RankEntry>();
  for (const m of moments) {
    if (!m.author) continue;
    const cur = map.get(m.author.id) || { user: m.author, points: 0 };
    cur.points +=
      mode === "moments"
        ? 20 + m.like_count * 10 + m.comment_count * 5
        : 30;
    map.set(m.author.id, cur);
  }
  if (mode === "activity") {
    for (const e of map.values()) {
      if (e.user.is_online) e.points += 50;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.points - a.points);
};

const pad = (n: number) => n.toString().padStart(2, "0");

export default function MomentsRanking() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [feed, setFeed] = useState<Moment[]>([]);
  const [tab, setTab] = useState<"activity" | "moments">("moments");
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(72 * 3600 + 28 * 60);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    api
      .get<Moment[]>("/moments")
      .then(setFeed)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const entries = useMemo(() => aggregate(feed, tab), [feed, tab]);

  const follow = async (u: User) => {
    setFollowed((prev) => ({ ...prev, [u.id]: !prev[u.id] }));
    try {
      await api.post(`/users/${u.id}/follow`);
    } catch {
      setFollowed((prev) => ({ ...prev, [u.id]: !prev[u.id] }));
    }
  };

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myIdx = entries.findIndex((e) => e.user.id === user?.id);
  const myPoints = myIdx >= 0 ? entries[myIdx].points : 0;
  const lastRanked = entries.length ? entries[entries.length - 1].points : 0;
  const deficit = Math.max(0, lastRanked - myPoints + 10);

  const hrs = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;

  const Podium = ({
    entry,
    rank,
  }: {
    entry?: RankEntry;
    rank: 1 | 2 | 3;
  }) => {
    const tints: Record<number, { bg: string; crown: string; ring: string }> = {
      1: { bg: "#FFF7DC", crown: "#F5B700", ring: "#F5B700" },
      2: { bg: "#E4F1FF", crown: "#6BA8F0", ring: "#6BA8F0" },
      3: { bg: "#FFE9F0", crown: "#F272A5", ring: "#F272A5" },
    };
    const t = tints[rank];
    if (!entry) return <View style={{ flex: 1 }} />;
    const on = followed[entry.user.id];
    const big = rank === 1;
    return (
      <View
        style={[
          styles.podium,
          { backgroundColor: t.bg },
          big && styles.podiumBig,
        ]}
        testID={`rank-podium-${rank}`}
      >
        <View style={styles.crownWrap}>
          <MaterialCommunityIcons name="crown" size={big ? 26 : 21} color={t.crown} />
          <Text style={[styles.crownNum, { color: t.crown }]}>{rank}</Text>
        </View>
        <View style={[styles.podiumRing, { borderColor: t.ring }]}>
          <Avatar
            name={entry.user.name}
            url={entry.user.avatar_url}
            size={big ? 66 : 54}
            flagCode={countryToCode(entry.user.country)}
          />
        </View>
        <Text style={styles.podiumName} numberOfLines={1}>
          {entry.user.name?.split(" ")[0]}
        </Text>
        <Text style={[styles.podiumPoints, { color: t.crown }]}>
          {entry.points}
        </Text>
        <Pressable
          testID={`rank-follow-${entry.user.id}`}
          style={styles.podiumFollow}
          onPress={() => follow(entry.user)}
        >
          <Text style={styles.podiumFollowText}>
            {on ? "Following" : "Follow"}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="moments-ranking-screen">
      <View style={styles.header}>
        <Pressable testID="mr-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headTabs}>
          <Pressable testID="mr-tab-activity" onPress={() => setTab("activity")} hitSlop={8}>
            <Text style={tab === "activity" ? styles.headTabOn : styles.headTabDim}>
              Activity Ranking
            </Text>
          </Pressable>
          <Pressable testID="mr-tab-moments" onPress={() => setTab("moments")} hitSlop={8}>
            <Text style={tab === "moments" ? styles.headTabOn : styles.headTabDim}>
              Moments Ranking
            </Text>
          </Pressable>
        </View>
        <Pressable
          testID="mr-report-btn"
          onPress={() => router.push("/moments-report")}
          hitSlop={8}
        >
          <Ionicons name="reader-outline" size={24} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={styles.updateRow}>
        <View>
          <Text style={styles.updateLabel}>Next Update</Text>
          <Text style={styles.updateTime}>
            {pad(hrs)} : {pad(mins)} : {pad(secs)}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.allPill}>
          <Text style={styles.allText}>All</Text>
          <Ionicons name="chevron-down" size={15} color={colors.onSurface} />
        </View>
        <Ionicons
          name="information-circle-outline"
          size={22}
          color={colors.onSurfaceSecondary}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            <View style={styles.podiumRow}>
              <Podium entry={top3[1]} rank={2} />
              <Podium entry={top3[0]} rank={1} />
              <Podium entry={top3[2]} rank={3} />
            </View>
          }
          renderItem={({ item, index }) => {
            const on = followed[item.user.id];
            return (
              <Pressable
                testID={`rank-row-${index + 4}`}
                style={styles.row}
                onPress={() => router.push(`/user/${item.user.id}`)}
              >
                <Text style={styles.rankNum}>{index + 4}</Text>
                <Avatar
                  name={item.user.name}
                  url={item.user.avatar_url}
                  size={52}
                  flagCode={countryToCode(item.user.country)}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.user.name}
                  </Text>
                  <Text style={styles.rowPoints}>{item.points}</Text>
                </View>
                {item.user.id !== user?.id && (
                  <Pressable
                    testID={`rank-follow-row-${item.user.id}`}
                    style={[styles.followPill, on && { opacity: 0.6 }]}
                    onPress={() => follow(item.user)}
                  >
                    <Text style={styles.followPillText}>
                      {on ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}

      {/* My rank bar */}
      <View style={styles.myBar} testID="rank-my-bar">
        <Text style={styles.myRank}>
          {myIdx >= 0 && myIdx < 100 ? `#${myIdx + 1}` : "300+"}
        </Text>
        <Avatar
          name={user?.name}
          url={user?.avatar_url}
          size={46}
          flagCode={countryToCode(user?.country)}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.myName} numberOfLines={1}>
            {user?.name}
          </Text>
          <Text style={styles.myHint} numberOfLines={1}>
            {deficit > 0
              ? `${deficit} more Popularity Points to get ranked!`
              : "You're on the board — keep it up!"}
          </Text>
        </View>
        <Text style={styles.myPoints}>{myPoints}</Text>
        <Pressable
          testID="rank-post-btn"
          style={styles.postBtn}
          onPress={() => router.push("/moment-compose")}
        >
          <Text style={styles.postText}>Post</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    headTabs: { flex: 1, flexDirection: "row", justifyContent: "center", gap: 16 },
    headTabDim: { fontFamily: fonts.textSemi, fontSize: 15.5, color: colors.onSurfaceSecondary },
    headTabOn: { fontFamily: fonts.displayBold, fontSize: 15.5, color: colors.onSurface },
    updateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    updateLabel: { fontFamily: fonts.textSemi, fontSize: 13.5, color: colors.onSurfaceSecondary },
    updateTime: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.onSurface },
    allPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    allText: { fontFamily: fonts.textSemi, fontSize: 14, color: colors.onSurface },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    podiumRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    podium: {
      flex: 1,
      alignItems: "center",
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 6,
    },
    podiumBig: { paddingVertical: 18 },
    crownWrap: { alignItems: "center", marginBottom: 2 },
    crownNum: { fontFamily: fonts.textBold, fontSize: 11, marginTop: -6 },
    podiumRing: {
      borderWidth: 2.5,
      borderRadius: 60,
      padding: 3,
      backgroundColor: "#FFFFFF",
    },
    podiumName: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurface,
      marginTop: 6,
      maxWidth: 90,
    },
    podiumPoints: { fontFamily: fonts.textBold, fontSize: 13.5, marginTop: 1 },
    podiumFollow: {
      backgroundColor: "#FFFFFF",
      borderRadius: radius.pill,
      paddingHorizontal: 18,
      paddingVertical: 7,
      marginTop: 8,
    },
    podiumFollowText: { fontFamily: fonts.textSemi, fontSize: 13, color: colors.onSurfaceSecondary },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
    },
    rankNum: { width: 22, fontFamily: fonts.displayBold, fontSize: 16, color: colors.onSurface },
    rowName: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
    rowPoints: { fontFamily: fonts.textSemi, fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 2 },
    followPill: {
      backgroundColor: colors.brandTertiary,
      borderRadius: radius.pill,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    followPillText: { fontFamily: fonts.textBold, fontSize: 14, color: colors.brand },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 96 },
    myBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      paddingBottom: 26,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    myRank: { fontFamily: fonts.displayBold, fontSize: 16, color: PURPLE },
    myName: { fontFamily: fonts.textBold, fontSize: 15.5, color: colors.onSurface },
    myHint: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 1 },
    myPoints: { fontFamily: fonts.textBold, fontSize: 14.5, color: colors.onSurfaceSecondary },
    postBtn: {
      backgroundColor: PURPLE,
      borderRadius: radius.pill,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },
    postText: { fontFamily: fonts.textBold, fontSize: 14.5, color: "#FFFFFF" },
  });
