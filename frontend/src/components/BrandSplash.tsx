import React from "react";
import { StyleSheet, View, useColorScheme, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { darkColors, lightColors } from "@/src/theme";

/** Matches the transparent native splash artwork, with no baked-in gray box.
 * No custom fonts, network images or artificial launch delay are required.
 */
export function BrandSplash({ testID = "mello-splash-screen", backgroundColor }: { testID?: string; backgroundColor?: string }) {
  const { width, height } = useWindowDimensions();
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;
  const size = Math.max(48, Math.min(200, width - 64, height - 64));
  return <View testID={testID} style={[styles.screen, { backgroundColor: backgroundColor || colors.surface }]} accessibilityLabel="Mello is loading">
    <Image testID={`${testID}-logo`} source={require("@/assets/images/splash-icon.png")}
      contentFit="contain" accessible accessibilityLabel="Mello logo"
      style={{ width: size, height: size }} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, alignItems: "center", justifyContent: "center" },
});