import { Ionicons } from "@/src/ui/icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

/** Small ♂ / ♀ symbol shown next to user names. */
export const GenderBadge: React.FC<{
  gender?: "male" | "female" | null;
  size?: number;
}> = ({ gender, size = 13 }) => {
  if (!gender) return null;
  const male = gender === "male";
  return (
    <View
      style={[
        styles.genderWrap,
        {
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          backgroundColor: male ? "rgba(59,130,246,0.15)" : "rgba(236,72,153,0.15)",
        },
      ]}
    >
      <Ionicons
        name={male ? "male" : "female"}
        size={size}
        color={male ? "#3B82F6" : "#EC4899"}
      />
    </View>
  );
};

// Glossy sticker palette per VIP tier (light top → dark bottom).
const VIP_COLORS: Record<string, [string, string]> = {
  gold: ["#FFDB57", "#F0A000"],
  blue: ["#63ABF5", "#1C6ED6"],
  purple: ["#C483EC", "#8A2FC2"],
};

/**
 * Professional glossy "verified" VIP badge — a checkmark sticker with a
 * top gloss highlight, tinted by tier (gold = weekly/monthly, purple =
 * lifetime). Renders as an SVG so it stays crisp at every size.
 */
export const VipBadge: React.FC<{
  small?: boolean;
  tier?: "weekly" | "monthly" | "lifetime" | null;
}> = ({ small, tier }) => {
  const gid = React.useId();
  const size = small ? 16 : 20;
  const [light, dark] =
    tier === "lifetime"
      ? VIP_COLORS.purple
      : tier === "weekly"
        ? VIP_COLORS.blue
        : VIP_COLORS.gold;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`v${gid}`} x1="0.25" y1="0" x2="0.75" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
        <LinearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* Sticker body */}
      <Rect x="8" y="8" width="84" height="84" rx="24" fill={`url(#v${gid})`} />
      {/* Top gloss highlight */}
      <Rect x="16" y="14" width="68" height="34" rx="17" fill={`url(#g${gid})`} />
      {/* Checkmark */}
      <Path
        d="M29 52 L44 68 L73 33"
        stroke="#FFFFFF"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  genderWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
