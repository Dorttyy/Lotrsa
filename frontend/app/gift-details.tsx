import { Ionicons } from "@/src/ui/icons";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";
import { api, User } from "@/src/utils/api";

interface GiftItem {
  id: string;
  user: User | null;
  emoji: string;
  name: string;
  diamonds: number;
  created_at: string;
}

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const hm = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  if (d.toDateString() === now.toDateString()) return hm;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${hm}`;
};

/** Gift details — received / sent history with diamond values. */
export default function GiftDetails() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<"received" | "sent" | "awards">("received");
  const [data, setData] = useState<{ total_value: number; count: number; items: GiftItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || tab === "awards") return;
    setLoading(true);
    api
      .get<{ total_value: number; count: number; items: GiftItem[] }>(
        `/market/gifts?dir=${tab}`,
      )
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, tab]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="gift-details-screen">
      <View style={styles.header}>
        <Pressable testID="gd-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <AppTitle variant="navigation" testID="gift-details-header-title" style={styles.title}>Gift details</AppTitle>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabs}>
        {([
          { k: "received", label: "GIFT RECEIVED" },
          { k: "sent", label: "GIFT SENT" },
          { k: "awards", label: "PLATFORM\nAWARDS" },
        ] as const).map((t) => (
          <Pressable
            key={t.k}
            testID={`gd-tab-${t.k}`}
            style={[styles.tab, tab === t.k && styles.tabOn]}
            onPress={() => setTab(t.k)}
          >
            <Text style={[styles.tabText, tab === t.k && styles.tabTextOn]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab !== "awards" && (
        <View style={styles.totalsRow}>
          <View>
            <View style={styles.totLine}>
              <Text style={{ fontSize: 14 }}>💎</Text>
              <Text style={styles.totNum}>{data?.total_value ?? 0}</Text>
            </View>
            <Text style={styles.totLabel}>Total gift value</Text>
          </View>
          <View style={{ marginLeft: 30 }}>
            <View style={styles.totLine}>
              <Text style={{ fontSize: 14 }}>🎁</Text>
              <Text style={styles.totNum}>{data?.count ?? 0}</Text>
            </View>
            <Text style={styles.totLabel}>
              {tab === "received" ? "Gift received" : "Gift sent"}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.daysPill}>
            <Text style={styles.daysText}>30 Days</Text>
            <Ionicons name="chevron-down" size={14} color={colors.onSurface} />
          </View>
        </View>
      )}

      {tab === "awards" ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>🏆</Text>
          <Text style={styles.emptyText}>No platform awards yet.</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0E9AE0" />
        </View>
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40 }}>🎁</Text>
              <Text style={styles.emptyText}>
                {tab === "received"
                  ? "No gifts received yet — be active in voice rooms!"
                  : "You haven't sent any gifts yet."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row} testID={`gift-row-${item.id}`}>
              <Avatar
                name={item.user?.name}
                url={item.user?.avatar_url}
                size={44}
                flagCode={countryToCode(item.user?.country)}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.user?.name || "Unknown"}
                </Text>
                <Text style={styles.rowTime}>{fmtTime(item.created_at)}</Text>
              </View>
              <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
              <Text style={styles.rowQty}>x1</Text>
              <Text style={styles.rowValue}>
                {tab === "received" ? "+" : "-"}
                {item.diamonds}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    title: { flex: 1, textAlign: "center", fontFamily: fonts.displayBold, fontSize: 24, color: colors.onSurface },
    tabs: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg },
    tab: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill },
    tabOn: { backgroundColor: colors.surfaceSecondary },
    tabText: {
      fontFamily: fonts.textSemi,
      fontSize: 11.5,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    tabTextOn: { fontFamily: fonts.textBold, color: colors.onSurface },
    totalsRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    totLine: { flexDirection: "row", alignItems: "center", gap: 5 },
    totNum: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onSurface },
    totLabel: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 1 },
    daysPill: { flexDirection: "row", alignItems: "center", gap: 3 },
    daysText: { fontFamily: fonts.textBold, fontSize: 14.5, color: colors.onSurface },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, minHeight: 260, paddingHorizontal: 40 },
    emptyText: { fontFamily: fonts.text, fontSize: 13.5, color: colors.onSurfaceSecondary, textAlign: "center" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
    },
    rowName: { fontFamily: fonts.textBold, fontSize: 15.5, color: colors.onSurface },
    rowTime: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 1 },
    rowQty: { fontFamily: fonts.textSemi, fontSize: 13, color: colors.onSurface },
    rowValue: { fontFamily: fonts.textBold, fontSize: 15, color: "#3B82F6", minWidth: 48, textAlign: "right" },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 74 },
  });
