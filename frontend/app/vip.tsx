import React, { useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { PurchasesPackage } from "react-native-purchases";
import { isTestStore, livePurchasesReady, useSubscription } from "@/src/billing/revenuecat";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { AppTitle } from "@/src/ui/AppTitle";
import { Ionicons } from "@/src/ui/icons";
import { fonts, ThemeColors } from "@/src/theme";

export default function VipScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = styles(colors);
  const billing = useSubscription();
  const [chosen, setChosen] = useState<PurchasesPackage | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = billing.packages.find(p => p.identifier === chosen?.identifier) || billing.packages[0];
  const busy = billing.purchasing || billing.restoring;

  const purchase = async () => {
    setConfirmation(false); setMessage(""); setError("");
    if (!selected) return;
    try {
      const info = await billing.purchase(selected);
      if (info.entitlements.active.pro) setMessage("Your subscription is confirmed by the store.");
      else setError("The store receipt did not activate the configured VIP entitlement. Please do not purchase again—contact support to resolve the subscription setup.");
    } catch (e: any) { if (!e.userCancelled) setError(e.message || "The purchase could not be completed."); }
  };
  const restore = async () => {
    setError(""); setMessage("");
    try { const info = await billing.restore(); if (info.entitlements.active.pro) setMessage("Your active subscription was restored."); else if (info.activeSubscriptions.length) setError("A store subscription exists, but VIP activation is not linked correctly. Please contact support rather than purchasing again."); else setMessage("No active subscription was found for this store account."); }
    catch (e: any) { setError(e.message || "Could not restore purchases."); }
  };

  return <SafeAreaView testID="vip-store-screen" style={s.root}>
    <View style={s.header}><Pressable testID="vip-store-back" accessibilityLabel="Back" onPress={() => router.back()} style={s.iconButton}><Ionicons name="chevron-back" size={24} color={colors.onSurface} /></Pressable><AppTitle testID="vip-store-title" variant="page" style={s.title}>VIP Membership</AppTitle></View>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}><View style={s.crown}><Ionicons name="diamond" size={32} color={colors.brand} /></View><Text testID="vip-store-headline" style={s.headline}>More room to connect.</Text><Text style={s.copy}>Your membership, managed securely through your app store.</Text></View>
      {isTestStore && <View testID="vip-test-store-banner" style={s.notice}><Ionicons name="information-circle-outline" size={22} color={colors.brand} /><Text style={s.noticeText}>SIMULATED TEST STORE · No real payment. Actual purchases require a configured App Store or Google Play build.</Text></View>}
      {!isTestStore && !livePurchasesReady && <Text testID="vip-live-setup-required" style={s.copy}>Live purchases are not enabled yet. Store verification and secure membership activation must be configured first.</Text>}
      {billing.isSubscribed && <View testID="vip-subscription-active" style={s.active}><Ionicons name="checkmark-circle" size={22} color={colors.success} /><Text style={s.activeText}>Store subscription active</Text></View>}
      {billing.hasUnmatchedSubscription && <Text testID="vip-entitlement-setup-error" style={s.error}>Your store reports an active subscription, but VIP activation is not linked correctly. Please do not buy again. Contact support to resolve the setup.</Text>}
      {!user ? <Pressable testID="vip-store-login" style={s.primary} onPress={() => router.push("/auth?mode=login")}><Text style={s.primaryText}>Sign in to continue</Text></Pressable> : billing.loading ? <ActivityIndicator testID="vip-store-loading" color={colors.brand} /> : billing.packages.length === 0 ? <View style={s.empty}><Text testID="vip-store-unavailable" style={s.copy}>Subscription options are unavailable right now. Please try again later.</Text><Pressable testID="vip-store-retry" onPress={billing.refresh} style={s.iconButton}><Text style={s.link}>Retry</Text></Pressable></View> : billing.packages.map(item => <Pressable key={item.identifier} testID={`vip-package-${item.identifier.replace(/\$/g, "")}`} onPress={() => setChosen(item)} disabled={busy} style={[s.plan, selected?.identifier === item.identifier && s.selected]}>
        <View style={s.planInfo}><Text style={s.planTitle}>{item.product.title || item.identifier}</Text><Text style={s.copy}>{item.product.description}</Text></View><Text testID={`vip-price-${item.identifier.replace(/\$/g, "")}`} style={s.price}>{item.product.priceString}</Text><Ionicons name={selected?.identifier === item.identifier ? "radio-button-on" : "radio-button-off"} size={20} color={colors.brand} />
      </Pressable>)}
      {!!(billing.error || error) && <Text testID="vip-store-error" style={s.error}>{error || billing.error}</Text>}
      {!!message && <Text testID="vip-store-message" style={s.copy}>{message}</Text>}
      <Text testID="vip-store-currency-note" style={s.copy}>Prices and currency come from your store account’s country, not your profile country. Subscription terms and any eligible trial appear at checkout.</Text>
      <Text testID="vip-store-renewal-note" style={s.legal}>Subscriptions renew automatically unless cancelled through the store. Review the price and renewal terms before confirming.</Text>
      {billing.customerInfo?.managementURL && <Pressable testID="vip-manage-subscription" onPress={() => Linking.openURL(billing.customerInfo!.managementURL!).catch(() => setError("Open subscription settings in your app store."))} style={s.restore}><Text style={s.link}>Manage subscription</Text></Pressable>}
      <Pressable testID="vip-restore-purchases" disabled={!billing.identityReady || busy} onPress={restore} style={s.restore}>{billing.restoring ? <ActivityIndicator color={colors.brand} /> : <Text style={[s.link, !billing.identityReady && s.disabled]}>Restore purchases</Text>}</Pressable>
    </ScrollView>
    {user && selected && !billing.isSubscribed && !billing.hasUnmatchedSubscription && <View style={s.footer}><Pressable testID="vip-buy-subscription" disabled={!billing.identityReady || busy || (!isTestStore && !livePurchasesReady)} onPress={() => isTestStore ? setConfirmation(true) : void purchase()} style={[s.primary, (!billing.identityReady || busy || (!isTestStore && !livePurchasesReady)) && s.disabled]}>{billing.purchasing ? <ActivityIndicator color={colors.onBrand} /> : <Text style={s.primaryText}>{isTestStore ? "Test purchase" : "Continue"} · {selected.product.priceString}</Text>}</Pressable></View>}
    <Modal visible={confirmation} transparent animationType="fade" onRequestClose={() => setConfirmation(false)}><View style={[s.modalOverlay, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24 }]}><View testID="vip-test-confirmation" style={s.modalCard}><Text style={s.planTitle}>Simulate this purchase?</Text><Text style={s.copy}>This is the Test Store. No money will be charged. The test subscription is linked to your signed-in account.</Text><Pressable testID="vip-test-confirm" onPress={purchase} style={s.primary}><Text style={s.primaryText}>Continue in Test Store</Text></Pressable><Pressable testID="vip-test-cancel" onPress={() => setConfirmation(false)} style={s.restore}><Text style={s.link}>Cancel</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.surface }, header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }, title: { color: c.onSurface, flex: 1 }, iconButton: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  content: { padding: 20, paddingBottom: 28, gap: 20 }, hero: { alignItems: "center", paddingVertical: 18, gap: 16 }, crown: { width: 76, height: 76, borderRadius: 24, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" }, headline: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, color: c.onSurface, textAlign: "center" }, copy: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.onSurfaceSecondary },
  notice: { flexDirection: "row", gap: 10, padding: 16, borderRadius: 16, backgroundColor: c.brandTertiary }, noticeText: { flex: 1, fontFamily: fonts.text, fontSize: 12, lineHeight: 19, color: c.onSurfaceSecondary }, active: { flexDirection: "row", gap: 8, alignItems: "center" }, activeText: { color: c.success, fontFamily: fonts.textBold, fontSize: 15 },
  plan: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: c.border, padding: 16, borderRadius: 20 }, selected: { borderColor: c.brand, backgroundColor: c.brandTertiary }, planInfo: { flex: 1, minWidth: 0, gap: 5 }, planTitle: { fontFamily: fonts.textBold, fontSize: 17, color: c.onSurface }, price: { fontFamily: fonts.textBold, fontSize: 17, color: c.onSurface }, empty: { padding: 20, gap: 12, borderRadius: 16, backgroundColor: c.surfaceSecondary },
  error: { color: c.error, fontFamily: fonts.text, fontSize: 13, lineHeight: 20 }, legal: { color: c.onSurfaceSecondary, fontFamily: fonts.text, fontSize: 11, lineHeight: 18 }, restore: { minHeight: 48, justifyContent: "center", alignItems: "center" }, link: { color: c.brand, fontFamily: fonts.textBold, fontSize: 14 },
  footer: { padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }, primary: { minHeight: 54, borderRadius: 28, backgroundColor: c.brand, justifyContent: "center", alignItems: "center", padding: 12 }, primaryText: { fontFamily: fonts.textBold, fontSize: 15, color: c.onBrand, textAlign: "center" }, disabled: { opacity: 0.45 }, modalOverlay: { flex: 1, backgroundColor: "rgba(5,16,30,0.6)", justifyContent: "center", paddingHorizontal: 24 }, modalCard: { padding: 24, gap: 20, borderRadius: 24, backgroundColor: c.surface },
});