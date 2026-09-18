/**
 * OfflineBanner — a purple "No network connection" strip that slides in
 * from the top when the user is offline. Matches the reference screenshot.
 * Renders nothing when online.
 */

import { Ionicons } from "@/src/ui/icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetwork } from "@/src/context/NetworkContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, spacing, ThemeColors } from "@/src/theme";

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetwork();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  if (isOnline) return null;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.banner,
        {
          paddingTop:
            Platform.OS === "android"
              ? insets.top + 10
              : insets.top === 0
                ? 12
                : insets.top + 4,
        },
      ]}
      testID="offline-banner"
    >
      <Ionicons name="cloud-offline" size={16} color={colors.brand} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>No network connection</Text>
        <Text style={styles.subtitle}>Please check your network settings</Text>
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    banner: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.brandTertiary,
      paddingHorizontal: spacing.md,
      paddingBottom: 10,
    },
    title: {
      fontFamily: fonts.textBold,
      fontSize: 13.5,
      color: colors.brand,
    },
    subtitle: {
      fontFamily: fonts.text,
      fontSize: 11.5,
      color: colors.brand,
      opacity: 0.75,
    },
  });
