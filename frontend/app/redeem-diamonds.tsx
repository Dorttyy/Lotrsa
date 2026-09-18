import { Ionicons } from "@/src/ui/icons";
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
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api } from "@/src/utils/api";

const PURPLE = "#0E9AE0";

const notify = (t: string, m: string) => {
  if (Platform.OS === "web") window.alert(`${t}\n\n${m}`);
  else Alert.alert(t, m);
};

/** Redeem diamonds — withdraw, exchange for coins, redeem VIP days. */
export default function RedeemDiamonds() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [diamonds, setDiamonds] = useState(0);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ diamonds: number }>("/market/wallet")
      .then((w) => setDiamonds(w.diamonds))
      .catch(() => {});
  }, [user]);

  const redeemCoins = async () => {
    try {
      const res = await api.post<{ coins_gained: number }>("/market/redeem", { what: "coins" });
      setDiamonds(0);
      api.get<any>("/auth/me").then(setUser).catch(() => {});
      notify("Redeemed! 🪙", `You received ${res.coins_gained} coins (+10% bonus).`);
    } catch (e) {
      notify("Redeem", e instanceof Error ? e.message : "Could not redeem.");
    }
  };

  const redeemVip = async () => {
    router.push("/vip");
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="redeem-diamonds-screen">
      <View style={styles.header}>
        <Pressable testID="rd-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Redeem diamonds</Text>
        <Pressable testID="diamonds-info" hitSlop={8} onPress={() => notify("Diamonds", "Earn diamonds when partners send you gifts and exchange them for coins. VIP subscriptions are purchased through your app store.")}>
          <Ionicons name="information-circle-outline" size={23} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Diamond balance</Text>
          <View style={styles.balRow}>
            <Text style={{ fontSize: 20 }}>💎</Text>
            <Text style={styles.balNum}>{diamonds}</Text>
          </View>
          <View style={styles.withdrawRow}>
            <Text style={styles.dimText}>
              Can be withdrawn for cash or exchanged for Coins
            </Text>
            <Pressable
              testID="rd-withdraw"
              style={styles.withdrawBtn}
              onPress={() => notify("Withdraw", "Cash withdrawal is coming soon!")}
            >
              <Text style={styles.withdrawText}>Withdraw</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>Exchange for Coins</Text>
        <Text style={styles.dimText}>Up to 10% bonus Coins</Text>
        <View style={styles.exchangeRow}>
          <Text style={styles.exchangeHint}>≥100 Diamonds</Text>
          <Pressable testID="rd-redeem-all" style={styles.redeemAllBtn} onPress={redeemCoins}>
            <Text style={styles.redeemAllText}>Redeem all</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>VIP Membership</Text>
        <Text testID="diamonds-vip-store-note" style={styles.dimText}>VIP subscriptions are purchased through your app store in its local currency. Diamonds can still be exchanged for coins.</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          testID="rd-redeem-btn"
          style={styles.redeemBtn}
          onPress={redeemVip}
        >
          <Text style={styles.redeemBtnText}>View VIP subscriptions</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    title: { flex: 1, textAlign: "center", fontFamily: fonts.displayBold, fontSize: 24, color: colors.onSurface },
    body: { padding: spacing.lg, paddingBottom: spacing.xl },
    card: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg },
    cardTitle: { fontFamily: fonts.displayBold, fontSize: 16.5, color: colors.onSurface },
    balRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    balNum: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.onSurface },
    withdrawRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
    dimText: { flex: 1, fontFamily: fonts.text, fontSize: 13.5, color: colors.onSurfaceSecondary, lineHeight: 19 },
    withdrawBtn: { backgroundColor: PURPLE, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 11 },
    withdrawText: { fontFamily: fonts.textBold, fontSize: 14.5, color: "#FFFFFF" },
    section: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.onSurface, marginTop: spacing.xl },
    exchangeRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      marginTop: spacing.sm,
      gap: 10,
    },
    exchangeHint: { flex: 1, fontFamily: fonts.text, fontSize: 15, color: colors.onSurfaceSecondary },
    redeemAllBtn: { backgroundColor: PURPLE, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
    redeemAllText: { fontFamily: fonts.textBold, fontSize: 13.5, color: "#FFFFFF" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: spacing.md },
    vipCard: {
      width: "31%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: "transparent",
      alignItems: "center",
      paddingVertical: 14,
      gap: 4,
    },
    vipCardOn: { borderColor: PURPLE, backgroundColor: "#F5F2FF" },
    vipBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "#F7D66B",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    vipBadgeText: { fontFamily: fonts.textBold, fontSize: 11, color: "#8A6D00", fontStyle: "italic" },
    vipDays: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.onSurface, marginTop: 4 },
    costPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 4,
    },
    costText: { fontFamily: fonts.textBold, fontSize: 12.5, color: "#3B82F6" },
    footer: { padding: spacing.lg, backgroundColor: colors.surfaceSecondary },
    redeemBtn: {
      backgroundColor: colors.surfaceTertiary,
      borderRadius: radius.pill,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    redeemBtnText: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurfaceSecondary },
  });
