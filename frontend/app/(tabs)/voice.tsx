import { Ionicons } from "@/src/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
    Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppSwitch } from "@/src/components/AppSwitch";

import { Avatar } from "@/src/components/Avatar";
import { EmptyState } from "@/src/components/EmptyState";
import { FlagIcon } from "@/src/components/FlagIcon";
import { NetworkErrorState } from "@/src/components/NetworkErrorState";
import { SpeakingBars } from "@/src/components/SpeakingBars";
import { countryToCode } from "@/src/constants/countries";
import { langName } from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { useNetwork } from "@/src/context/NetworkContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, shadow, spacing, ThemeColors } from "@/src/theme";
import { api, Room } from "@/src/utils/api";
import { timeAgo } from "@/src/utils/time";

const BG_GRADIENTS: [string, string][] = [
  ["#0E9AE0", "#4B3F87"],
  ["#0EA5E9", "#0369A1"],
  ["#EC4899", "#701A75"],
  ["#F59E0B", "#B45309"],
];

const bgForRoom = (room: Room) => {
  if (typeof room.background === "number") {
    return BG_GRADIENTS[room.background % BG_GRADIENTS.length];
  }
  let hash = 0;
  for (const ch of room.id) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return BG_GRADIENTS[hash % BG_GRADIENTS.length];
};

const MODES: {
  id: "chat" | "music" | "study" | "interactive" | "game";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  locked?: boolean;
}[] = [
  { id: "chat", label: "Chat", icon: "chatbubbles" },
  { id: "music", label: "Music", icon: "musical-notes" },
  { id: "study", label: "Study", icon: "timer" },
  { id: "interactive", label: "Interactive", icon: "easel", locked: true },
  { id: "game", label: "Game", icon: "game-controller", locked: true },
];

const TOPIC_TAGS = [
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

export default function Voice() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isOnline, retry } = useNetwork();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [roomLangs, setRoomLangs] = useState<string[]>([]);
  const [mode, setMode] = useState<"chat" | "music" | "study">("chat");
  const [topic, setTopic] = useState<string | null>("Voice Lover");
  const [isPrivate, setIsPrivate] = useState(false);
  const [background, setBackground] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [shareToMoments, setShareToMoments] = useState(true);
  const [announcePinned, setAnnouncePinned] = useState(true);
  const [roomBoost, setRoomBoost] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);

  // Room languages come from the user's own languages (native + teach + learning).
  const myLangs = Array.from(
    new Set(
      [
        user?.native_language,
        ...(user?.teach_languages || []),
        ...(user?.learning_languages?.length
          ? user.learning_languages
          : user?.learning_language
            ? [user.learning_language]
            : []),
      ].filter(Boolean) as string[],
    ),
  );

  const toggleRoomLang = (code: string) => {
    setRoomLangs((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length >= 2
          ? prev
          : [...prev, code],
    );
  };

  const load = useCallback(async () => {
    try {
      const data = await api.get<Room[]>("/rooms");
      setRooms(data);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 10000);
      return () => clearInterval(t);
    }, [load]),
  );

  const resetForm = () => {
    setTitle("");
    setRoomLangs([]);
    setMode("chat");
    setTopic("Voice Lover");
    setIsPrivate(false);
    setBackground(0);
    setAnnouncement("");
    setShareToMoments(true);
    setAnnouncePinned(true);
    setRoomBoost(false);
    setLangOpen(false);
    setTopicOpen(false);
    setBgOpen(false);
  };

  const openCreateModal = () => {
    // Preselect the user's first language (fallback: English) so creating
    // always works — some accounts (e.g. fresh guests) have no languages set.
    if (roomLangs.length === 0) {
      setRoomLangs([myLangs[0] || "en"]);
    }
    if (!topic) setTopic("Voice Lover");
    setModalOpen(true);
  };

  const createRoom = async () => {
    if (!title.trim() || creating || roomLangs.length === 0) return;
    setCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const room = await api.post<Room>("/rooms", {
        title: title.trim(),
        language: roomLangs[0],
        languages: roomLangs,
        topic,
        mode,
        is_private: isPrivate,
        background,
        announcement: announcement.trim() || null,
        share_to_moments: shareToMoments && !isPrivate,
      });
      setModalOpen(false);
      resetForm();
      router.push(`/room/${room.id}`);
    } catch (e) {
      // Keep the modal open and TELL the user why it failed (was silent before).
      const msg = e instanceof Error ? e.message : "Could not create the room. Try again.";
      if (Platform.OS === "web") {
        window.alert(`Create room\n\n${msg}`);
      } else {
        Alert.alert("Create room", msg);
      }
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (room: Room) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post(`/rooms/${room.id}/join`);
      router.push(`/room/${room.id}`);
    } catch {
      load();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="voice-screen">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice Rooms</Text>
        <Text style={styles.headerSub}>
          Join live audio rooms and practice speaking
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            rooms.length === 0 ? { flex: 1 } : styles.list
          }
          ListEmptyComponent={
            !isOnline || loadError ? (
              <NetworkErrorState
                testID="voice-network-error"
                onRefresh={async () => {
                  setLoading(true);
                  await retry();
                  await load();
                }}
                loading={loading}
              />
            ) : (
              <EmptyState testID="voice-empty" message="Nothing here~" />
            )
          }
          renderItem={({ item }) => {
            const previewExtra = Math.max(
              0,
              item.member_count - (item.members_preview?.length || 0),
            );
            return (
              <Pressable
                testID={`room-card-${item.id}`}
                style={styles.cardWrap}
                onPress={() => joinRoom(item)}
              >
                <LinearGradient colors={bgForRoom(item)} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.badgeRow}>
                      <View style={styles.langBadge}>
                        <FlagIcon code={item.language} size={12} />
                        <Text style={styles.langText}>
                          {langName(item.language)}
                        </Text>
                      </View>
                      {item.topic ? (
                        <View style={styles.topicBadge}>
                          <Text style={styles.topicText}>#{item.topic}</Text>
                        </View>
                      ) : null}
                      {item.mode === "study" ? (
                        <View style={styles.topicBadge}>
                          <Text style={styles.topicText}>⏱ Study</Text>
                        </View>
                      ) : null}
                      {item.is_private ? (
                        <Ionicons
                          name="lock-closed"
                          size={12}
                          color="rgba(255,255,255,0.85)"
                        />
                      ) : null}
                    </View>
                    <View style={styles.liveBadge}>
                      <SpeakingBars />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.cardBottom}>
                    <View style={styles.hostRow}>
                      <Avatar
                        name={item.host?.name}
                        url={item.host?.avatar_url}
                        size={26}
                        flagCode={countryToCode(item.host?.country)}
                        frame={item.host?.active_frame}
                      />
                      <Text style={styles.hostName} numberOfLines={1}>
                        {item.host?.name} · {timeAgo(item.created_at)}
                      </Text>
                    </View>
                    <View style={styles.memberStack}>
                      {(item.members_preview || []).map((m, i) => (
                        <View
                          key={m.id}
                          style={[
                            styles.stackAvatar,
                            { marginLeft: i === 0 ? 0 : -9, zIndex: 10 - i },
                          ]}
                        >
                          <Avatar name={m.name} url={m.avatar_url} size={24} />
                        </View>
                      ))}
                      <View style={styles.memberCountPill}>
                        <Ionicons name="people" size={11} color="#FFFFFF" />
                        <Text style={styles.memberCountText}>
                          {previewExtra > 0 ? `+${previewExtra}` : item.member_count}
                        </Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        testID="room-create-fab"
        style={styles.fab}
        onPress={openCreateModal}
      >
        <Ionicons name="add" size={26} color={colors.onBrand} />
        <Text style={styles.fabText}>Create Room</Text>
      </Pressable>

      <Modal
        visible={modalOpen}
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.crRoot}>
          <LinearGradient
            colors={[colors.brandSecondary, "rgba(255,255,255,0)"]}
            style={styles.crGlow}
            pointerEvents="none"
          />
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <Pressable
                testID="room-modal-close-btn"
                onPress={() => setModalOpen(false)}
                hitSlop={10}
                style={styles.crClose}
              >
                <Ionicons name="close" size={28} color={colors.onSurface} />
              </Pressable>

              <ScrollView
                contentContainerStyle={styles.crBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.crTitle}>Create a Room</Text>

                {/* What will you talk about? */}
                <View style={styles.crInputCard}>
                  <TextInput
                    testID="room-title-input"
                    style={styles.crTitleInput}
                    placeholder="What will you talk about?"
                    placeholderTextColor={colors.onSurfaceSecondary}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={80}
                    multiline
                  />
                  <Ionicons name="pencil" size={20} color={colors.onSurfaceSecondary} />
                </View>

                {/* Settings card: Language / Mode / Topic / Private */}
                <View style={styles.crCard}>
                  <Pressable
                    testID="room-language-row"
                    style={styles.crRow}
                    onPress={() => setLangOpen((v) => !v)}
                  >
                    <Text style={styles.crRowLabel}>Language</Text>
                    <View style={styles.crRowRight}>
                      <Text style={styles.crRowValue}>
                        {roomLangs.length
                          ? roomLangs.map((c) => c.toUpperCase()).join(", ")
                          : "Select"}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.onSurfaceSecondary}
                      />
                    </View>
                  </Pressable>
                  {langOpen && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.crChipRow}
                    >
                      {myLangs.map((code) => {
                        const active = roomLangs.includes(code);
                        return (
                          <Pressable
                            key={code}
                            testID={`room-lang-${code}`}
                            onPress={() => toggleRoomLang(code)}
                            style={[
                              styles.crChip,
                              active && styles.crChipActive,
                            ]}
                          >
                            <FlagIcon code={code} size={15} />
                            <Text
                              style={[
                                styles.crChipText,
                                active && styles.crChipTextActive,
                              ]}
                            >
                              {langName(code)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}

                  <View style={styles.crDivider} />

                  <View style={styles.crRow}>
                    <Text style={styles.crRowLabel}>Mode</Text>
                    <Pressable
                      style={styles.crHowRow}
                      onPress={() =>
                        Alert.alert(
                          "How to Play",
                          "Chat: open mic conversation.\nMusic: share and enjoy music together.\nStudy: silent focus room with a shared Pomodoro timer.\nInteractive & Game modes are coming soon!",
                        )
                      }
                    >
                      <Ionicons
                        name="information-circle"
                        size={16}
                        color={colors.onSurfaceSecondary}
                      />
                      <Text style={styles.crHowText}>How to Play</Text>
                    </Pressable>
                  </View>

                  <View style={styles.crModeGrid}>
                    {MODES.map((m) => {
                      const active = mode === m.id;
                      const sub =
                        m.id === "interactive"
                          ? "(Whiteboard)"
                          : m.id === "game"
                            ? "(Guess the Word)"
                            : m.id === "study"
                              ? "(Pomodoro)"
                              : null;
                      return (
                        <Pressable
                          key={m.id}
                          testID={`room-mode-${m.id}`}
                          style={[
                            styles.crModeBtn,
                            active && styles.crModeBtnActive,
                          ]}
                          onPress={() =>
                            m.locked
                              ? Alert.alert(
                                  "Coming soon",
                                  `${m.label} rooms are coming in a future update!`,
                                )
                              : setMode(m.id as "chat" | "music")
                          }
                        >
                          <View style={styles.crModeLine}>
                            <Ionicons
                              name={m.icon}
                              size={17}
                              color={
                                active
                                  ? colors.brand
                                  : m.locked
                                    ? colors.onSurfaceSecondary
                                    : colors.onSurfaceTertiary
                              }
                            />
                            <Text
                              style={[
                                styles.crModeLabel,
                                active && styles.crModeLabelActive,
                                m.locked && styles.crModeLabelLocked,
                              ]}
                            >
                              {m.label}
                            </Text>
                          </View>
                          {sub && (
                            <Text
                              style={[
                                styles.crModeSub,
                                m.locked && styles.crModeLabelLocked,
                              ]}
                            >
                              {sub}
                            </Text>
                          )}
                          {m.id === "interactive" && (
                            <View style={styles.crLockBadge}>
                              <Ionicons
                                name="lock-closed"
                                size={11}
                                color={colors.onSurfaceSecondary}
                              />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.crDivider} />

                  <Pressable
                    testID="room-topic-row"
                    style={styles.crRow}
                    onPress={() => setTopicOpen((v) => !v)}
                  >
                    <Text style={styles.crRowLabel}>Topic</Text>
                    <View style={styles.crRowRight}>
                      <View style={styles.crHashBadge}>
                        <Text style={styles.crHashBadgeText}>#</Text>
                      </View>
                      <Text style={styles.crRowValue}>
                        {topic || "Choose"}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.onSurfaceSecondary}
                      />
                    </View>
                  </Pressable>
                  {topicOpen && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.crChipRow}
                    >
                      {TOPIC_TAGS.map((t) => {
                        const active = topic === t;
                        return (
                          <Pressable
                            key={t}
                            testID={`room-topic-${t}`}
                            onPress={() => {
                              setTopic(t);
                              setTopicOpen(false);
                            }}
                            style={[
                              styles.crChip,
                              active && styles.crChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.crChipText,
                                active && styles.crChipTextActive,
                              ]}
                            >
                              {t}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}

                  <View style={styles.crDivider} />

                  <View style={styles.crRow}>
                    <View style={styles.crLabelRow}>
                      <Text style={styles.crRowLabel}>Private Room</Text>
                      <Pressable
                        hitSlop={6}
                        onPress={() =>
                          Alert.alert(
                            "Private Room",
                            "Only people you invite can join a private room. Private rooms are not shared to Moments.",
                          )
                        }
                      >
                        <Ionicons
                          name="information-circle"
                          size={16}
                          color={colors.onSurfaceSecondary}
                        />
                      </Pressable>
                    </View>
                    <AppSwitch
                      testID="room-private-toggle"
                      value={isPrivate}
                      onValueChange={setIsPrivate}
                      trackColor={{ true: colors.brand, false: colors.borderStrong }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                {/* Announcement card */}
                <View style={styles.crAnnounceCard}>
                  <View style={styles.crAnnounceHeader}>
                    <Text style={styles.crAnnounceTitle}>
                      Create Room Announcement
                    </Text>
                    <Pressable
                      testID="room-announce-pin"
                      style={styles.crPinRow}
                      onPress={() => setAnnouncePinned((v) => !v)}
                    >
                      <Text style={styles.crPinText}>Pin</Text>
                      <View
                        style={[
                          styles.crCheckCircle,
                          announcePinned && styles.crCheckCircleActive,
                        ]}
                      >
                        {announcePinned && (
                          <Ionicons
                            name="checkmark"
                            size={13}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                    </Pressable>
                  </View>
                  <TextInput
                    testID="room-announcement-input"
                    style={styles.crAnnounceInput}
                    placeholder="Create Room Announcement"
                    placeholderTextColor={colors.onSurfaceSecondary}
                    value={announcement}
                    onChangeText={setAnnouncement}
                    maxLength={300}
                    multiline
                  />
                  <View style={styles.crAnnounceFooter}>
                    {topic ? (
                      <View style={styles.crTopicChip}>
                        <Text style={styles.crTopicChipText}>#{topic}</Text>
                      </View>
                    ) : (
                      <View />
                    )}
                    <Text style={styles.crCounter}>
                      {announcement.length}/300
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.crFooter}>
                <Pressable
                  testID="room-boost-toggle"
                  style={styles.crBoostRow}
                  onPress={() => setRoomBoost((v) => !v)}
                >
                  <Ionicons name="flash" size={18} color="#F59E0B" />
                  <Text style={styles.crBoostText}>Room Boost</Text>
                  <View style={{ flex: 1 }} />
                  <View
                    style={[
                      styles.crRadio,
                      roomBoost && styles.crRadioActive,
                    ]}
                  >
                    {roomBoost && (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    )}
                  </View>
                </Pressable>

                {bgOpen && (
                  <View style={styles.crBgPicker}>
                    {BG_GRADIENTS.map((g, i) => (
                      <Pressable
                        key={i}
                        testID={`room-bg-swatch-${i}`}
                        onPress={() => {
                          setBackground(i);
                          setBgOpen(false);
                        }}
                      >
                        <LinearGradient
                          colors={g}
                          style={[
                            styles.crBgSwatch,
                            background === i && styles.crBgSwatchActive,
                          ]}
                        >
                          {background === i && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="#FFFFFF"
                            />
                          )}
                        </LinearGradient>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={styles.crFooterMain}>
                  <Pressable
                    testID="room-change-bg-btn"
                    style={styles.crBgBtn}
                    onPress={() => setBgOpen((v) => !v)}
                  >
                    <View style={styles.crBgIconWrap}>
                      <LinearGradient
                        colors={["#93C5FD", "#38B6F1"]}
                        style={styles.crBgIcon}
                      >
                        <Ionicons name="image" size={16} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
                    <Text style={styles.crBgLabel}>
                      Change{"\n"}Background
                    </Text>
                  </Pressable>

                  <Pressable
                    testID="room-create-submit-btn"
                    style={[
                      styles.crStartBtn,
                      (!title.trim() ||
                        roomLangs.length === 0 ||
                        creating) && { opacity: 0.45 },
                    ]}
                    disabled={
                      !title.trim() || roomLangs.length === 0 || creating
                    }
                    onPress={createRoom}
                  >
                    {creating ? (
                      <ActivityIndicator color={colors.onBrand} />
                    ) : (
                      <Text style={styles.crStartText}>Start Voiceroom</Text>
                    )}
                  </Pressable>
                </View>

                <Pressable
                  testID="room-share-toggle"
                  style={styles.crShareRow}
                  onPress={() => !isPrivate && setShareToMoments((v) => !v)}
                >
                  <View
                    style={[
                      styles.crCheckCircle,
                      shareToMoments &&
                        !isPrivate &&
                        styles.crCheckCircleActive,
                      isPrivate && { opacity: 0.4 },
                    ]}
                  >
                    {shareToMoments && !isPrivate && (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={[styles.crShareText, isPrivate && { opacity: 0.4 }]}
                  >
                    Share to Moments
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerTitle: {
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.onSurface,
    },
    headerSub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    list: {
      padding: spacing.lg,
      paddingBottom: 110,
      gap: spacing.md,
    },
    cardWrap: {
      borderRadius: radius.lg,
      ...shadow.card,
    },
    card: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      flex: 1,
    },
    langBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    langText: {
      fontFamily: fonts.textBold,
      fontSize: 10.5,
      color: "#FFFFFF",
    },
    topicBadge: {
      backgroundColor: "rgba(255,255,255,0.14)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    topicText: {
      fontFamily: fonts.textSemi,
      fontSize: 10.5,
      color: "rgba(255,255,255,0.9)",
    },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(0,0,0,0.28)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    liveText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: "#FFFFFF",
      letterSpacing: 0.8,
    },
    cardTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 17,
      color: "#FFFFFF",
      lineHeight: 23,
    },
    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    hostRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flex: 1,
    },
    hostName: {
      fontFamily: fonts.textSemi,
      fontSize: 12.5,
      color: "rgba(255,255,255,0.85)",
      flexShrink: 1,
    },
    memberStack: {
      flexDirection: "row",
      alignItems: "center",
    },
    stackAvatar: {
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.5)",
      borderRadius: 14,
    },
    memberCountPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(0,0,0,0.28)",
      borderRadius: radius.pill,
      paddingHorizontal: 7,
      paddingVertical: 3,
      marginLeft: 6,
    },
    memberCountText: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: "#FFFFFF",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.xl,
    },
    emptyTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 18,
      color: colors.onSurface,
      marginTop: spacing.md,
    },
    emptyIconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontFamily: fonts.text,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    fab: {
      position: "absolute",
      right: spacing.xl,
      bottom: spacing.xl,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...shadow.card,
    },
    fabText: {
      color: colors.onBrand,
      fontFamily: fonts.textBold,
      fontSize: 15,
    },
    createScreen: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    createHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    createHeaderTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 17,
      color: colors.onSurface,
    },
    createBody: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    topicInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      fontFamily: fonts.displaySemi,
      fontSize: 18,
      color: colors.onSurface,
      minHeight: 70,
      textAlignVertical: "top",
      ...shadow.card,
    },
    sectionLabel: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: spacing.xs,
    },
    announceHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.md,
    },
    announceLabel: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onSurface,
    },
    announceHint: {
      fontFamily: fonts.textSemi,
      fontSize: 11,
      color: colors.onSurfaceTertiary,
      marginLeft: "auto",
    },
    announceInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontFamily: fonts.text,
      fontSize: 14,
      color: colors.onSurface,
      minHeight: 90,
      textAlignVertical: "top",
      lineHeight: 20,
      borderWidth: 1.5,
      borderColor: colors.divider,
    },
    announceCounter: {
      fontFamily: fonts.textSemi,
      fontSize: 11,
      color: colors.onSurfaceTertiary,
      alignSelf: "flex-end",
      marginTop: 4,
    },
    langChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    langChipActive: {
      backgroundColor: colors.brandTertiary,
    },
    langChipText: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurfaceTertiary,
    },
    langChipTextActive: {
      color: colors.onBrandTertiary,
      fontFamily: fonts.textBold,
    },
    modeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    modeItem: {
      width: "47%",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      gap: 6,
      position: "relative",
      borderWidth: 1.5,
      borderColor: "transparent",
      ...shadow.card,
    },
    modeItemActive: {
      borderColor: colors.brand,
      backgroundColor: colors.brand,
    },
    modeItemLocked: {
      opacity: 0.6,
    },
    modeLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurface,
    },
    modeLabelActive: {
      color: colors.onBrand,
      fontFamily: fonts.textBold,
    },
    modeLabelLocked: {
      color: colors.onSurfaceSecondary,
    },
    lockChip: {
      position: "absolute",
      top: 6,
      right: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: colors.onSurfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    lockChipText: {
      fontFamily: fonts.textBold,
      fontSize: 8,
      color: "#FFFFFF",
    },
    bgRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    bgSwatchWrap: {
      borderRadius: 22,
    },
    bgSwatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    bgSwatchActive: {
      borderColor: colors.onSurface,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.md,
      ...shadow.card,
    },
    toggleLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 14.5,
      color: colors.onSurface,
    },
    toggleSub: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginTop: 1,
    },
    createFooter: {
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    createBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    createText: {
      color: colors.onBrand,
      fontFamily: fonts.textBold,
      fontSize: 16,
    },
    /* ---- Create-a-Room sheet (main app theme, matches reference layout) ---- */
    crRoot: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    crGlow: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 170,
    },
    crClose: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 4,
      alignSelf: "flex-start",
    },
    crBody: {
      paddingHorizontal: 18,
      paddingBottom: 24,
    },
    crTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 30,
      color: colors.onSurface,
      marginTop: 8,
      marginBottom: 18,
    },
    crInputCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 6,
      minHeight: 64,
      marginBottom: 16,
      ...shadow.card,
    },
    crTitleInput: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 16.5,
      color: colors.onSurface,
      paddingVertical: 10,
      marginRight: 10,
    },
    crCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
      marginBottom: 16,
      ...shadow.card,
    },
    crRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 15,
    },
    crLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    crRowLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 17,
      color: colors.onSurface,
    },
    crRowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    crRowValue: {
      fontFamily: fonts.textSemi,
      fontSize: 16,
      color: colors.onSurface,
    },
    crHowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    crHowText: {
      fontFamily: fonts.text,
      fontSize: 14.5,
      color: colors.onSurfaceSecondary,
    },
    crDivider: {
      height: 1,
      backgroundColor: colors.divider,
    },
    crChipRow: {
      gap: 8,
      paddingBottom: 14,
    },
    crChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 18,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    crChipActive: {
      backgroundColor: colors.brandTertiary,
      borderColor: colors.brand,
    },
    crChipText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: colors.onSurfaceTertiary,
    },
    crChipTextActive: {
      color: colors.onBrandTertiary,
    },
    crModeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
      paddingBottom: 16,
      paddingTop: 2,
    },
    crModeBtn: {
      width: "48.5%",
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 62,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    crModeBtnActive: {
      backgroundColor: colors.brandTertiary,
      borderColor: colors.brand,
    },
    crModeLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    crModeLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 16,
      color: colors.onSurfaceTertiary,
    },
    crModeLabelActive: {
      color: colors.brand,
    },
    crModeLabelLocked: {
      color: colors.onSurfaceSecondary,
    },
    crModeSub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    crLockBadge: {
      position: "absolute",
      top: 8,
      right: 10,
    },
    crHashBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 2,
    },
    crHashBadgeText: {
      fontFamily: fonts.textBold,
      fontSize: 12.5,
      color: colors.onBrand,
    },
    crAnnounceCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.brand,
      padding: 16,
      marginBottom: 8,
      ...shadow.card,
    },
    crAnnounceHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    crAnnounceTitle: {
      fontFamily: fonts.textSemi,
      fontSize: 16.5,
      color: colors.onSurface,
    },
    crPinRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    crPinText: {
      fontFamily: fonts.text,
      fontSize: 14.5,
      color: colors.onSurfaceSecondary,
    },
    crCheckCircle: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    crCheckCircleActive: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    crAnnounceInput: {
      minHeight: 120,
      textAlignVertical: "top",
      fontFamily: fonts.text,
      fontSize: 15.5,
      color: colors.onSurface,
      paddingVertical: 4,
    },
    crAnnounceFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
    },
    crTopicChip: {
      backgroundColor: colors.brandTertiary,
      borderRadius: 15,
      paddingHorizontal: 13,
      paddingVertical: 6,
    },
    crTopicChipText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: colors.onBrandTertiary,
    },
    crCounter: {
      fontFamily: fonts.text,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
    },
    crFooter: {
      backgroundColor: colors.surface,
      paddingHorizontal: 18,
      paddingTop: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    crBoostRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
    },
    crBoostText: {
      fontFamily: fonts.textBold,
      fontSize: 16,
      color: "#F59E0B",
    },
    crRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    crRadioActive: {
      backgroundColor: "#F59E0B",
      borderColor: "#F59E0B",
    },
    crBgPicker: {
      flexDirection: "row",
      gap: 10,
      paddingBottom: 10,
    },
    crBgSwatch: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    crBgSwatchActive: {
      borderColor: colors.brand,
    },
    crFooterMain: {
      flexDirection: "row",
      alignItems: "center",
    },
    crBgBtn: {
      alignItems: "center",
      width: 80,
    },
    crBgIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    crBgIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    crBgLabel: {
      fontFamily: fonts.text,
      fontSize: 11.5,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
      marginTop: 5,
      lineHeight: 14,
    },
    crStartBtn: {
      flex: 1,
      marginLeft: 12,
      backgroundColor: colors.brand,
      borderRadius: 28,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    crStartText: {
      fontFamily: fonts.textBold,
      fontSize: 17.5,
      color: colors.onBrand,
    },
    crShareRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 13,
    },
    crShareText: {
      fontFamily: fonts.textSemi,
      fontSize: 15.5,
      color: colors.onSurface,
    },
  });
