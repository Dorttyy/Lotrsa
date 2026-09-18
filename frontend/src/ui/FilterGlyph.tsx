import React, { useId } from "react";
import { Image, StyleSheet } from "react-native";
import type { ImageStyle, StyleProp, TextStyle } from "react-native";

// Exact artwork re-uploaded by the user. Already hosted in managed asset storage.
export const FILTER_ARTWORK_URL = "https://customer-assets-v7afamib.emergentagent.net/job_elevate-familiar/artifacts/1l8f05p9_icons8-xbox-menu-500.png";

export function FilterGlyph({ size = 22, color, style, testID, accessibilityLabel }: {
  size?: number; color?: string; style?: StyleProp<TextStyle>; testID?: string; accessibilityLabel?: string;
}) {
  const id = useId();
  return <Image source={{ uri: FILTER_ARTWORK_URL }} resizeMode="contain" fadeDuration={0}
    testID={testID || `uploaded-filter-icon-${id.replace(/:/g, "")}`}
    accessibilityLabel={accessibilityLabel} accessible={!!accessibilityLabel}
    style={[styles.icon, { width: size, height: size, tintColor: color }, style as StyleProp<ImageStyle>]} />;
}
const styles = StyleSheet.create({ icon: { flexShrink: 0 } });