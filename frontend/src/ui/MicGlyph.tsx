import React from "react";
import { Image, StyleSheet, View } from "react-native";
import type { ColorValue, ImageStyle, StyleProp, TextStyle, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import navbarUploads from "@/src/assets/navbar-upload-icons.json";

/** One exact uploaded microphone source for navigation and every in-app alias. */
const microphoneSource = { uri: navbarUploads.voice };

export interface MicGlyphProps {
  size?: number;
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export function MicGlyph({
  size = 22,
  color = "#111827",
  style,
  testID,
  accessibilityLabel,
}: MicGlyphProps) {
  return (
    <Image
      source={microphoneSource}
      style={[styles.image, { width: size, height: size }, style as StyleProp<ImageStyle>, { tintColor: color }]}
      fadeDuration={0}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      testID={testID ?? "uploaded-microphone"}
    />
  );
}

/** Same microphone artwork, with a distinct slash; never use speaker-mute here. */
export function MicOffGlyph({
  size = 22,
  color = "#111827",
  style,
  testID,
  accessibilityLabel,
}: MicGlyphProps) {
  return (
    <View
      style={[{ width: size, height: size }, style as StyleProp<ViewStyle>]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      testID={testID ?? "uploaded-microphone-off"}
    >
      <Image
        source={microphoneSource}
        style={[StyleSheet.absoluteFill, styles.image, { tintColor: color }]}
        fadeDuration={0}
        accessible={false}
      />
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessible={false}
      >
        <Path d="M3.6 20.4 L20.4 3.6" stroke={color} strokeWidth={2.25} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: "contain" },
});
