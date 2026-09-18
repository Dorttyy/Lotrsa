import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, ThemeColors } from "@/src/theme";
import { Ionicons } from "@/src/ui/icons";

export function RemovedFromRoom({ onLeave }: { onLeave: () => void }) {
  const { colors } = useTheme(); const s = styles(colors); const inset = useSafeAreaInsets();
  return <View testID="room-removed-screen" style={[s.overlay, { paddingTop: inset.top + 24, paddingBottom: inset.bottom + 24 }]}>
    <View style={s.content}><View style={s.icon}><Ionicons name="exit-outline" size={34} color={colors.onSurfaceSecondary} /></View><Text testID="room-removed-title" style={s.title}>You were removed from this room</Text><Text testID="room-removed-description" style={s.copy}>The host or a moderator removed you. Your microphone is off and you’re no longer connected to this room.</Text></View>
    <Pressable testID="room-removed-back" onPress={onLeave} style={s.button}><Text style={s.buttonText}>Back to Voice Rooms</Text></Pressable>
  </View>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: c.surface, paddingHorizontal: 24, zIndex: 999 }, content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 }, icon: { width: 82, height: 82, borderRadius: 28, backgroundColor: c.surfaceSecondary, justifyContent: "center", alignItems: "center" }, title: { fontFamily: fonts.displaySemi, fontSize: 24, lineHeight: 32, textAlign: "center", color: c.onSurface }, copy: { fontFamily: fonts.text, fontSize: 14, lineHeight: 22, textAlign: "center", color: c.onSurfaceSecondary }, button: { minHeight: 52, backgroundColor: c.brand, borderRadius: 26, alignItems: "center", justifyContent: "center" }, buttonText: { fontFamily: fonts.textBold, fontSize: 15, color: c.onBrand },
});