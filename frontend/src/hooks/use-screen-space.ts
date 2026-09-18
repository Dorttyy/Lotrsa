import { BottomTabBarHeightContext } from "expo-router/js-tabs";
import { useContext } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/src/theme";

/**
 * Bottom-space helpers — one place that knows how much room the system UI
 * (home indicator / Android nav bar) and the app's own bottom tab bar need.
 *
 * React Navigation's tab bar occupies real layout space (it is not absolutely
 * positioned) and already includes the safe-area inset, so screens *inside* a
 * tab navigator must NOT add the inset again — that would create a visible
 * double gap. `BottomTabBarHeightContext` tells us which case we're in.
 */

/** True when the current screen renders inside a bottom-tab navigator. */
export const useInsideTabs = () =>
  useContext(BottomTabBarHeightContext) !== undefined;

/** Live dimensions: rotation, split screen and accessibility changes reflow.
 * Modal bounds deliberately do NOT use tab context (modals cover the tabs).
 */
export function useScreenSpace() {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return {
    ...window,
    insets,
    safeWidth: Math.max(0, window.width - insets.left - insets.right),
    safeHeight: Math.max(0, window.height - insets.top - insets.bottom),
  };
}

/** Grow the existing icon/label row only when system text is enlarged. */
export function useTabContentHeight(baseHeight = 64) {
  const { fontScale } = useWindowDimensions();
  return baseHeight + Math.ceil(16 * Math.max(0, fontScale - 1));
}

/** For sheets already containing a FlatList/ScrollView: avoid nested scrolling. */
export function useSheetBounds() {
  const { safeHeight, insets } = useScreenSpace();
  return { maxHeight: Math.max(0, safeHeight - 16), flexShrink: 1,
    marginLeft: insets.left, marginRight: insets.right };
}

/**
 * Padding to append to a scroll container so its last item can always be
 * scrolled fully clear of the system UI / tab bar.
 *
 * @param extra breathing room after the last item (defaults to 24)
 */
export const useScrollBottomPadding = (extra: number = spacing.xl) => {
  const insets = useSafeAreaInsets();
  const insideTabs = useInsideTabs();
  return (insideTabs ? 0 : insets.bottom) + extra;
};

/**
 * Padding for a pinned/absolute footer (composer, CTA bar, sheet actions) so
 * its buttons stay above the home indicator / Android nav bar.
 *
 * @param extra padding the footer already wants on top of the inset
 */
export const useFooterBottomPadding = (extra: number = spacing.md) => {
  const insets = useSafeAreaInsets();
  const insideTabs = useInsideTabs();
  return (insideTabs ? 0 : insets.bottom) + extra;
};

/**
 * Bottom padding for content that sits behind an in-screen pinned footer:
 * footer height + its safe-area padding + a small gap.
 */
export const useContentBottomPadding = (
  footerHeight: number,
  extra: number = spacing.md,
) => {
  const footer = useFooterBottomPadding(extra);
  return footerHeight + footer;
};
