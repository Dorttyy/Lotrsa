import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, ThemeColors } from "@/src/theme";
import { api, Room } from "@/src/utils/api";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";

type Invitation = { id: string; from: string; expires_at: number; kind: "stage" | "moderators" };

export function StageInvitation({ room, userId, subscribe, onAccepted }: {
  room: Room; userId: string; subscribe: (fn: (e: any) => void) => () => void; onAccepted: () => void;
}) {
  const { colors } = useTheme();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const resolved = useRef(new Set<string>());
  const [error, setError] = useState("");
  const member = room.members?.find(m => m.id === userId);
  const present = !!member;

  useEffect(() => {
    let live = true;
    if (!present) { setInvitation(null); return; }
    const fetchInvite = async () => {
      try {
        const [mod, stage] = await Promise.all([api.get<{ invitation: Invitation | null }>(`/rooms/${room.id}/moderators/invitation`), api.get<{ invitation: Invitation | null }>(`/rooms/${room.id}/stage/invitation`)]);
        const usable = (invite: Invitation | null) => !!invite && !resolved.current.has(invite.id) && invite.expires_at > Date.now();
        if (live) setInvitation(usable(mod.invitation) ? { ...mod.invitation!, kind: "moderators" } : usable(stage.invitation) ? { ...stage.invitation!, kind: "stage" } : null);
      }
      catch (e: any) { if (live && [403,404].includes(e.status)) setInvitation(null); }
    };
    void fetchInvite();
    const timer = setInterval(fetchInvite, 5000);
    const unsub = subscribe(event => {
      if (event.room_id === room.id && ["room_stage_invite", "room_moderator_invite"].includes(event.type)) { setError(""); void fetchInvite(); }
      if (event.type === "room_update" && event.room?.id === room.id) void fetchInvite();
    });
    return () => { live = false; clearInterval(timer); unsub(); };
  }, [room.id, room.host?.id, present, subscribe]);

  useEffect(() => {
    if (!invitation) return;
    const timer = setTimeout(() => setInvitation(null), Math.max(0, invitation.expires_at - Date.now()));
    return () => clearTimeout(timer);
  }, [invitation]);

  const respond = async (accept: boolean) => {
    if (!invitation || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await api.post(`/rooms/${room.id}/${invitation.kind}/respond`, { invitation_id: invitation.id, accept });
      resolved.current.add(invitation.id);
      setInvitation(null);
      if (accept) onAccepted();
    } catch (e: any) {
      if ([403,404,409].includes(e.status)) setInvitation(null);
      else setError(e.message || "Could not respond. Please try again.");
    } finally { lock.current = false; setBusy(false); }
  };
  const moderator = invitation?.kind === "moderators";
  const prefix = moderator ? "moderator-invitation" : "stage-invitation";
  return <Modal transparent visible={!!invitation && present} animationType="fade" onRequestClose={() => void respond(false)}>
    <View style={[s.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <BoundedSheet testID={moderator ? "room-moderator-invitation" : "room-stage-invitation"} style={s.card} accessibilityViewIsModal>
        <Text testID={`${prefix}-title`} style={s.title}>{moderator ? "Become a room moderator?" : "Invite you to the stage"}</Text>
        {!!error && <Text testID={`${prefix}-error`} style={s.error}>{error}</Text>}
        <View style={s.actions}><Pressable testID={`${prefix}-reject`} disabled={busy} onPress={() => respond(false)} style={[s.button,s.reject]}><Text style={s.rejectText}>Reject</Text></Pressable><Pressable testID={`${prefix}-accept`} disabled={busy} onPress={() => respond(true)} style={[s.button,s.accept]}><Text style={s.acceptText}>{busy ? "Please wait…" : "Accept"}</Text></Pressable></View>
      </BoundedSheet>
    </View>
  </Modal>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(5,16,30,0.35)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  card: { width: "100%", maxWidth: 340, borderRadius: 22, backgroundColor: c.surface, padding: 20, gap: 20 },
  title: { fontFamily: fonts.textBold, fontSize: 17, lineHeight: 24, textAlign: "center", color: c.onSurface }, error: { color: c.error, fontSize: 12 },
  actions: { flexDirection: "row", gap: 12 }, button: { flex: 1, minHeight: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8 }, reject: { backgroundColor: c.surfaceSecondary }, accept: { backgroundColor: c.brand }, rejectText: { color: c.error, fontFamily: fonts.textBold, fontSize: 14 }, acceptText: { color: c.onBrand, fontFamily: fonts.textBold, fontSize: 14 },
});