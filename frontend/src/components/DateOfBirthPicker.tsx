import { Ionicons } from "@/src/ui/icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetBounds } from "@/src/hooks/use-screen-space";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing } from "@/src/theme";

/**
 * Cross-platform, dropdown-style date-of-birth picker. Renders three tap-to-
 * open pickers (Year · Month · Day). Each picker opens a bottom-sheet Modal
 * with a scrollable FlatList so it works identically on iOS, Android, and web
 * (no dependency on native pickers). All fields are optional individually;
 * the parent controls validation.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS: number[] = [];
// Range: 5 years back (13yo min) → 100 years back
for (let y = currentYear - 13; y >= currentYear - 100; y--) YEARS.push(y);

const daysInMonth = (year: number | null, month: number | null) => {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
};

export interface DateOfBirthValue {
  year: number | null;
  month: number | null; // 1-12
  day: number | null; // 1-31
}

interface Props {
  value: DateOfBirthValue;
  onChange: (v: DateOfBirthValue) => void;
  testID?: string;
}

export function DateOfBirthPicker({ value, onChange, testID }: Props) {
  const { colors } = useTheme();
  const [openField, setOpenField] = useState<"year" | "month" | "day" | null>(null);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const days: number[] = useMemo(() => {
    const max = daysInMonth(value.year, value.month);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [value.year, value.month]);

  const setYear = (year: number) => {
    // Clamp day if switching to a shorter month/year (leap year etc.)
    let day = value.day;
    if (day && value.month) {
      const max = daysInMonth(year, value.month);
      if (day > max) day = max;
    }
    onChange({ year, month: value.month, day });
    setOpenField(null);
  };
  const setMonth = (month: number) => {
    let day = value.day;
    if (day) {
      const max = daysInMonth(value.year, month);
      if (day > max) day = max;
    }
    onChange({ year: value.year, month, day });
    setOpenField(null);
  };
  const setDay = (day: number) => {
    onChange({ year: value.year, month: value.month, day });
    setOpenField(null);
  };

  return (
    <View style={styles.row} testID={testID}>
      <Chip
        label="Year"
        display={value.year ? String(value.year) : "YYYY"}
        active={openField === "year"}
        filled={!!value.year}
        onPress={() => setOpenField("year")}
        testID="dob-year-btn"
      />
      <Chip
        label="Month"
        display={value.month ? MONTHS[value.month - 1] : "MMM"}
        active={openField === "month"}
        filled={!!value.month}
        onPress={() => setOpenField("month")}
        testID="dob-month-btn"
      />
      <Chip
        label="Day"
        display={value.day ? String(value.day) : "DD"}
        active={openField === "day"}
        filled={!!value.day}
        onPress={() => setOpenField("day")}
        testID="dob-day-btn"
      />

      <PickerSheet
        visible={openField === "year"}
        title="Select year"
        options={YEARS.map((y) => ({ key: String(y), label: String(y), value: y }))}
        selectedKey={value.year ? String(value.year) : null}
        onSelect={(v) => setYear(v as number)}
        onClose={() => setOpenField(null)}
      />
      <PickerSheet
        visible={openField === "month"}
        title="Select month"
        options={MONTHS.map((label, i) => ({
          key: String(i + 1),
          label,
          value: i + 1,
        }))}
        selectedKey={value.month ? String(value.month) : null}
        onSelect={(v) => setMonth(v as number)}
        onClose={() => setOpenField(null)}
      />
      <PickerSheet
        visible={openField === "day"}
        title="Select day"
        options={days.map((d) => ({ key: String(d), label: String(d), value: d }))}
        selectedKey={value.day ? String(value.day) : null}
        onSelect={(v) => setDay(v as number)}
        onClose={() => setOpenField(null)}
      />
    </View>
  );
}

const Chip = ({
  label,
  display,
  active,
  filled,
  onPress,
  testID,
}: {
  label: string;
  display: string;
  active: boolean;
  filled: boolean;
  onPress: () => void;
  testID: string;
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[
        styles.chip,
        active && styles.chipActive,
        filled && styles.chipFilled,
      ]}
    >
      <Text style={styles.chipLabel}>{label}</Text>
      <View style={styles.chipValueRow}>
        <Text
          style={[
            styles.chipValue,
            filled && styles.chipValueFilled,
          ]}
          numberOfLines={1}
        >
          {display}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={filled ? colors.brand : colors.onSurfaceSecondary}
        />
      </View>
    </Pressable>
  );
};

interface Option {
  key: string;
  label: string;
  value: number;
}

const PickerSheet = ({
  visible,
  title,
  options,
  selectedKey,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  selectedKey: string | null;
  onSelect: (value: number) => void;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetBounds = useSheetBounds();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          testID="dob-picker-sheet"
          style={[styles.sheet, sheetBounds, { paddingBottom: spacing.xl + insets.bottom }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              testID="dob-picker-close"
            >
              <Ionicons name="close" size={22} color={colors.onSurfaceSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.key}
            initialNumToRender={20}
            style={{ maxHeight: 360, flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = selectedKey === item.key;
              return (
                <Pressable
                  testID={`dob-option-${item.key}`}
                  onPress={() => onSelect(item.value)}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark" size={20} color={colors.brand} />
                  )}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export function computeAgeFromDob(v: DateOfBirthValue): number | null {
  if (!v.year || !v.month || !v.day) return null;
  const today = new Date();
  let age = today.getFullYear() - v.year;
  const beforeBirthday =
    today.getMonth() + 1 < v.month ||
    (today.getMonth() + 1 === v.month && today.getDate() < v.day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function dobToIso(v: DateOfBirthValue): string | null {
  if (!v.year || !v.month || !v.day) return null;
  const mm = String(v.month).padStart(2, "0");
  const dd = String(v.day).padStart(2, "0");
  return `${v.year}-${mm}-${dd}`;
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    chip: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderWidth: 1.5,
      borderColor: "transparent",
      gap: 2,
    },
    chipActive: {
      borderColor: colors.brand,
    },
    chipFilled: {
      backgroundColor: colors.brandTertiary,
      borderColor: colors.brand,
    },
    chipLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      letterSpacing: 0.4,
    },
    chipValueRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
    },
    chipValue: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurfaceSecondary,
      flexShrink: 1,
    },
    chipValueFilled: {
      color: colors.onSurface,
    },
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    sheetTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 17,
      color: colors.onSurface,
    },
    option: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
    },
    optionActive: {
      backgroundColor: colors.brandTertiary,
    },
    optionText: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurface,
    },
    optionTextActive: {
      color: colors.onBrandTertiary,
      fontFamily: fonts.textBold,
    },
  });
