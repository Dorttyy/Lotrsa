/**
 * Main bottom-navigation artwork: exact user uploads, bundled as data URIs.
 * Upload order: 1 Voice (mic), 2 Chats (communication), 3 Connect (group),
 * 4 Moments (yin-yang). Tab order stays Chats / Connect / Moments / Voice / Me.
 * Profile keeps the separate saved-gender uploads with a neutral fallback.
 * Existing theme tints, transparent backgrounds, and focus spring are retained.
 */

import React from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import type { ColorValue } from "react-native";
import Svg, { Circle, Ellipse, G } from "react-native-svg";

import navbarUploads from "@/src/assets/navbar-upload-icons.json";
import profileNavIcons from "@/src/assets/profile-nav-icons.json";
import { MicGlyph } from "@/src/ui/MicGlyph";

export interface NavIconProps {
  focused: boolean;
  color: ColorValue;
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

type UploadedTab = keyof typeof navbarUploads;

const uploadedSources = {
  voice: { uri: navbarUploads.voice },
  chats: { uri: navbarUploads.chats },
  connect: { uri: navbarUploads.connect },
  moments: { uri: navbarUploads.moments },
};

function UploadedNavIcon({
  name,
  focused,
  color,
  size = 26,
}: NavIconProps & { name: UploadedTab }) {
  return (
    <Shell focused={focused} size={size} raster>
      <Image
        source={uploadedSources[name]}
        style={[styles.profileImage, { width: size, height: size, tintColor: color }]}
        fadeDuration={0}
        accessible={false}
        testID={`navbar-icon-${name}`}
      />
    </Shell>
  );
}

export function ChatsIcon(props: NavIconProps) {
  return <UploadedNavIcon name="chats" {...props} />;
}

export function ConnectIcon(props: NavIconProps) {
  return <UploadedNavIcon name="connect" {...props} />;
}

export function MomentsIcon(props: NavIconProps) {
  return <UploadedNavIcon name="moments" {...props} />;
}

export function VoiceIcon({ focused, color, size = 26 }: NavIconProps) {
  return (
    <Shell focused={focused} size={size} raster>
      <MicGlyph size={size} color={color} testID="navbar-icon-voice" />
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
