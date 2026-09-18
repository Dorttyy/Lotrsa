import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { MessageReaction } from "@/src/utils/api";
import { fonts } from "@/src/theme";

/** Floating below the bubble border; the bubble's bottom margin reserves room. */
export function MessageReactionBadges({ messageId, reactions = [], mine }: {
  messageId: string; reactions?: MessageReaction[]; mine: boolean;
}) {
  const { colors } = useTheme();
  if (!reactions.length) return null;
  const capsule = { backgroundColor: colors.surface, borderColor: colors.border };
  return <View testID={`message-reactions-${messageId}`} pointerEvents="none"
    accessibilityLabel={reactions.map(r => `${r.emoji}: ${r.count}`).join(", ")}
    style={[s.row, mine ? s.mine : s.theirs]}>
    {reactions.slice(0, 3).map(r => <View key={r.emoji} testID={`message-reaction-${messageId}-${r.emoji}`} style={[s.badge, capsule]}>
      <Text testID={`reaction-emoji-${messageId}-${r.emoji}`} allowFontScaling={false} style={s.emoji}>{r.emoji}</Text>
      {r.count > 1 && <Text testID={`reaction-count-${messageId}-${r.emoji}`} style={[s.count, { color: colors.onSurfaceSecondary }]}>{r.count}</Text>}
    </View>)}
    {reactions.length > 3 && <View testID={`reaction-more-${messageId}`} style={[s.badge, capsule]}>
      <Text style={[s.count, { color: colors.onSurfaceSecondary }]}>+{reactions.length - 3}</Text>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  row: { position: "absolute", bottom: -13, flexDirection: "row", alignItems: "center", gap: 3, zIndex: 2 },
  mine: { right: 8 }, theirs: { left: 8 },
  badge: { minHeight: 24, flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 6, gap: 3 },
  emoji: { fontSize: 14, lineHeight: 20 }, count: { fontFamily: fonts.textSemi, fontSize: 11 },
});