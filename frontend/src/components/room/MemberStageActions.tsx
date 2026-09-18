import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@/src/ui/icons";
import { fonts } from "@/src/theme";
import { RoomMember } from "@/src/utils/api";

export function MemberStageActions({ member, isHost, isOwner, isSelf, busy, onAction }: {
  member: RoomMember; isHost: boolean; isOwner: boolean; isSelf: boolean; busy: boolean;
  onAction: (action: "invite" | "mute" | "remove-stage" | "kick" | "leave-stage" | "moderator-add" | "moderator-remove" | "self-mute" | "leave-room") => void;
}) {
  const actions: { key: "invite" | "mute" | "remove-stage" | "kick" | "leave-stage" | "moderator-add" | "moderator-remove" | "self-mute" | "leave-room"; label: string; icon: string; disabled?: boolean }[] = [];
  if (isHost && !isSelf && member.role !== "host" && (isOwner || !member.is_moderator)) {
    if (member.role === "listener") actions.push({ key: "invite", label: member.stage_invited ? "Invitation sent" : "Invite to stage", icon: "mic", disabled: member.stage_invited });
    else actions.push({ key: "mute", label: member.mic_on ? "Mute microphone" : "Microphone muted", icon: "mic-off", disabled: !member.mic_on }, { key: "remove-stage", label: "Remove from stage", icon: "arrow-down-circle-outline" });
    actions.push({ key: "kick", label: "Remove from room", icon: "exit-outline" });
  }
  if (isOwner && !isSelf && member.role !== "host") actions.push({ key: member.is_moderator ? "moderator-remove" : "moderator-add", label: member.is_moderator ? "Remove moderator" : member.moderator_invited ? "Moderator invitation sent" : "Invite as moderator", icon: "shield-checkmark-outline", disabled: !member.is_moderator && member.moderator_invited });
  if (isSelf && member.role !== "listener") actions.push({ key: "self-mute", label: member.mic_on ? "Mute microphone" : "Unmute microphone", icon: member.mic_on ? "mic-off" : "mic" });
  if (isSelf && member.role === "speaker") actions.push({ key: "leave-stage", label: "Leave stage", icon: "arrow-down-circle-outline" });
  if (isSelf) actions.push({ key: "leave-room", label: "Leave room", icon: "exit-outline" });
  if (!actions.length) return null;
  return <View style={s.list}>{actions.map(action => <Pressable key={action.key} testID={`room-ms-${action.key}`} disabled={busy || action.disabled} onPress={() => onAction(action.key)} style={({ pressed }) => [s.button, { opacity: busy || action.disabled || pressed ? 0.45 : 1 }]}><Ionicons name={action.icon as any} size={20} color={action.key === "kick" ? "#F87171" : "#FFFFFF"} /><Text style={[s.label, action.key === "kick" && s.danger]}>{action.label}</Text></Pressable>)}</View>;
}
const s = StyleSheet.create({ list: { gap: 8, marginTop: 20 }, button: { minHeight: 48, padding: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", flexDirection: "row", alignItems: "center", gap: 12 }, label: { fontFamily: fonts.textSemi, fontSize: 14, color: "#FFFFFF" }, danger: { color: "#F87171" } });