import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
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

interface StoreItem {
  id: string;
  type: string;
  cat?: string;
  name: string;
  emoji?: string;
  price: number;
  duration_days?: number | null;
  color?: string;
  active?: boolean;
}

const TABS = [
  { key: "recommend", label: "Recommend" },
  { key: "avatar", label: "Avatar Effect" },
  { key: "bubble", label: "Chat Bubbles" },
  { key: "background", label: "Background" },
  { key: "profile_frame", label: "Profile Frame" },
  { key: "entry", label: "Entry Effects" },
];

const notify = (t: string, m: string) => {
  if (Platform.OS === "web") window.alert(`${t}\n\n${m}`);
  else Alert.alert(t, m);
};

/** Categories store — cosmetics grid with tabs (HelloTalk style). */
export default function Categories() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [coins, setCoins] = useState(0);
  const [tab, setTab] = useState("avatar");

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api
        .get<{ coins: number; items: StoreItem[] }>("/market")
        .then((d) => {
          setCoins(d.coins);
          setItems(d.items.filter((i) => i.cat));
        })
        .catch(() => {});
    }, [user]),
  );

  const visible = useMemo(() => {
    if (tab === "recommend") return items.slice(0, 12);
    return items.filter((i) => (i.cat || i.type) === tab);
  }, [items, tab]);

  const buy = (item: StoreItem) => {
    const doBuy = async () => {
      try {
        const res = await api.post<{ coins: number; user: any }>("/market/buy", {
          item_id: item.id,
        });
        setCoins(res.coins);
        if (res.user) setUser(res.user);
        notify("Purchased! 🎉", `${item.name} is now in your Backpack and equipped.`);
      } catch (e) {
        notify("Store", e instanceof Error ? e.message : "Purchase failed.");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Buy ${item.name} for ${item.price} coins (7 days)?`)) doBuy();
    } else {
      Alert.alert(item.name, `Buy for ${item.price} coins (7 days)?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Buy", onPress: doBuy },
      ]);
    }
  };

  const Preview = ({ item }: { item: StoreItem }) => {
    const cat = item.cat || item.type;
    if (cat === "bubble") {
      return (
        <View style={[styles.bubblePrev, { backgroundColor: item.color || "#EEE" }]}>
          <Text style={styles.bubblePrevText}>Hello!</Text>
        </View>
      );
    }
    if (cat === "background") {
      return <View style={[styles.bgPrev, { backgroundColor: item.color || "#EEE" }]} />;
    }
    if (cat === "profile_frame") {
      return (
        <View style={styles.pfPrev}>
          <View style={[styles.pfBar, { backgroundColor: item.color || "#EEE" }]} />
          <Text style={{ fontSize: 22, marginTop: 4 }}>{item.emoji}</Text>
        </View>
      );
    }
    if (cat === "entry") {
      return (
        <View style={styles.entryPrev}>
          <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
          <Text style={{ fontSize: 15 }}>✨</Text>
        </View>
      );
    }
    // avatar effect ring
    return (
      <View style={[styles.ringPrev, { borderColor: item.color || "#DDD" }]}>
        <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="categories-screen">
      <View style={styles.header}>
        <Pressable testID="cat-back" style={styles.roundBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Categories</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.coinPill}>
          <View style={styles.coinDot}>
            <Text style={styles.coinDotText}>C</Text>
          </View>
          <Text style={styles.coinText}>{coins}</Text>
        </View>
        <Pressable
          testID="cat-backpack-btn"
          style={styles.roundBtn}
          onPress={() => router.push("/backpack")}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="bag-personal" size={21} color={colors.onSurface} />
        </Pressable>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                testID={`cat-tab-${t.key}`}
                style={[styles.tab, on && styles.tabOn]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {tab === "profile_frame" && (
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.onSurfaceSecondary} />
          <Text style={styles.hintText}>For use in Live Rooms and Voice Rooms only</Text>
        </View>
      )}

      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        numColumns={3}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ gap: 10, paddingBottom: 110, paddingTop: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            testID={`store-item-${item.id}`}
            style={styles.card}
            onPress={() => buy(item)}
          >
            <View style={styles.prevBox}>
              <Preview item={item} />
              {item.active && (
                <View style={styles.inUse}>
                  <Text style={styles.inUseText}>In use</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.priceRow}>
              <View style={styles.coinDotSm}>
                <Text style={styles.coinDotSmText}>C</Text>
              </View>
              <Text style={styles.priceText}>
                {item.price}
                <Text style={styles.per}>/7d</Text>
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable testID="cat-home-fab" style={styles.homeFab} onPress={() => router.back()}>
        <MaterialCommunityIcons name="storefront" size={22} color={colors.onSurface} />
        <Text style={styles.homeText}>Home</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    roundBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onSurface },
    coinPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    coinDot: {
      width: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: "#F5B700",
      alignItems: "center",
      justifyContent: "center",
    },
    coinDotText: { fontFamily: fonts.textBold, fontSize: 9, color: "#FFFFFF" },
    coinText: { fontFamily: fonts.textBold, fontSize: 13.5, color: colors.onSurface },
    tabsRow: { gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    tab: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill },
    tabOn: { backgroundColor: colors.surface },
    tabText: { fontFamily: fonts.textSemi, fontSize: 14.5, color: colors.onSurfaceSecondary },
    tabTextOn: { fontFamily: fonts.textBold, color: colors.onSurface },
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: spacing.lg,
      paddingBottom: 4,
    },
    hintText: { fontFamily: fonts.text, fontSize: 12.5, color: colors.onSurfaceSecondary },
    card: { flex: 1 / 3 },
    prevBox: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      height: 108,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    inUse: {
      position: "absolute",
      top: 6,
      left: 6,
      backgroundColor: "#F43F5E",
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    inUseText: { fontFamily: fonts.textBold, fontSize: 9.5, color: "#FFFFFF" },
    itemName: { fontFamily: fonts.textSemi, fontSize: 13.5, color: colors.onSurface, marginTop: 6 },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    coinDotSm: {
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor: "#F5B700",
      alignItems: "center",
      justifyContent: "center",
    },
    coinDotSmText: { fontFamily: fonts.textBold, fontSize: 7.5, color: "#FFFFFF" },
    priceText: { fontFamily: fonts.textBold, fontSize: 12.5, color: colors.onSurface },
    per: { fontFamily: fonts.text, fontSize: 11.5, color: colors.onSurfaceSecondary },
    ringPrev: {
      width: 66,
      height: 66,
      borderRadius: 33,
      borderWidth: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    bubblePrev: {
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    bubblePrevText: { fontFamily: fonts.textBold, fontSize: 14, color: "#FFFFFF" },
    bgPrev: { width: "78%", height: 76, borderRadius: 10 },
    pfPrev: { width: "80%", alignItems: "center" },
    pfBar: { alignSelf: "stretch", height: 8, borderRadius: 4 },
    entryPrev: { flexDirection: "row", alignItems: "center", gap: 4 },
    homeFab: {
      position: "absolute",
      right: 18,
      bottom: 26,
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 5,
    },
    homeText: { fontFamily: fonts.textSemi, fontSize: 10.5, color: colors.onSurface },
  });
