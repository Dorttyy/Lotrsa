import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAvoidingView } from "@/src/components/layout/KeyboardAvoidingView";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";
import { useSheetBounds } from "@/src/hooks/use-screen-space";
import { AppSwitch } from "@/src/components/AppSwitch";

import { Avatar } from "@/src/components/Avatar";
import { RaiseHandIcon } from "@/src/components/RaiseHandIcon";
import { FlagIcon } from "@/src/components/FlagIcon";
import { PomodoroCard } from "@/src/components/PomodoroCard";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useCall } from "@/src/context/CallContext";
import { useRoomSession } from "@/src/context/RoomSessionContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors, genderColors } from "@/src/theme";
import { StageRequestsSheet } from "@/src/components/room/StageRequestsSheet";
import { MemberStageActions } from "@/src/components/room/MemberStageActions";
import { ModeratorsSheet } from "@/src/components/room/ModeratorsSheet";
import { WaitingForStage } from "@/src/components/room/WaitingForStage";
import { RemovedFromRoom } from "@/src/components/room/RemovedFromRoom";
import { api, Conversation, Room, RoomGift, RoomMember, RoomMessage } from "@/src/utils/api";
import { webrtcAvailable } from "@/src/utils/webrtc";
import { SafeAreaView, useSafeAreaInsets } from "@/src/components/layout/SafeAreaView";

const QUICK_REPLIES = [
  "Hey, everyone! 👋",
  "What's the topic?",
  "Nice to meet you!",
  "I'm new here!",
];

// Solid, uniform room backgrounds (single colour top-to-bottom so the
// device status bar area blends in and stays readable).
const BG_COLORS: string[] = ["#413389", "#1E293B", "#4A1D6E", "#153A44"];
// Slightly deeper tones of BG_COLORS — used for surfaces that overlay the
// main room background (like the 3-dot switcher panel) so they feel part of
// the room instead of being an out-of-place pitch-black sheet.
const PANEL_BG_COLORS: string[] = ["#2E2461", "#131B29", "#331349", "#0C2229"];

// Topic options shown in the host's Edit Room sheet (same set as create page).
const ROOM_TOPICS = [
  "Voice Lover",
  "Small Talk",
  "Culture",
  "Music",
  "Games",
  "Study Together",
  "Just Chatting",
  "News",
  "Travel",
];

const STAGE_SEATS = 8;
const MAX_LISTENERS_SHOWN = 6;

export default function RoomScreen() {
  const insets = useSafeAreaInsets();
  const sheetBounds = useSheetBounds();
  const { height: screenHeight } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { subscribe } = useCall();
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [bgIndex, setBgIndex] = useState(0);
  const roomBg = BG_COLORS[bgIndex];

  // The room's saved background (set by the host) is the source of truth, so
  // the screen, its overlay panels and the OS chrome all show the same colour.
  useEffect(() => {
    if (room?.background != null) {
      setBgIndex(room.background % BG_COLORS.length);
    }
  }, [room?.background]);

  // Paint the OS chrome with the room's own colour while this screen is open,
  // so the phone's bottom (navigation) bar and the area behind the status bar
  // match the room background instead of the app surface. Restored on exit.
  useEffect(() => {
    if (Platform.OS === "web") return;
    SystemUI.setBackgroundColorAsync(roomBg).catch(() => {});
    if (Platform.OS === "android") {
      // SDK 57: setStyle replaces the removed setButtonStyleAsync. "dark" gives
      // light buttons, suitable for the immersive dark room background.
      NavigationBar.setStyle?.("dark");
    }
    return () => {
      SystemUI.setBackgroundColorAsync(colors.surface).catch(() => {});
      if (Platform.OS === "android") {
        NavigationBar.setStyle?.(mode === "dark" ? "dark" : "light");
      }
    };
  }, [roomBg, colors.surface, mode]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioNoticeDismissed, setAudioNoticeDismissed] = useState(false);
  const [switcherRooms, setSwitcherRooms] = useState<Room[]>([]);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [exitSheetOpen, setExitSheetOpen] = useState(false);
  const [hostPickOpen, setHostPickOpen] = useState(false);
  const [chatPickOpen, setChatPickOpen] = useState(false);
  const [chatList, setChatList] = useState<Conversation[]>([]);
  const [sharingChatId, setSharingChatId] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [handModalOpen, setHandModalOpen] = useState(false);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [quickRepliesVisible, setQuickRepliesVisible] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
  const chatInputRef = useRef<TextInput>(null);

  /** Close the keyboard and restore the icon row beside the comment box. */
  const dismissComposer = useCallback(() => {
    chatInputRef.current?.blur();
    Keyboard.dismiss();
    setInputFocused(false);
  }, []);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [gifts, setGifts] = useState<RoomGift[]>([]);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftTargetId, setGiftTargetId] = useState<string | null>(null);
  const [sendingGiftId, setSendingGiftId] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  // Auto-translate incoming chat messages (bar toggle, HelloTalk-style).
  const [autoTranslate, setAutoTranslate] = useState(false);
  const autoTranslateRef = useRef(false);
  const chatListRef = useRef<FlatList<RoomMessage>>(null);
  // HelloTalk-style extras: ended-summary overlay.
  const [ended, setEnded] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [roomNotice, setRoomNotice] = useState("");
  // Member profile sheet (opens when tapping someone on stage / in audience).
  const [memberSheet, setMemberSheet] = useState<RoomMember | null>(null);
  const [sheetFollowing, setSheetFollowing] = useState(false);
  const [stageBusy, setStageBusy] = useState(false);
  const stageLock = useRef(false);
  const [stageError, setStageError] = useState("");
  useEffect(() => {
    if (!roomNotice) return;
    const timer = setTimeout(() => setRoomNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [roomNotice]);

  const stageAction = async (path: string, data?: object) => {
    if (stageLock.current) return;
    stageLock.current = true; setStageBusy(true); setStageError("");
    try {
      await api.post(`/rooms/${id}/${path}`, data);
      const fresh = await api.get<Room>(`/rooms/${id}`);
      setRoom(fresh); session.updateRoom(fresh);
    } catch (e: any) { setStageError(e.message || "Could not update the stage. Please try again."); }
    finally { stageLock.current = false; setStageBusy(false); }
  };

  const followSheetMember = async (member: RoomMember) => {
    try {
      const res = await api.post<{ following: boolean }>(
        `/users/${member.id}/follow`,
      );
      setSheetFollowing(res.following);
    } catch {
      /* non-critical */
    }
  };
  // Right-rail promo carousel: gentle 6s rotation, settles after 5 turns;
  // tapping flips it manually.
  const [promoIdx, setPromoIdx] = useState(0);
  const promoCyclesRef = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (promoCyclesRef.current >= 5) return;
      promoCyclesRef.current += 1;
      setPromoIdx((i) => (i + 1) % 3);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const members: RoomMember[] = room?.members || [];
  const me = members.find((m) => m.id === user?.id);
  const isHost = me?.role === "host";
  const isOwner = room?.host?.id === user?.id;
  const canManage = !!me && (isOwner || !!me.is_moderator);
  const isSpeaker = isHost || me?.role === "speaker";
  // Raised hands are private moderation info: only the host (and moderators,
  // when the host appoints them) can see who raised a hand.
  const canSeeHands =
    isHost || ((room as any)?.moderators || []).includes(user?.id);
  const host = room?.host || null;

  // Audio now lives in the root RoomSession (survives minimize/navigation).
  const session = useRoomSession();
  const endedRef = useRef(false);

  // Register this room as the active session; on unmount, minimize (keep the
  // audio alive as a floating bubble) unless we explicitly left/closed.
  useEffect(() => {
    if (id) session.startSession(id);
    return () => {
      if (!endedRef.current) session.minimize();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = useCallback(async () => {
    try {
      const [r, msgs] = await Promise.all([
        api.get<Room>(`/rooms/${id}`),
        api.get<RoomMessage[]>(`/rooms/${id}/messages`),
      ]);
      setRoom(r);
      session.updateRoom(r);
      setMessages(msgs);
      if (r.host && r.host.id !== user?.id) {
        try {
          const hostProfile = await api.get<{ is_following: boolean }>(
            `/users/${r.host.id}`,
          );
          setIsFollowingHost(!!hostProfile.is_following);
        } catch {
          // non-critical
        }
      }
    } catch {
      endedRef.current = true;
      session.endSession();
      router.back();
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  useEffect(() => {
    load();
    api
      .get<{ coins: number; gifts: RoomGift[] }>("/rooms/gift-catalog")
      .then((res) => setGifts(res.gifts))
      .catch(() => {});
    api
      .get<Room[]>("/rooms")
      .then((rs) => {
        const others = rs.filter((r) => r.id !== id);
        // live rooms first
        others.sort((a, b) => Number(b.is_live) - Number(a.is_live));
        setSwitcherRooms(others);
      })
      .catch(() => {});
  }, [load]);

  useEffect(() => {
    const unsub = subscribe((event: any) => {
      if (event.type === "room_update" && event.room?.id === id) {
        setRoom(event.room);
        setMemberSheet(previous => previous ? event.room.members.find((m: RoomMember) => m.id === previous.id) || null : null);
        session.updateRoom(event.room);
      } else if (event.type === "room_message" && event.message?.room_id === id) {
        const incoming = event.message as RoomMessage;
        setMessages((prev) =>
          prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
        );
        // Auto-translate other people's text messages when the toggle is on.
        if (
          autoTranslateRef.current &&
          incoming.text &&
          incoming.type !== "system" &&
          incoming.type !== "gift" &&
          incoming.sender?.id !== user?.id
        ) {
          api
            .post<{ translated: string }>("/ai/translate", {
              text: incoming.text,
              target_language: user?.native_language || "en",
            })
            .then((res) =>
              setTranslations((prev) =>
                prev[incoming.id] !== undefined
                  ? prev
                  : { ...prev, [incoming.id]: res.translated },
              ),
            )
            .catch(() => {});
        }
      } else if (event.type === "room_invitation_result" && event.room_id === id) {
        setRoomNotice(`${event.name} ${event.accepted ? "accepted" : "rejected"} your ${event.kind === "moderator" ? "moderator" : "stage"} invitation.`);
      } else if (event.type === "room_stage_request_rejected" && event.room_id === id) {
        setRoomNotice("Your stage request was rejected.");
      } else if ((event.type === "room_ended" || event.type === "room_kicked" ||
        (event.type === "room_left" && (event.reason === "daily_listener_limit" || event.reason === "disconnected"))) && event.room_id === id) {
        setMemberSheet(null); setHandModalOpen(false); setAudienceModalOpen(false);
        setHostPickOpen(false); setExitSheetOpen(false); setMenuOpen(false);
        endedRef.current = true;
        session.endSession();
        if (event.reason === "daily_host_limit" || event.reason === "daily_listener_limit" || event.reason === "disconnected") {
          router.replace("/(tabs)/voice");
        } else if (event.type === "room_kicked") setRemoved(true);
        else setEnded(true);
      }
    });
    return unsub;
  }, [id, subscribe, router, user?.id, user?.native_language]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Leaving never transfers room ownership.
  const leave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (stageLock.current) return;
    stageLock.current = true; setStageBusy(true);
    try {
      await api.post(`/rooms/${id}/leave`);
      endedRef.current = true;
      session.endSession();
      router.back();
    } catch (e: any) { setStageError(e.message || "Could not leave. Please try again."); }
    finally { stageLock.current = false; setStageBusy(false); }
  };

  // Host permanently closes the room for everyone — then sees the summary.
  const closeRoom = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (stageLock.current) return;
    stageLock.current = true; setStageBusy(true);
    try {
      await api.post(`/rooms/${id}/end`);
      endedRef.current = true;
      session.endSession();
      setEnded(true);
    } catch (e: any) { setStageError(e.message || "Could not close this room. Please try again."); }
    finally { setExitSheetOpen(false); stageLock.current = false; setStageBusy(false); }
  };

  // Edit-room sheet (host) — mirrors the create-room page fields.
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTopic, setEditTopic] = useState<string | null>(null);
  const [editAnnouncement, setEditAnnouncement] = useState("");
  const [editBackground, setEditBackground] = useState(0);
  const [editPrivate, setEditPrivate] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const openEditRoom = () => {
    if (!room) return;
    setEditTitle(room.title);
    setEditTopic(room.topic || null);
    setEditAnnouncement(room.announcement || "");
    setEditBackground(room.background ?? 0);
    setEditPrivate(!!room.is_private);
    setEditOpen(true);
  };

  const saveRoomSettings = async () => {
    if (!editTitle.trim() || editSaving) return;
    setEditSaving(true);
    try {
      await api.post(`/rooms/${id}/settings`, {
        title: editTitle.trim(),
        topic: editTopic || "",
        announcement: editAnnouncement,
        background: editBackground,
        is_private: editPrivate,
      });
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle.trim(),
              topic: editTopic,
              announcement: editAnnouncement.trim() || null,
              background: editBackground,
              is_private: editPrivate,
            }
          : prev,
      );
      setEditOpen(false);
    } catch (e) {
      Alert.alert("Edit room", e instanceof Error ? e.message : "Could not save.");
    } finally {
      setEditSaving(false);
    }
  };

  // Owner may step away without giving away ownership or income.
  const hostLeaveFlow = () => {
    setExitSheetOpen(false);
    void leave();
  };

  // Switch to another recommended room: leave the current one, then open the new.
  const switchRoom = async (roomId: string) => {
    setMenuOpen(false);
    if (!roomId || roomId === id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    endedRef.current = true;
    session.endSession();
    try {
      await api.post(`/rooms/${id}/leave`);
    } catch {
      // ignore — room may already have ended
    }
    router.replace(`/room/${roomId}`);
  };

  // Minimize: keep membership + audio, collapse to a floating bubble.
  const minimizeRoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(false);
    setExitSheetOpen(false);
    session.minimize();
    router.back();
  };

  const toggleMic = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post(`/rooms/${id}/mic`);
    } catch (e: any) {
      setStageError(e.message || "Could not change the microphone.");
    }
  };

  const toggleHand = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post(`/rooms/${id}/hand`);
    } catch {
      // ignore
    }
  };

  const changeRole = (member: RoomMember, role: "speaker" | "listener") => stageAction("role", { user_id: member.id, role });

  const kickMember = (member: RoomMember) => stageAction("kick", { user_id: member.id });

  const dismissHand = (member: RoomMember) => stageAction("hand/dismiss", { user_id: member.id });

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (room?.chat_muted && !canManage) {
      Alert.alert("Chat muted", "The host has muted text chat right now.");
      return;
    }
    setDraft("");
    try {
      const msg = await api.post<RoomMessage>(`/rooms/${id}/messages`, {
        text: trimmed,
      });
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    } catch (e) {
      Alert.alert("Message", e instanceof Error ? e.message : "Could not send.");
    }
  };

  const sendMessage = () => sendText(draft);

  const toggleChatMute = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post(`/rooms/${id}/chat-mute`);
    } catch {
      // ignore
    }
  };

  const shareToMoments = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setToolsOpen(false);
    setShareMenuOpen(false);
    setMenuOpen(false);
    // Full-page composer with caption + card preview, like posting a moment.
    router.push({ pathname: "/share-to-moments", params: { room_id: String(id) } });
  };

  // Share to Chat: open a dedicated page listing chat contacts.
  const openShareToChat = () => {
    setShareMenuOpen(false);
    setMenuOpen(false);
    router.push({ pathname: "/share-to-chat", params: { room_id: String(id) } });
  };

  const sendRoomToChat = async (conv: Conversation) => {
    if (sharingChatId) return;
    setSharingChatId(conv.id);
    try {
      await api.post(`/chats/${conv.id}/messages`, {
        room_id: id,
      });
      setChatPickOpen(false);
      Alert.alert(
        "Invite sent! 🎉",
        `Your room invite was sent to ${conv.partner?.name || "the chat"}.`,
      );
    } catch (e) {
      Alert.alert(
        "Share to Chat",
        e instanceof Error ? e.message : "Could not send the invite.",
      );
    } finally {
      setSharingChatId(null);
    }
  };

  const toggleFollowHost = async () => {
    if (!host || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await api.post<{ following: boolean }>(
        `/users/${host.id}/follow`,
      );
      setIsFollowingHost(res.following);
    } catch {
      // ignore
    } finally {
      setFollowBusy(false);
    }
  };

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `Join "${room?.title}" — a live voice room on Mello! 🎙️`,
      });
    } catch {
      // user cancelled
    }
  };

  const openGiftModal = (targetId?: string | null) => {
    setGiftTargetId(targetId || host?.id || null);
    setGiftOpen(true);
  };

  const sendGift = async (gift: RoomGift) => {
    if (!giftTargetId || sendingGiftId) return;
    if ((user?.coins || 0) < gift.price) {
      Alert.alert(
        "Not enough coins",
        "Visit the market to top up your coins.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Market", onPress: () => router.push("/market") },
        ],
      );
      return;
    }
    setSendingGiftId(gift.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.post<{ coins: number; message: RoomMessage }>(
        `/rooms/${id}/gift`,
        { to_user_id: giftTargetId, gift_id: gift.id },
      );
      if (user) setUser({ ...user, coins: res.coins });
      setMessages((prev) =>
        prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message],
      );
      setGiftOpen(false);
    } catch (e) {
      Alert.alert("Gift", e instanceof Error ? e.message : "Could not send gift.");
    } finally {
      setSendingGiftId(null);
    }
  };

  const toggleTranslate = async (msg: RoomMessage) => {
    if (translations[msg.id] !== undefined) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
      return;
    }
    setTranslatingId(msg.id);
    try {
      const res = await api.post<{ translated: string }>("/ai/translate", {
        text: msg.text,
        target_language: user?.native_language || "en",
      });
      setTranslations((prev) => ({ ...prev, [msg.id]: res.translated }));
    } catch {
      // ignore
    } finally {
      setTranslatingId(null);
    }
  };

  // Silent translate used by the auto-translate toggle — no spinners, and
  // never overwrites a translation that's already there.
  const translateIncoming = useCallback(
    async (msg: RoomMessage) => {
      if (!msg.text || msg.type === "system" || msg.type === "gift") return;
      try {
        const res = await api.post<{ translated: string }>("/ai/translate", {
          text: msg.text,
          target_language: user?.native_language || "en",
        });
        setTranslations((prev) =>
          prev[msg.id] !== undefined ? prev : { ...prev, [msg.id]: res.translated },
        );
      } catch {
        // silent — user can still tap the per-message translate button
      }
    },
    [user?.native_language],
  );

  const toggleAutoTranslate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !autoTranslate;
    setAutoTranslate(next);
    autoTranslateRef.current = next;
    if (next) {
      // Catch up on the latest visible messages from others.
      messages
        .filter(
          (m) =>
            m.text &&
            m.type !== "system" &&
            m.type !== "gift" &&
            m.sender?.id !== user?.id &&
            translations[m.id] === undefined,
        )
        .slice(-8)
        .forEach((m) => translateIncoming(m));
    }
  };

  const onAvatarPress = (member: RoomMember) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetFollowing(false);
    setMemberSheet(member);
    api
      .get<{ is_following: boolean }>(`/users/${member.id}`)
      .then((p) => setSheetFollowing(!!p.is_following))
      .catch(() => {});
  };

  const startPartnerChat = async (member: RoomMember) => {
    setMemberSheet(null);
    try {
      const conv = await api.post<Conversation>("/chats", {
        partner_id: member.id,
      });
      router.push(`/chat/${conv.id}`);
    } catch {
      Alert.alert("Partner", "Could not open the chat. Try again.");
    }
  };

  const onEmptySeatPress = () => {
    if (isSpeaker) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleHand();
  };

  // Only the LAST text message from someone else shows the translate icon.
  const lastForeignMsgId = [...messages]
    .reverse()
    .find(
      (m) =>
        m.text &&
        m.type !== "system" &&
        m.type !== "gift" &&
        m.sender?.id !== user?.id,
    )?.id;
  const hostMember = members.find((m) => m.role === "host");
  const speakers = members.filter((m) => m.role === "speaker");
  const listeners = members.filter((m) => m.role === "listener");
  const handRequests = listeners.filter((m) => m.hand_raised);
  const stageMembers = [hostMember, ...speakers].filter(
    (m): m is RoomMember => !!m,
  );
  const hostAway = !hostMember;
  const emptySeatCount = Math.max(0, STAGE_SEATS - stageMembers.length - (hostAway ? 1 : 0));
  const shownListeners = listeners.slice(0, MAX_LISTENERS_SHOWN);
  const extraListeners = listeners.length - shownListeners.length;
  const giftTarget = members.find((m) => m.id === giftTargetId);

  if (loading || !room) {
    return (
      <View style={[styles.container, { backgroundColor: roomBg }]}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </SafeAreaView>
      </View>
    );
  }

  const renderStageMember = (member: RoomMember) => (
    <Pressable
      key={member.id}
      style={styles.memberCell}
      testID={`room-member-${member.id}`}
      onPress={() => onAvatarPress(member)}
    >
      <View>
        <Avatar
          name={member.name}
          url={member.avatar_url}
          size={50}
          flagCode={countryToCode(member.country)}
          online
          frame={member.active_frame}
          isSpeaking={member.mic_on && session.speakingIds.includes(member.id)}
        />
        {(member.role === "host" || member.role === "speaker") &&
          !member.mic_on && (
            <View
              testID={`room-mute-badge-${member.id}`}
              style={styles.muteCenter}
              pointerEvents="none"
            >
              <View style={styles.muteCenterCircle}>
                <Ionicons name="mic-off" size={15} color="#FFF" />
              </View>
            </View>
          )}
        {canSeeHands && member.hand_raised && (
          <View style={styles.handBadge}>
            <RaiseHandIcon size={12} color="#FFF" />
          </View>
        )}
      </View>
      <View style={styles.memberNameRow}>
        {member.role === "host" && (
          <View style={styles.hostHomeBadge}>
            <Ionicons name="home" size={9} color="#FFFFFF" />
          </View>
        )}
        {member.is_moderator && member.role !== "host" && <View testID={`moderator-badge-${member.id}`} style={[styles.hostHomeBadge, styles.moderatorBadge]}><Ionicons name="shield-checkmark" size={10} color="#FFFFFF" /></View>}
        <Text style={styles.memberName} numberOfLines={1}>
          {member.id === user?.id ? "You" : member.name.split(" ")[0]}
        </Text>
      </View>
    </Pressable>
  );

  const renderListenerMember = (member: RoomMember) => (
    <Pressable
      key={member.id}
      style={styles.listenerCell}
      testID={`room-listener-${member.id}`}
      onPress={() => onAvatarPress(member)}
    >
      <Avatar
        name={member.name}
        url={member.avatar_url}
        size={28}
        flagCode={countryToCode(member.country)}
        online
      />
      {canSeeHands && member.hand_raised && (
        <View style={styles.handBadgeSmall}>
          <RaiseHandIcon size={10} color="#FFF" />
        </View>
      )}
      {member.is_moderator && <View testID={`moderator-badge-${member.id}`} style={[styles.hostHomeBadge, styles.moderatorBadge]}><Ionicons name="shield-checkmark" size={10} color="#FFFFFF" /></View>}
      <Text style={styles.listenerName} numberOfLines={1}>
        {member.id === user?.id ? "You" : member.name.split(" ")[0]}
      </Text>
    </Pressable>
  );

  const renderEmptySeat = (i: number) => (
    <Pressable
      key={`empty-${i}`}
      style={styles.emptySeat}
      testID={`room-empty-seat-${i}`}
      onPress={onEmptySeatPress}
    >
      <View style={styles.emptySeatCircle}>
        <RaiseHandIcon size={24} color="rgba(255,255,255,0.85)" />
      </View>
      <Text style={styles.seatNum}>{stageMembers.length + i + 1 + (hostAway ? 1 : 0)}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: roomBg }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="room-screen">
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {room.title}
              </Text>
              {canManage && (
                <Pressable
                  testID="room-rename-btn"
                  style={styles.renameBtn}
                  onPress={openEditRoom}
                >
                  <Ionicons name="create-outline" size={15} color="#FFFFFF" />
                </Pressable>
              )}
              {host && host.id !== user?.id && (
                <Pressable
                  testID="room-follow-btn"
                  style={[styles.followBtn, isFollowingHost && styles.followingBtn]}
                  onPress={toggleFollowHost}
                  disabled={followBusy}
                >
                  <Text style={styles.followText}>
                    {isFollowingHost ? "Following" : "Follow"}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.subRow}>
              <View style={styles.langPill}>
                <Text style={styles.langPillText}>
                  {(room.language || "en").toUpperCase()}
                </Text>
              </View>
              <View style={styles.levelChip}>
                <Text style={styles.levelEmoji}>🏠</Text>
                <Text style={styles.levelText}>Lv.{room.host_level || 1}</Text>
              </View>
              <Text style={styles.subText}>
                {members.length} {members.length === 1 ? "member" : "members"}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {(room.top_gifters || []).length > 0 && (
              <View style={styles.gifterRow} testID="room-top-gifters">
                {(room.top_gifters || []).map((g, i) => (
                  <View
                    key={g.id}
                    style={[
                      styles.gifterWrap,
                      { marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i },
                    ]}
                    testID={`room-gifter-rank-${i + 1}`}
                  >
                    <Avatar name={g.name} url={g.avatar_url} size={28} />
                    <View
                      style={[
                        styles.gifterRankBadge,
                        i === 0
                          ? styles.rankGold
                          : i === 1
                            ? styles.rankSilver
                            : styles.rankBronze,
                      ]}
                    >
                      <Text style={styles.gifterRankText}>{i + 1}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Pressable
              testID="room-menu-btn"
              style={styles.menuBtn}
              onPress={() => (canManage ? setExitSheetOpen(true) : setMenuOpen(true))}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {Platform.OS !== "web" && !webrtcAvailable() && !audioNoticeDismissed && (
          <View style={styles.audioNoticeBar} testID="room-audio-notice">
            <Ionicons name="mic-off" size={14} color="#FCD34D" />
            <Text style={styles.audioNoticeText} numberOfLines={2}>
              Live audio works in the installed app — everything else works
              here.
            </Text>
            <Pressable
              onPress={() => setAudioNoticeDismissed(true)}
              hitSlop={8}
              testID="room-audio-notice-close"
            >
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        )}


        {room?.mode === "study" && room?.pomodoro && (
          <PomodoroCard
            pomodoro={room.pomodoro}
            isHost={canManage}
            onAction={(a) =>
              api.post(`/rooms/${id}/pomodoro`, { action: a }).catch(() => {})
            }
          />
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "web" ? undefined : "translate-with-padding"}
        >
          {/* Stage keeps its usual size; short/keyboard layouts can scroll it. */}
          <ScrollView
            testID="room-stage-scroll"
            style={{ flexGrow: 0, flexShrink: 1, maxHeight: "48%" }}
            contentContainerStyle={styles.stageFixed}
            keyboardShouldPersistTaps="handled"
            onStartShouldSetResponder={() => {
              if (inputFocused) dismissComposer();
              return false;
            }}
          >
            <View style={styles.stageGrid}>
              {hostAway && <View testID="room-host-away-seat" style={styles.emptySeat}><View style={styles.emptySeatCircle}><Ionicons name="cafe" size={30} color="#FCD34D" /></View><Text testID="room-host-away-label" style={styles.memberName}>Host is away</Text></View>}
              {stageMembers.map(renderStageMember)}
              {Array.from({ length: emptySeatCount }).map((_, i) =>
                renderEmptySeat(i),
              )}
            </View>

            {/* Audience area is ALWAYS reserved — for host and users alike */}
            <Text style={styles.sectionLabel}>
              Audience · {listeners.length}
            </Text>
            <View style={styles.listenerRow}>
              {listeners.length === 0 ? (
                <View style={styles.listenerCell} testID="room-audience-empty">
                  <View style={styles.moreCircle}>
                    <Ionicons
                      name="person"
                      size={13}
                      color="rgba(255,255,255,0.55)"
                    />
                  </View>
                  <Text style={styles.listenerName}>Empty</Text>
                </View>
              ) : (
                <>
                  {shownListeners.map(renderListenerMember)}
                  {extraListeners > 0 && (
                    <Pressable
                      style={styles.listenerCell}
                      testID="room-listeners-more"
                      onPress={() => setAudienceModalOpen(true)}
                    >
                      <View style={styles.moreCircle}>
                        <Text style={styles.moreText}>+{extraListeners}</Text>
                      </View>
                      <Text style={styles.listenerName}>Others</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.chatSection}>
            {/* Right rail — promo carousel · VIP (audience only) · raise-hand */}
            <View style={styles.rightRail} pointerEvents="box-none">
              <Pressable
                testID="room-rail-promo"
                style={styles.railPromo}
                onPress={() => setPromoIdx((i) => (i + 1) % 3)}
              >
                <Text style={styles.railPromoEmoji}>
                  {["🪔", "🎤", "🎁"][promoIdx]}
                </Text>
                <View style={styles.railDashes}>
                  {[0, 1, 2].map((d) => (
                    <View
                      key={d}
                      style={[
                        styles.railDash,
                        d === promoIdx && styles.railDashActive,
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
              {!canManage && (
                <Pressable
                  testID="room-rail-vip"
                  style={styles.railVip}
                  onPress={() => router.push("/premium")}
                >
                  <Ionicons name="people" size={19} color="#7DABFF" />
                  <View style={styles.railVipTag}>
                    <Text style={styles.railVipTagText}>VIP</Text>
                  </View>
                </Pressable>
              )}
              <Pressable
                testID="room-rail-hand"
                style={[
                  styles.railHand,
                  !canManage && me?.hand_raised && styles.railHandActive,
                ]}
                onPress={() => (canManage ? setHandModalOpen(true) : toggleHand())}
              >
                {!canManage && me?.hand_raised ? <WaitingForStage /> : <RaiseHandIcon size={21} color="#FFFFFF" />}
                {canManage && handRequests.length > 0 && (
                  <View style={styles.railHandBadge}>
                    <Text style={styles.railHandBadgeText}>
                      {handRequests.length}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
            <FlatList
              ref={chatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScrollBeginDrag={() => {
                if (inputFocused) dismissComposer();
              }}
              ListHeaderComponent={
                <View style={styles.noticeRow} testID="room-notice">
                  <View style={styles.noticeIconCircle} testID="room-notice-icon">
                    <Ionicons name="megaphone" size={12} color="#FFFFFF" />
                  </View>
                  <View style={styles.noticeBubble}>
                    <View style={styles.noticePill}>
                      <Text style={styles.noticePillText}>Notice</Text>
                    </View>
                    <Text style={styles.noticeText}>
                      Please speak the room&apos;s language and keep it friendly —
                      enjoy practicing together! 🎉
                    </Text>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <Text style={styles.chatEmpty}>Say hi in the room chat 👋</Text>
              }
              renderItem={({ item }) => {
                if (item.type === "system") {
                  return (
                    <View style={styles.noticeRow} testID={`room-msg-${item.id}`}>
                      <View style={styles.noticeIconCircle}>
                        <Ionicons name="megaphone" size={12} color="#FFFFFF" />
                      </View>
                      <View style={[styles.noticeBubble, styles.systemBubble]}>
                        <Text style={styles.noticeText}>{item.text}</Text>
                      </View>
                    </View>
                  );
                }
                if (item.type === "gift") {
                  return (
                    <View style={styles.giftRow} testID={`room-msg-${item.id}`}>
                      <Avatar
                        name={item.sender?.name}
                        url={item.sender?.avatar_url}
                        size={26}
                        flagCode={countryToCode(item.sender?.country)}
                      />
                      <Text style={styles.giftText}>
                        <Text style={styles.giftSender}>{item.sender?.name} </Text>
                        {item.text}
                      </Text>
                    </View>
                  );
                }
                const fromHost = !!host && item.sender?.id === host.id;
                return (
                  <View style={styles.chatRow} testID={`room-msg-${item.id}`}>
                    <Avatar
                      name={item.sender?.name}
                      url={item.sender?.avatar_url}
                      size={30}
                      flagCode={countryToCode(item.sender?.country)}
                    />
                    <View style={styles.chatBubbleCol}>
                      <View style={styles.chatBubble}>
                        {fromHost && (
                          <View style={styles.hostChip}>
                            <Ionicons name="home" size={9} color="#FFFFFF" />
                          </View>
                        )}
                        <Text style={styles.chatText}>
                          <Text style={styles.chatSender}>{item.sender?.name}:  </Text>
                          {item.text}
                        </Text>
                      </View>
                      {translations[item.id] ? (
                        <Text style={styles.translatedText}>
                          🌐 {translations[item.id]}
                        </Text>
                      ) : null}
                    </View>
                    {item.id === lastForeignMsgId && (
                      <Pressable
                        testID={`room-translate-${item.id}`}
                        onPress={() => toggleTranslate(item)}
                        hitSlop={6}
                        style={[styles.translateBtn, { marginLeft: 4 }]}
                      >
                        {translatingId === item.id ? (
                          <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                        ) : (
                          <Ionicons
                            name="language"
                            size={15}
                            color="rgba(255,255,255,0.55)"
                          />
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {quickRepliesVisible && (
            <View style={styles.quickRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickScroll}
              >
                {QUICK_REPLIES.map((q) => (
                  <Pressable
                    key={q}
                    style={styles.quickChip}
                    onPress={() => sendText(q)}
                    testID={`room-quick-${q}`}
                  >
                    <Text style={styles.quickText}>{q}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                testID="room-quick-close"
                onPress={() => setQuickRepliesVisible(false)}
                hitSlop={8}
                style={styles.quickClose}
              >
                <Ionicons name="close" size={16} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
          )}

          {!!roomNotice && <Pressable testID="room-action-notice" accessibilityLiveRegion="polite" onPress={() => setRoomNotice("")} style={styles.roomNotice}><Text style={styles.stageErrorText}>{roomNotice}</Text><Ionicons name="close" size={18} color="#FFFFFF" /></Pressable>}
          {!!stageError && <Pressable testID="room-stage-error" onPress={() => setStageError("")} style={styles.stageErrorBox}><Text style={styles.stageErrorText}>{stageError}</Text><Ionicons name="close" size={18} color="#FFFFFF" /></Pressable>}
          <View style={styles.controls}>
            <TextInput
              ref={chatInputRef}
              testID="room-chat-input"
              style={[styles.input, inputFocused && styles.inputFocused]}
              placeholder={
                room.chat_muted && !canManage
                  ? "Chat muted by host"
                  : "Comment..."
              }
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={draft}
              onChangeText={setDraft}
              editable={!(room.chat_muted && !canManage)}
              onSubmitEditing={sendMessage}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              returnKeyType="send"
            />
            {!inputFocused && (
              <>
                {isSpeaker && (
                  <Pressable
                    testID="room-bar-mic-btn"
                    style={styles.iconBtn}
                    onPress={toggleMic}
                  >
                    <Ionicons
                      name={me?.mic_on ? "mic" : "mic-off-outline"}
                      size={19}
                      color={me?.mic_on ? "#4ADE80" : "rgba(255,255,255,0.85)"}
                    />
                  </Pressable>
                )}
                <Pressable
                  testID="room-autotranslate-btn"
                  style={styles.iconBtn}
                  onPress={toggleAutoTranslate}
                >
                  <MaterialCommunityIcons
                    name={autoTranslate ? "closed-caption" : "closed-caption-outline"}
                    size={22}
                    color={autoTranslate ? "#4ADE80" : "rgba(255,255,255,0.85)"}
                  />
                </Pressable>
                <Pressable
                  testID="room-tools-btn"
                  style={styles.iconBtn}
                  onPress={() => setToolsOpen(true)}
                >
                  <Ionicons name="grid-outline" size={19} color="rgba(255,255,255,0.85)" />
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                </Pressable>
                <Pressable
                  testID="room-shop-btn"
                  style={styles.iconBtn}
                  onPress={() => router.push("/market")}
                >
                  <Text style={styles.barEmoji}>🏪</Text>
                </Pressable>
                <Pressable
                  testID="room-gift-btn"
                  style={styles.iconBtn}
                  onPress={() => openGiftModal()}
                >
                  <Text style={styles.barEmoji}>🎁</Text>
                  <View style={styles.giftDot} />
                </Pressable>
              </>
            )}
            {(inputFocused || draft.trim().length > 0) && (
              <Pressable
                testID="room-chat-send-btn"
                style={styles.sendBtn}
                onPress={sendMessage}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>

        {/* Edit room sheet — same fields/design language as the create page */}
        <Modal
          visible={editOpen}
          animationType="slide"
          onRequestClose={() => setEditOpen(false)}
        >
          <View style={styles.edRoot}>
            <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "web" ? undefined : "translate-with-padding"}
              >
                <Pressable
                  testID="room-edit-close"
                  onPress={() => setEditOpen(false)}
                  hitSlop={10}
                  style={styles.edClose}
                >
                  <Ionicons name="close" size={28} color="#111827" />
                </Pressable>
                <ScrollView
                  contentContainerStyle={styles.edBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.edTitle}>Edit Room</Text>

                  <View style={styles.edInputCard}>
                    <TextInput
                      testID="room-edit-title-input"
                      style={styles.edTitleInput}
                      placeholder="What will you talk about?"
                      placeholderTextColor="#9CA3AF"
                      value={editTitle}
                      onChangeText={setEditTitle}
                      maxLength={80}
                      multiline
                    />
                    <Ionicons name="pencil" size={20} color="#9CA3AF" />
                  </View>

                  <View style={styles.edCard}>
                    <Text style={styles.edLabel}>Topic</Text>
                    <View style={styles.edChipWrap}>
                      {ROOM_TOPICS.map((t) => {
                        const active = editTopic === t;
                        return (
                          <Pressable
                            key={t}
                            testID={`room-edit-topic-${t}`}
                            onPress={() => setEditTopic(active ? null : t)}
                            style={[styles.edChip, active && styles.edChipActive]}
                          >
                            <Text
                              style={[
                                styles.edChipText,
                                active && styles.edChipTextActive,
                              ]}
                            >
                              {t}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View style={styles.edDivider} />

                    <Text style={styles.edLabel}>Background</Text>
                    <View style={styles.edBgRow}>
                      {BG_COLORS.map((c, i) => (
                        <Pressable
                          key={i}
                          testID={`room-edit-bg-${i}`}
                          onPress={() => setEditBackground(i)}
                          style={[
                            styles.edBgSwatch,
                            { backgroundColor: c },
                            editBackground === i && styles.edBgSwatchActive,
                          ]}
                        >
                          {editBackground === i && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.edDivider} />

                    <View style={styles.edRow}>
                      <Text style={styles.edLabel}>Private Room</Text>
                      <AppSwitch
                        testID="room-edit-private"
                        value={editPrivate}
                        onValueChange={setEditPrivate}
                        trackColor={{ true: "#0EA5E9", false: "#D1D5DB" }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>

                  <View style={styles.edAnnounceCard}>
                    <Text style={styles.edAnnounceTitle}>Room Announcement</Text>
                    <TextInput
                      testID="room-edit-announcement"
                      style={styles.edAnnounceInput}
                      placeholder="Create Room Announcement"
                      placeholderTextColor="#9CA3AF"
                      value={editAnnouncement}
                      onChangeText={setEditAnnouncement}
                      maxLength={300}
                      multiline
                    />
                    <View style={styles.edAnnounceFooter}>
                      {editTopic ? (
                        <View style={styles.edTopicChip}>
                          <Text style={styles.edTopicChipText}>#{editTopic}</Text>
                        </View>
                      ) : (
                        <View />
                      )}
                      <Text style={styles.edCounter}>
                        {editAnnouncement.length}/300
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.edFooter}>
                  <Pressable
                    testID="room-edit-save"
                    style={[
                      styles.edSaveBtn,
                      (!editTitle.trim() || editSaving) && { opacity: 0.45 },
                    ]}
                    disabled={!editTitle.trim() || editSaving}
                    onPress={saveRoomSettings}
                  >
                    {editSaving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.edSaveText}>Save Changes</Text>
                    )}
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Member profile sheet (reference design) */}
        <Modal
          visible={!!memberSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setMemberSheet(null)}
        >
          <View style={[styles.memberModalHost, { paddingTop: insets.top + 16 }]}>
          <Pressable
            testID="room-member-sheet-backdrop"
            style={styles.msBackdrop}
            onPress={() => setMemberSheet(null)}
          />
          {memberSheet && (
            <ScrollView
              style={[styles.msPanel, sheetBounds, { height: Math.min(screenHeight * 0.64, 540) }]}
              contentContainerStyle={{ padding: 20, paddingBottom: 24 + insets.bottom }}
              testID="room-member-sheet"
            >
              <View style={styles.msTopRow}>
                <Avatar
                  name={memberSheet.name}
                  url={memberSheet.avatar_url}
                  size={64}
                  flagCode={countryToCode(memberSheet.country)}
                />
                <View style={{ flex: 1 }} />
                {!isHost && memberSheet.id !== user?.id && (
                  <Pressable
                    testID="room-ms-follow"
                    style={[
                      styles.msFollowBtn,
                      sheetFollowing && { backgroundColor: "rgba(255,255,255,0.16)" },
                    ]}
                    onPress={() => followSheetMember(memberSheet)}
                  >
                    <Text style={styles.msFollowText}>
                      {sheetFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                )}
                {isHost && memberSheet.id !== user?.id && (
                  <Pressable
                    testID="room-ms-partner"
                    style={styles.msPillBtn}
                    onPress={() => startPartnerChat(memberSheet)}
                  >
                    <Ionicons name="swap-horizontal" size={15} color="#E6E1FF" />
                    <Text style={styles.msPillText}>Partner</Text>
                  </Pressable>
                )}
                <Pressable
                  testID="room-ms-close"
                  accessibilityLabel="Close member profile"
                  style={styles.msMoreBtn}
                  onPress={() => setMemberSheet(null)}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color="#E6E1FF"
                  />
                </Pressable>
              </View>

              <View style={styles.msNameRow}>
                <Text style={styles.msName}>{memberSheet.name}</Text>
                {(memberSheet.gender === "male" || memberSheet.gender === "female") && (
                  <View testID={`room-member-gender-${memberSheet.gender}`} style={[styles.msAgePill, { backgroundColor: memberSheet.gender === "male" ? genderColors.maleBackground : genderColors.femaleBackground }]}>
                    <Ionicons name={memberSheet.gender} size={14} color={genderColors[memberSheet.gender]} />
                    <Text style={[styles.msAgeText, { color: genderColors[memberSheet.gender] }]}>
                      {memberSheet.age || ""}
                    </Text>
                  </View>
                )}
                {memberSheet.is_vip && (
                  <View style={styles.msVipPill}>
                    <Text style={styles.msVipText}>VIP</Text>
                  </View>
                )}
              </View>
              {memberSheet.is_moderator && <View testID="room-member-moderator-label" style={styles.modLabel}><Ionicons name="shield-checkmark" size={16} color="#A78BFA" /><Text style={styles.msPillText}>Moderator</Text></View>}
              <MemberStageActions member={memberSheet} isHost={canManage} isOwner={isOwner} isSelf={memberSheet.id === user?.id} busy={stageBusy} onAction={action => {
                const member = memberSheet;
                setMemberSheet(null);
                if (action === "invite") void stageAction("stage/invite", { user_id: member.id });
                else if (action === "mute") void stageAction("stage/mute", { user_id: member.id });
                else if (action === "remove-stage") void changeRole(member, "listener");
                else if (action === "kick") void kickMember(member);
                else if (action === "moderator-add") void stageAction("moderators/invite", { user_id: member.id });
                else if (action === "moderator-remove") void stageAction("moderators/remove", { user_id: member.id });
                else if (action === "self-mute") void toggleMic();
                else if (action === "leave-room") void leave();
                else void stageAction("stage/leave");
              }} />
              <View style={styles.msLangRow}>
                <Text style={styles.msLangText}>
                  {(memberSheet.native_language || "??").toUpperCase()}
                </Text>
                <Ionicons
                  name="swap-horizontal"
                  size={13}
                  color="rgba(255,255,255,0.6)"
                />
                <Text style={styles.msLangText}>
                  {(memberSheet.learning_language || "??").toUpperCase()}
                </Text>
              </View>

              <View style={styles.msLocRow}>
                <Text style={styles.msLocText} numberOfLines={1}>
                  {memberSheet.country || "Location Not Provided"}
                </Text>
              </View>
              <Pressable
                testID="room-ms-visit"
                style={styles.msVisitRow}
                onPress={() => {
                  const id2 = memberSheet.id;
                  setMemberSheet(null);
                  router.push(`/user/${id2}`);
                }}
              >
                <Text style={styles.msVisitText}>Visit profile</Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color="rgba(255,255,255,0.75)"
                />
              </Pressable>

              {memberSheet.id !== user?.id && <Pressable
                testID="room-ms-gift"
                style={styles.msGiftBtn}
                onPress={() => {
                  const id2 = memberSheet.id;
                  setMemberSheet(null);
                  openGiftModal(id2);
                }}
              >
                <Ionicons name="gift" size={18} color="#FFFFFF" />
                <Text style={styles.msGiftText}>Send Gift</Text>
              </Pressable>}
            </ScrollView>
          )}
          </View>
        </Modal>

        {/* Voiceroom-ended summary overlay */}
        {ended && (
          <View style={styles.endedOverlay} testID="room-ended-overlay">
            <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
              <Pressable
                testID="room-ended-close"
                style={styles.endedClose}
                onPress={() => router.back()}
                hitSlop={10}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.endedTitle}>The Voiceroom has ended</Text>
              <View style={{ alignItems: "center", marginTop: 18 }}>
                <Avatar
                  name={host?.name || room.title}
                  url={host?.avatar_url}
                  size={86}
                  flagCode={countryToCode(host?.country)}
                />
                <Text style={styles.endedHostName}>{host?.name || "Host"}</Text>
                <Pressable
                  testID="room-ended-hostcenter"
                  style={styles.endedHostCenter}
                  onPress={() =>
                    host
                      ? router.push(host.id === user?.id ? "/(tabs)/profile" : `/user/${host.id}`)
                      : router.back()
                  }
                >
                  <Text style={styles.endedHostCenterText}>Host Center</Text>
                </Pressable>
              </View>
              <Text style={styles.endedStatsLabel}>Stats</Text>
              <View style={styles.endedStatsCard}>
                <View style={styles.endedStatsRow}>
                  <View style={styles.endedStatCell}>
                    <Text style={styles.endedStatValue}>
                      {Math.max(
                        1,
                        Math.round(
                          (Date.now() - new Date(room.created_at).getTime()) / 60000,
                        ),
                      )}{" "}
                      <Text style={styles.endedStatUnit}>minutes</Text>
                    </Text>
                    <Text style={styles.endedStatLabel}>Hosting hours</Text>
                  </View>
                  <View style={[styles.endedStatCell, styles.endedStatCellRight]}>
                    <Text style={styles.endedStatValue}>
                      💎 {((room.most_gifted || []).reduce((s: number, g: any) => s + (g.coins || 0), 0) / 10).toFixed(1)}
                    </Text>
                    <Text style={styles.endedStatLabel}>Gifts income</Text>
                  </View>
                </View>
                <View style={styles.endedStatsRow}>
                  <View style={styles.endedStatCell}>
                    <Text style={styles.endedStatValue}>{members.length}</Text>
                    <Text style={styles.endedStatLabel}>Audience totals</Text>
                  </View>
                  <View style={[styles.endedStatCell, styles.endedStatCellRight]}>
                    <Text style={styles.endedStatValue}>
                      {(room.most_gifted || []).length}
                    </Text>
                    <Text style={styles.endedStatLabel}>Number of gifters</Text>
                  </View>
                </View>
                <View style={styles.endedStatsRow}>
                  <View style={styles.endedStatCell}>
                    <Text style={styles.endedStatValue}>{speakers.length}</Text>
                    <Text style={styles.endedStatLabel}>Stage Participants</Text>
                  </View>
                </View>
              </View>
              <View style={{ flex: 1 }} />
              <Text style={styles.endedFooter}>Visit the Host Center to view more</Text>
            </SafeAreaView>
          </View>
        )}

        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <View style={styles.switcherRoot}>
            <Pressable
              style={styles.switcherBackdrop}
              onPress={() => setMenuOpen(false)}
            />
            <View
              style={[
                styles.switcherPanel,
                {
                  backgroundColor:
                    PANEL_BG_COLORS[
                      (room?.background ?? bgIndex) % PANEL_BG_COLORS.length
                    ],
                },
              ]}
            >
              <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
                <View style={styles.switcherIconRow}>
                  <Pressable
                    testID="room-switcher-share-btn"
                    style={[styles.switcherIconBtn, styles.switcherShareBtn]}
                    onPress={() => setShareMenuOpen(true)}
                  >
                    <Ionicons name="share-social" size={19} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    testID="room-switcher-minimize-btn"
                    style={[styles.switcherIconBtn, styles.switcherMinimizeBtn]}
                    onPress={minimizeRoom}
                  >
                    <MaterialCommunityIcons
                      name="arrow-collapse"
                      size={19}
                      color="#FFFFFF"
                    />
                  </Pressable>
                  <Pressable
                    testID="room-power-btn"
                    style={[styles.switcherIconBtn, styles.switcherPowerBtn]}
                    onPress={() => {
                      setMenuOpen(false);
                      leave();
                    }}
                  >
                    <Ionicons name="power" size={19} color="#FFFFFF" />
                  </Pressable>
                </View>

                <Text style={styles.switcherTitle}>Recommended</Text>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 40 }}
                >
                  {switcherRooms.length === 0 ? (
                    <Text style={styles.switcherEmpty}>
                      No other live rooms right now
                    </Text>
                  ) : (
                    switcherRooms.map((r) => (
                      <Pressable
                        key={r.id}
                        testID={`room-switcher-item-${r.id}`}
                        style={styles.switcherRoomRow}
                        onPress={() => switchRoom(r.id)}
                      >
                        <Avatar
                          name={r.host?.name}
                          url={r.host?.avatar_url}
                          size={56}
                          flagCode={countryToCode(r.host?.country)}
                        />
                        <View style={styles.switcherRoomInfo}>
                          <Text
                            style={styles.switcherRoomTitle}
                            numberOfLines={1}
                          >
                            {r.title}
                          </Text>
                          <View style={styles.switcherMetaRow}>
                            <View style={styles.switcherLangChip}>
                              <Text style={styles.switcherLangText}>
                                {(r.language || "en").toUpperCase()}
                              </Text>
                            </View>
                            <Ionicons
                              name="people"
                              size={13}
                              color="rgba(255,255,255,0.5)"
                              style={{ marginLeft: 12 }}
                            />
                            <Text style={styles.switcherMembers}>
                              {r.member_count}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </SafeAreaView>
            </View>
          </View>
        </Modal>

        {/* Exit action sheet (opened by the Power icon) */}
        <Modal
          visible={exitSheetOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setExitSheetOpen(false)}
        >
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setExitSheetOpen(false)}
          >
            <View style={[styles.actionSheetWrap, { paddingBottom: spacing.xl + insets.bottom }]}>
              <View style={styles.actionSheet}>
                <Pressable
                  testID="exit-share-btn"
                  style={styles.actionSheetRow}
                  onPress={() => {
                    setExitSheetOpen(false);
                    setShareMenuOpen(true);
                  }}
                >
                  <Text style={styles.actionSheetText}>Share</Text>
                </Pressable>
                <View style={styles.actionSheetDivider} />
                <Pressable
                  testID="exit-minimize-btn"
                  style={styles.actionSheetRow}
                  onPress={minimizeRoom}
                >
                  <Text style={styles.actionSheetText}>Minimize the room</Text>
                </Pressable>
                {isOwner && <><View style={styles.actionSheetDivider} /><Pressable testID="room-moderators-btn" style={styles.actionSheetRow} onPress={() => { setExitSheetOpen(false); setHostPickOpen(true); }}><Text style={styles.actionSheetText}>Moderators · {room.moderators?.length || 0}</Text></Pressable></>}
                <View style={styles.actionSheetDivider} />
                <Pressable
                  testID="exit-leave-btn"
                  style={styles.actionSheetRow}
                  onPress={() => {
                    if (isHost) {
                      hostLeaveFlow();
                    } else {
                      setExitSheetOpen(false);
                      leave();
                    }
                  }}
                >
                  <Text style={styles.actionSheetText}>Leave</Text>
                </Pressable>
                {canManage && (
                  <>
                    <View style={styles.actionSheetDivider} />
                    <Pressable
                      testID="exit-close-btn"
                      style={styles.actionSheetRow}
                      onPress={() => {
                        setExitSheetOpen(false);
                        closeRoom();
                      }}
                    >
                      <Text
                        style={[styles.actionSheetText, styles.actionSheetDanger]}
                      >
                        Close
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
              <Pressable
                testID="exit-cancel-btn"
                style={styles.actionSheetCancel}
                onPress={() => setExitSheetOpen(false)}
              >
                <Text style={styles.actionSheetCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Share submenu: Share to Chat / Share to Moments */}
        <Modal
          visible={shareMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setShareMenuOpen(false)}
        >
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setShareMenuOpen(false)}
          >
            <View style={[styles.actionSheetWrap, { paddingBottom: spacing.xl + insets.bottom }]}>
              <View style={styles.actionSheet}>
                <Pressable
                  testID="share-to-chat-btn"
                  style={styles.actionSheetRow}
                  onPress={openShareToChat}
                >
                  <Text style={styles.actionSheetText}>Share to Chat</Text>
                </Pressable>
                <View style={styles.actionSheetDivider} />
                <Pressable
                  testID="share-to-moments-btn"
                  style={styles.actionSheetRow}
                  onPress={shareToMoments}
                >
                  <Text style={styles.actionSheetText}>Share to Moments</Text>
                </Pressable>
              </View>
              <Pressable
                style={styles.actionSheetCancel}
                onPress={() => setShareMenuOpen(false)}
              >
                <Text style={styles.actionSheetCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <ModeratorsSheet visible={hostPickOpen && isOwner} room={room} busy={stageBusy} error={stageError} notice={roomNotice} onClose={() => setHostPickOpen(false)} onInvite={m => stageAction("moderators/invite", { user_id: m.id })} onRemove={m => stageAction("moderators/remove", { user_id: m.id })} />

        {/* Share to Chat: pick a conversation */}
        <Modal
          visible={chatPickOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setChatPickOpen(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setChatPickOpen(false)}
          >
            <View style={styles.menuSheet}>
              <Text style={styles.menuTitle}>Share to Chat</Text>
              {chatList.length === 0 ? (
                <Text style={styles.pickerSub}>
                  You have no chats yet. Say hi to a partner first!
                </Text>
              ) : (
                <ScrollView style={{ maxHeight: 340 }}>
                  {chatList.map((c) => (
                    <Pressable
                      key={c.id}
                      testID={`share-chat-${c.id}`}
                      style={styles.pickerRow}
                      onPress={() => sendRoomToChat(c)}
                      disabled={!!sharingChatId}
                    >
                      <Avatar
                        name={c.partner?.name}
                        url={c.partner?.avatar_url}
                        size={40}
                        flagCode={countryToCode(c.partner?.country)}
                      />
                      <Text
                        style={[styles.pickerName, { flex: 1, marginLeft: spacing.md }]}
                        numberOfLines={1}
                      >
                        {c.partner?.name}
                      </Text>
                      {sharingChatId === c.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons
                          name="paper-plane"
                          size={16}
                          color="#10B981"
                        />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={toolsOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setToolsOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setToolsOpen(false)}>
            <View style={styles.menuSheet}>
              <Text style={styles.menuTitle}>Room Tools</Text>
              <Pressable
                style={styles.menuRow}
                testID="room-bg-btn"
                onPress={() => setBgIndex((i) => (i + 1) % BG_COLORS.length)}
              >
                <Ionicons name="color-palette-outline" size={18} color="#FFFFFF" />
                <Text style={styles.menuText}>Change background</Text>
              </Pressable>
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  setToolsOpen(false);
                  shareInvite();
                }}
              >
                <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                <Text style={styles.menuText}>Invite friends</Text>
              </Pressable>
              {canManage && (
                <Pressable
                  style={styles.menuRow}
                  testID="room-tools-mute-btn"
                  onPress={toggleChatMute}
                >
                  <Ionicons
                    name={room.chat_muted ? "chatbox-ellipses-outline" : "chatbox-outline"}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.menuText}>
                    {room.chat_muted ? "Unmute room chat" : "Mute room chat"}
                  </Text>
                </Pressable>
              )}
              {canManage && !room.is_private && (
                <Pressable
                  style={styles.menuRow}
                  testID="room-share-moments-btn"
                  onPress={shareToMoments}
                >
                  <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.menuText}>Share to Moments</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Modal>

        <StageRequestsSheet visible={handModalOpen && canManage} members={handRequests} busy={stageBusy} error={stageError} onClose={() => setHandModalOpen(false)} onAccept={m => changeRole(m, "speaker")} onReject={dismissHand} />
        {removed && <RemovedFromRoom onLeave={() => router.replace("/(tabs)/voice")} />}

        <Modal
          visible={audienceModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setAudienceModalOpen(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setAudienceModalOpen(false)}
          >
            <Pressable testID="room-audience-sheet" style={[styles.menuSheet, sheetBounds]} onPress={() => {}}>
              <Text testID="room-audience-title" style={styles.menuTitle}>Audience · {listeners.length}</Text>
              <ScrollView style={{ maxHeight: 360, flexShrink: 1 }}>
                {listeners.map((m) => (
                  <Pressable
                    key={m.id}
                    testID={`audience-row-${m.id}`}
                    style={styles.requestRow}
                    onPress={() => {
                      setAudienceModalOpen(false);
                      onAvatarPress(m);
                    }}
                  >
                    <Avatar
                      name={m.name}
                      url={m.avatar_url}
                      size={36}
                      flagCode={countryToCode(m.country)}
                    />
                    <Text style={styles.requestName} numberOfLines={1}>
                      {m.id === user?.id ? "You" : m.name}
                    </Text>
                    {canSeeHands && m.hand_raised && (
                      <RaiseHandIcon size={17} color="#FBBF24" />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={giftOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setGiftOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setGiftOpen(false)}>
            <BoundedSheet
              testID="room-gift-sheet"
              style={[styles.giftSheet, { paddingBottom: spacing.xl + insets.bottom }]}
            >
              <View style={styles.giftHeader}>
                <Text style={styles.menuTitle}>
                  Send a gift
                  {giftTarget
                    ? ` to ${giftTarget.id === user?.id ? "yourself" : giftTarget.name}`
                    : ""}
                </Text>
                <View style={styles.coinsPill}>
                  <Ionicons name="logo-bitcoin" size={14} color="#FBBF24" />
                  <Text style={styles.coinsText}>{user?.coins || 0}</Text>
                </View>
              </View>
              <View style={styles.giftGrid}>
                {gifts.map((g) => (
                  <Pressable
                    key={g.id}
                    style={styles.giftItem}
                    testID={`room-gift-${g.id}`}
                    onPress={() => sendGift(g)}
                    disabled={!!sendingGiftId}
                  >
                    {sendingGiftId === g.id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.giftItemEmoji}>{g.emoji}</Text>
                        <Text style={styles.giftItemName}>{g.name}</Text>
                        <View style={styles.giftPricePill}>
                          <Ionicons name="logo-bitcoin" size={11} color="#FBBF24" />
                          <Text style={styles.giftPriceText}>{g.price}</Text>
                        </View>
                      </>
                    )}
                  </Pressable>
                ))}
              </View>
            </BoundedSheet>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors, bottomInset = 0) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    safe: {
      flex: 1,
      backgroundColor: "transparent",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flexWrap: "wrap",
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: "#F87171",
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 19,
      lineHeight: 25,
      color: "#FFFFFF",
      flexShrink: 1,
      maxWidth: 160,
    },
    followBtn: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 3,
    },
    followingBtn: {
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    followText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: "#FFFFFF",
    },
    subRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    levelChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: "#DB2777",
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 1.5,
    },
    levelEmoji: {
      fontSize: 9,
    },
    langPill: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderRadius: radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 1.5,
    },
    langPillText: {
      fontFamily: fonts.textBold,
      fontSize: 10.5,
      color: "#FFFFFF",
    },
    renameBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "#0E9AE0",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 6,
    },
    hostHomeBadge: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#0E9AE0",
      alignItems: "center",
      justifyContent: "center",
    },
    seatNum: {
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: "rgba(255,255,255,0.7)",
      marginTop: 4,
    },
    rightRail: {
      position: "absolute",
      right: 14,
      bottom: 60,
      zIndex: 20,
      alignItems: "center",
      gap: 9,
    },
    railPromo: {
      alignItems: "center",
    },
    railPromoEmoji: {
      fontSize: 31,
    },
    railDashes: {
      flexDirection: "row",
      gap: 3,
      marginTop: 3,
    },
    railDash: {
      width: 6,
      height: 3,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.35)",
    },
    railDashActive: {
      backgroundColor: "#FFFFFF",
      width: 10,
    },
    railVip: {
      width: 41,
      height: 41,
      borderRadius: 12,
      backgroundColor: "#1E2B7A",
      alignItems: "center",
      justifyContent: "center",
    },
    railVipTag: {
      position: "absolute",
      top: 2,
      right: 3,
      backgroundColor: "transparent",
    },
    railVipTagText: {
      fontFamily: fonts.textBold,
      fontSize: 8,
      color: "#FFD700",
    },
    railHand: {
      width: 41,
      height: 41,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    railHandActive: {
      backgroundColor: "#B45309",
    },
    railHandBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "#EF4444",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    railHandBadgeText: {
      fontFamily: fonts.textBold,
      fontSize: 9.5,
      color: "#FFFFFF",
    },
    edRoot: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    edClose: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
      alignSelf: "flex-start",
    },
    edBody: {
      paddingHorizontal: 18,
      paddingBottom: 24,
    },
    edTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 28,
      color: colors.onSurface,
      marginTop: 6,
      marginBottom: 16,
    },
    edInputCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 6,
      minHeight: 62,
      marginBottom: 16,
    },
    edTitleInput: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 16.5,
      color: colors.onSurface,
      paddingVertical: 10,
      marginRight: 10,
    },
    edCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
    },
    edLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 16.5,
      color: colors.onSurface,
      marginBottom: 10,
    },
    edRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    edDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginVertical: 14,
    },
    edChipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    edChip: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 18,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    edChipActive: {
      backgroundColor: colors.brandTertiary,
      borderColor: colors.brand,
    },
    edChipText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
    },
    edChipTextActive: {
      color: colors.brand,
    },
    edBgRow: {
      flexDirection: "row",
      gap: 10,
    },
    edBgSwatch: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    edBgSwatchActive: {
      borderColor: colors.brand,
    },
    edAnnounceCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.brand,
      padding: 16,
    },
    edAnnounceTitle: {
      fontFamily: fonts.textSemi,
      fontSize: 16,
      color: colors.onSurface,
      marginBottom: 8,
    },
    edAnnounceInput: {
      minHeight: 100,
      textAlignVertical: "top",
      fontFamily: fonts.text,
      fontSize: 15,
      color: colors.onSurface,
      paddingVertical: 4,
    },
    edAnnounceFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
    },
    edTopicChip: {
      backgroundColor: colors.brandTertiary,
      borderRadius: 15,
      paddingHorizontal: 13,
      paddingVertical: 6,
    },
    edTopicChipText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: colors.brand,
    },
    edCounter: {
      fontFamily: fonts.text,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
    },
    edFooter: {
      padding: 18,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    edSaveBtn: {
      backgroundColor: colors.brand,
      borderRadius: 28,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    edSaveText: {
      fontFamily: fonts.textBold,
      fontSize: 16.5,
      color: colors.onBrand,
    },
    msBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(5,3,20,0.45)",
    },
    msPanel: {
      maxHeight: "70%",
      flexGrow: 0,
      flexShrink: 1,
      backgroundColor: "#241D4F",
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
    },
    msTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    msPillBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderRadius: 20,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    msPillText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: "#E6E1FF",
    },
    msMoreBtn: {
      width: 44,
      height: 44,
      borderRadius: 19,
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    msNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
      flexWrap: "wrap",
    },
    msName: {
      fontFamily: fonts.displayBold,
      fontSize: 21,
      color: "#FFFFFF",
      flexShrink: 1,
    },
    msAgePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    msAgeText: {
      fontFamily: fonts.textBold,
      fontSize: 11.5,
      color: "#FFFFFF",
    },
    msVipPill: {
      backgroundColor: "#F59E0B",
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    msVipText: {
      fontFamily: fonts.textBold,
      fontSize: 10.5,
      color: "#3B2A00",
    },
    msLangRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    msLangText: {
      fontFamily: fonts.textBold,
      fontSize: 12.5,
      color: "rgba(255,255,255,0.85)",
    },
    msFollowBtn: {
      backgroundColor: "#0E9AE0",
      borderRadius: 24,
      paddingHorizontal: 26,
      paddingVertical: 12,
    },
    msFollowText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: "#FFFFFF",
    },
    msLocRow: {
      marginTop: 10,
    },
    msLocText: {
      fontFamily: fonts.text,
      fontSize: 14,
      color: "rgba(255,255,255,0.55)",
    },
    msVisitRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 3,
      marginTop: 12,
    },
    msVisitText: {
      fontFamily: fonts.textSemi,
      fontSize: 14.5,
      color: "rgba(255,255,255,0.85)",
    },
    msGiftBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#0E9AE0",
      borderRadius: 28,
      height: 52,
      marginTop: 18,
    },
    msGiftText: {
      fontFamily: fonts.textBold,
      fontSize: 16.5,
      color: "#FFFFFF",
    },
    endedOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "#241D4F",
      zIndex: 100,
      paddingHorizontal: 22,
    },
    endedClose: {
      alignSelf: "flex-start",
      paddingVertical: 10,
    },
    endedTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 24,
      color: "#FFFFFF",
      textAlign: "center",
      marginTop: 8,
    },
    endedHostName: {
      fontFamily: fonts.displaySemi,
      fontSize: 18,
      color: "#FFFFFF",
      marginTop: 10,
    },
    endedHostCenter: {
      backgroundColor: "#0E9AE0",
      borderRadius: radius.pill,
      paddingHorizontal: 46,
      paddingVertical: 13,
      marginTop: 16,
    },
    endedHostCenterText: {
      fontFamily: fonts.textBold,
      fontSize: 15.5,
      color: "#FFFFFF",
    },
    endedStatsLabel: {
      fontFamily: fonts.displaySemi,
      fontSize: 18,
      color: "#FFFFFF",
      marginTop: 26,
      marginBottom: 10,
    },
    endedStatsCard: {
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: 18,
      paddingVertical: 6,
      paddingHorizontal: 16,
    },
    endedStatsRow: {
      flexDirection: "row",
      paddingVertical: 12,
    },
    endedStatCell: {
      flex: 1,
    },
    endedStatCellRight: {
      borderLeftWidth: 1,
      borderLeftColor: "rgba(255,255,255,0.12)",
      paddingLeft: 16,
    },
    endedStatValue: {
      fontFamily: fonts.displayBold,
      fontSize: 19,
      color: "#FFFFFF",
    },
    endedStatUnit: {
      fontSize: 12,
      fontFamily: fonts.textSemi,
      color: "rgba(255,255,255,0.8)",
    },
    endedStatLabel: {
      fontFamily: fonts.text,
      fontSize: 13.5,
      color: "rgba(255,255,255,0.6)",
      marginTop: 2,
    },
    endedFooter: {
      fontFamily: fonts.text,
      fontSize: 14,
      color: "rgba(255,255,255,0.55)",
      textAlign: "center",
      paddingBottom: 16,
    },
    levelText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: "#FDE68A",
    },
    subText: {
      fontFamily: fonts.text,
      fontSize: 11.5,
      color: "rgba(255,255,255,0.65)",
    },
    menuBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    gifterRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    gifterWrap: {
      position: "relative",
    },
    gifterRankBadge: {
      position: "absolute",
      bottom: -3,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.35)",
    },
    rankGold: {
      backgroundColor: "#F59E0B",
    },
    rankSilver: {
      backgroundColor: "#94A3B8",
    },
    rankBronze: {
      backgroundColor: "#B45309",
    },
    gifterRankText: {
      fontFamily: fonts.textBold,
      fontSize: 8.5,
      color: "#FFFFFF",
    },
    stageScroll: {
      maxHeight: "42%",
    },
    stageFixed: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    stage: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    sectionLabel: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: "rgba(255,255,255,0.55)",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    handNotifyBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      backgroundColor: "rgba(251,191,36,0.22)",
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: "rgba(251,191,36,0.5)",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    audioNoticeBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    audioNoticeText: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 11.5,
      color: "rgba(255,255,255,0.85)",
    },
    joinAnnouncement: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      alignSelf: "center",
      marginBottom: spacing.sm,
      backgroundColor: "rgba(109,90,232,0.85)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      maxWidth: "88%",
    },
    joinAnnouncementText: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: "#FFFFFF",
      flexShrink: 1,
    },
    handNotifyIconWrap: {
      position: "relative",
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    handNotifyBadge: {
      position: "absolute",
      top: -6,
      right: -8,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "#EF4444",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    handNotifyBadgeText: {
      fontFamily: fonts.textBold,
      fontSize: 9,
      color: "#FFFFFF",
    },
    handNotifyText: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 12.5,
      color: "#FFFFFF",
    },
    requestRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    requestName: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: "#FFFFFF",
    },
    acceptBtn: {
      backgroundColor: "#8B7CF6",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
    },
    acceptText: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: "#FFFFFF",
    },
    dismissBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    stageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: spacing.lg,
    },
    memberCell: {
      alignItems: "center",
      gap: 5,
      width: 74,
    },
    muteCenter: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    muteCenterCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "rgba(15,10,40,0.72)",
      alignItems: "center",
      justifyContent: "center",
    },
    micBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#2A2154",
    },
    handBadge: {
      position: "absolute",
      top: -3,
      right: -3,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#FBBF24",
      alignItems: "center",
      justifyContent: "center",
    },
    handBadgeSmall: {
      position: "absolute",
      top: -2,
      right: 4,
      width: 15,
      height: 15,
      borderRadius: 8,
      backgroundColor: "#FBBF24",
      alignItems: "center",
      justifyContent: "center",
    },
    hostCrown: {
      position: "absolute",
      top: -3,
      left: -3,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    memberNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      maxWidth: 78,
    },
    memberName: {
      fontFamily: fonts.textSemi,
      fontSize: 11.5,
      color: "#FFFFFF",
      maxWidth: 72,
    },
    emptySeat: {
      alignItems: "center",
      width: 74,
    },
    emptySeatCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    listenerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      gap: spacing.sm,
    },
    listenerCell: {
      alignItems: "center",
      gap: 3,
      width: 34,
    },
    listenerName: {
      fontFamily: fonts.text,
      fontSize: 9,
      color: "rgba(255,255,255,0.75)",
      maxWidth: 34,
    },
    moreCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    moreText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: "#FFFFFF",
    },
    chatSection: {
      flex: 1,
      // Same colour as the room background — one uniform tone everywhere.
      backgroundColor: "transparent",
      position: "relative",
    },
    chatList: {
      padding: spacing.lg,
      gap: spacing.sm,
      flexGrow: 1,
      paddingRight: 70,
    },
    noticeRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    noticeIconCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "#10B981",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    noticeBubble: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: "rgba(0,0,0,0.28)",
      borderRadius: radius.md,
      padding: spacing.sm + 4,
    },
    systemBubble: {
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    noticePill: {
      backgroundColor: "rgba(124,107,240,0.45)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      marginTop: 1,
    },
    noticePillText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: "#E0E7FF",
    },
    noticeText: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 12.5,
      lineHeight: 18,
      color: "rgba(255,255,255,0.88)",
    },
    chatEmpty: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: "rgba(255,255,255,0.55)",
      textAlign: "center",
      paddingTop: spacing.xl,
    },
    systemRow: {
      alignItems: "center",
      paddingVertical: 4,
    },
    systemText: {
      fontFamily: fonts.text,
      fontSize: 11.5,
      fontStyle: "italic",
      color: "rgba(255,255,255,0.55)",
      textAlign: "center",
    },
    giftRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: "rgba(251,191,36,0.14)",
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    giftText: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 13,
      color: "#FDE68A",
    },
    giftSender: {
      fontFamily: fonts.textBold,
      color: "#FFFFFF",
    },
    chatRow: {
      flexDirection: "row",
      gap: spacing.sm,
      alignItems: "flex-start",
    },
    chatBubbleCol: {
      flex: 1,
      alignItems: "flex-start",
    },
    chatBubble: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 5,
      backgroundColor: "rgba(0,0,0,0.28)",
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      maxWidth: "100%",
    },
    hostChip: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "#10B981",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    chatSender: {
      fontFamily: fonts.textBold,
      color: "#7FD1F5",
    },
    chatText: {
      flexShrink: 1,
      fontFamily: fonts.text,
      fontSize: 13.5,
      lineHeight: 19,
      color: "#FFFFFF",
    },
    translatedText: {
      fontFamily: fonts.text,
      fontSize: 12,
      lineHeight: 17,
      color: "rgba(255,255,255,0.6)",
      marginTop: 2,
    },
    translateBtn: {
      padding: 4,
    },
    floatingStack: {
      position: "absolute",
      right: 12,
      // Lifted a little above the quick-reply / input area so the raise-hand
      // button sits in a comfortable thumb spot.
      bottom: 34,
      alignItems: "center",
      gap: 10,
    },
    topGifterWrap: {
      position: "relative",
    },
    crownBadge: {
      position: "absolute",
      top: -3,
      right: -3,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    floatBtn: {
      width: 48,
      height: 48,
      // Rounded square, HelloTalk-style hand-raise button.
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    micOn: {
      backgroundColor: "#22C55E",
    },
    micOff: {
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    handActive: {
      backgroundColor: "#FBBF24",
    },
    quickRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: 6,
      gap: spacing.xs,
    },
    quickScroll: {
      gap: spacing.xs,
      paddingRight: spacing.xs,
    },
    quickChip: {
      backgroundColor: "rgba(255,255,255,0.14)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
    },
    quickText: {
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: "#FFFFFF",
    },
    quickClose: {
      padding: 4,
    },
    controls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    input: {
      flex: 1,
      minWidth: 0,
      backgroundColor: "rgba(0,0,0,0.28)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      fontFamily: fonts.text,
      fontSize: 13.5,
      color: "#FFFFFF",
    },
    inputFocused: {
      paddingVertical: spacing.md,
      fontSize: 14.5,
      backgroundColor: "rgba(0,0,0,0.38)",
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "rgba(0,0,0,0.28)",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    newBadge: {
      position: "absolute",
      top: 0,
      right: 0,
      backgroundColor: "#EF4444",
      borderRadius: 5,
      paddingHorizontal: 3,
      paddingVertical: 0.5,
    },
    barEmoji: {
      fontSize: 17,
    },
    giftDot: {
      position: "absolute",
      top: 2,
      right: 3,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#F472B6",
    },
    newBadgeText: {
      fontFamily: fonts.textBold,
      fontSize: 6,
      color: "#FFFFFF",
    },
    sendBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#0E9AE0",
      alignItems: "center",
      justifyContent: "center",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    menuSheet: {
      maxHeight: "85%",
      flexShrink: 1,
      backgroundColor: "#2A2154",
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      gap: 4,
      paddingBottom: spacing.xl + bottomInset,
    },
    memberModalHost: { ...StyleSheet.absoluteFill, justifyContent: "flex-end" },
    roomNotice: { flexDirection: "row", alignItems: "center", padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, backgroundColor: "#3C3178", gap: 8, minHeight: 44 },
    moderatorBadge: { backgroundColor: "#7C3AED" },
    modLabel: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 12 },
    stageErrorBox: { flexDirection: "row", alignItems: "center", padding: 12, marginHorizontal: 16, borderRadius: 12, backgroundColor: "#8B2536", gap: 8, minHeight: 44 },
    stageErrorText: { flex: 1, color: "#FFFFFF", fontSize: 12, lineHeight: 18 },
    stageStatusRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 16 },
    stageStatusText: { flexShrink: 1, color: "#FFFFFF", fontFamily: fonts.textSemi, fontSize: 11, lineHeight: 17 },
    stageLeaveButton: { minHeight: 44, paddingHorizontal: 12, marginLeft: "auto", borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center" },
    menuTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 15,
      color: "#FFFFFF",
      marginBottom: spacing.sm,
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingVertical: spacing.sm + 2,
    },
    menuRowDanger: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(255,255,255,0.15)",
      marginTop: 4,
    },
    menuText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: "#FFFFFF",
    },
    switcherRoot: {
      flex: 1,
      flexDirection: "row",
    },
    switcherBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    switcherPanel: {
      width: "62%",
      maxWidth: 280,
      // Fallback — the runtime style overrides this with a room-specific tint.
      backgroundColor: "#2E2461",
      paddingHorizontal: spacing.md,
    },
    switcherIconRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingHorizontal: spacing.xs,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    switcherIconBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    switcherShareBtn: {
      backgroundColor: "#0E9AE0",
    },
    switcherMinimizeBtn: {
      backgroundColor: "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    switcherPowerBtn: {
      backgroundColor: "#EF4444",
    },
    switcherTitle: {
      fontFamily: fonts.display,
      fontSize: 21,
      color: "#FFFFFF",
      marginBottom: spacing.md,
    },
    switcherEmpty: {
      fontFamily: fonts.text,
      fontSize: 14,
      color: "rgba(255,255,255,0.5)",
      marginTop: spacing.md,
    },
    switcherRoomRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm + 4,
    },
    switcherRoomInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    switcherRoomTitle: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: "#FFFFFF",
      marginBottom: 8,
    },
    switcherMetaRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    switcherLangChip: {
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    switcherLangText: {
      fontFamily: fonts.textSemi,
      fontSize: 11,
      color: "rgba(255,255,255,0.85)",
    },
    switcherMembers: {
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: "rgba(255,255,255,0.5)",
      marginLeft: 4,
    },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
      paddingHorizontal: spacing.md,
    },
    actionSheetWrap: {
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    actionSheet: {
      backgroundColor: "#2A2A32",
      borderRadius: radius.lg,
      overflow: "hidden",
    },
    actionSheetRow: {
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    actionSheetText: {
      fontFamily: fonts.textSemi,
      fontSize: 17,
      color: "#FFFFFF",
    },
    actionSheetDanger: {
      color: "#F87171",
    },
    actionSheetDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    actionSheetCancel: {
      backgroundColor: "#10B981",
      borderRadius: radius.lg,
      paddingVertical: 16,
      alignItems: "center",
    },
    actionSheetCancelText: {
      fontFamily: fonts.textBold,
      fontSize: 17,
      color: "#FFFFFF",
    },
    pickerSub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: "rgba(255,255,255,0.6)",
      marginBottom: spacing.sm,
    },
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm + 2,
    },
    pickerName: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: "#FFFFFF",
    },
    pickerRole: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: "rgba(255,255,255,0.5)",
      marginTop: 2,
    },
    giftSheet: {
      backgroundColor: "#2A2154",
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    giftHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    coinsPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
    },
    coinsText: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: "#FDE68A",
    },
    giftGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    giftItem: {
      width: "22.5%",
      aspectRatio: 0.85,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
    },
    giftItemEmoji: {
      fontSize: 26,
    },
    giftItemName: {
      fontFamily: fonts.textSemi,
      fontSize: 10.5,
      color: "#FFFFFF",
    },
    giftPricePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: "rgba(0,0,0,0.3)",
      borderRadius: radius.pill,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    giftPriceText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: "#FDE68A",
    },
  });
