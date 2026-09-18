import { Ionicons } from "@/src/ui/icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/context/ThemeContext";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";
import { fonts, radius, spacing } from "@/src/theme";

export type Visibility = "public" | "friends" | "private";

interface Props {
  visible: boolean;
  current: Visibility;
  onClose: () => void;
  onSelect: (v: Visibility) => Promise<void>;
}

interface Option {
  key: Visibility;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
}

const OPTIONS: Option[] = [
  {
    key: "public",
    icon: "earth",
    title: "Public",
    subtitle: "Anyone on Mello can see this post",
  },
  {
    key: "friends",
    icon: "people",
    title: "Friends only",
    subtitle: "Only people you follow can see this post",
  },
  {
    key: "private",
    icon: "lock-closed",
    title: "Only me",
    subtitle: "Nobody else can see this post",
  },
];

/**
 * Bottom sheet with three visibility choices. Confirming a new choice runs
 * `onSelect` (async — parent updates the moment); a small spinner shows while
 * the request is in flight.
 */
export const VisibilityModal: React.FC<Props> = ({
  visible,
  current,
  onClose,
  onSelect,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = React.useState<Visibility | null>(null);

  const handleSelect = async (v: Visibility) => {
    if (saving || v === current) {
      if (v === current) onClose();
      return;
    }
    Haptics.selectionAsync();
    setSaving(v);
    try {
      await onSelect(v);
      onClose();
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} testID="vis-backdrop">
        <BoundedSheet
          testID="visibility-sheet"
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: spacing.xl + insets.bottom },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.onSurface }]}>
              Who can see this?
            </Text>
            <Text style={[styles.sub, { color: colors.onSurfaceSecondary }]}>
              Choose the audience for this Moment.
            </Text>
          </View>
          {OPTIONS.map((opt) => {
            const active = current === opt.key;
            const spinning = saving === opt.key;
            return (
              <Pressable
                key={opt.key}
                testID={`vis-option-${opt.key}`}
                onPress={() => handleSelect(opt.key)}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: pressed ? colors.surfaceSecondary : "transparent" },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: colors.brandTertiary },
                  ]}
                >
                  <Ionicons name={opt.icon} size={20} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.onSurface }]}>
                    {opt.title}
                  </Text>
                  <Text
                    style={[styles.rowSub, { color: colors.onSurfaceSecondary }]}
                  >
                    {opt.subtitle}
                  </Text>
                </View>
                {spinning ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <View
                    style={[
                      styles.radio,
                      { borderColor: active ? colors.brand : colors.border },
                    ]}
                  >
                    {active ? (
                      <View
                        style={[
                          styles.radioDot,
                          { backgroundColor: colors.brand },
                        ]}
                      />
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </BoundedSheet>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: 8,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: "#D1D4DB",
    marginBottom: spacing.md,
  },
  header: {
    paddingHorizontal: 4,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
  },
  sub: {
    fontFamily: fonts.text,
    fontSize: 13.5,
    marginTop: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    borderRadius: radius.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontFamily: fonts.textBold,
    fontSize: 16,
  },
  rowSub: {
    fontFamily: fonts.text,
    fontSize: 13,
    marginTop: 1,
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
