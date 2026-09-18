import { Ionicons } from "@/src/ui/icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PartnerCard } from "@/src/components/PartnerCard";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";
import { api, Conversation, User } from "@/src/utils/api";

const LEVELS = ["Beginner", "Elementary", "Intermediate", "Advanced", "Proficient"];

/** Custom Search results — partners filtered by the Filter sheet params. */
export default function CustomSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const p = useLocalSearchParams<Record<string, string>>();
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "serious">("all");

  useEffect(() => {
    if (!user) return;
    // Explicit filters (location/gender/age) use the backend's search mode,
    // which bypasses language matching and scans all users.
    const qs = new URLSearchParams();
    if (p.region) qs.set("location", p.region);
    if (p.gender === "male" || p.gender === "female") qs.set("gender", p.gender);
    api
      .get<User[]>(`/users/partners${qs.toString() ? `?${qs.toString()}` : ""}`)
      .then(setPartners)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, p.region, p.gender]);

  const filtered = useMemo(() => {
    const lvMin = parseInt(p.levelMin || "0", 10);
    const lvMax = parseInt(p.levelMax || "4", 10);
    const aMin = parseInt(p.ageMin || "18", 10);
    const aMax = parseInt(p.ageMax || "90", 10);
    let list = partners.filter((u) => {
      if (p.native && p.native !== "any" && u.native_language !== p.native) return false;
      const learn = u.learning_languages?.[0] || u.learning_language;
      if (p.learning && p.learning !== "any" && learn !== p.learning) return false;
      if (u.age && (u.age < aMin || (aMax < 90 && u.age > aMax))) return false;
      if (p.gender && p.gender !== "all" && u.gender !== p.gender) return false;
      const lv = LEVELS.indexOf(u.proficiency || "");
      if (lv >= 0 && (lv < lvMin || lv > lvMax)) return false;
      const where = `${u.country || ""}`.toLowerCase();
      if (p.region && !where.includes(p.region.toLowerCase())) return false;
      // City is a soft filter — profiles rarely store a city, so only exclude
      // users whose stored city clearly differs.
      const uCity = String((u as { city?: string }).city || "").toLowerCase();
      if (p.city && uCity && !uCity.includes(p.city.toLowerCase())) return false;
      return true;
    });
    if (tab === "serious") {
      list = list.filter((u) => !!u.bio || u.is_vip);
    }
    if (p.nearby === "1" && user?.country) {
      list = [...list].sort(
        (a, b) =>
          Number(b.country === user.country) - Number(a.country === user.country),
      );
    }
    return list;
  }, [partners, p, tab, user?.country]);

  const openChat = async (partner: User) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const conv = await api.post<Conversation>("/chats", {
        partner_id: partner.id,
      });
      router.push(`/chat/${conv.id}`);
    } catch (e) {
      Alert.alert(
        "Message limit",
        e instanceof Error ? e.message : "Could not start the chat.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="custom-search-screen">
      <View style={styles.header}>
        <Pressable testID="cs-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <AppTitle variant="navigation" testID="custom-search-header-title" style={styles.title}>Custom Search</AppTitle>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabsRow}>
        {(["all", "serious"] as const).map((t) => (
          <Pressable
            key={t}
            testID={`cs-tab-${t}`}
            style={[styles.tab, tab === t && styles.tabOn]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === "all" ? "All" : "Serious Learners"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No partners match these filters.</Text>
          }
          renderItem={({ item }) => (
            <PartnerCard
              item={item}
              me={user}
              testIDPrefix="cs"
              onPress={() => router.push(`/user/${item.id}`)}
              onMessage={() => openChat(item)}
            />
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
    title: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    tabsRow: {
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    tab: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: radius.pill,
    },
    tabOn: { backgroundColor: colors.surfaceSecondary },
    tabText: { fontFamily: fonts.textSemi, fontSize: 15, color: colors.onSurfaceSecondary },
    tabTextOn: { fontFamily: fonts.textBold, color: colors.onSurface },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.sm },
    empty: {
      textAlign: "center",
      fontFamily: fonts.text,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
      marginTop: 50,
    },
    sep: { height: spacing.lg },
  });
