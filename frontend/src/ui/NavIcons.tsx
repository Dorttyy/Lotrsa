/**
 * Bottom-navigation icon set — faithful vector recreations of the user's five
 * uploaded reference glyphs (solid, chunky, brand-mark style):
 *
 *   1. Chats    → two overlapping speech bubbles; the front-left bubble has a
 *                 white dash knockout, the back-right bubble shows as a
 *                 crescent separated by a clean gap (mask), tail bottom-right.
 *   2. Connect  → two solid people: small bust on the left (clipped by a gap
 *                 where the big one overlaps) + large bust on the right with a
 *                 wide flat-bottom rounded body.
 *   3. Moments  → a solid disc with a rounded, tilted diamond knocked out of
 *                 the middle (compass-needle look).
 *   4. Voice    → duotone microphone (shared MicShape, see src/ui/MicGlyph):
 *                 translucent capsule with two curved dashes inside, wrapped
 *                 by a thick U-bracket — identical to every in-app mic icon.
 *   5. Me       → the user's two uploaded PNGs, chosen by saved gender;
 *                 the neutral head-and-shoulders glyph is the fallback.
 *
 * Every glyph uses the single `color` the tab bar passes in (brand tint
 * when active, muted tint when inactive) with a gentle spring pop on focus.
 * SVG knockouts and uploaded PNG transparency remain transparent on any
 * bar background (light or dark mode).
 */

import React from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, G, Mask, Path, Rect } from "react-native-svg";

import profileNavIcons from "@/src/assets/profile-nav-icons.json";
import { MicShape } from "@/src/ui/MicGlyph";

export interface NavIconProps {
  focused: boolean;
  color: string;
  size?: number;
}

/** Canvas with a gentle spring-pop when the tab becomes active. */
function Shell({
  focused,
  size = 26,
  children,
  raster = false,
}: {
  focused: boolean;
  size?: number;
  children: React.ReactNode;
  raster?: boolean;
}) {
  const anim = React.useRef(new Animated.Value(focused ? 1 : 0)).current;
  React.useEffect(() => {
    const animation = Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 5,
      tension: 180,
    });
    animation.start();
    return () => animation.stop();
  }, [focused, anim]);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  return (
    <View style={[styles.shell, { width: size + 6, height: size + 4 }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {raster ? children : (
          <Svg width={size} height={size} viewBox="0 0 24 24">
            {children}
          </Svg>
        )}
      </Animated.View>
    </View>
  );
}

/* ── 1 · Chats — two overlapping bubbles ───────────────────────────────── */

/** Front (big, upper-left) bubble with a spike tail at the lower-left. */
const CHAT_FRONT =
  "M9.3 1.9 C13.7 1.9 17.2 5.35 17.2 9.6 C17.2 13.85 13.7 17.3 9.3 17.3 " +
  "C8.8 17.3 8.3 17.26 7.8 17.17 C7.35 18.6 6.55 19.9 5.45 20.85 " +
  "C5.05 21.2 4.5 20.85 4.57 20.35 C4.72 19.05 4.6 17.75 4.2 16.6 " +
  "C2.6 15.2 1.4 13.1 1.4 9.6 C1.4 5.35 4.9 1.9 9.3 1.9 Z";

/** Back (smaller, lower-right) bubble with a spike tail at the lower-right. */
const CHAT_BACK =
  "M16.3 7.4 C12.7 7.4 9.9 10.2 9.9 13.7 C9.9 17.2 12.7 20 16.3 20 " +
  "C16.75 20 17.2 19.96 17.63 19.88 C18.05 21.15 18.85 22.25 19.9 23.05 " +
  "C20.3 23.35 20.83 23.02 20.77 22.53 C20.63 21.35 20.75 20.2 21.15 19.15 " +
  "C22.1 18 22.7 16 22.7 13.7 C22.7 10.2 19.9 7.4 16.3 7.4 Z";

export function ChatsIcon({ focused, color, size }: NavIconProps) {
  return (
    <Shell focused={focused} size={size}>
      {/* gap between the two bubbles + dash knockout, via luminance masks */}
      <Mask id="chatBackM">
        <Rect x="0" y="0" width="24" height="24" fill="#FFFFFF" />
        {/* front bubble enlarged with a stroke → carves the white gap */}
        <Path d={CHAT_FRONT} fill="#000000" stroke="#000000" strokeWidth={2.4} />
      </Mask>
      <Mask id="chatFrontM">
        <Rect x="0" y="0" width="24" height="24" fill="#FFFFFF" />
        {/* white dash inside the front bubble */}
        <Rect x="5.9" y="8.35" width="6.9" height="2.5" rx="1.25" fill="#000000" />
      </Mask>
      <Path d={CHAT_BACK} fill={color} mask="url(#chatBackM)" />
      <Path d={CHAT_FRONT} fill={color} mask="url(#chatFrontM)" />
    </Shell>
  );
}

/* ── 2 · Connect — two solid people ────────────────────────────────────── */

const CONN_BIG_BODY =
  "M15.9 12.5 C11.4 12.5 8.5 15.3 8.5 19.2 C8.5 20.2 9.2 20.9 10.2 20.9 " +
  "L21.6 20.9 C22.6 20.9 23.3 20.2 23.3 19.2 C23.3 15.3 20.4 12.5 15.9 12.5 Z";
const CONN_SMALL_BODY =
  "M6.5 12.8 C3.3 12.8 1 15 1 17.9 C1 18.75 1.6 19.35 2.45 19.35 " +
  "L10.55 19.35 C11.4 19.35 12 18.75 12 17.9 C12 15 9.7 12.8 6.5 12.8 Z";

export function ConnectIcon({ focused, color, size }: NavIconProps) {
  return (
    <Shell focused={focused} size={size}>
      <Mask id="connBackM">
        <Rect x="0" y="0" width="24" height="24" fill="#FFFFFF" />
        {/* big person enlarged → carves the separation gap on the small one */}
        <Ellipse
          cx="15.9"
          cy="6.9"
          rx="3.7"
          ry="4.1"
          fill="#000000"
          stroke="#000000"
          strokeWidth={2.2}
        />
        <Path d={CONN_BIG_BODY} fill="#000000" stroke="#000000" strokeWidth={2.2} />
      </Mask>
      {/* small person (behind, left) */}
      <G mask="url(#connBackM)">
        <Ellipse cx="6.5" cy="7.4" rx="3" ry="3.4" fill={color} />
        <Path d={CONN_SMALL_BODY} fill={color} />
      </G>
      {/* big person (front, right) */}
      <Ellipse cx="15.9" cy="6.9" rx="3.7" ry="4.1" fill={color} />
      <Path d={CONN_BIG_BODY} fill={color} />
    </Shell>
  );
}

/* ── 3 · Moments — disc with a rounded tilted-diamond knockout ─────────── */

export function MomentsIcon({ focused, color, size }: NavIconProps) {
  return (
    <Shell focused={focused} size={size}>
      <Mask id="momentsM">
        <Rect x="0" y="0" width="24" height="24" fill="#FFFFFF" />
        {/* rounded diamond, tilted like a compass needle (NE–SW) */}
        <Rect
          x="-2.8"
          y="-3.7"
          width="5.6"
          height="7.4"
          rx="2.7"
          fill="#000000"
          transform="translate(13.1 11.4) rotate(40)"
        />
      </Mask>
      <Circle cx="12" cy="12" r="9.8" fill={color} mask="url(#momentsM)" />
    </Shell>
  );
}

/* ── 4 · Voice — duotone microphone ────────────────────────────────────── */

export function VoiceIcon({ focused, color, size }: NavIconProps) {
  return (
    <Shell focused={focused} size={size}>
      <MicShape color={color} />
    </Shell>
  );
}

/* ── 5 · Me — uploaded artwork selected by the saved account gender ────── */

export interface MeIconProps extends NavIconProps {
  gender?: "male" | "female" | null;
}

// Original uploads are bundled as data URIs, not downloaded when tabs mount.
const profileSources = {
  male: { uri: profileNavIcons.male },
  female: { uri: profileNavIcons.female },
};

export function MeIcon({ color, focused, size = 26, gender }: MeIconProps) {
  const source = gender === "male" || gender === "female"
    ? profileSources[gender]
    : null;

  return (
    <Shell focused={focused} size={size} raster={!!source}>
      {source ? (
        <Image
          source={source}
          style={[styles.profileImage, { width: size, height: size, tintColor: color }]}
          fadeDuration={0}
          accessible={false}
          testID={`profile-nav-icon-${gender}`}
        />
      ) : (
        <G testID="profile-nav-icon-neutral">
          <Circle cx="12" cy="7" r="4.6" fill={color} />
          <Ellipse cx="12" cy="17.4" rx="7.5" ry="5" fill={color} />
        </G>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileImage: {
    resizeMode: "contain",
  },
});
