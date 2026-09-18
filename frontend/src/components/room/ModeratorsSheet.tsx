import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import { ProfileAvatar } from "@/src/components/ProfileAvatar";
import { fonts, ThemeColors } from "@/src/theme";
import { Room, RoomMember, User } from "@/src/utils/api";
import { Ionicons } from "@/src/ui/icons";

export function ModeratorsSheet({ visible, room, busy, error, notice, onClose, onInvite, onRemove }: {
  visible: boolean; room: Room; busy: boolean; error: string; notice?: string; onClose: () => void;
  onInvite: (user: User) => void; onRemove: (user: User) => void;
}) {
  const { colors } = useTheme(); const s = styles(colors); const insets = useSafeAreaInsets();
  const assigned = room.moderator_members || [];
  const candidates = (room.members || []).filter(m => m.id !== room.host?.id && !m.is_moderator);
  const row = (user: User | RoomMember, moderator: boolean) => {
    const pending = "moderator_invited" in user && user.moderator_invited;
    return <View key={user.id} testID={`moderator-list-${user.id}`} style={s.row}>
      <ProfileAvatar user={user} size={44} /><View style={s.flex}><Text numberOfLines={2} style={s.name}>{user.name}</Text><Text style={s.copy}>{moderator ? "Moderator · no ownership or earnings" : pending ? "Waiting for a response" : "Invite to help manage this room"}</Text></View>
      <Pressable testID={`moderator-${moderator || pending ? "remove" : "add"}-${user.id}`} disabled={busy} onPress={() => moderator || pending ? onRemove(user) : onInvite(user)} style={s.button}><Text style={[s.action, (moderator || pending) && { color: colors.error }]}>{moderator ? "Remove" : pending ? "Cancel" : "Add"}</Text></Pressable>
    </View>;
  };
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={[s.overlay,{ paddingTop: insets.top + 20 }]}>
    <Pressable testID="moderators-backdrop" accessibilityLabel="Close moderators" onPress={onClose} style={StyleSheet.absoluteFill} />
    <View testID="room-moderators-sheet" style={[s.sheet,{ paddingBottom: insets.bottom + 16 }]}><View style={s.header}><Text testID="room-moderators-title" style={s.title}>Moderators</Text><Pressable testID="moderators-close" accessibilityLabel="Close moderators" onPress={onClose} style={s.button}><Ionicons name="close" size={22} color={colors.onSurface} /></Pressable></View>
      {!!error && <Text testID="moderators-error" style={s.error}>{error}</Text>}
      {!!notice && <Text testID="moderators-notice" accessibilityLiveRegion="polite" style={[s.error, { color: colors.onSurfaceSecondary }]}>{notice}</Text>}
      <ScrollView style={s.scroll} contentContainerStyle={s.content}><Text testID="moderators-count" style={s.section}>Appointed · {assigned.length}</Text>{assigned.map(user => row(user,true))}{!assigned.length && <Text testID="moderators-empty" style={s.copy}>No moderators yet. Invite a member below.</Text>}<Text style={s.section}>Room members</Text>{candidates.map(user => row(user,false))}{!candidates.length && <Text testID="moderators-no-candidates" style={s.copy}>No other members available to invite.</Text>}</ScrollView>
    </View>
  </View></Modal>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", backgroundColor: "rgba(5,16,30,0.5)" }, sheet: { maxHeight: "90%", flexShrink: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.surface }, header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12 }, title: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 22, color: c.onSurface }, button: { minWidth: 48, minHeight: 48, justifyContent: "center", alignItems: "center" }, scroll: { flexShrink: 1, minHeight: 0 }, content: { padding: 20, gap: 18 }, section: { fontFamily: fonts.textBold, fontSize: 14, color: c.onSurfaceSecondary }, row: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.divider }, flex: { flex: 1, minWidth: 0, gap: 4 }, name: { fontFamily: fonts.textBold, fontSize: 14, color: c.onSurface }, copy: { fontFamily: fonts.text, fontSize: 11, lineHeight: 17, color: c.onSurfaceSecondary }, action: { fontFamily: fonts.textBold, fontSize: 12, color: c.brand }, error: { paddingHorizontal: 20, color: c.error, fontSize: 12, lineHeight: 18 },
});