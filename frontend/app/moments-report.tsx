import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, Moment } from "@/src/utils/api";

const PURPLE = "#0E9AE0";

const weekRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  const f = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
  return `${f(start)}-${f(now)}`;
};

/** Weekly Moments Report — my posting stats + boost shortcuts. */
export default function MomentsReport() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mine, setMine] = useState<Moment[]>([]);
  const [surpassed, setSurpassed] = useState(80);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Moment[]>(`/moments?user_id=${user.id}`),
      api.get<Moment[]>("/moments"),
    ])
      .then(([my, all]) => {
        setMine(my);
        const authors = new Set(all.map((m) => m.author?.id).filter(Boolean));
        const myPts = my.reduce((s, m) => s + m.like_count * 10 + m.comment_count * 5 + 20, 0);
        const per = new Map<string, number>();
        for (const m of all) {
          if (!m.author) continue;
          per.set(
            m.author.id,
            (per.get(m.author.id) || 0) + m.like_count * 10 + m.comment_count * 5 + 20,
          );
        }
        const below = Array.from(per.values()).filter((p) => p < myPts).length;
        setSurpassed(
          authors.size > 1 ? Math.round((below / (authors.size - 1)) * 1000) / 10 : 100,
        );
      })
      .catch(() => {});
  }, [user]);

  const likes = mine.reduce((s, m) => s + m.like_count, 0);
  const comments = mine.reduce((s, m) => s + m.comment_count, 0);
  const views = mine.length * 137 + likes * 19; // estimated reach

  const share = async () => {
    try {
      await Share.share({
        message: `My weekly Moments report: ${mine.length} moments, ${views.toLocaleString()} views, ${likes} likes! 🚀`,
      });
    } catch {
      /* dismissed */
    }
  };

  return (
    <View style={styles.root} testID="moments-report-screen">
      <LinearGradient colors={["#0E9AE0", "#0A6B9E"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable testID="rep-back" onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.title}>Weekly Moments Report</Text>
          <Pressable testID="rep-share" onPress={share} hitSlop={8}>
            <Ionicons name="share-social" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Avatar
            name={user?.name}
            url={user?.avatar_url}
            size={54}
            flagCode={countryToCode(user?.country)}
            online
          />
          <Text style={styles.range}>{weekRange()}</Text>
          <Text style={styles.big}>
            You surpassed{"\n"}
            <Text style={styles.bigNum}>{surpassed}%</Text> of partners
          </Text>

          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{mine.length}</Text>
                <Text style={styles.statLabel}>Moments</Text>
              </View>
              <View style={[styles.statCell, styles.statCellRight]}>
                <Text style={styles.statNum}>{views.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
            </View>
            <View style={[styles.statsRow, styles.statsRowTop]}>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{comments}</Text>
                <Text style={styles.statLabel}>Comments</Text>
              </View>
              <View style={[styles.statCell, styles.statCellRight]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.statNum}>{likes}</Text>
                  <Text style={styles.statUp}>↑ 12%</Text>
                </View>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionRow}>
            <Ionicons name="add-circle" size={17} color="#E4DCFF" />
            <Text style={styles.sectionTitle}>Popular Activities</Text>
          </View>
          <Pressable
            testID="rep-activity"
            style={styles.activityCard}
            onPress={() => router.push("/(tabs)/moments")}
          >
            <Text style={{ fontSize: 34 }}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>Travel with Friends</Text>
              <Text style={styles.activitySub} numberOfLines={2}>
                Travel views and delicious food are meant to be shared…
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceSecondary} />
          </Pressable>

          <Pressable
            testID="rep-boost-row"
            style={styles.boostRow}
            onPress={() => router.push("/boost-center")}
          >
            <Ionicons name="trending-up" size={17} color="#E4DCFF" />
            <Text style={styles.sectionTitle}>Moments Boost</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={18} color="#E4DCFF" />
          </Pressable>
          <Text style={styles.boostHint}>
            Choose a post to Boost to help you get more exposure
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {mine.slice(0, 4).map((m) => (
              <View key={m.id} style={styles.postChip}>
                <Text style={styles.postChipText} numberOfLines={2}>
                  {m.text || (m.audio_url ? "🎙 Voice moment" : "📷 Photo moment")}
                </Text>
              </View>
            ))}
          </ScrollView>

          <Pressable
            testID="rep-post"
            style={styles.postBtn}
            onPress={() => router.push("/moment-compose")}
          >
            <Text style={styles.postBtnText}>Post</Text>
          </Pressable>
          <Pressable testID="rep-boost" onPress={() => router.push("/boost-center")}>
            <LinearGradient
              colors={["#FF5FA2", "#B44BF0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.boostBtn}
            >
              <Text style={[styles.postBtnText, { color: "#FFFFFF" }]}>Boost</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: "#FFFFFF",
    },
    body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    range: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: "#E9E2FF",
      marginTop: 10,
    },
    big: {
      fontFamily: fonts.displayBold,
      fontSize: 30,
      lineHeight: 38,
      color: "#FFFFFF",
      marginTop: 6,
      marginBottom: spacing.lg,
    },
    bigNum: { color: "#FFC24B" },
    statsCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      paddingHorizontal: spacing.lg,
    },
    statsRow: { flexDirection: "row", paddingVertical: 16 },
    statsRowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    statCell: { flex: 1 },
    statCellRight: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.border,
      paddingLeft: spacing.lg,
    },
    statNum: { fontFamily: fonts.displayBold, fontSize: 24, color: "#111827" },
    statUp: { fontFamily: fonts.textBold, fontSize: 13, color: PURPLE },
    statLabel: { fontFamily: fonts.text, fontSize: 13.5, color: "#6B7280", marginTop: 2 },
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    sectionTitle: { fontFamily: fonts.displayBold, fontSize: 16.5, color: "#FFFFFF" },
    activityCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: spacing.md,
    },
    activityTitle: { fontFamily: fonts.textBold, fontSize: 15.5, color: "#111827" },
    activitySub: { fontFamily: fonts.text, fontSize: 12.5, color: "#6B7280", marginTop: 2 },
    boostRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: spacing.xl,
    },
    boostHint: { fontFamily: fonts.text, fontSize: 12.5, color: "#E4DCFF", marginTop: 3, marginBottom: spacing.sm },
    postChip: {
      width: 220,
      backgroundColor: "rgba(255,255,255,0.92)",
      borderRadius: 12,
      padding: 12,
    },
    postChipText: { fontFamily: fonts.text, fontSize: 13.5, color: "#111827" },
    postBtn: {
      backgroundColor: "#FFFFFF",
      borderRadius: radius.pill,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.xl,
    },
    boostBtn: {
      borderRadius: radius.pill,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.md,
    },
    postBtnText: { fontFamily: fonts.textBold, fontSize: 16.5, color: PURPLE },
  });
