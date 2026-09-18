import React from "react";
import { Pressable, ScrollView, StyleSheet, type ViewProps } from "react-native";
import { useScreenSpace } from "@/src/hooks/use-screen-space";

/** Retains the existing card's styling; only overflowing content scrolls.
 * Existing sheet bottom padding is the sole owner of the bottom inset.
 */
export function BoundedSheet({ children, style, testID, ...props }: ViewProps) {
  const { safeHeight, insets } = useScreenSpace();
  const flat = StyleSheet.flatten(style) || {};
  return (
    <Pressable {...props} onPress={event => event.stopPropagation()} testID={testID} style={[
      style, styles.bounds, { maxHeight: Math.max(0, safeHeight - 16), marginLeft: insets.left, marginRight: insets.right },
    ]}>
      <ScrollView testID={testID ? `${testID}-scroll` : undefined}
        style={styles.scroll} contentContainerStyle={{ gap: flat.gap, alignItems: flat.alignItems }}
        keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {children}
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bounds: { flexShrink: 1, minHeight: 0 },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
});