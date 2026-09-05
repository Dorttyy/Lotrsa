import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api } from "@/src/utils/api";

const PACKS = [
  { coins: 8, price: "KZT 66.34" },
  { coins: 64, price: "KZT 499" },
  { coins: 324, price: "KZT 2490" },
  { coins: 649, price: "KZT 4990" },
  { coins: 3249, price: "KZT 24990" },
  { coins: 10334, price: "KZT 79990" },
];

const USES = [
  { icon: "gift", title: "Send Gift", sub: "Send gifts to your language partners to express your gratitude. After receiving gifts, partners receive diamonds which can be redeemed for VIP or Coins" },
  { icon: "happy", title: "Stickers", sub: "Get cute stickers to brighten up your language chats" },
  { icon: "flash", title: "Profile Boost", sub: "Boost your profile by 10x so more language partners can see you" },
  { icon: "document-text", title: "Boosted Posts", sub: "Feature your posts so more language partners will see them" },
  { icon: "mic", title: "Stage Pass", sub: "Join your favorite hosts on stage with priority stage requests" },
  { icon: "chatbox-ellipses", title: "Call Subtitles", sub: "Supercharge your learning with instant voicecall subtitles" },
] as const;

const notify = (t: string, m: string) => {
  if (Platform.OS === "web") window.alert(`${t}\n\n${m}`);
  else Alert.alert(t, m);
};

/** Coins hub — balances, top-up packs (MOCK payment), what coins are for. */
export default function Coins() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [wallet, setWallet] = useState<{ coins: number; diamonds: number } | null>(null);
  const [sel, setSel] = useState(8);
  const [agree, setAgree] = useState(true);
  const [buying, setBuying] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api.get<{ coins: number; diamonds: number }>("/market/wallet").then(setWallet).catch(() => {});
    }, [user]),
  );

  const buy = async () => {
    if (!agree) {
      notify("Recharge", "Please agree to the Recharge Service Agreement first.");
      return;
    }
    if (buying) return;
    setBuying(true);
    try {
      const res = await api.post<{ coins: number }>("/market/topup-pack", { coins: sel });
      setWallet((w) => (w ? { ...w, coins: res.coins } : w));
      api.get<any>("/auth/me").then(setUser).catch(() => {});
      notify("Success 🎉", `${sel} coins added to your balance!`);
    } catch (e) {
      notify("Recharge", e instanceof Error ? e.message : "Purchase failed.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="coins-screen">
      <View style={styles.header}>
        <Pressable testID="coins-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Coins</Text>
        <Pressable
          testID="coins-overview-btn"
          onPress={() => router.push("/account-overview")}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="clipboard-text-clock" size={23} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <Pressable testID="coins-balance-card" onPress={() => router.push("/redeem-diamonds")}>
          <LinearGradient
            colors={["#FFD44D", "#F5B700"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHead}>
              <Text style={styles.balanceTitle}>Coins</Text>
              <Ionicons name="chevron-forward" size={18} color="#5B4300" />
            </View>
            <View style={styles.balanceRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.balLine}>
                  <View style={styles.coinDot}>
                    <Text style={styles.coinDotText}>C</Text>
                  </View>
                  <Text style={styles.balNum}>{wallet?.coins ?? user?.coins ?? 0}</Text>
                </View>
                <Text style={styles.balLabel}>Coin balance</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.balLine}>
                  <Text style={{ fontSize: 18 }}>💎</Text>
                  <Text style={styles.balNum}>{wallet?.diamonds ?? 0}</Text>
                </View>
                <Text style={styles.balLabel}>Diamond balance</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Promo */}
        <LinearGradient
          colors={["#FFB020", "#FF8A00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.promoCard}
        >
          <Text style={styles.promoTitle}>
            Top up KZT66.34 and get a KZT598 gift pack
          </Text>
          <View style={styles.promoRow}>
            {["🎟️", "🦄", "💿"].map((e, i) => (
              <View key={i} style={styles.promoItem}>
                <Text style={{ fontSize: 24 }}>{e}</Text>
              </View>
            ))}
          </View>
          <View style={styles.promoLabels}>
            <Text style={styles.promoLabel}>1-hour c…</Text>
            <Text style={styles.promoLabel}>Disco P…</Text>
            <Text style={styles.promoLabel}>Limited …</Text>
          </View>
        </LinearGradient>

        {/* Packages */}
        <View style={styles.grid}>
          {PACKS.map((p) => {
            const on = sel === p.coins;
            return (
              <Pressable
                key={p.coins}
                testID={`coins-pack-${p.coins}`}
                style={[styles.pack, on && styles.packOn]}
                onPress={() => setSel(p.coins)}
              >
                <View style={styles.coinBig}>
                  <Text style={styles.coinBigText}>C</Text>
                </View>
                <Text style={styles.packCoins}>{p.coins}</Text>
                <View style={styles.pricePill}>
                  <Text style={styles.priceText}>{p.price}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Use coins for */}
        <Text style={styles.useTitle}>Use coins for</Text>
        {USES.map((u) => (
          <View key={u.title} style={styles.useRow}>
            <View style={styles.useIcon}>
              <Ionicons name={u.icon as any} size={20} color="#F5B700" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.useName}>{u.title}</Text>
              <Text style={styles.useSub}>{u.sub}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          testID="coins-continue"
          style={[styles.continueBtn, buying && { opacity: 0.6 }]}
          onPress={buy}
          disabled={buying}
        >
          {buying ? (
            <ActivityIndicator color="#5B4300" />
          ) : (
            <Text style={styles.continueText}>Continue</Text>
          )}
        </Pressable>
        <Pressable testID="coins-agree" style={styles.agreeRow} onPress={() => setAgree(!agree)}>
          <View style={[styles.agreeCircle, agree && styles.agreeOn]}>
            {agree && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
          </View>
          <Text style={styles.agreeText}>
            I have read and agree to the{" "}
            <Text style={{ color: "#E5A800" }}>“Recharge Service Agreement”</Text>
          </Text>
        </Pressable>
        <Text style={styles.reminder}>
          Reminder: Minors should be accompanied by/obtain the permission of a
          guardian
        </Text>
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
      backgroundColor: colors.surface,
    },
    title: { flex: 1, textAlign: "center", fontFamily: fonts.displayBold, fontSize: 24, color: colors.onSurface },
    body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.md },
    balanceCard: { borderRadius: 20, padding: spacing.lg },
    balanceHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    balanceTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: "#3B2A00" },
    balanceRow: { flexDirection: "row", marginTop: 12 },
    balLine: { flexDirection: "row", alignItems: "center", gap: 6 },
    coinDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#F5B700",
      borderWidth: 1.5,
      borderColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    coinDotText: { fontFamily: fonts.textBold, fontSize: 10, color: "#FFFFFF" },
    balNum: { fontFamily: fonts.displayBold, fontSize: 24, color: "#211500" },
    balLabel: { fontFamily: fonts.text, fontSize: 13, color: "#7A5D0F", marginTop: 2 },
    promoCard: { borderRadius: 18, padding: spacing.lg },
    promoTitle: { fontFamily: fonts.displayBold, fontSize: 16.5, color: "#FFFFFF", lineHeight: 22 },
    promoRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    promoItem: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    promoLabels: { flexDirection: "row", gap: 10, marginTop: 4 },
    promoLabel: { width: 52, fontFamily: fonts.text, fontSize: 10, color: "#FFF3D6", textAlign: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    pack: {
      width: "31%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: "transparent",
      alignItems: "center",
      paddingVertical: 14,
      gap: 6,
    },
    packOn: { borderColor: "#F5B700", backgroundColor: "#FFFBEE" },
    coinBig: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#F5B700",
      alignItems: "center",
      justifyContent: "center",
    },
    coinBigText: { fontFamily: fonts.textBold, fontSize: 15, color: "#FFFFFF" },
    packCoins: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onSurface },
    pricePill: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    priceText: { fontFamily: fonts.textSemi, fontSize: 11.5, color: colors.onSurface },
    useTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.onSurface, marginTop: spacing.sm },
    useRow: { flexDirection: "row", gap: spacing.md, paddingVertical: 10 },
    useIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: "#FFF3CE",
      alignItems: "center",
      justifyContent: "center",
    },
    useName: { fontFamily: fonts.textBold, fontSize: 15.5, color: colors.onSurface },
    useSub: { fontFamily: fonts.text, fontSize: 12.5, color: colors.onSurfaceSecondary, marginTop: 2, lineHeight: 17 },
    footer: { padding: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.surfaceSecondary },
    continueBtn: {
      backgroundColor: "#F5B700",
      borderRadius: radius.pill,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    continueText: { fontFamily: fonts.textBold, fontSize: 17, color: "#3B2A00" },
    agreeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    agreeCircle: {
      width: 17,
      height: 17,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    agreeOn: { backgroundColor: "#F5B700", borderColor: "#F5B700" },
    agreeText: { flex: 1, fontFamily: fonts.text, fontSize: 12.5, color: colors.onSurface },
    reminder: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 8 },
  });
