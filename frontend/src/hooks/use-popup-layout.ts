import { useScreenSpace } from "./use-screen-space";

/** Preserve anchored menus on roomy screens; bound/scroll them on short ones. */
export function usePopupLayout() {
  const { width, height, insets, safeWidth, safeHeight, fontScale } = useScreenSpace();
  const cardWidth = Math.min(258, Math.max(0, safeWidth - 48));
  return {
    width, height, fontScale, cardWidth, safeWidth,
    left: (x: number, itemWidth: number) => Math.max(insets.left + 16,
      Math.min(x, width - insets.right - itemWidth - 16)),
    vertical: (anchorY: number, previewHeight: number, menuHeight: number, accessoryHeight = 0) => {
      const top = insets.top + 12;
      const available = Math.max(0, safeHeight - 24);
      const pillHeight = Math.min(previewHeight, available * 0.26);
      const cardHeight = Math.max(0, available - pillHeight - 14 - accessoryHeight);
      const total = pillHeight + 14 + accessoryHeight + Math.min(menuHeight, cardHeight);
      const pillTop = Math.max(top, Math.min(anchorY, height - insets.bottom - 12 - total));
      return { pillTop, pillHeight, accessoryTop: pillTop + pillHeight + 14,
        cardTop: pillTop + pillHeight + 14 + accessoryHeight,
        cardMaxHeight: Math.max(0, height - insets.bottom - 12 - pillTop - pillHeight - 14 - accessoryHeight) };
    },
  };
}