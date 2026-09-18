import React, { useId } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { ColorValue, StyleProp, TextStyle, ViewStyle } from "react-native";

/** User's exact managed upload, bundled for reliable offline composer buttons. */
const source = require("../../assets/icons/send.png");

export function SendGlyph({ size = 22, color = "#111827", style, testID, accessibilityLabel }: {
  size?: number; color?: ColorValue; style?: StyleProp<TextStyle>;
  testID?: string; accessibilityLabel?: string;
}) {
  const instance = useId().replace(/:/g, "");
  const id = testID || `uploaded-send-${instance}`;
  // Alpha bounds are (64,72)-(439,448). Crop transparent margins in layout only;
  // no redraw, rotation or modification of the supplied PNG bytes.
  const scale = size / 376;
  return <View testID={id} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}
    style={[s.wrap, { width: size, height: size }, style as StyleProp<ViewStyle>]}>
    <Image testID={`${id}-image`} source={source} fadeDuration={0} accessible={false}
      style={[s.image, { width: 512 * scale, height: 512 * scale,
        left: -63.5 * scale, top: -72 * scale, tintColor: color }]} />
  </View>;
}
const s = StyleSheet.create({
  wrap: { overflow: "hidden", flexShrink: 0 },
  image: { position: "absolute", resizeMode: "contain" },
});