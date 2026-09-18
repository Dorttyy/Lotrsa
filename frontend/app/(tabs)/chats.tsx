import { Ionicons, MaterialCommunityIcons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Avatar } from "@/src/components/Avatar";
import { GroupAvatar } from "@/src/components/GroupAvatar";
import { ChatLastMessage } from "@/src/components/ChatLastMessage";
import { SpeakingBars } from "@/src/components/SpeakingBars";
import { VipBadge } from "@/src/components/Badges";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { useChatSocket } from "@/src/hooks/use-chat-socket";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";
import { api, Conversation } from "@/src/utils/api";
import { timeAgo } from "@/src/utils/time";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface Shortcut {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route?: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    key: "pro",
    label: "Pro",
    icon: "videocam",
    color: "#C05A46",
    route: "/pro",
  },
  {
    key: "lessons",
    label: "Lessons",
    icon: "sparkles",
    color: "#3AC569",
    route: "/lessons",
  },
  {
    key: "call",
    label: "Call",
    icon: "call",
    color: "#FFB627",
    route: "/call",
  },
  {
    key: "learn",
    label: "Vocab",
    icon: "book",
    color: "#C6B2FF",
    route: "/vocab-hub",
  },
  {
    key: "courses",
    label: "All Courses",
    icon: "book",
    color: "#3B82F6",
    route: "/all-courses",
  },
  {
    key: "play",
    label: "Play",
    icon: "game-controller",
    color: "#22C55E",
    route: "/play",
  },
  {
    key: "translate",
    label: "AI Translation",
    icon: "language",
    color: "#38B6F1",
    route: "/translate",
  },
  {
    key: "voice",
    label: "Voiceroom",
    icon: "mic",
    color: "#0E9AE0",
    route: "/(tabs)/voice",
  },
  { key: "more", label: "More", icon: "chevron-down", color: "#9CA3AF" },
];

// Secondary shortcuts revealed by the "More" bottom sheet.
interface MoreShortcut {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
}

const MORE_SHORTCUTS: MoreShortcut[] = [
  { key: "boost", label: "Boost Center", icon: "flash", color: "#F97316", route: "/boost-center" },
  { key: "ranking", label: "Ranking", icon: "trophy", color: "#F59E0B", route: "/moments-ranking" },
  { key: "coins", label: "Coins", icon: "cash", color: "#EAB308", route: "/coins" },
  { key: "store", label: "Store", icon: "storefront", color: "#0E9AE0", route: "/store" },
  { key: "backpack", label: "Backpack", icon: "briefcase", color: "#EC4899", route: "/backpack" },
  { key: "search", label: "Discover", icon: "search", color: "#0EA5E9", route: "/search" },
  { key: "notif", label: "Notifications", icon: "notifications", color: "#EF4444", route: "/notifications" },
  { key: "market", label: "Market", icon: "pricetags", color: "#0E9AE0", route: "/market" },
  { key: "visitors", label: "Visitors", icon: "eye", color: "#6366F1", route: "/visitors" },
];

export default function Chats() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const [vnInfo, setVnInfo] = useState<{
    unread: number;
    last: { text: string; created_at: string } | null;
  } | null>(null);

  const load = useCallback(async () => {
    if (!user) return; // wait for auth to hydrate (fresh page loads)
    try {
      const data = await api.get<Conversation[]>("/chats");
      setConversations(data);
      api
        .get<{ unread: number; last: { text: string; created_at: string } | null }>(
          "/rooms/notices/unread",
        )
        .then(setVnInfo)
        .catch(() => {});
    } catch {
      // keep previous list on transient errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  useChatSocket(
    useCallback(
      (event) => {
        if (event.type === "new_message") load();
      },
      [load],
    ),
  );

  const [chatFilter, setChatFilter] = useState<
    "all" | "online" | "unread" | "myturn" | "timezone"
  >("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = conversations;
    if (q) {
      list = list.filter((c) => {
        const name = ((c.is_group ? c.name : c.partner?.name) || "").toLowerCase();
        const snippet = (c.last_message?.text || "").toLowerCase();
        return name.includes(q) || snippet.includes(q);
      });
    }
    switch (chatFilter) {
      case "online":
        return list.filter((c) => c.is_group || c.partner?.is_online);
      case "unread":
        return list.filter((c) => c.unread > 0);
      case "myturn":
        // Their message is the latest — it's my turn to reply.
        return list.filter(
          (c) => c.last_message && c.last_message.sender_id !== user?.id,
        );
      case "timezone":
        // Same country ≈ same timezone neighbourhood.
        return list.filter(
          (c) => !c.is_group && c.partner?.country && c.partner.country === user?.country,
        );
      default:
        return list;
    }
  }, [conversations, query, chatFilter, user?.id, user?.country]);

  const FILTERS: { key: typeof chatFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "online", label: "Online" },
    { key: "unread", label: "Unread" },
    { key: "myturn", label: "My turn" },
    { key: "timezone", label: "Timezone" },
  ];

  const onShortcut = (s: Shortcut) => {
    if (s.key === "more") {
      setMoreOpen(true);
      return;
    }
    if (s.route) router.push(s.route as never);
  };

  const listHeader = (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shortcutRow}
      >
        {SHORTCUTS.map((s) => (
          <Pressable
            key={s.key}
            testID={`chats-shortcut-${s.key}`}
            style={styles.shortcut}
            onPress={() => onShortcut(s)}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: s.color }]}>
              <Ionicons name={s.icon} size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.shortcutLabel} numberOfLines={1}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.onSurfaceSecondary} />
        <TextInput
          testID="chats-search-input"
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={colors.onSurfaceSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <Pressable
            testID="chats-search-clear"
            onPress={() => setQuery("")}
            hitSlop={8}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.onSurfaceSecondary}
            />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <View style={styles.filterSortBtn}>
          <MaterialCommunityIcons
            name="sort-variant"
            size={18}
            color={colors.onSurfaceSecondary}
          />
        </View>
        {FILTERS.map((f) => {
          const active = chatFilter === f.key;
          return (
            <Pressable
              key={f.key}
              testID={`chat-filter-${f.key}`}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setChatFilter(f.key)}
            >
              <Text
                style={[styles.filterChipText, active && styles.filterChipTextActive]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="chats-screen">
      {/* Header */}
      <View style={styles.header}>
        <AppTitle variant="page" testID="chats-header-title" style={styles.headerTitle}>Chats</AppTitle>
        <Pressable
          testID="chats-add-btn"
          style={styles.headerIconBtn}
          onPress={() => router.push("/add-sheet")}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Shortcuts + search — pinned; only the conversation list scrolls. */}
      {listHeader}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          ListHeaderComponent={
            <Pressable
              testID="live-voiceroom-row"
              style={styles.row}
              onPress={() => router.push("/voiceroom-notices")}
            >
              <View>
                <View style={styles.vnAvatar}>
                  <Ionicons name="mic" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.vnVerified}>
                  <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <View style={styles.nameWrap}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      Live & Voiceroom
                    </Text>
                  </View>
                  {vnInfo?.last ? (
                    <Text style={styles.rowTime}>
                      {timeAgo(vnInfo.last.created_at)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.rowSnippet} numberOfLines={1}>
                    {vnInfo?.last?.text ||
                      "Voiceroom alerts from hosts you follow"}
                  </Text>
                  {(vnInfo?.unread || 0) > 0 && (
                    <View style={styles.badge} testID="vn-unread-badge">
                      <Text style={styles.badgeText}>{vnInfo?.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          }
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="chatbubbles-outline"
                size={56}
                color={colors.borderStrong}
              />
              <Text style={styles.emptyTitle}>
                {query
                  ? "No matches"
                  : chatFilter !== "all" && conversations.length > 0
                    ? "No chats match this filter"
                    : "No chats yet"}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? "Try a different search."
                  : chatFilter === "timezone" && conversations.length > 0
                    ? `No partners from ${user?.country || "your country"} yet.`
                    : chatFilter !== "all" && conversations.length > 0
                      ? "Try another filter."
                      : "Find a partner and say hello!"}
              </Text>
              {!query && (chatFilter === "all" || conversations.length === 0) && (
                <Pressable
                  testID="chats-find-partners-btn"
                  style={styles.findBtn}
                  onPress={() => router.push("/add-sheet")}
                >
                  <Text style={styles.findBtnText}>Find Partners</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`chat-row-${item.id}`}
              style={styles.row}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <View>
                {item.is_group ? (
                  <GroupAvatar
                    testID={`group-avatar-${item.id}`}
                    members={item.members_preview || []}
                    size={54}
                  />
                ) : (
                  <Avatar
                    name={item.partner?.name}
                    url={item.partner?.avatar_url}
                    size={54}
                    flagCode={countryToCode(item.partner?.country)}
                    online={item.partner?.is_online}
                    frame={item.partner?.active_frame}
                    inVoiceRoom={!!item.partner?.in_voice_room}
                  />
                )}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <View style={styles.nameWrap}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.is_group ? item.name : item.partner?.name || "Unknown"}
                    </Text>
                    {item.partner?.active_badge?.emoji ? (
                      <Text style={{ fontSize: 12 }}>
                        {item.partner.active_badge.emoji}
                      </Text>
                    ) : null}
                    {item.partner?.is_vip ? (
                      <VipBadge small tier={item.partner?.vip_tier} />
                    ) : null}
                  </View>
                  <Text style={styles.rowTime}>
                    {timeAgo(item.last_message?.created_at)}
                  </Text>
                </View>
                <View style={styles.rowBottom}>
                  {item.partner?.in_voice_room ? (
                    <View style={styles.roomStatusRow}>
                      <SpeakingBars color={colors.brand} />
                      <Text style={styles.roomStatus} numberOfLines={1}>
                        In voice room
                        {item.partner.in_voice_room.name
                          ? ` · ${item.partner.in_voice_room.name}`
                          : ""}
                      </Text>
                    </View>
                  ) : (
                    <ChatLastMessage message={item.last_message} conversationId={item.id} />
                  )}
                  {item.unread > 0 && (
                    <View style={styles.badge} testID={`chat-unread-${item.id}`}>
                      <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* More sheet — secondary shortcuts */}
      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable
          style={styles.moreBackdrop}
          onPress={() => setMoreOpen(false)}
        />
        <View style={[styles.moreSheet, { paddingBottom: 34 + insets.bottom }]} testID="chats-more-sheet">
          <View style={styles.moreHandle} />
          <Text style={styles.moreTitle}>Explore</Text>
          <View style={styles.moreGrid}>
            {MORE_SHORTCUTS.map((m) => (
              <Pressable
                key={m.key}
                testID={`chats-more-${m.key}`}
                onPress={() => {
                  setMoreOpen(false);
                  router.push(m.route as never);
                }}
                style={styles.moreItem}
              >
                <View style={[styles.moreItemIcon, { backgroundColor: m.color }]}>
                  <Ionicons name={m.icon} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.moreItemLabel} numberOfLines={1}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    collapsibleWrap: {
      overflow: "hidden",
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
    },
    headerTitle: {
      flex: 1,
      textAlign: "left",
      fontFamily: fonts.display,
      fontSize: 24,
      color: colors.onSurface,
    },
    shortcutRow: {
      gap: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    shortcut: {
      alignItems: "center",
      width: 56,
      gap: 6,
    },
    shortcutIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    shortcutLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.md,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      height: 40,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 15,
      color: colors.onSurface,
      padding: 0,
    },
    list: {
      paddingBottom: spacing.xxxl,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    rowBody: {
      flex: 1,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
      paddingBottom: spacing.md,
      gap: spacing.xs,
    },
    rowTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    groupAvatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.brandTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    rowName: {
      fontFamily: fonts.displaySemi,
      fontSize: 16,
      color: colors.onSurface,
      flexShrink: 1,
    },
    nameWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    filterSortBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    filterChip: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 15,
      paddingVertical: 8,
    },
    filterChipActive: {
      backgroundColor: colors.brandTertiary,
    },
    filterChipText: {
      fontFamily: fonts.textSemi,
      fontSize: 13.5,
      color: colors.onSurfaceSecondary,
    },
    filterChipTextActive: {
      fontFamily: fonts.textBold,
      color: colors.brand,
    },
    vnAvatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: "#3B9DF8",
      alignItems: "center",
      justifyContent: "center",
    },
    vnVerified: {
      position: "absolute",
      bottom: 0,
      left: 0,
      width: 15,
      height: 15,
      borderRadius: 8,
      backgroundColor: "#22C55E",
      borderWidth: 1.5,
      borderColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    roomBadge: {
      position: "absolute",
      top: -3,
      left: -3,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.brand,
      borderWidth: 2,
      borderColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    roomStatusRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    roomStatus: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.brand,
    },
    rowTime: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
    },
    rowBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.sm,
    },
    rowSnippet: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
    },
    badgeText: {
      color: colors.onBrand,
      fontFamily: fonts.textBold,
      fontSize: 11,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.xl,
      paddingTop: spacing.xxxl,
    },
    emptyTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 18,
      color: colors.onSurface,
      marginTop: spacing.md,
    },
    emptyText: {
      fontFamily: fonts.text,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    findBtn: {
      marginTop: spacing.lg,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
    },
    findBtnText: {
      color: colors.onBrand,
      fontFamily: fonts.textBold,
      fontSize: 15,
    },
    // More sheet
    moreBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.42)",
    },
    moreSheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      paddingBottom: 34,
    },
    moreHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      alignSelf: "center",
      marginBottom: 14,
    },
    moreTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: colors.onSurface,
      marginBottom: 14,
    },
    moreGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    moreItem: {
      width: "30%",
      flexGrow: 1,
      alignItems: "center",
      gap: 8,
      paddingVertical: 14,
    },
    moreItemIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    moreItemLabel: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: colors.onSurface,
      textAlign: "center",
    },
  });
