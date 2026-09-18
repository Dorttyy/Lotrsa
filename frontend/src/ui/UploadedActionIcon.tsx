import React from "react";
import { Image, StyleSheet } from "react-native";
import type { ColorValue, ImageStyle, StyleProp, TextStyle } from "react-native";

import uploads from "@/src/assets/action-upload-icons.json";

export type UploadedActionName = keyof typeof uploads;

// Stable sources retain the exact uploaded artwork, without remote requests.
const sources = {
  lightning: { uri: uploads.lightning },
  notification: { uri: uploads.notification },
  call: { uri: uploads.call },
  speakerMute: { uri: uploads.speakerMute },
  menu: { uri: uploads.menu },
};

// Explicit aliases only. Never conflate a muted speaker, microphone, and bell.
const aliases: Record<string, UploadedActionName | undefined> = {
  flash: "lightning",
  bolt: "lightning",
  lightning: "lightning",
  "lightning-bolt": "lightning",
  notifications: "notification",
  bell: "notification",
  call: "call",
  phone: "call",
  "volume-mute": "speakerMute",
  "volume-off": "speakerMute",
  menu: "menu",
  "reorder-three": "menu",
  "reorder-four": "menu",
};

export function resolveUploadedAction(name?: string): UploadedActionName | undefined {
  const base = (name || "").replace(/-(outline|sharp)$/i, "");
  return Object.prototype.hasOwnProperty.call(aliases, base) ? aliases[base] : undefined;
}

export function UploadedActionIcon({
  artwork,
  size,
  color,
  style,
  testID,
  accessibilityLabel,
}: {
  artwork: UploadedActionName;
  size: number;
  color: ColorValue;
  style?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Image
      source={sources[artwork]}
      style={[
        styles.image,
        { width: size, height: size },
        style as StyleProp<ImageStyle>,
        { tintColor: color },
      ]}
      fadeDuration={0}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      testID={testID ?? `uploaded-action-${artwork}`}
    />
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: "contain" },
});
