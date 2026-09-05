import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppSwitch } from "@/src/components/AppSwitch";
import { CountryFlagIcon, FlagIcon } from "@/src/components/FlagIcon";
import { citiesFor } from "@/src/constants/cities";
import { COUNTRIES } from "@/src/constants/countries";
import { LANGUAGES, langName } from "@/src/constants/languages";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

const LEVELS = ["Beginner", "Elementary", "Intermediate", "Advanced", "Proficient"];
const AGES = [18, 25, 35, 50, 90];

type PickerKind = "native" | "learn" | "country" | "city";

const PICKER_TITLES: Record<PickerKind, string> = {
  native: "Native language",
  learn: "Learning language",
  country: "Country",
  city: "City",
};

/**
 * Redesigned Connect Filter — grouped section cards with leading icons, a
 * proper range-bar for Level and Age (with a highlighted active track), and a
 * softer "Advanced Search" premium section that reads well in both themes.
 */
export default function ConnectFilter() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [native, setNative] = useState("any");
  const [learning, setLearning] = useState("any");
  const [levelMin, setLevelMin] = useState(0);
  const [levelMax, setLevelMax] = useState(4);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(90);
  const [newUsers, setNewUsers] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [gender, setGender] = useState<"all" | "female" | "male">("all");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [fullPicker, setFullPicker] = useState<PickerKind | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const reset = () => {
    setNative("any");
    setLearning("any");
    setLevelMin(0);
    setLevelMax(4);
    setAgeMin(18);
    setAgeMax(90);
    setNewUsers(false);
    setNearby(false);
    setGender("all");
    setCountry("");
    setCity("");
  };

  // Rows for the full-screen picker (with search).
  const pickerItems = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    let items: { key: string; label: string; country?: string | null; lang?: string }[] = [];
    if (fullPicker === "native" || fullPicker === "learn") {
      items = [
        { key: "any", label: "Any language" },
        ...LANGUAGES.map((l) => ({ key: l.code, label: l.name, lang: l.code })),
      ];
    } else if (fullPicker === "country") {
      items = [
        { key: "any", label: "Any country" },
        ...COUNTRIES.map((c) => ({ key: c.name, label: c.name, country: c.code })),
      ];
    } else if (fullPicker === "city") {
      items = [
        { key: "any", label: "Any city" },
        ...citiesFor(country).map((c) => ({ key: c, label: c })),
      ];
    }
    return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  }, [fullPicker, pickerSearch, country]);

  const pickerSelected =
    fullPicker === "native"
      ? native
      : fullPicker === "learn"
        ? learning
        : fullPicker === "country"
          ? country || "any"
          : city || "any";

  const openPicker = (kind: PickerKind) => {
    setPickerSearch("");
    setFullPicker(kind);
  };

  const onPick = (key: string) => {
    if (fullPicker === "native") setNative(key);
    else if (fullPicker === "learn") setLearning(key);
    else if (fullPicker === "country") {
      setCountry(key === "any" ? "" : key);
      setCity(""); // cities depend on the country
    } else if (fullPicker === "city") setCity(key === "any" ? "" : key);
    setFullPicker(null);
  };

  const search = () =>
    router.push({
      pathname: "/custom-search",
      params: {
        native,
        learning,
        levelMin: String(levelMin),
        levelMax: String(levelMax),
        ageMin: String(ageMin),
        ageMax: String(ageMax),
        newUsers: newUsers ? "1" : "0",
        nearby: nearby ? "1" : "0",
        gender,
        region: country.trim(),
        city: city.trim(),
      },
    });

  const RangeBar: React.FC<{
    stops: number;
    minIdx: number;
    maxIdx: number;
    onTap: (idx: number) => void;
  }> = ({ stops, minIdx, maxIdx, onTap }) => (
    <View style={styles.rangeWrap}>
      <View style={styles.rangeTrack} />
      <View
        style={[
          styles.rangeFill,
          {
            left: `${(minIdx / (stops - 1)) * 100}%`,
            right: `${((stops - 1 - maxIdx) / (stops - 1)) * 100}%`,
          },
        ]}
      />
      <View style={styles.rangeStops}>
        {Array.from({ length: stops }, (_, i) => (
          <Pressable
            key={i}
            hitSlop={12}
            onPress={() => onTap(i)}
            style={styles.rangeHitBox}
          >
            <View
              style={[
                styles.rangeStop,
                i >= minIdx && i <= maxIdx && styles.rangeStopActive,
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );

  const iconWrap = (name: React.ComponentProps<typeof Ionicons>["name"], color = colors.brand) => (
    <View style={[styles.iconCircle, { backgroundColor: colors.brandTertiary }]}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "bottom"]}
      testID="connect-filter-screen"
    >
      <View style={styles.header}>
        <Pressable
          testID="cf-close"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Filter</Text>
        <Pressable
          testID="cf-reset"
          onPress={reset}
          hitSlop={8}
          style={styles.headerBtn}
        >
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1 · Language */}
        <Text style={styles.sectionHeader}>Language</Text>
        <View style={styles.card}>
          <Pressable
            testID="cf-native"
            style={styles.row}
            onPress={() => openPicker("native")}
          >
            {native === "any" ? (
              iconWrap("chatbubbles-outline")
            ) : (
              <View style={styles.flagCircle}>
                <FlagIcon code={native} size={26} />
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Native language</Text>
              <Text style={styles.rowValue}>
                {native === "any" ? "Any" : langName(native)}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.onSurfaceSecondary}
            />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            testID="cf-learning"
            style={styles.row}
            onPress={() => openPicker("learn")}
          >
            {learning === "any" ? (
              iconWrap("book-outline")
            ) : (
              <View style={styles.flagCircle}>
                <FlagIcon code={learning} size={26} />
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Learning language</Text>
              <Text style={styles.rowValue}>
                {learning === "any" ? "Any" : langName(learning)}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.onSurfaceSecondary}
            />
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.sliderBlock}>
            <View style={styles.sliderHead}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {iconWrap("stats-chart-outline")}
                <Text style={styles.rowLabel}>Level</Text>
              </View>
              <Text style={styles.accentValue}>
                {LEVELS[levelMin]} – {LEVELS[levelMax]}
              </Text>
            </View>
            <RangeBar
              stops={LEVELS.length}
              minIdx={levelMin}
              maxIdx={levelMax}
              onTap={(i) => {
                if (Math.abs(i - levelMin) <= Math.abs(i - levelMax))
                  setLevelMin(Math.min(i, levelMax));
                else setLevelMax(Math.max(i, levelMin));
              }}
            />
          </View>
        </View>

        {/* Section 2 · Age */}
        <Text style={styles.sectionHeader}>Age & Activity</Text>
        <View style={styles.card}>
          <View style={styles.sliderBlock}>
            <View style={styles.sliderHead}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {iconWrap("calendar-outline")}
                <Text style={styles.rowLabel}>Age Range</Text>
              </View>
              <Text style={styles.accentValue}>
                {ageMin} – {ageMax}
                {ageMax >= 90 ? "+" : ""}
              </Text>
            </View>
            <RangeBar
              stops={AGES.length}
              minIdx={AGES.indexOf(
                AGES.reduce((p, c) => (Math.abs(c - ageMin) < Math.abs(p - ageMin) ? c : p), AGES[0])
              )}
              maxIdx={AGES.indexOf(
                AGES.reduce((p, c) => (Math.abs(c - ageMax) < Math.abs(p - ageMax) ? c : p), AGES[AGES.length - 1])
              )}
              onTap={(i) => {
                const val = AGES[i];
                if (Math.abs(val - ageMin) <= Math.abs(val - ageMax))
                  setAgeMin(Math.min(val, ageMax));
                else setAgeMax(Math.max(val, ageMin));
              }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            {iconWrap("sparkles-outline")}
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>New Users only</Text>
              <Text style={styles.rowHint}>Show partners who joined recently</Text>
            </View>
            <AppSwitch
              testID="cf-new-users"
              value={newUsers}
              onValueChange={setNewUsers}
            />
          </View>
        </View>

        {/* Section 3 · Advanced (VIP) */}
        <View style={styles.advHead}>
          <Text style={styles.sectionHeader}>Advanced Search</Text>
          <LinearGradient
            colors={["#F59E0B", "#EAB308"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.vipChip}
          >
            <Ionicons name="diamond" size={9} color="#FFFFFF" />
            <Text style={styles.vipChipText}>VIP</Text>
          </LinearGradient>
        </View>
        <View style={styles.card}>
          <View style={styles.row}>
            {iconWrap("location-outline")}
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Prioritize people nearby</Text>
              <Text style={styles.rowHint}>Sort partners by distance</Text>
            </View>
            <AppSwitch
              testID="cf-nearby"
              value={nearby}
              onValueChange={setNearby}
            />
          </View>
          <View style={styles.divider} />
          <View style={[styles.row, { paddingVertical: spacing.sm }]}>
            <View style={styles.genderRow}>
              {(["all", "female", "male"] as const).map((g) => (
                <Pressable
                  key={g}
                  testID={`cf-gender-${g}`}
                  style={[styles.genderPill, gender === g && styles.genderPillOn]}
                  onPress={() => setGender(g)}
                >
                  <Ionicons
                    name={g === "all" ? "people-outline" : "person-outline"}
                    size={15}
                    color={
                      gender === g ? colors.onBrand : colors.onSurfaceSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.genderText,
                      gender === g && styles.genderTextOn,
                    ]}
                  >
                    {g === "all" ? "Any" : g === "female" ? "Female" : "Male"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.divider} />
          <Pressable
            testID="cf-country"
            style={styles.row}
            onPress={() => openPicker("country")}
          >
            {country ? (
              <View style={styles.flagCircle}>
                <CountryFlagIcon
                  country={
                    COUNTRIES.find((c) => c.name === country)?.code
                  }
                  size={26}
                />
              </View>
            ) : (
              iconWrap("map-outline")
            )}
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Country</Text>
              <Text style={styles.rowValue}>{country || "Any"}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.onSurfaceSecondary}
            />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            testID="cf-city"
            style={styles.row}
            onPress={() => openPicker(country ? "city" : "country")}
          >
            {iconWrap("business-outline")}
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>City</Text>
              <Text style={styles.rowValue}>
                {city || (country ? "Any" : "Pick a country first")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.onSurfaceSecondary}
            />
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable testID="cf-search" style={styles.searchBtn} onPress={search}>
          <Ionicons name="search" size={19} color={colors.onBrand} />
          <Text style={styles.searchText}>Search partners</Text>
        </Pressable>
      </View>

      {/* Full-page picker: languages, countries (flag + name) and cities */}
      <Modal
        visible={fullPicker !== null}
        animationType="slide"
        onRequestClose={() => setFullPicker(null)}
      >
        <SafeAreaView
          style={styles.pickerScreen}
          edges={["top", "bottom"]}
          testID="cf-picker-screen"
        >
          <View style={styles.header}>
            <Pressable
              testID="cf-picker-back"
              onPress={() => setFullPicker(null)}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
            </Pressable>
            <Text style={styles.title}>
              {fullPicker ? PICKER_TITLES[fullPicker] : ""}
            </Text>
            <View style={styles.headerBtn} />
          </View>

          <View style={styles.pickerSearchWrap}>
            <Ionicons name="search" size={17} color={colors.onSurfaceSecondary} />
            <TextInput
              testID="cf-picker-search"
              style={styles.pickerSearchInput}
              placeholder={
                fullPicker === "city" ? `Search cities in ${country}` : "Search"
              }
              placeholderTextColor={colors.onSurfaceSecondary}
              value={pickerSearch}
              onChangeText={setPickerSearch}
              autoCorrect={false}
            />
            {pickerSearch.length > 0 && (
              <Pressable onPress={() => setPickerSearch("")} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={17}
                  color={colors.onSurfaceSecondary}
                />
              </Pressable>
            )}
          </View>

          <FlatList
            data={pickerItems}
            keyExtractor={(i) => i.key}
            contentContainerStyle={styles.pickerList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = pickerSelected === item.key;
              return (
                <Pressable
                  testID={`cf-pick-${item.key}`}
                  style={[styles.pickerRow, selected && styles.pickerRowOn]}
                  onPress={() => onPick(item.key)}
                >
                  {item.lang ? (
                    <FlagIcon code={item.lang} size={28} />
                  ) : item.country ? (
                    <CountryFlagIcon country={item.country} size={28} />
                  ) : (
                    <View style={styles.pickerAnyIcon}>
                      <Ionicons
                        name={
                          item.key === "any"
                            ? "earth"
                            : fullPicker === "city"
                              ? "business"
                              : "earth"
                        }
                        size={15}
                        color={colors.brand}
                      />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.pickerRowText,
                      selected && { color: colors.brand },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={21}
                      color={colors.brand}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.pickerEmpty}>No results found</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerBtn: {
      minWidth: 60,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    resetText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.brand,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    sectionHeader: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: spacing.md,
      marginLeft: 4,
      marginBottom: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: 14,
    },
    rowBody: { flex: 1 },
    rowLabel: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurface,
    },
    rowValue: {
      fontFamily: fonts.text,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    rowHint: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    iconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    flagCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.brandTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    pickerScreen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    pickerSearchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    pickerSearchInput: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 14.5,
      color: colors.onSurface,
      padding: 0,
    },
    pickerList: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: 6,
    },
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    pickerRowOn: {
      borderColor: colors.brand,
      backgroundColor: colors.brandTertiary,
    },
    pickerAnyIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.brandTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    pickerRowText: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurface,
    },
    pickerEmpty: {
      fontFamily: fonts.text,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
      paddingVertical: spacing.xl,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginLeft: 34 + spacing.md,
    },
    accentValue: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.brand,
    },
    sliderBlock: { paddingVertical: spacing.md },
    sliderHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    rangeWrap: {
      height: 32,
      justifyContent: "center",
      marginHorizontal: 4,
    },
    rangeTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceTertiary,
    },
    rangeFill: {
      position: "absolute",
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.brand,
    },
    rangeStops: {
      position: "absolute",
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rangeHitBox: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: -12,
    },
    rangeStop: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.surfaceTertiary,
    },
    rangeStopActive: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    advHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: spacing.md,
    },
    vipChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      marginTop: spacing.md,
      marginBottom: 4,
    },
    vipChipText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: "#FFFFFF",
      letterSpacing: 0.4,
    },
    genderRow: { flex: 1, flexDirection: "row", gap: 8 },
    genderPill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingVertical: 10,
    },
    genderPillOn: { backgroundColor: colors.brand },
    genderText: {
      fontFamily: fonts.textBold,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
    },
    genderTextOn: { color: colors.onBrand },
    footer: {
      padding: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: colors.surfaceSecondary,
    },
    searchBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      height: 54,
    },
    searchText: {
      fontFamily: fonts.textBold,
      fontSize: 16.5,
      color: colors.onBrand,
    },
  });
