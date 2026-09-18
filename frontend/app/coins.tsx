import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, ThemeColors } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";
import { Ionicons } from "@/src/ui/icons";
import { api } from "@/src/utils/api";

export default function Coins() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = styles(colors);
  const [wallet, setWallet] = useState<{ coins: number; diamonds: number } | null>(null);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    let live = true;
    api.get<{ coins: number; diamonds: number }>("/market/wallet").then(data => { if (live) { setWallet(data); setError(""); } }).catch(() => { if (live) setError("Could not refresh your wallet."); });
    return () => { live = false; };
  }, [user?.id]));
  return <SafeAreaView testID="coins-screen" style={s.root}>
    <View style={s.header}><Pressable testID="coins-back" accessibilityLabel="Back" onPress={() => router.back()} style={s.iconBtn}><Ionicons name="chevron-back" size={24} color={colors.onSurface} /></Pressable><AppTitle variant="page" testID="coins-title" style={s.title}>Coins</AppTitle><Pressable testID="coins-overview-btn" accessibilityLabel="Wallet history" style={s.iconBtn} onPress={() => router.push("/account-overview")}><Ionicons name="time-outline" size={24} color={colors.onSurface} /></Pressable></View>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.balanceCard}><Text style={s.eyebrow}>YOUR WALLET</Text><Text testID="coins-balance-value" style={s.balance}>{wallet?.coins ?? user?.coins ?? 0}</Text><Text style={s.copy}>Coins available to spend</Text><Pressable testID="coins-balance-card" style={s.diamonds} onPress={() => router.push("/redeem-diamonds")}><Ionicons name="diamond" color={colors.brand} size={19} /><Text testID="diamonds-balance-value" style={s.subtitle}>{wallet?.diamonds ?? 0} diamonds</Text><Ionicons name="chevron-forward" color={colors.brand} size={18} /></Pressable></View>
      {!!error && <Text testID="coins-wallet-error" style={s.error}>{error}</Text>}
      <View testID="coins-store-setup-required" style={s.notice}><Ionicons name="shield-checkmark-outline" color={colors.brand} size={26} /><Text style={s.subtitle}>Only verified store purchases</Text><Text style={s.copy}>Coin packs will appear when their Google Play / App Store products and secure purchase verification are configured. No payment or coins are added here until then.</Text><Text testID="coins-local-currency-note" style={s.copy}>Store prices will use your store account’s local currency. Your coin balance stays in coins—not a converted cash amount.</Text></View>
      <Text style={s.section}>Use your coins</Text>
      {[{ icon: "gift", title: "Gifts", text: "Choose a conversation and send a gift to your partner.", route: "/(tabs)/chats" }, { icon: "happy", title: "Stickers & profile items", text: "Personalize your conversations and profile.", route: "/store" }].map(item => <Pressable key={item.icon} testID={`coins-use-${item.icon}`} onPress={() => router.push(item.route as any)} style={s.row}><View style={s.itemIcon}><Ionicons name={item.icon as any} size={22} color={colors.brand} /></View><View style={s.flex}><Text style={s.subtitle}>{item.title}</Text><Text style={s.copy}>{item.text}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.onSurfaceSecondary} /></Pressable>)}
      <Pressable testID="coins-view-vip" onPress={() => router.push("/vip")} style={s.vip}><Text style={s.link}>Looking for VIP? View store subscriptions</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.surface }, header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }, title: { flex: 1, color: c.onSurface }, iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, content: { padding: 20, gap: 24, paddingBottom: 32 },
  balanceCard: { padding: 24, borderRadius: 24, backgroundColor: c.brandTertiary, gap: 8 }, eyebrow: { color: c.onBrandSecondary, fontFamily: fonts.textBold, fontSize: 10, letterSpacing: 1.5 }, balance: { fontFamily: fonts.displayBold, fontSize: 44, color: c.onSurface }, copy: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.onSurfaceSecondary }, diamonds: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }, subtitle: { color: c.onSurface, fontFamily: fonts.textBold, fontSize: 15 }, notice: { borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 20, gap: 12 },
  section: { color: c.onSurface, fontFamily: fonts.displaySemi, fontSize: 21 }, row: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 72 }, flex: { flex: 1, gap: 4 }, itemIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: c.brandTertiary, justifyContent: "center", alignItems: "center" }, vip: { minHeight: 48, justifyContent: "center" }, link: { fontFamily: fonts.textBold, fontSize: 14, color: c.brand }, error: { fontFamily: fonts.text, fontSize: 13, color: c.error },
});