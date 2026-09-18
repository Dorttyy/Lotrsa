import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { langName } from "@/src/constants/languages";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, ThemeColors } from "@/src/theme";
import { Ionicons } from "@/src/ui/icons";
import { User } from "@/src/utils/api";

/** Only a top request card while ringing; full call UI opens after acceptance. */
export function IncomingCallPopup({ peer, outgoing, expiresAt, onAccept, onReject }: {
  peer: User; outgoing: boolean; expiresAt: number; onAccept: () => void; onReject: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = styles(colors);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, [expiresAt]);
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return <View testID="call-overlay" style={[s.backdrop, { paddingTop: insets.top + 16 }]}>
    <View testID={outgoing ? "outgoing-call-popup" : "incoming-call-popup"} style={s.card} accessibilityViewIsModal>
      <View style={s.topRow}>
        <View style={s.kind}><Ionicons name="call" color={colors.brand} size={15} /><Text testID="call-request-title" style={s.kindText}>{outgoing ? "CALL REQUEST" : "INCOMING CALL"}</Text></View>
        <View style={[s.countdown, remaining <= 10 && { backgroundColor: colors.surfaceSecondary }]}><Ionicons name="time-outline" size={14} color={remaining <= 10 ? colors.error : colors.brand} /><Text testID="call-ring-countdown" accessibilityLabel={`${remaining} seconds remaining`} style={[s.countText, remaining <= 10 && { color: colors.error }]}>{remaining}s</Text></View>
      </View>
      <View style={s.person}><ProfileAvatar testID="ringing-peer-avatar" user={peer} online={false} />
        <View style={s.identity}><Text testID="ringing-peer-name" numberOfLines={2} style={s.name}>{peer.name}</Text><Text testID="call-request-description" style={s.description}>{outgoing ? "Waiting for an answer…" : "Wants to talk with you"}{peer.native_language ? ` · ${langName(peer.native_language)}` : ""}</Text></View>
      </View>
      <View style={s.progressTrack}><View testID="call-ring-progress" style={[s.progress, { width: `${Math.min(100, remaining / 45 * 100)}%` }]} /></View>
      <View style={s.actions}>
        <Pressable testID={outgoing ? "call-cancel-request-btn" : "call-decline-btn"} accessibilityLabel={outgoing ? "Cancel call request" : "Reject call"} onPress={onReject} style={({ pressed }) => [s.action, s.reject, { opacity: pressed ? 0.65 : 1 }]}><Ionicons name="call" size={20} color={colors.error} style={s.rejectIcon} /><Text style={[s.actionText, { color: colors.error }]}>{outgoing ? "Cancel request" : "Reject"}</Text></Pressable>
        {!outgoing && <Pressable testID="call-accept-btn" accessibilityLabel="Accept call" disabled={remaining === 0} onPress={onAccept} style={({ pressed }) => [s.action, s.accept, { opacity: pressed || remaining === 0 ? 0.65 : 1 }]}><Ionicons name="call" size={20} color={colors.onBrand} /><Text style={[s.actionText, { color: colors.onBrand }]}>Accept</Text></Pressable>}
      </View>
      <Text testID="call-request-note" style={s.note}>{outgoing ? "The call screen opens when your partner accepts." : "Accept to open the call screen and turn on your microphone."}</Text>
    </View>
  </View>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(5,16,30,0.38)", alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 16 },
  card: { width: "100%", maxWidth: 420, backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 16, borderWidth: 1, borderColor: c.border },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, kind: { flexDirection: "row", gap: 7, alignItems: "center" }, kindText: { fontFamily: fonts.textBold, fontSize: 10, letterSpacing: 1, color: c.onSurfaceSecondary },
  countdown: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, backgroundColor: c.brandTertiary }, countText: { fontFamily: fonts.textBold, fontSize: 12, color: c.brand, fontVariant: ["tabular-nums"] },
  person: { flexDirection: "row", gap: 14, alignItems: "center" }, identity: { flex: 1, minWidth: 0, gap: 4 }, name: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 23, color: c.onSurface }, description: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.onSurfaceSecondary },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: c.surfaceSecondary, overflow: "hidden" }, progress: { height: 3, backgroundColor: c.brand, borderRadius: 2 },
  actions: { flexDirection: "row", gap: 12 }, action: { minHeight: 48, flex: 1, borderRadius: 24, alignItems: "center", justifyContent: "center", gap: 8, flexDirection: "row" }, accept: { backgroundColor: c.brand }, reject: { backgroundColor: c.surfaceSecondary }, rejectIcon: { transform: [{ rotate: "135deg" }] },
  actionText: { fontSize: 14, fontFamily: fonts.textBold }, note: { fontSize: 10, lineHeight: 16, textAlign: "center", color: c.onSurfaceSecondary, fontFamily: fonts.text, marginTop: -4 },
});