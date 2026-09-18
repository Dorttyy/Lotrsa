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

import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api } from "@/src/utils/api";

interface Tx {
  id: string;
  amount: number;
  label: string;
  created_at: string;
}

/** Account overview — coin & diamond transaction history. */
export default function AccountOverview() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<"coin" | "diamond">("coin");
  const [data, setData] = useState<{ totals: number; spent: number; items: Tx[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .get<{ totals: number; spent: number; items: Tx[] }>(
        `/market/transactions?kind=${tab}`,
      )
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, tab]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="account-overview-screen">
      <View style={styles.header}>
        <Pressable testID="ao-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Account overview</Text>
        <Pressable
          testID="ao-gifts-btn"
          onPress={() => router.push("/gift-details")}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="clipboard-text-clock" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable
          testID="ao-tab-coin"
          style={[styles.tab, tab === "coin" && styles.tabOn]}
          onPress={() => setTab("coin")}
        >
          <View style={styles.coinDot}>
            <Text style={styles.coinDotText}>C</Text>
          </View>
          <Text style={[styles.tabText, tab === "coin" && styles.tabTextOn]}>Coin</Text>
        </Pressable>
        <Pressable
          testID="ao-tab-diamond"
          style={[styles.tab, tab === "diamond" && styles.tabOn]}
          onPress={() => setTab("diamond")}
        >
          <Text style={{ fontSize: 13 }}>💎</Text>
          <Text style={[styles.tabText, tab === "diamond" && styles.tabTextOn]}>
            Diamonds
          </Text>
        </Pressable>
      </View>

      <View style={styles.totalsRow}>
        <View>
          <Text style={styles.totLine}>
            Totals <Text style={styles.totPlus}>+{data?.totals ?? 0}</Text>
          </Text>
          <Text style={styles.totLine}>
            {tab === "coin" ? "Payment made " : "Spent "}
            <Text style={styles.totMinus}>{data?.spent ?? 0}</Text>
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.daysPill}>
          <Text style={styles.daysText}>30 Days</Text>
          <Ionicons name="chevron-down" size={14} color={colors.onSurface} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0E9AE0" />
        </View>
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 30, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt" size={34} color="#8B7CF6" />
                <View style={styles.zeroBadge}>
                  <Text style={styles.zeroText}>0</Text>
                </View>
              </View>
              <Text style={styles.emptyText}>No record yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row} testID={`tx-row-${item.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowTime}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.rowAmount,
                  { color: item.amount >= 0 ? "#22C55E" : "#EF4444" },
                ]}
              >
                {item.amount >= 0 ? "+" : ""}
                {item.amount}
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
    tabs: { flexDirection: "row", gap: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: radius.pill,
    },
    tabOn: { backgroundColor: colors.surfaceSecondary },
    coinDot: {
      width: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: "#F5B700",
      alignItems: "center",
      justifyContent: "center",
    },
    coinDotText: { fontFamily: fonts.textBold, fontSize: 9, color: "#FFFFFF" },
    tabText: { fontFamily: fonts.textSemi, fontSize: 14.5, color: colors.onSurfaceSecondary },
    tabTextOn: { fontFamily: fonts.textBold, color: colors.onSurface },
    totalsRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    totLine: { fontFamily: fonts.text, fontSize: 15, color: colors.onSurfaceSecondary, marginBottom: 3 },
    totPlus: { fontFamily: fonts.textBold, color: "#0E9AE0" },
    totMinus: { fontFamily: fonts.textBold, color: "#EF4444" },
    daysPill: { flexDirection: "row", alignItems: "center", gap: 3 },
    daysText: { fontFamily: fonts.textBold, fontSize: 14.5, color: colors.onSurface },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, minHeight: 300 },
    emptyIcon: {
      width: 74,
      height: 74,
      borderRadius: 20,
      backgroundColor: "#EFEAFE",
      alignItems: "center",
      justifyContent: "center",
    },
    zeroBadge: {
      position: "absolute",
      top: 10,
      right: 12,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#0E9AE0",
      alignItems: "center",
      justifyContent: "center",
    },
    zeroText: { fontFamily: fonts.textBold, fontSize: 10.5, color: "#FFFFFF" },
    emptyText: { fontFamily: fonts.text, fontSize: 14.5, color: colors.onSurfaceSecondary },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: 13,
      gap: 10,
    },
    rowLabel: { fontFamily: fonts.textSemi, fontSize: 15, color: colors.onSurface },
    rowTime: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
    rowAmount: { fontFamily: fonts.textBold, fontSize: 16 },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
  });
