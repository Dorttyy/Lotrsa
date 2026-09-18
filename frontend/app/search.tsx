import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { BackButton } from "@/src/components/BackButton";
import { GenderBadge, VipBadge } from "@/src/components/Badges";
import { LanguagePair } from "@/src/components/LanguagePair";
import { countryToCode } from "@/src/constants/countries";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, shadow, spacing, ThemeColors } from "@/src/theme";
import { api, User } from "@/src/utils/api";

const AGE_PRESETS: { key: string; label: string; min: number | null; max: number | null }[] = [
  { key: "any", label: "Any age", min: null, max: null },
  { key: "18-25", label: "18–25", min: 18, max: 25 },
  { key: "26-35", label: "26–35", min: 26, max: 35 },
  { key: "36+", label: "36+", min: 36, max: null },
];

export default function Search() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [agePreset, setAgePreset] = useState("any");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const activeFilters =
    (agePreset !== "any" ? 1 : 0) +
    (location.trim() ? 1 : 0) +
    (gender ? 1 : 0) +
    (onlineOnly ? 1 : 0);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      const preset = AGE_PRESETS.find((p) => p.key === agePreset);
      if (preset?.min != null) params.set("min_age", String(preset.min));
      if (preset?.max != null) params.set("max_age", String(preset.max));
      if (location.trim()) params.set("location", location.trim());
      if (gender) params.set("gender", gender);
      if (onlineOnly) params.set("online_only", "true");
      if (!params.toString()) params.set("language", "all");
      const data = await api.get<User[]>(`/users/partners?${params.toString()}`);
      setResults(data);
    } catch {
      // keep previous results
    } finally {
      setLoading(false);
    }
  }, [query, agePreset, location, gender, onlineOnly]);

  useEffect(() => {
    const t = setTimeout(load, query || location ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, query, location]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="search-screen">
      <View style={styles.header}>
        <BackButton testID="search-back-btn" />
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.onSurfaceSecondary} />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor={colors.onSurfaceSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable
              testID="search-clear-btn"
              onPress={() => setQuery("")}
              hitSlop={6}
            >
              <Ionicons
                name="close-circle"
                size={17}
                color={colors.onSurfaceSecondary}
              />
            </Pressable>
          )}
        </View>
        <Pressable
          testID="search-filter-btn"
          style={[styles.filterBtn, (filtersOpen || activeFilters > 0) && styles.filterBtnActive]}
          onPress={() => setFiltersOpen(!filtersOpen)}
        >
          <Ionicons
            name="options"
            size={18}
            color={filtersOpen || activeFilters > 0 ? colors.onBrand : colors.onSurfaceSecondary}
          />
          {activeFilters > 0 && (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{activeFilters}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {filtersOpen && (
        <View style={styles.filterPanel} testID="search-filter-panel">
          <Text style={styles.filterLabel}>Age</Text>
          <View style={styles.chipWrap}>
            {AGE_PRESETS.map((p) => (
              <Pressable
                key={p.key}
                testID={`search-age-${p.key}`}
                onPress={() => setAgePreset(p.key)}
                style={[styles.chip, agePreset === p.key && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, agePreset === p.key && styles.chipTextActive]}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.filterLabel}>Location</Text>
          <View style={styles.locationBox}>
            <Ionicons name="location" size={15} color={colors.onSurfaceSecondary} />
            <TextInput
              testID="search-location-input"
              style={styles.searchInput}
              placeholder="Country or city..."
              placeholderTextColor={colors.onSurfaceSecondary}
              value={location}
              onChangeText={setLocation}
            />
            {location.length > 0 && (
              <Pressable onPress={() => setLocation("")} hitSlop={6}>
                <Ionicons
                  name="close-circle"
                  size={15}
                  color={colors.onSurfaceSecondary}
                />
              </Pressable>
            )}
          </View>
          <Text style={styles.filterLabel}>More</Text>
          <View style={styles.chipWrap}>
            {(["male", "female"] as const).map((g) => (
              <Pressable
                key={g}
                testID={`search-gender-${g}`}
                onPress={() => setGender(gender === g ? null : g)}
                style={[styles.chip, gender === g && styles.chipActive]}
              >
                <Ionicons
                  name={g}
                  size={13}
                  color={gender === g ? colors.onBrandTertiary : colors.onSurfaceTertiary}
                />
                <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                  {g === "male" ? "Male" : "Female"}
                </Text>
              </Pressable>
            ))}
            <Pressable
              testID="search-online-toggle"
              onPress={() => setOnlineOnly(!onlineOnly)}
              style={[styles.chip, onlineOnly && styles.chipActive]}
            >
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: onlineOnly ? "#22C55E" : colors.borderStrong },
                ]}
              />
              <Text style={[styles.chipText, onlineOnly && styles.chipTextActive]}>
                Online
              </Text>
            </Pressable>
            {activeFilters > 0 && (
              <Pressable
                testID="search-filters-reset"
                onPress={() => {
                  setAgePreset("any");
                  setLocation("");
                  setGender(null);
                  setOnlineOnly(false);
                }}
                style={styles.chip}
              >
                <Ionicons name="refresh" size={13} color={colors.error} />
                <Text style={[styles.chipText, { color: colors.error }]}>Reset</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="search-outline"
                size={48}
                color={colors.borderStrong}
              />
              <Text style={styles.emptyText}>
                No users found. Try different filters!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`search-result-${item.id}`}
              style={styles.row}
              onPress={() => router.push(`/user/${item.id}`)}
            >
              <Avatar
                name={item.name}
                url={item.avatar_url}
                size={48}
                flagCode={countryToCode(item.country)}
                online={item.is_online}
                frame={item.active_frame}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <GenderBadge gender={item.gender} size={11} />
                  {item.is_vip && <VipBadge small tier={item.vip_tier} />}
                </View>
                <LanguagePair
                  native={item.native_language}
                  teach={item.teach_languages}
                  learning={
                    item.learning_languages?.length
                      ? item.learning_languages
                      : item.learning_language
                  }
                  compact
                />
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.onSurfaceSecondary}
              />
            </Pressable>
          )}
        />
      )}
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
      paddingVertical: spacing.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    searchBox: {
      flex: 1,
      // Lets the field shrink instead of pushing the filter button off-screen
      // on very narrow (320px) devices.
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      ...shadow.card,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.text,
      fontSize: 15,
      color: colors.onSurface,
      paddingVertical: 2,
    },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.card,
    },
    filterBtnActive: { backgroundColor: colors.brand },
    filterCount: {
      position: "absolute",
      top: -3,
      right: -3,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.error,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    filterCountText: { color: "#FFF", fontSize: 9, fontFamily: fonts.textBold },
    filterPanel: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.xs,
      padding: spacing.lg,
      gap: spacing.xs,
      ...shadow.card,
    },
    locationBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    filterLabel: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSecondary,
    },
    chipActive: { backgroundColor: colors.brandTertiary },
    chipText: {
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: colors.onSurfaceTertiary,
    },
    chipTextActive: {
      color: colors.onBrandTertiary,
      fontFamily: fonts.textBold,
    },
    onlineDot: { width: 8, height: 8, borderRadius: 4 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      padding: spacing.xl,
      minHeight: 200,
    },
    emptyText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      ...shadow.card,
    },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: {
      fontFamily: fonts.displaySemi,
      fontSize: 15,
      color: colors.onSurface,
      flexShrink: 1,
    },
  });
