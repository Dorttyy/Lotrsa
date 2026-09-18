import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { MicGlyph } from "@/src/ui/MicGlyph";
import { Ionicons } from "@/src/ui/icons";

/** Fixed bounds keep the badge attached even beside a tall notice bubble. */
export function VoiceroomAvatar({ size = 54, testID }: { size?: number; testID: string }) {
  const { colors } = useTheme();
  const badge = Math.max(14, Math.round(size * 0.3));
  return (
    <View testID={testID} style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.circle, { backgroundColor: colors.brand, borderRadius: size / 2 }]}>
        <MicGlyph testID={`${testID}-mic`} size={Math.round(size * 0.46)} color={colors.onBrand} />
      </View>
      <View testID={`${testID}-verified`} accessibilityLabel="Official Voiceroom notices"
        style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2,
          backgroundColor: colors.success, borderColor: colors.surface }]}>
        <Ionicons name="checkmark" size={badge - 5} color={colors.onBrand} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", flexShrink: 0, alignSelf: "flex-start" },
  circle: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", right: -1, bottom: -1, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center" },
});