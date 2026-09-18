import React, { useEffect, useRef } from "react";
import { Animated, AccessibilityInfo, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, ThemeColors } from "@/src/theme";
import { Ionicons } from "@/src/ui/icons";

function SearchRadar({ searching }: { searching: boolean }) {
  const { colors } = useTheme();
  const s = styles(colors);
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (cancelled || reduce || !searching) return;
      animation = Animated.parallel([
        Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true })),
        Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })),
      ]);
      animation.start();
    });
    return () => { cancelled = true; animation?.stop(); pulse.setValue(0); orbit.setValue(0); };
  }, [searching, pulse, orbit]);
  return <View style={s.art} testID={searching ? "random-search-animation" : "random-idle-art"}>
    <View style={s.outerRing} /><View style={s.innerRing} />
    {searching && <Animated.View style={[s.pulseRing, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] }) }] }]} />}
    <Animated.View style={[s.orbit, { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }]}><View style={s.orbitDot} /></Animated.View>
    <View style={[s.miniIcon, s.leftIcon]}><Ionicons name="language" color={colors.onBrandSecondary} size={18} /></View>
    <View style={[s.miniIcon, s.rightIcon]}><Ionicons name="headset-outline" color={colors.onBrandSecondary} size={18} /></View>
    <View style={s.centerIcon}><Ionicons name={searching ? "shuffle" : "call"} color={colors.onBrand} size={32} /></View>
  </View>;
}

export function RandomPartner({ searching, disabled, onStart, onCancel }: {
  searching: boolean; disabled: boolean; onStart: () => void; onCancel: () => void;
}) {
  const { colors } = useTheme();
  const s = styles(colors);
  return <LinearGradient colors={[colors.brandTertiary, colors.brandSecondary]} style={s.card} testID="random-partner-card">
    <View style={s.eyebrow}><View style={s.dot} /><Text testID="random-partner-badge" style={s.eyebrowText}>{searching ? "FINDING YOUR NEXT CONVERSATION" : "ONE-TO-ONE · ALWAYS FREE"}</Text></View>
    <SearchRadar searching={searching} />
    <Text testID="random-partner-title" style={s.title}>{searching ? "Your next hello is on its way" : "A little hello.\nA world of connection."}</Text>
    <Text testID="random-partner-description" style={s.copy}>{searching ? "Matching with someone ready to talk. Your mic stays off until the call starts." : "Skip the small talk. Find a language partner\nand let the conversation flow."}</Text>
    <Pressable testID={searching ? "cancel-random-match-btn" : "start-random-match-btn"} disabled={!searching && disabled} onPress={searching ? onCancel : onStart}
      style={({ pressed }) => [s.button, searching && s.cancel, { opacity: pressed || (!searching && disabled) ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Ionicons name={searching ? "close" : "shuffle"} size={20} color={searching ? colors.brand : colors.onBrand} />
      <Text style={[s.buttonText, searching && { color: colors.brand }]}>{searching ? "Cancel search" : "Random Partner"}</Text>
      {!searching && <Ionicons name="arrow-forward" size={19} color={colors.onBrand} />}
    </Pressable>
  </LinearGradient>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  card: { padding: 22, borderRadius: 28, alignItems: "center", gap: 12, overflow: "hidden", borderWidth: 1, borderColor: c.brandSecondary },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 6 }, eyebrowText: { fontFamily: fonts.textBold, fontSize: 9, letterSpacing: 1.1, color: c.onBrandSecondary }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.brand },
  art: { width: 212, height: 136, alignItems: "center", justifyContent: "center" },
  outerRing: { position: "absolute", width: 132, height: 132, borderRadius: 66, borderWidth: 1, borderColor: c.borderStrong },
  innerRing: { position: "absolute", width: 102, height: 102, borderRadius: 51, borderWidth: 1, borderStyle: "dashed", borderColor: c.borderStrong },
  pulseRing: { position: "absolute", width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: c.brand },
  orbit: { position: "absolute", width: 132, height: 132, borderRadius: 66 }, orbitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand, alignSelf: "center", marginTop: -4 },
  centerIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: c.brand, alignItems: "center", justifyContent: "center", borderWidth: 6, borderColor: c.surface },
  miniIcon: { position: "absolute", width: 36, height: 36, borderRadius: 14, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.brandSecondary },
  leftIcon: { left: 18, top: 12, transform: [{ rotate: "-12deg" }] }, rightIcon: { right: 18, bottom: 12, transform: [{ rotate: "12deg" }] },
  title: { fontFamily: fonts.displayBold, fontSize: 23, lineHeight: 29, textAlign: "center", letterSpacing: -0.6, color: c.onSurface },
  copy: { fontFamily: fonts.text, fontSize: 12, lineHeight: 19, textAlign: "center", color: c.onSurfaceSecondary },
  button: { width: "100%", marginTop: 6, minHeight: 52, borderRadius: 28, backgroundColor: c.brand, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 12 },
  cancel: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }, buttonText: { fontFamily: fonts.textBold, fontSize: 15, color: c.onBrand },
});