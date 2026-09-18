import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { StatusBar } from "expo-status-bar";

import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/utils/api";
import { VideoStream } from "@/src/pro/VideoStream";
import { useProRtc } from "@/src/pro/useProRtc";
import { proColors, proFonts, proRadius } from "@/src/pro/theme";

interface Session {
  id: string;
  status: string;
  tutor: { id: string; name: string; avatar_url?: string; native_accent?: string };
  stream_room_token: string;
}

export default function ProSession() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<null | "chat" | "notebook">(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState("");
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    api
      .get<Session>(`/pro/sessions/${id}`)
      .then(setSession)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer.current);
  }, []);

  const {
    connected,
    messages,
    sendChat,
    localStream,
    remoteStream,
    peerPresent,
    mediaError,
    toggleTrack,
  } = useProRtc(session?.stream_room_token, user?.name || "You");

  const clock = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  const endCall = async () => {
    try {
      await api.post(`/pro/sessions/${id}/end`);
    } catch {
      // ignore
    }
    router.replace("/pro/home");
  };

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    sendChat(t);
    setDraft("");
  };

  const onToggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    toggleTrack("audio", next);
  };
  const onToggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    toggleTrack("video", next);
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={proColors.terracotta} />
      </View>
    );
  }

  const tutor = session?.tutor;
  const showRemoteVideo = !!remoteStream;
  const showLocalVideo = !!localStream && camOn;

  return (
    <View style={styles.screen} testID="pro-session-screen">
      <StatusBar style="light" />
      {/* Tutor primary feed (65%) */}
      <View style={styles.tutorFeed}>
        {showRemoteVideo ? (
          <VideoStream stream={remoteStream} style={StyleSheet.absoluteFill as any} />
        ) : (
          <>
            {tutor?.avatar_url ? (
              <Image
                source={{ uri: tutor.avatar_url }}
                style={styles.feedImg}
                contentFit="cover"
                blurRadius={3}
              />
            ) : null}
            <View style={styles.feedScrim} />
            <View style={styles.waitingBox}>
              <Avatar name={tutor?.name} url={tutor?.avatar_url} size={72} />
              <Text style={styles.waitingText}>
                {peerPresent ? "Connecting video…" : `Waiting for ${tutor?.name || "tutor"} to join…`}
              </Text>
              <ActivityIndicator color="#fff" style={{ marginTop: 6 }} />
            </View>
          </>
        )}

        <SafeAreaView edges={["top", "bottom"]} style={styles.feedTopBar}>
          <View style={styles.livePill}>
            <View style={[styles.liveDot, { backgroundColor: connected ? "#4ADE80" : "#EF5B4C" }]} />
            <Text style={styles.liveText}>{connected ? "LIVE" : "…"} · {clock}</Text>
          </View>
          <View style={styles.simPill}>
            <Ionicons name="wifi" size={12} color={"#fff"} />
            <Text style={styles.simText}>{peerPresent ? "Peer connected" : "P2P · WebRTC"}</Text>
          </View>
        </SafeAreaView>

        <View style={styles.tutorMeta}>
          <Avatar name={tutor?.name} url={tutor?.avatar_url} size={36} />
          <View>
            <Text style={styles.tutorName}>{tutor?.name}</Text>
            <Text style={styles.tutorAccent}>{tutor?.native_accent}</Text>
          </View>
        </View>

        {/* Student PiP (35%) */}
        <View style={styles.pip}>
          {showLocalVideo ? (
            <VideoStream stream={localStream} muted mirror style={StyleSheet.absoluteFill as any} />
          ) : (
            <View style={styles.pipInner}>
              {camOn ? (
                <>
                  <Avatar name={user?.name} url={user?.avatar_url} size={48} />
                  <Text style={styles.pipName}>{mediaError ? "No camera" : "You"}</Text>
                </>
              ) : (
                <Ionicons name="videocam-off" size={24} color={proColors.inkFaint} />
              )}
            </View>
          )}
        </View>
      </View>

      {/* Right sidebar utility panel */}
      {tab && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHead}>
            <Text style={styles.sidebarTitle}>
              {tab === "chat" ? "Live chat" : "Smart notebook"}
            </Text>
            <Pressable onPress={() => setTab(null)} hitSlop={8}>
              <Ionicons name="close" size={20} color={proColors.inkSoft} />
            </Pressable>
          </View>
          {tab === "chat" ? (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "web" ? undefined : "translate-with-padding"}
            >
              <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.chatList}>
                {messages.length === 0 ? (
                  <Text style={styles.chatEmpty}>
                    Say hello — messages are delivered live to the other participant.
                  </Text>
                ) : (
                  messages.map((m) => (
                    <View
                      key={m.id}
                      style={[styles.msg, m.mine ? styles.msgMine : styles.msgTheirs]}
                    >
                      {!m.mine && m.name ? (
                        <Text style={styles.msgName}>{m.name}</Text>
                      ) : null}
                      <Text style={[styles.msgText, m.mine && { color: proColors.onAccent }]}>
                        {m.text}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
              <View style={styles.chatInputRow}>
                <TextInput
                  testID="pro-session-chat-input"
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={send}
                  placeholder="Type a message…"
                  placeholderTextColor={proColors.inkFaint}
                  style={styles.chatInput}
                />
                <Pressable onPress={send} style={styles.chatSend} testID="pro-session-chat-send">
                  <Ionicons name="send" size={16} color={proColors.onAccent} />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <ScrollView contentContainerStyle={styles.chatList}>
              <Text style={styles.chatEmpty}>
                Highlight phrases during your lesson to save them as study notes.
                Live transcript arrives with the video connection.
              </Text>
            </ScrollView>
          )}
        </View>
      )}

      {/* Floating glass control dock */}
      <SafeAreaView edges={["bottom"]} style={styles.dockWrap} pointerEvents="box-none">
        <View style={styles.dock}>
          <Pressable onPress={onToggleMic} style={[styles.dockBtn, !micOn && styles.dockBtnOff]} testID="pro-dock-mic">
            <Ionicons name={micOn ? "mic" : "mic-off"} size={22} color={micOn ? proColors.ink : "#fff"} />
          </Pressable>
          <Pressable onPress={onToggleCam} style={[styles.dockBtn, !camOn && styles.dockBtnOff]} testID="pro-dock-cam">
            <Ionicons name={camOn ? "videocam" : "videocam-off"} size={22} color={camOn ? proColors.ink : "#fff"} />
          </Pressable>
          <Pressable onPress={() => setTab((t) => (t === "chat" ? null : "chat"))} style={[styles.dockBtn, tab === "chat" && styles.dockBtnActive]} testID="pro-dock-chat">
            <Ionicons name="chatbubble-ellipses" size={21} color={tab === "chat" ? proColors.onAccent : proColors.ink} />
          </Pressable>
          <Pressable onPress={() => setTab((t) => (t === "notebook" ? null : "notebook"))} style={[styles.dockBtn, tab === "notebook" && styles.dockBtnActive]} testID="pro-dock-notebook">
            <Ionicons name="book" size={20} color={tab === "notebook" ? proColors.onAccent : proColors.ink} />
          </Pressable>
          <Pressable onPress={endCall} style={[styles.dockBtn, styles.dockEnd]} testID="pro-dock-end">
            <Ionicons name="call" size={22} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B0A09" },
  center: { alignItems: "center", justifyContent: "center" },
  tutorFeed: { flex: 1, backgroundColor: "#171310" },
  feedImg: { ...StyleSheet.absoluteFill, opacity: 0.9 },
  feedScrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(11,10,9,0.45)" },
  waitingBox: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 12 },
  waitingText: { fontFamily: proFonts.sansMedium, fontSize: 14, color: "#fff", textAlign: "center", paddingHorizontal: 30 },
  feedTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: proRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF5B4C" },
  liveText: { fontFamily: proFonts.sansBold, fontSize: 12, color: "#fff", letterSpacing: 0.5 },
  simPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: proRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  simText: { fontFamily: proFonts.sansMedium, fontSize: 11, color: "#fff" },
  tutorMeta: {
    position: "absolute",
    left: 18,
    bottom: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: proRadius.pill,
    padding: 6,
    paddingRight: 16,
  },
  tutorName: { fontFamily: proFonts.sansBold, fontSize: 15, color: "#fff" },
  tutorAccent: { fontFamily: proFonts.sans, fontSize: 12, color: "rgba(255,255,255,0.8)" },
  pip: {
    position: "absolute",
    top: 90,
    right: 16,
    width: 116,
    height: 168,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#241E19",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  pipInner: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  pipName: { fontFamily: proFonts.sansSemi, fontSize: 12, color: "#fff" },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "82%",
    maxWidth: 360,
    backgroundColor: proColors.bg,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    paddingTop: 54,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: -6, height: 0 } }, android: { elevation: 24 }, default: {} }),
  },
  sidebarHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: proColors.border,
  },
  sidebarTitle: { fontFamily: proFonts.serifBold, fontSize: 19, color: proColors.ink },
  chatList: { padding: 16, gap: 10, flexGrow: 1 },
  chatEmpty: { fontFamily: proFonts.sans, fontSize: 13, color: proColors.inkSoft, textAlign: "center", marginTop: 30, lineHeight: 20 },
  msg: { maxWidth: "80%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  msgMine: { alignSelf: "flex-end", backgroundColor: proColors.terracotta },
  msgTheirs: { alignSelf: "flex-start", backgroundColor: proColors.surfaceMuted },
  msgName: { fontFamily: proFonts.sansSemi, fontSize: 10.5, color: proColors.inkSoft, marginBottom: 2 },
  msgText: { fontFamily: proFonts.sans, fontSize: 14, color: proColors.ink },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: proColors.border,
  },
  chatInput: {
    flex: 1,
    backgroundColor: proColors.surfaceMuted,
    borderRadius: proRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: proFonts.sans,
    fontSize: 14,
    color: proColors.ink,
  },
  chatSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: proColors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  dockWrap: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: proRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 20 }, default: {} }),
  },
  dockBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: proColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  dockBtnOff: { backgroundColor: proColors.inkSoft },
  dockBtnActive: { backgroundColor: proColors.terracotta },
  dockEnd: { backgroundColor: proColors.danger, transform: [{ rotate: "135deg" }] },
});
