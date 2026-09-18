import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { StageInvitation } from "@/src/components/room/StageInvitation";
import { useAuth } from "@/src/context/AuthContext";
import { useCall } from "@/src/context/CallContext";
import { useRoomAudio } from "@/src/hooks/use-room-audio";
import { fonts } from "@/src/theme";
import { api, Room } from "@/src/utils/api";

interface RoomSessionValue {
  activeRoomId: string | null;
  minimized: boolean;
  room: Room | null;
  /** Ids of members whose microphones are actually producing audio right now. */
  speakingIds: string[];
  /** Per-member WebRTC transport state (CONNECTED / RECONNECTING / …). */
  peerStates: Record<string, string>;
  /** Begin (or re-focus) a live room session. */
  startSession: (roomId: string, initialRoom?: Room) => void;
  /** Push the latest room document (called by the open room screen). */
  updateRoom: (room: Room) => void;
  /** Collapse the room to a floating bubble; audio keeps running. */
  minimize: () => void;
  /** Re-open the full room screen from the bubble. */
  expand: () => void;
  /** Fully tear down the session (leave / close / end). */
  endSession: () => void;
}

const Ctx = createContext<RoomSessionValue | undefined>(undefined);

/**
 * Root-mounted audio engine for the active voice room. Because it lives at the
 * app root (not inside the room screen), the WebRTC mesh survives navigation —
 * so a minimized room keeps hearing/speaking.
 */
function AudioSessionHost({
  roomId,
  myId,
  members,
  onSpeakingChange,
  onPeerStateChange,
}: {
  roomId: string;
  myId: string;
  members: Room["members"];
  onSpeakingChange: (ids: string[]) => void;
  onPeerStateChange: (states: Record<string, string>) => void;
}) {
  const { sendSignal, subscribe } = useCall();
  useRoomAudio({
    roomId,
    myId,
    members: members || [],
    sendSignal,
    subscribe,
    onSpeakingChange,
    onPeerStateChange,
  });
  return null;
}

export const RoomSessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { subscribe } = useCall();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [speakingIds, setSpeakingIds] = useState<string[]>([]);
  const [peerStates, setPeerStates] = useState<Record<string, string>>({});

  const handleSpeakingChange = useCallback(
    (ids: string[]) => setSpeakingIds(ids),
    [],
  );
  const handlePeerStateChange = useCallback(
    (states: Record<string, string>) => setPeerStates(states),
    [],
  );

  const startSession = useCallback((roomId: string, initialRoom?: Room) => {
    setActiveRoomId((prev) => {
      if (prev !== roomId) setRoom(initialRoom || null);
      return roomId;
    });
    if (initialRoom) setRoom(initialRoom);
    setMinimized(false);
  }, []);

  const updateRoom = useCallback((r: Room) => {
    if (r) setRoom(r);
  }, []);

  const minimize = useCallback(() => setMinimized(true), []);

  const endSession = useCallback(() => {
    setActiveRoomId(null);
    setMinimized(false);
    setRoom(null);
    setSpeakingIds([]);
    setPeerStates({});
  }, []);

  const expand = useCallback(() => {
    setMinimized(false);
    if (activeRoomId) router.push(`/room/${activeRoomId}` as never);
  }, [activeRoomId, router]);

  // Keep the room fresh from WS events even when the screen is unmounted.
  useEffect(() => {
    if (!activeRoomId) return;
    const unsub = subscribe((event: any) => {
      if (event.type === "room_update" && event.room?.id === activeRoomId) {
        setRoom(event.room);
      } else if ((event.type === "room_ended" || event.type === "room_kicked") && event.room_id === activeRoomId) {
        endSession();
      }
    });
    return unsub;
  }, [activeRoomId, subscribe, endSession]);

  // Safety poll (5s) so a minimized room stays accurate and auto-closes if we
  // were removed or the room ended.
  useEffect(() => {
    if (!activeRoomId) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await api.get<Room>(`/rooms/${activeRoomId}`);
        if (!alive) return;
        setRoom(r);
        const stillIn = (r.members || []).some((m) => m.id === user?.id);
        if (!stillIn || r.is_live === false) endSession();
      } catch (error: any) {
        // A brief offline/5xx response must not kill an otherwise recoverable
        // WebRTC room. Only definitive loss of access ends the audio session.
        if (alive && (error?.status === 403 || error?.status === 404)) endSession();
      }
    };
    const iv = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [activeRoomId, user?.id, endSession]);

  const members = room?.members || [];
  const showBubble = !!activeRoomId && minimized && !!room;

  return (
    <Ctx.Provider
      value={{
        activeRoomId,
        minimized,
        room,
        speakingIds,
        peerStates,
        startSession,
        updateRoom,
        minimize,
        expand,
        endSession,
      }}
    >
      {children}
      {!!activeRoomId && !!room && !!user && <StageInvitation key={`invitation-${activeRoomId}`} room={room} userId={user.id} subscribe={subscribe} onAccepted={() => { if (minimized) expand(); }} />}
      {!!activeRoomId && !!user?.id ? (
        <AudioSessionHost
          key={`audio-${activeRoomId}`}
          roomId={activeRoomId}
          myId={user.id}
          members={members}
          onSpeakingChange={handleSpeakingChange}
          onPeerStateChange={handlePeerStateChange}
        />
      ) : null}
      {showBubble ? (
        <Pressable
          testID="room-float-bubble"
          style={[styles.bubble, { bottom: insets.bottom + 92 }]}
          onPress={expand}
        >
          <Avatar
            name={room?.host?.name}
            url={room?.host?.avatar_url}
            size={54}
          />
          <View style={styles.liveTag}>
            <Ionicons name="mic" size={9} color="#FFFFFF" />
            <Text style={styles.liveTagText}>LIVE</Text>
          </View>
          <View style={styles.bubbleRing} pointerEvents="none" />
        </Pressable>
      ) : null}
    </Ctx.Provider>
  );
};

export function useRoomSession(): RoomSessionValue {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useRoomSession must be used within RoomSessionProvider");
  return ctx;
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A2154",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  bubbleRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#10B981",
  },
  liveTag: {
    position: "absolute",
    bottom: -6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  liveTagText: {
    fontFamily: fonts.textBold,
    fontSize: 8,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
