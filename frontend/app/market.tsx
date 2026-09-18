import { Ionicons } from "@/src/ui/icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "@/src/components/layout/SafeAreaView";

import { BackButton } from "@/src/components/BackButton";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, shadow, spacing, ThemeColors } from "@/src/theme";
import { api, MarketItem, User } from "@/src/utils/api";

const SECTIONS: { type: MarketItem["type"]; title: string; sub: string }[] = [
  { type: "badge", title: "Name Badges", sub: "Show off next to your name — 7 days" },
  { type: "frame", title: "Avatar Rings", sub: "Beautiful ring around your avatar — 7 days" },
];

const TOPUP_AMOUNTS: number[] = [];

export default function Market() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const toppingUp: number | null = null;

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ coins: number; items: MarketItem[] }>("/market");
      setCoins(d.coins);
      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const buy = async (item: MarketItem) => {
    if (buying) return;
    if (coins < item.price) {
      Alert.alert("Not enough coins", "You need more coins to buy this item.");
      return;
    }
    setBuying(item.id);
    try {
      const res = await api.post<{ coins: number; user: User }>("/market/buy", {
        item_id: item.id,
      });
      setCoins(res.coins);
      setUser(res.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    } catch (e) {
      Alert.alert("Purchase", e instanceof Error ? e.message : "Could not buy.");
    } finally {
      setBuying(null);
    }
  };

  const topup = async () => {
    setTopupOpen(false);
    router.push("/coins");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="market-screen">
      <View style={styles.header}>
        <BackButton testID="market-back-btn" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Marketplace</Text>
          <Text style={styles.headerSub}>Spend your coins on gifts, badges & rings</Text>
        </View>
        <Pressable
          style={styles.wallet}
          testID="wallet-balance"
          onPress={() => router.push("/coins")}
        >
          <Text style={styles.walletCoin}>🪙</Text>
          <Text style={styles.walletText}>{coins}</Text>
          <View style={styles.walletPlus}>
            <Ionicons name="add" size={12} color={colors.onBrand} />
          </View>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.card}><Text style={styles.cardName}>VIP Membership</Text><Text style={styles.cardDesc}>Subscriptions are purchased securely through your app store.</Text><Pressable testID="market-vip-store" onPress={() => router.push("/vip")} style={styles.buyBtn}><Text style={styles.buyText}>View VIP plans</Text></Pressable></View>
          {SECTIONS.map((section) => (
            <View key={section.type}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSub}>{section.sub}</Text>
              <View style={styles.grid}>
                {items
                  .filter((i) => i.type === section.type)
                  .map((item) => (
                    <View key={item.id} style={styles.card}>
                      <Text style={styles.cardEmoji}>{item.emoji}</Text>
                      <Text style={styles.cardName}>{item.name}</Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {item.desc}
                      </Text>
                      {item.active ? (
                        <View style={styles.activePill} testID={`market-active-${item.id}`}>
                          <Ionicons name="checkmark" size={13} color="#FFF" />
                          <Text style={styles.activeText}>Active</Text>
                        </View>
                      ) : (
                        <Pressable
                          testID={`market-buy-${item.id}`}
                          style={[
                            styles.buyBtn,
                            coins < item.price && { opacity: 0.5 },
                          ]}
                          onPress={() => buy(item)}
                          disabled={buying === item.id}
                        >
                          {buying === item.id ? (
                            <ActivityIndicator size="small" color={colors.onBrand} />
                          ) : (
                            <Text style={styles.buyText}>🪙 {item.price}</Text>
                          )}
                        </Pressable>
                      )}
                    </View>
                  ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={topupOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTopupOpen(false)}
      >
        <View style={styles.modalBackdrop}>
        <BoundedSheet testID="market-topup-sheet" style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Coins</Text>
              <Pressable
                testID="topup-close-btn"
                onPress={() => setTopupOpen(false)}
              >
                <Ionicons name="close" size={24} color={colors.onSurfaceSecondary} />
              </Pressable>
            </View>
            <View style={styles.demoNote}>
              <Ionicons name="information-circle" size={16} color={colors.brand} />
              <Text style={styles.demoNoteText}>
                Coin purchases require verified store billing.
              </Text>
            </View>
            <View style={styles.amountGrid}>
              {TOPUP_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  testID={`topup-${amount}`}
                  style={styles.amountBtn}
                  onPress={topup}
                  disabled={toppingUp !== null}
                >
                  {toppingUp === amount ? (
                    <ActivityIndicator size="small" color={colors.onBrand} />
                  ) : (
                    <Text style={styles.amountText}>🪙 {amount}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </BoundedSheet>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurface },
    headerSub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    wallet: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadow.card,
    },
    walletCoin: { fontSize: 16 },
    walletText: { fontFamily: fonts.display, fontSize: 16, color: colors.onSurface },
    walletPlus: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 2,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.45)",
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.xl,
      gap: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
    demoNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.brandTertiary,
      borderRadius: radius.sm,
      padding: spacing.md,
    },
    demoNoteText: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: colors.onBrandTertiary,
    },
    amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    amountBtn: {
      width: "47.5%",
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    amountText: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onBrand },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
    sectionTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 17,
      color: colors.onSurface,
      marginTop: spacing.md,
    },
    sectionSub: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginBottom: spacing.md,
      marginTop: 2,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    card: {
      width: "47.5%",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: 6,
      alignItems: "center",
      ...shadow.card,
    },
    cardEmoji: { fontSize: 32 },
    cardName: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurface,
      textAlign: "center",
    },
    cardDesc: {
      fontFamily: fonts.text,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
      minHeight: 28,
    },
    buyBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minWidth: 84,
      alignItems: "center",
    },
    buyText: { fontFamily: fonts.textBold, fontSize: 13, color: colors.onBrand },
    activePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#22C55E",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    activeText: { fontFamily: fonts.textBold, fontSize: 12, color: "#FFF" },
  });
