import React from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { fonts, ThemeColors } from "@/src/theme";
import { RoomMember } from "@/src/utils/api";
import { Ionicons } from "@/src/ui/icons";

export function StageRequestsSheet({ visible, members, busy, error, onClose, onAccept, onReject }: {
  visible: boolean; members: RoomMember[]; busy: boolean; error?: string; onClose: () => void;
  onAccept: (member: RoomMember) => void; onReject: (member: RoomMember) => void;
}) {
  const { colors } = useTheme(); const s = styles(colors); const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType={Platform.OS === "web" ? "fade" : "slide"} onRequestClose={onClose}>
    <View style={[s.overlay, { paddingTop: insets.top + 20 }]}>
      <Pressable testID="stage-requests-backdrop" accessibilityLabel="Close stage requests" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View testID="stage-requests-sheet" style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.header}><Text testID="stage-requests-title" style={s.title}>Stage requests · {members.length}</Text><Pressable testID="stage-requests-close" accessibilityLabel="Close stage requests" onPress={onClose} style={s.close}><Ionicons name="close" size={22} color={colors.onSurface} /></Pressable></View>
        <ScrollView style={s.list} contentContainerStyle={s.content}>
          {!!error && <Text testID="stage-requests-error" style={[s.copy, { color: colors.error }]}>{error}</Text>}
          {members.length === 0 && <Text testID="stage-requests-empty" style={s.copy}>No pending requests.</Text>}
          {members.map(member => <View key={member.id} testID={`stage-request-${member.id}`} style={s.item}>
            <View style={s.person}><ProfileAvatar user={member} size={44} /><Text testID={`stage-request-name-${member.id}`} numberOfLines={2} style={s.name}>{member.name}</Text></View>
            <View style={s.actions}><Pressable testID={`hand-dismiss-${member.id}`} disabled={busy} onPress={() => onReject(member)} style={[s.button,s.reject]}><Text style={s.rejectText}>Reject</Text></Pressable><Pressable testID={`hand-accept-${member.id}`} disabled={busy} onPress={() => onAccept(member)} style={[s.button,s.accept]}><Text style={s.acceptText}>Accept</Text></Pressable></View>
          </View>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", backgroundColor: "rgba(5,16,30,0.5)" }, sheet: { maxHeight: "85%", flexShrink: 1, backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, header: { paddingHorizontal: 20, paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }, title: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 26, color: c.onSurface }, close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, list: { flexShrink: 1, minHeight: 0 }, content: { padding: 20, gap: 20 }, item: { borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 20, gap: 12 }, person: { flexDirection: "row", alignItems: "center", gap: 12 }, name: { flex: 1, fontFamily: fonts.textBold, fontSize: 15, color: c.onSurface }, copy: { fontFamily: fonts.text, fontSize: 14, color: c.onSurfaceSecondary }, actions: { flexDirection: "row", gap: 12 }, button: { flex: 1, minHeight: 44, borderRadius: 24, alignItems: "center", justifyContent: "center" }, reject: { backgroundColor: c.surfaceSecondary }, accept: { backgroundColor: c.brand }, rejectText: { fontFamily: fonts.textBold, fontSize: 14, color: c.error }, acceptText: { fontFamily: fonts.textBold, fontSize: 14, color: c.onBrand },
});