import { Ionicons } from "@/src/ui/icons";
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

interface PackItem {
  id: string;
  type: string;
  cat?: string;
  name: string;
  emoji?: string;
  color?: string;
  expires_at?: string | null;
  expired: boolean;
  in_use: boolean;
}

const TABS = [
  { key: "avatar", label: "Avatar Effect" },
  { key: "bubble", label: "Chat Bubbles" },
  { key: "background", label: "Background" },
];

const notify = (t: string, m: string) => {
  if (Platform.OS === "web") window.alert(`${t}\n\n${m}`);
  else Alert.alert(t, m);
};

/** Backpack — items you bought or were rewarded; equip or see expiry. */
export default function Backpack() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<PackItem[]>([]);
  const [tab, setTab] = useState("avatar");

  const load = useCallback(() => {
    if (!user) return;
    api
      .get<{ items: PackItem[] }>("/market/backpack")
      .then((d) => setItems(d.items))
      .catch(() => {});
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = items.filter((i) => {
    const cat = i.cat || i.type;
    if (tab === "avatar") return cat === "avatar" || i.type === "frame";
    return cat === tab;
  });

  const equipItem = async (item: PackItem) => {
    if (item.expired) {
      notify("Expired", "This item has expired — you can buy it again in the store.");
      return;
    }
    try {
      await api.post("/market/use", { item_id: item.id });
      api.get<any>("/auth/me").then(setUser).catch(() => {});
      load();
      notify("Equipped! ✨", `${item.name} is now in use.`);
    } catch (e) {
      notify("Backpack", e instanceof Error ? e.message : "Could not equip.");
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="backpack-screen">
      <View style={styles.header}>
        <Pressable testID="bp-back" style={styles.roundBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Backpack</Text>
        <View style={{ width: 38 }} />
      </View>

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
              testID={`bp-tab-${t.key}`}
              style={[styles.tab, on && styles.tabOn]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={visible}
        keyExtractor={(i, idx) => `${i.id}-${idx}`}
        numColumns={3}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ gap: 10, paddingBottom: 40, paddingTop: spacing.sm, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ fontSize: 40 }}>🎒</Text>
            <Text style={styles.emptyText}>
              Nothing here yet — buy items in the Categories store or earn them
              as rewards!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`bp-item-${item.id}`}
            style={styles.card}
            onPress={() => equipItem(item)}
          >
            <View style={[styles.prevBox, item.expired && { opacity: 0.55 }]}>
              {item.type === "frame" || (item.cat || "") === "avatar" ? (
                <View style={[styles.ringPrev, { borderColor: item.color || "#DDD" }]}>
                  <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                </View>
              ) : (item.cat || item.type) === "bubble" ? (
                <View style={[styles.bubblePrev, { backgroundColor: item.color || "#EEE" }]}>
                  <Text style={styles.bubblePrevText}>Hello!</Text>
                </View>
              ) : (
                <View style={[styles.bgPrev, { backgroundColor: item.color || "#EEE" }]} />
              )}
              {item.in_use && (
                <View style={styles.inUse}>
                  <Text style={styles.inUseText}>In use</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.status, item.expired && { color: colors.onSurfaceSecondary }]}>
              {item.expired
                ? "Expired"
                : item.expires_at
                  ? `Until ${new Date(item.expires_at).toLocaleDateString()}`
                  : "Permanent"}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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
    title: { flex: 1, fontFamily: fonts.displayBold, fontSize: 24, color: colors.onSurface },
    tabsRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    tab: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.pill },
    tabOn: { backgroundColor: colors.surface },
    tabText: { fontFamily: fonts.textSemi, fontSize: 14.5, color: colors.onSurfaceSecondary },
    tabTextOn: { fontFamily: fonts.textBold, color: colors.onSurface },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 44, minHeight: 280 },
    emptyText: { fontFamily: fonts.text, fontSize: 13.5, color: colors.onSurfaceSecondary, textAlign: "center", lineHeight: 19 },
    card: { flex: 1 / 3 },
    prevBox: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      height: 104,
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
    status: { fontFamily: fonts.text, fontSize: 11.5, color: colors.onSurfaceSecondary, marginTop: 1 },
    ringPrev: {
      width: 62,
      height: 62,
      borderRadius: 31,
      borderWidth: 3.5,
      alignItems: "center",
      justifyContent: "center",
    },
    bubblePrev: { borderRadius: 13, paddingHorizontal: 15, paddingVertical: 10 },
    bubblePrevText: { fontFamily: fonts.textBold, fontSize: 13, color: "#FFFFFF" },
    bgPrev: { width: "76%", height: 70, borderRadius: 10 },
  });
