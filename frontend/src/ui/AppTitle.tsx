import React from "react";
import { StyleSheet, Text } from "react-native";
import type { TextProps } from "react-native";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts } from "@/src/theme";

/** Semantic heading roles: equal roles always share the same typography. */
export const titleTypography = StyleSheet.create({
  page: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  navigation: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  conversation: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  section: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
  },
  card: {
    fontFamily: fonts.textBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  },
  modal: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
  },
});

export type TitleVariant = keyof typeof titleTypography;

export interface AppTitleProps extends TextProps {
  variant?: TitleVariant;
}

/**
 * Screen styles retain color, alignment and layout. Font metrics come LAST
 * from the semantic role, so legacy one-off sizes cannot drift across screens.
 * Text keeps native font scaling; titles wrap unless a compact surface opts
 * into an explicit line limit (for example, a conversation header).
 */
export function AppTitle({
  variant = "navigation",
  style,
  accessibilityRole = "header",
  allowFontScaling = true,
  children,
  ...props
}: AppTitleProps) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      accessibilityRole={accessibilityRole}
      allowFontScaling={allowFontScaling}
      style={[styles.base, { color: colors.onSurface }, style, titleTypography[variant]]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { minWidth: 0, flexShrink: 1 },
});
