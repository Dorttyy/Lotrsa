import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
    Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "@/src/components/layout/KeyboardAvoidingView";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";
import { AppSwitch } from "@/src/components/AppSwitch";

import { Avatar } from "@/src/components/Avatar";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, Conversation, User } from "@/src/utils/api";

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

/** Group Chat Settings — name, members grid (+/−), notice, toggles, leave. */
export default function GroupSettings() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removeMode, setRemoveMode] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [pinAll, setPinAll] = useState(false);
  const [renameAll, setRenameAll] = useState(true);
  const [notifsOn, setNotifsOn] = useState(true);
  const [voiceCalls, setVoiceCalls] = useState(true);

  const load = useCallback(async () => {
    if (!user || !id) return;
    try {
      const [c, m] = await Promise.all([
        api.get<Conversation>(`/chats/${id}`),
        api.get<{ owner_id: string; members: User[] }>(`/chats/${id}/group/members`),
      ]);
      setConv(c);
      setMembers(m.members);
      setOwnerId(m.owner_id);
    } catch {
      /* keep whatever we have */
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isOwner = ownerId === user?.id;

  const saveRename = async () => {
    const name = renameDraft.trim();
    if (!name) return;
    try {
      await api.post(`/chats/${id}/group/name`, { name });
      setConv((prev) => (prev ? { ...prev, name } : prev));
      setRenameOpen(false);
    } catch (e) {
      notify("Rename", e instanceof Error ? e.message : "Could not rename.");
    }
  };

  const removeMember = async (m: User) => {
    if (!isOwner || m.id === user?.id) return;
    try {
      await api.post(`/chats/${id}/group/remove`, { user_id: m.id });
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) {
      notify("Remove", e instanceof Error ? e.message : "Could not remove.");
    }
  };

  const leaveGroup = () => {
    const doLeave = async () => {
      try {
        await api.post(`/chats/${id}/group/leave`);
        router.replace("/(tabs)/chats");
      } catch (e) {
        notify("Leave", e instanceof Error ? e.message : "Could not leave.");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm("Leave this group and delete the chat?")) doLeave();
    } else {
      Alert.alert("Leave Group", "Leave this group and delete the chat?", [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: doLeave },
      ]);
    }
  };

  const soon = (label: string) => notify(label, "This option is coming soon!");

  if (loading || !conv) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const Row = ({
    icon,
    tint,
    label,
    right,
    onPress,
    danger,
    testID,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    label: string;
    right?: React.ReactNode;
    onPress?: () => void;
    danger?: boolean;
    testID?: string;
  }) => (
    <Pressable testID={testID} style={styles.row} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: tint + "22" }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: "#E11D48" }]}>{label}</Text>
      {right ?? (
        <Ionicons name="chevron-forward" size={17} color={colors.onSurfaceSecondary} />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="group-settings-screen">
      <View style={styles.header}>
        <Pressable testID="gs-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Chat Settings</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Group name + members */}
        <View style={styles.card}>
          <View style={styles.nameBlock}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nameLabel}>Group Name</Text>
              <Text style={styles.nameValue} numberOfLines={1}>
                {conv.name}
              </Text>
            </View>
            <Pressable
              testID="gs-edit-name"
              onPress={() => router.push(`/group-name/${id}`)}
              hitSlop={8}
            >
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>
          <View style={styles.divider} />
          <Text style={styles.membersLabel}>Group members ({members.length})</Text>
          <View style={styles.membersGrid}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                testID={`gs-member-${m.id}`}
                style={styles.memberCell}
                onPress={() =>
                  removeMode ? removeMember(m) : router.push(`/user/${m.id}`)
                }
              >
                <View>
                  <Avatar
                    name={m.name}
                    url={m.avatar_url}
                    size={56}
                    flagCode={countryToCode(m.country)}
                  />
                  {removeMode && m.id !== user?.id && (
                    <View style={styles.removeBadge}>
                      <Ionicons name="remove" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.name?.split(" ")[0]}
                </Text>
                {m.id === ownerId && <Text style={styles.ownerTag}>Owner</Text>}
              </Pressable>
            ))}
            <Pressable
              testID="gs-add-member"
              style={styles.memberCell}
              onPress={() => router.push({ pathname: "/create-group", params: { add_to: String(id) } })}
            >
              <View style={styles.addCircle}>
                <Ionicons name="add" size={26} color={colors.onSurface} />
              </View>
              <Text style={styles.memberName}>Add</Text>
            </Pressable>
            {isOwner && (
              <Pressable
                testID="gs-remove-member"
                style={styles.memberCell}
                onPress={() => setRemoveMode((v) => !v)}
              >
                <View style={[styles.addCircle, removeMode && { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons
                    name="remove"
                    size={26}
                    color={removeMode ? "#E11D48" : colors.onSurface}
                  />
                </View>
                <Text style={styles.memberName}>Remove</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.divider} />
          <Pressable
            testID="gs-notice"
            style={styles.noticeRow}
            onPress={() => soon("Group Notice")}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Group Notice</Text>
              <Text style={styles.noticeSub}>Not Set</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.onSurfaceSecondary} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Row icon="qr-code" tint="#0E9AE0" label="Group QR Code" onPress={() => router.push(`/group-qr/${id}`)} />
          <View style={styles.divider} />
          <Row icon="person-add" tint="#0E9AE0" label="Approval Settings" onPress={() => router.push(`/group-approval/${id}`)} />
        </View>

        <View style={styles.card}>
          <Row icon="folder" tint="#6366F1" label="Chat Files" onPress={() => soon("Chat Files")} />
          <View style={styles.divider} />
          <Row icon="search" tint="#0E9AE0" label="Search History" onPress={() => soon("Search History")} />
          <View style={styles.divider} />
          <Row
            icon="chatbubble"
            tint="#0E9AE0"
            label="Allow All to Pin Messages"
            right={
              <AppSwitch
                value={pinAll}
                onValueChange={setPinAll}
                trackColor={{ true: "#0E9AE0", false: colors.borderStrong }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <View style={styles.divider} />
          <Row
            icon="pencil"
            tint="#0E9AE0"
            label="Allow All to Rename Group"
            right={
              <AppSwitch
                value={renameAll}
                onValueChange={setRenameAll}
                trackColor={{ true: "#0E9AE0", false: colors.borderStrong }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </View>

        <View style={styles.card}>
          <Row
            icon="notifications"
            tint="#3B82F6"
            label="Notifications"
            right={
              <AppSwitch
                value={notifsOn}
                onValueChange={setNotifsOn}
                trackColor={{ true: "#0E9AE0", false: colors.borderStrong }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </View>

        <View style={styles.card}>
          <Row icon="text" tint="#38B6F1" label="My Alias" onPress={() => soon("My Alias")} />
        </View>

        <View style={styles.card}>
          <Row icon="chatbubbles" tint="#22C55E" label="Chat Bubbles" onPress={() => soon("Chat Bubbles")} />
          <View style={styles.divider} />
          <Row icon="color-palette" tint="#0E9AE0" label="Set chat background" onPress={() => soon("Chat background")} />
          <View style={styles.divider} />
          <Row icon="globe" tint="#0EA5E9" label="Translation Target Language" onPress={() => router.push("/translate")} />
        </View>

        <View style={styles.card}>
          <Row
            icon="call"
            tint="#3B82F6"
            label="Receive Voice Calls"
            right={
              <AppSwitch
                value={voiceCalls}
                onValueChange={setVoiceCalls}
                trackColor={{ true: "#0E9AE0", false: colors.borderStrong }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </View>

        <View style={styles.card}>
          <Row icon="alert-circle" tint="#E11D48" label="Report" danger onPress={() => notify("Report", "Thanks — our team will review this group.")} />
          <View style={styles.divider} />
          <Row icon="trash" tint="#E11D48" label="Clear Chat History" danger onPress={() => soon("Clear Chat History")} />
          <View style={styles.divider} />
          <Row
            icon="log-out"
            tint="#E11D48"
            label="Leave Group & Delete Chat"
            danger
            testID="gs-leave"
            onPress={leaveGroup}
          />
        </View>
      </ScrollView>

      {/* Rename modal */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRenameOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Group Name</Text>
            <TextInput
              testID="gs-rename-input"
              style={styles.modalInput}
              value={renameDraft}
              onChangeText={setRenameDraft}
              maxLength={80}
              autoFocus
            />
            <Pressable
              testID="gs-rename-save"
              style={[styles.modalSave, !renameDraft.trim() && { opacity: 0.5 }]}
              disabled={!renameDraft.trim()}
              onPress={saveRename}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </Pressable>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: colors.onSurface,
    },
    body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
    },
    nameBlock: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
    nameLabel: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary },
    nameValue: { fontFamily: fonts.textBold, fontSize: 17, color: colors.onSurface, marginTop: 2 },
    editText: { fontFamily: fonts.textBold, fontSize: 15, color: "#0E9AE0" },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    membersLabel: { fontFamily: fonts.textBold, fontSize: 15.5, color: colors.onSurface, paddingTop: 14 },
    membersGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.lg,
      paddingVertical: 14,
    },
    memberCell: { alignItems: "center", width: 62 },
    memberName: {
      fontFamily: fonts.textSemi,
      fontSize: 11.5,
      color: colors.onSurface,
      marginTop: 5,
      maxWidth: 62,
    },
    ownerTag: { fontFamily: fonts.text, fontSize: 10.5, color: "#0E9AE0" },
    addCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    removeBadge: {
      position: "absolute",
      top: -3,
      right: -3,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#E11D48",
      alignItems: "center",
      justifyContent: "center",
    },
    noticeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
    noticeTitle: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
    noticeSub: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 2 },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 14 },
    rowIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: { flex: 1, fontFamily: fonts.textSemi, fontSize: 15.5, color: colors.onSurface },
    modalRoot: { flex: 1, alignItems: "center", justifyContent: "center", padding: 26 },
    modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(15,23,42,0.5)" },
    modalCard: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    modalTitle: { fontFamily: fonts.displaySemi, fontSize: 16.5, color: colors.onSurface },
    modalInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontFamily: fonts.text,
      fontSize: 15,
      color: colors.onSurface,
    },
    modalSave: {
      backgroundColor: "#0E9AE0",
      borderRadius: radius.pill,
      paddingVertical: 13,
      alignItems: "center",
    },
    modalSaveText: { fontFamily: fonts.textBold, fontSize: 15, color: "#FFFFFF" },
  });
