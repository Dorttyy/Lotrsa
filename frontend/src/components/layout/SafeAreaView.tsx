import React, { forwardRef } from "react";
import { SafeAreaView as NativeSafeAreaView, type Edge, type SafeAreaViewProps } from "react-native-safe-area-context";

export { useSafeAreaInsets } from "react-native-safe-area-context";

/** Keep each screen's existing top/bottom owner, but always protect side cutouts.
 * No global font/palette/spacing overrides, and no extra bottom padding in tabs.
 */
export const SafeAreaView = forwardRef<
  React.ComponentRef<typeof NativeSafeAreaView>, SafeAreaViewProps
>(function SafeAreaView({ edges, ...props }, ref) {
  const safeEdges: SafeAreaViewProps["edges"] = Array.isArray(edges)
    ? Array.from(new Set<Edge>([...edges, "left", "right"]))
    : edges ? { left: "additive", right: "additive", ...edges } : undefined;
  return <NativeSafeAreaView ref={ref} {...props} edges={safeEdges} />;
});