import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { BackButton } from "@/src/components/BackButton";
import { useTheme } from "@/src/context/ThemeContext";
import { spacing } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";

/**
 * Shared non-tab top-bar using the same navigation-title role as other screens.
 * The bar can grow for longer/scaled titles, with the standard BackButton.
 *
 * Layout: [back or spacer] · [centered title] · [right slot]
 *
 * Use it as:
 *   <ScreenHeader title="Notifications" right={<Ionicons name="ellipsis" />} />
 */
export function ScreenHeader({
  title,
  showBack = true,
  onBack,
  right,
  variant = "default",
  style,
}: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  variant?: "default" | "overlay";
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const isOverlay = variant === "overlay";
  return (
    <View
      style={[
        styles.bar,
        {
          borderBottomColor: isOverlay ? "transparent" : colors.border,
          backgroundColor: isOverlay ? "transparent" : colors.surface,
        },
        style,
      ]}
    >
      <View style={styles.side}>
        {showBack ? (
          <BackButton
            onPress={onBack}
            variant={isOverlay ? "overlay" : "plain"}
            color={isOverlay ? "#FFFFFF" : undefined}
          />
        ) : null}
      </View>
      <AppTitle
        variant="navigation"
        style={[
          styles.title,
          { color: isOverlay ? "#FFFFFF" : colors.onSurface },
        ]}
      >
        {title}
      </AppTitle>
      <View style={[styles.side, styles.rightSide]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 60,
    justifyContent: "center",
  },
  rightSide: {
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    textAlign: "center",
  },
});
