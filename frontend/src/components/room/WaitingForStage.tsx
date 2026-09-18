import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { Ionicons } from "@/src/ui/icons";

export function WaitingForStage() {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let motion: Animated.CompositeAnimation | undefined;
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!live || reduced) return;
      motion = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
      motion.start();
    });
    return () => { live = false; motion?.stop(); rotation.setValue(0); };
  }, [rotation]);
  return <View testID="room-hand-waiting" accessibilityLabel="Waiting for stage request approval" style={s.wrap}><Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [0,1], outputRange: ["0deg","360deg"] }) }] }}><Ionicons name="time-outline" size={23} color="#FCD34D" /></Animated.View></View>;
}
const s = StyleSheet.create({ wrap: { width: 26, height: 26, alignItems: "center", justifyContent: "center" } });