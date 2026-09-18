import React, { forwardRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView as NativeAvoider } from "react-native-keyboard-controller";

/** One keyboard owner per form. Keep headers stationary; shrink the scroll area.
 * Native absolute measurement includes safe areas, headers and modal offsets.
 * The browser already resizes its visual viewport, so never avoid twice there.
 */
export const KeyboardAvoidingView = forwardRef<
  View, React.ComponentProps<typeof NativeAvoider>
>(function KeyboardAvoidingView({ style, behavior, ...props }, ref) {
  if (Platform.OS === "web") {
    const { enabled, automaticOffset, keyboardVerticalOffset, contentContainerStyle, ...viewProps } = props;
    return <View ref={ref} {...viewProps} style={[styles.bounds, style]} />;
  }
  return (
    <NativeAvoider
      ref={ref}
      automaticOffset
      {...props}
      behavior={behavior === "translate-with-padding" || !behavior
        ? (Platform.OS === "ios" ? "padding" : "height") : behavior}
      style={[styles.bounds, style]}
    />
  );
});

const styles = StyleSheet.create({ bounds: { minHeight: 0, minWidth: 0 } });