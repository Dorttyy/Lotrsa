import React from "react";
import { Image } from "expo-image";
import { StyleSheet } from "react-native";

/** Exact uploaded artwork; bundled so the brand remains visible offline. */
export function AppLogo({ size = 32, testID = "app-logo" }: { size?: number; testID?: string }) {
  return <Image source={require("@/assets/images/brand-logo.png")}
    testID={testID} accessibilityLabel="Mello logo" accessible
    contentFit="contain" style={[styles.logo, { width: size, height: size }]} />;
}

const styles = StyleSheet.create({ logo: { flexShrink: 0, borderRadius: 8 } });