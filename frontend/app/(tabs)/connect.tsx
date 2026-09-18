import { Ionicons } from "@/src/ui/icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { FlagIcon } from "@/src/components/FlagIcon";
import { IconChip } from "@/src/components/IconChip";
import { PartnerCard } from "@/src/components/PartnerCard";
import { LANGUAGES, langName } from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";
import { api, Conversation, User } from "@/src/utils/api";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "serious", label: "Serious Learners" },
  { key: "nearby", label: "Nearby" },
  { key: "city", label: "City" },
  { key: "gender", label: "Gender" },
  { key: "practice", label: "Paid Practice" },
];

export default function Connect() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("match");
  const [category, setCategory] = useState<string>("all");
  const [genderPick, setGenderPick] = useState<"any" | "male" | "female">("any");
  const [cityPick, setCityPick] = useState<string | null>(null);
  const [catSheet, setCatSheet] = useState<null | "gender" | "city">(null);
  const [addLangOpen, setAddLangOpen] = useState(false);
  const [addingLang, setAddingLang] = useState(false);
  const vipBusy = false;

  const load = useCallback(async () => {
    if (!user) return; // wait for auth to hydrate (fresh page loads)
    setError(null);
    try {
      const params = new URLSearchParams();
      // Category tabs that need a broader pool than language-matching:
      if (category === "practice") {
        params.set("paid_practice", "true");
      } else if (category === "nearby" && user.country) {
        params.set("location", user.country);
      } else if (category === "city" && cityPick) {
        params.set("location", cityPick);
      } else if (category === "gender" && genderPick !== "any") {
        params.set("gender", genderPick);
      } else if (filter !== "match") {
        params.set("language", filter);
      }
      const qs = params.toString();
      const data = await api.get<User[]>(`/users/partners${qs ? `?${qs}` : ""}`);
      setPartners(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load partners");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, category, cityPick, genderPick, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Category tabs (All / Serious Learners / Nearby / City / Gender) ──
  const onCategoryPress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(key);
    if (key === "gender") setCatSheet("gender");
    if (key === "city") setCatSheet("city");
  };

  const visiblePartners = React.useMemo(() => {
    switch (category) {
      case "practice":
        // API already returns only paid-practice partners.
        return partners;
      case "serious":
        // Consistent with the "Serious learner" card tag: 3+ day streak.
        return partners.filter((p) => (p.streak_count || 0) >= 3);
      case "nearby":
        return partners.filter(
          (p) => !!p.country && p.country === user?.country,
        );
      case "city":
        return cityPick
          ? partners.filter((p) => p.country === cityPick)
          : partners;
      case "gender":
        // API already filters by gender (bypasses privacy-hidden values).
        return partners;
      default:
        return partners;
    }
  }, [partners, category, cityPick, user?.country]);

  const partnerCountries = React.useMemo(
    () =>
      Array.from(
        new Set(partners.map((p) => p.country).filter(Boolean) as string[]),
      ).sort(),
    [partners],
  );

  const categoryLabel = (c: { key: string; label: string }) => {
    if (c.key === "gender" && genderPick !== "any")
      return genderPick === "male" ? "Gender: Male" : "Gender: Female";
    if (c.key === "city" && cityPick) return cityPick;
    return c.label;
  };

  const emptyHint = (() => {
    switch (category) {
      case "practice":
        return "No paid-practice partners available right now.";
      case "serious":
        return "No partners with a 3+ day streak right now.";
      case "nearby":
        return user?.country
          ? `No partners from ${user.country} right now.`
          : "Set your country to see nearby partners.";
      case "city":
        return cityPick
          ? `No partners from ${cityPick} right now.`
          : "No partners found. Try a different filter!";
      case "gender":
        return genderPick === "any"
          ? "No partners found. Try a different filter!"
          : `No ${genderPick} partners right now.`;
      default:
        return "No partners found. Try a different filter!";
    }
  })();

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

  const myLearning = (
    user?.learning_languages?.length
      ? user.learning_languages
      : user?.learning_language
        ? [user.learning_language]
        : []
  ).slice(0, 3);

  const filterChips = [
    { key: "match", label: "Best Match" },
    ...myLearning.map((c) => ({ key: c, label: langName(c) })),
  ];

  const needsVipForMore = !user?.is_vip && myLearning.length >= 1;

  const addLanguage = async (code: string) => {
    if (addingLang) return;
    setAddingLang(true);
    try {
      const next = [...myLearning, code].slice(0, 3);
      const updated = await api.put<User>("/users/me", {
        learning_languages: next,
        learning_language: next[0],
      });
      setUser(updated);
      setAddLangOpen(false);
    } catch {
      Alert.alert("Language", "Could not add the language. Try again.");
    } finally {
      setAddingLang(false);
    }
  };

  const upgradeVip = async () => {
    if (vipBusy) return;
    setAddLangOpen(false);
    router.push("/vip");
  };

  const renderCard = ({ item }: { item: User }) => (
    <PartnerCard
      item={item}
      me={user}
      onPress={() => router.push(`/user/${item.id}`)}
      onMessage={() => openChat(item)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="connect-screen">
      {/* Header */}
      <View style={styles.header}>
        <AppTitle variant="page" testID="connect-header-title" style={styles.headerTitle}>Connect</AppTitle>
        <View style={styles.headerActions}>
          <IconChip
            testID="connect-boost-btn"
            tint="brand"
            icon="flash"
            size={18}
            onPress={() => router.push("/boost-center")}
          />
          <IconChip
            testID="connect-filter-btn"
            tint="brand"
            mci="tune-variant"
            size={18}
            onPress={() => router.push("/connect-filter")}
          />
        </View>
      </View>

      {/* Category tabs + language chips — pinned; only the list scrolls. */}
      <View>
        <View>
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
            >
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                const hasCaret = c.key === "gender" || c.key === "city";
                return (
                  <Pressable
                    key={c.key}
                    testID={`connect-cat-${c.key}`}
                    onPress={() => onCategoryPress(c.key)}
                    style={[styles.catItem, active && styles.catItemActive]}
                  >
                    <Text style={[styles.catText, active && styles.catTextActive]}>
                      {categoryLabel(c)}
                    </Text>
                    {hasCaret && (
                      <Ionicons
                        name="chevron-down"
                        size={12}
                        color={active ? colors.onSurface : colors.onSurfaceSecondary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {category === "practice" ? (
            <Pressable
              testID="paid-practice-banner"
              style={styles.ppBanner}
              onPress={() => router.push("/paid-practice-overview")}
            >
              <View style={styles.ppBannerIcon}>
                <Ionicons name="cash" size={20} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ppBannerTitle}>Introducing Paid Practice</Text>
                <Text style={styles.ppBannerSub}>
                  Get more replies and have better conversations!
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B45309" />
            </Pressable>
          ) : (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {filterChips.map((chip) => {
                const active = filter === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    testID={`connect-filter-${chip.key}`}
                    onPress={() => setFilter(chip.key)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    {chip.key !== "match" && <FlagIcon code={chip.key} size={14} />}
                    <Text
                      style={[styles.filterText, active && styles.filterTextActive]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
              {myLearning.length < 3 && (
                <Pressable
                  testID="connect-add-language-btn"
                  onPress={() => setAddLangOpen(true)}
                  style={[styles.filterChip, styles.addChip]}
                >
                  <Ionicons name="add" size={18} color={colors.brand} />
                </Pressable>
              )}
            </ScrollView>
          </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable testID="connect-retry-btn" onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visiblePartners}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="earth-outline" size={56} color={colors.borderStrong} />
              <Text style={styles.emptyText}>{emptyHint}</Text>
            </View>
          }
          renderItem={renderCard}
        />
      )}

      {/* Add language / VIP modal */}
      <Modal
        visible={addLangOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAddLangOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {needsVipForMore ? "VIP Feature" : "Add a learning language"}
              </Text>
              <Pressable
                testID="add-lang-close-btn"
                onPress={() => setAddLangOpen(false)}
              >
                <Ionicons name="close" size={24} color={colors.onSurfaceSecondary} />
              </Pressable>
            </View>
            {needsVipForMore ? (
              <View style={{ gap: spacing.lg }}>
                <Text style={styles.vipUpsellText}>
                  💎 Free members can learn 1 language. Upgrade to VIP to learn
                  up to 3 languages, chat without limits and get a VIP badge!
                </Text>
                <Pressable
                  testID="connect-vip-upgrade-btn"
                  style={styles.vipBtn}
                  onPress={upgradeVip}
                  disabled={vipBusy}
                >
                  {vipBusy ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="diamond" size={18} color="#FFF" />
                      <Text style={styles.vipBtnText}>View VIP plans</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                <View style={styles.langGrid}>
                  {LANGUAGES.filter(
                    (l) =>
                      l.code !== user?.native_language &&
                      !(user?.teach_languages || []).includes(l.code) &&
                      !myLearning.includes(l.code),
                  ).map((lang) => (
                    <Pressable
                      key={lang.code}
                      testID={`add-lang-${lang.code}`}
                      onPress={() => addLanguage(lang.code)}
                      disabled={addingLang}
                      style={styles.langOption}
                    >
                      <FlagIcon code={lang.code} size={18} />
                      <Text style={styles.langOptionText}>{lang.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Gender / City category sheets */}
      <Modal
        visible={catSheet !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setCatSheet(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {catSheet === "gender" ? "Filter by gender" : "Filter by location"}
              </Text>
              <Pressable
                testID="cat-sheet-close"
                onPress={() => setCatSheet(null)}
              >
                <Ionicons name="close" size={24} color={colors.onSurfaceSecondary} />
              </Pressable>
            </View>
            {catSheet === "gender" ? (
              <View style={{ gap: spacing.sm }}>
                {(
                  [
                    { key: "any", label: "Everyone", icon: "people" },
                    { key: "male", label: "Male", icon: "male" },
                    { key: "female", label: "Female", icon: "female" },
                  ] as const
                ).map((g) => {
                  const on = genderPick === g.key;
                  return (
                    <Pressable
                      key={g.key}
                      testID={`gender-opt-${g.key}`}
                      onPress={() => {
                        setGenderPick(g.key);
                        setCatSheet(null);
                      }}
                      style={[styles.sheetOption, on && styles.sheetOptionOn]}
                    >
                      <Ionicons
                        name={g.icon}
                        size={18}
                        color={on ? colors.brand : colors.onSurfaceSecondary}
                      />
                      <Text
                        style={[
                          styles.sheetOptionText,
                          on && { color: colors.brand },
                        ]}
                      >
                        {g.label}
                      </Text>
                      {on && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={colors.brand}
                          style={{ marginLeft: "auto" }}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                <View style={{ gap: spacing.sm }}>
                  <Pressable
                    testID="city-opt-any"
                    onPress={() => {
                      setCityPick(null);
                      setCatSheet(null);
                    }}
                    style={[styles.sheetOption, !cityPick && styles.sheetOptionOn]}
                  >
                    <Ionicons
                      name="earth"
                      size={18}
                      color={!cityPick ? colors.brand : colors.onSurfaceSecondary}
                    />
                    <Text
                      style={[
                        styles.sheetOptionText,
                        !cityPick && { color: colors.brand },
                      ]}
                    >
                      All locations
                    </Text>
                    {!cityPick && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.brand}
                        style={{ marginLeft: "auto" }}
                      />
                    )}
                  </Pressable>
                  {partnerCountries.map((cn) => {
                    const on = cityPick === cn;
                    return (
                      <Pressable
                        key={cn}
                        testID={`city-opt-${cn}`}
                        onPress={() => {
                          setCityPick(cn);
                          setCatSheet(null);
                        }}
                        style={[styles.sheetOption, on && styles.sheetOptionOn]}
                      >
                        <Ionicons
                          name="location"
                          size={18}
                          color={on ? colors.brand : colors.onSurfaceSecondary}
                        />
                        <Text
                          style={[
                            styles.sheetOptionText,
                            on && { color: colors.brand },
                          ]}
                        >
                          {cn}
                        </Text>
                        {on && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={colors.brand}
                            style={{ marginLeft: "auto" }}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    collapsibleWrap: {
      overflow: "hidden",
    },
    headerTitle: {
      fontFamily: fonts.display,
      fontSize: 24,
      color: colors.onSurface,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    catRow: {
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      alignItems: "center",
    },
    catItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    catItemActive: {
      backgroundColor: colors.surfaceSecondary,
    },
    catText: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurfaceSecondary,
    },
    catTextActive: {
      fontFamily: fonts.displaySemi,
      color: colors.onSurface,
    },
    filterRow: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    ppBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: "#FEF3C7",
    },
    ppBannerIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FDE68A",
    },
    ppBannerTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 15,
      color: "#B45309",
    },
    ppBannerSub: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: "#B45309",
      marginTop: 1,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSecondary,
    },
    filterChipActive: {
      backgroundColor: colors.brandTertiary,
    },
    filterText: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
    filterTextActive: {
      color: colors.brand,
    },
    addChip: {
      paddingHorizontal: spacing.xl,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxxl,
    },
    sep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginVertical: spacing.lg,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
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
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalTitle: {
      fontFamily: fonts.display,
      fontSize: 19,
      color: colors.onSurface,
    },
    vipUpsellText: {
      fontFamily: fonts.text,
      fontSize: 14,
      lineHeight: 21,
      color: colors.onSurfaceTertiary,
    },
    vipBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: "#F59E0B",
      borderRadius: radius.pill,
      paddingVertical: spacing.lg,
    },
    vipBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: "#FFFFFF",
    },
    langGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    langOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSecondary,
    },
    sheetOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceSecondary,
    },
    sheetOptionOn: {
      backgroundColor: colors.brandTertiary,
    },
    sheetOptionText: {
      fontFamily: fonts.textSemi,
      fontSize: 14.5,
      color: colors.onSurface,
    },
    langOptionText: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurfaceTertiary,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      padding: spacing.xl,
    },
    emptyText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    retryBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    retryText: {
      color: colors.onBrand,
      fontFamily: fonts.textBold,
    },
  });
