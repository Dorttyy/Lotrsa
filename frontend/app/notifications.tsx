import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { BackButton } from "@/src/components/BackButton";
import { countryToCode } from "@/src/constants/countries";
import { useAuth } from "@/src/context/AuthContext";
import { useNotifications } from "@/src/context/NotificationsContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";
import { api, AppNotification, assetUrl, Conversation } from "@/src/utils/api";
import { timeAgo } from "@/src/utils/time";

/**
 * "Moments Notices" — HelloTalk-style activity feed:
 *   • Tabs: All · Likes+ (unread badge) · Comments · New Moments
 *   • Like rows get a lilac "Send Thanks" pill (sends a DM thank-you)
 *   • Right-side moment preview: photo thumbnail or teal voice tile
 *   • Comment rows show the comment text (3 lines + "show more") with
 *     quick like/reply glyphs that open the moment.
 */

type TabKey = "all" | "likes" | "comments" | "new";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "likes", label: "Likes+" },
  { key: "comments", label: "Comments" },
  { key: "new", label: "New Moments" },
];

const matchesTab = (n: AppNotification, tab: TabKey): boolean => {
  if (tab === "all") return true;
  if (tab === "likes") return n.type === "like";
  if (tab === "comments") return n.type === "comment" || n.type === "reply";
  return n.type === "announcement";
};

export default function Notifications() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { markAllRead } = useNotifications();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [thanked, setThanked] = useState<Record<string, boolean>>({});
  // Unread like count captured BEFORE mark-all-read wipes it.
  const [likeBadge, setLikeBadge] = useState(0);

  useEffect(() => {
    if (!user) return; // wait for auth to hydrate before fetching
    api
      .get<{ unread: number; notifications: AppNotification[] }>("/notifications")
      .then((d) => {
        setItems(d.notifications);
        setLikeBadge(d.notifications.filter((n) => !n.read && n.type === "like").length);
      })
      .catch(() => {
        // keep empty state; screen still renders
      })
      .finally(() => {
        setLoading(false);
        markAllRead();
      });
  }, [markAllRead, user]);

  const sendThanks = async (n: AppNotification) => {
    if (!n.actor?.id || thanked[n.id]) return;
    setThanked((prev) => ({ ...prev, [n.id]: true }));
    try {
      const conv = await api.post<Conversation>("/chats", {
        partner_id: n.actor.id,
      });
      await api.post(`/chats/${conv.id}/messages`, {
        text: "Thank you for the like! 💜",
      });
    } catch {
      setThanked((prev) => ({ ...prev, [n.id]: false }));
    }
  };

  const filtered = items.filter((n) => matchesTab(n, tab));

  const openTarget = (n: AppNotification) => {
    if ((n.type === "follow" || n.type === "visit") && n.actor?.id) {
      router.push(`/user/${n.actor.id}`);
    } else if (n.moment_id) {
      router.push(`/moment/${n.moment_id}`);
    }
  };

  const actionLabel = (n: AppNotification): string => {
    switch (n.type) {
      case "like":
        return "liked";
      case "comment":
        return "";
      case "reply":
        return "";
      case "follow":
        return "started following you";
      case "visit":
        return "viewed your profile";
      default:
        return "posted a new moment";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="notifications-screen">
      <View style={styles.header}>
        <BackButton testID="notifications-back-btn" />
        <AppTitle variant="navigation" testID="notifications-header-title" style={styles.headerTitle}>Moments Notices</AppTitle>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter tabs — horizontally scrollable so every tab stays reachable
          on narrow (320px) screens without changing how the row looks. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              testID={`notices-tab-${t.key}`}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
              {t.key === "likes" && likeBadge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{likeBadge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color={colors.borderStrong}
              />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySub}>
                Likes, comments and new moments from your partners will show up
                here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isLike = item.type === "like";
            const isComment = item.type === "comment" || item.type === "reply";
            const preview = item.moment_preview;
            const likedSnippet =
              isLike && preview?.text ? ` ${preview.text}` : "";
            return (
              <Pressable
                testID={`notification-row-${item.id}`}
                style={styles.row}
                onPress={() => openTarget(item)}
              >
                <Pressable
                  hitSlop={4}
                  onPress={() =>
                    item.actor?.id && router.push(`/user/${item.actor.id}`)
                  }
                >
                  <Avatar
                    name={item.actor?.name}
                    url={item.actor?.avatar_url}
                    size={46}
                    flagCode={countryToCode(item.actor?.country)}
                    inVoiceRoom={!!item.actor?.in_voice_room}
                  />
                </Pressable>

                <View style={styles.mid}>
                  <Text style={styles.rowLine} numberOfLines={isLike ? 1 : 2}>
                    <Text style={styles.rowName}>
                      {item.actor?.name || "Someone"}
                    </Text>
                    {isLike ? (
                      <Text style={styles.rowAction}>
                        {" "}
                        liked
                        <Text style={styles.rowSnippet}>{likedSnippet}</Text>
                      </Text>
                    ) : isComment ? null : (
                      <Text style={styles.rowAction}> {actionLabel(item)}</Text>
                    )}
                  </Text>

                  {isComment && item.text ? (
                    <View>
                      <Text style={styles.commentText} numberOfLines={3}>
                        {item.text}
                      </Text>
                      {item.text.length > 90 ? (
                        <Text style={styles.showMore}>show more</Text>
                      ) : null}
                    </View>
                  ) : null}

                  <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>

                  {isLike && (
                    <Pressable
                      testID={`send-thanks-${item.id}`}
                      style={[
                        styles.thanksBtn,
                        thanked[item.id] && styles.thanksBtnDone,
                      ]}
                      onPress={() => sendThanks(item)}
                    >
                      <Ionicons
                        name={thanked[item.id] ? "checkmark" : "heart"}
                        size={14}
                        color={colors.brand}
                      />
                      <Text style={styles.thanksText}>
                        {thanked[item.id] ? "Thanks sent" : "Send Thanks"}
                      </Text>
                    </Pressable>
                  )}

                  {isComment && (
                    <View style={styles.commentActions}>
                      <Pressable hitSlop={6} onPress={() => openTarget(item)}>
                        <Ionicons
                          name="thumbs-up-outline"
                          size={19}
                          color={colors.onSurfaceSecondary}
                        />
                      </Pressable>
                      <Pressable hitSlop={6} onPress={() => openTarget(item)}>
                        <Ionicons
                          name="chatbubble-outline"
                          size={18}
                          color={colors.onSurfaceSecondary}
                        />
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Right: moment preview thumb (photo or voice tile) */}
                {preview?.image_url ? (
                  <Image
                    testID={`notice-thumb-${item.id}`}
                    source={{ uri: assetUrl(preview.image_url)! }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={100}
                  />
                ) : preview?.audio_url ? (
                  <View
                    style={styles.voiceThumb}
                    testID={`notice-voice-${item.id}`}
                  >
                    <Ionicons name="mic" size={20} color="#FFFFFF" />
                    <Text style={styles.voiceThumbLang}>
                      {(user?.native_language || "EN").toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
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
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: colors.onSurface,
    },
    tabsScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    tabsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    tabBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
    },
    tabBtnActive: {
      backgroundColor: colors.surfaceSecondary,
    },
    tabText: {
      fontFamily: fonts.textSemi,
      fontSize: 14.5,
      color: colors.onSurfaceSecondary,
    },
    tabTextActive: {
      fontFamily: fonts.textBold,
      color: colors.onSurface,
    },
    tabBadge: {
      position: "absolute",
      top: -2,
      right: -4,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: "#EF4444",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    tabBadgeText: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: "#FFFFFF",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 300,
      paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 16,
      color: colors.onSurface,
    },
    emptySub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      flexGrow: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    sep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 58,
    },
    mid: {
      flex: 1,
      gap: 4,
      // Lets long single-line notification text truncate instead of pushing
      // the row wider than the screen.
      minWidth: 0,
      overflow: "hidden",
    },
    rowLine: {
      fontFamily: fonts.text,
      fontSize: 15,
      color: colors.onSurface,
    },
    rowName: {
      fontFamily: fonts.textBold,
      fontSize: 15.5,
    },
    rowAction: {
      fontFamily: fonts.text,
      color: colors.onSurface,
    },
    rowSnippet: {
      fontFamily: fonts.textSemi,
      color: colors.onSurface,
    },
    commentText: {
      fontFamily: fonts.text,
      fontSize: 14.5,
      lineHeight: 20,
      color: colors.onSurface,
      marginTop: 1,
    },
    showMore: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.brand,
      marginTop: 1,
    },
    rowTime: {
      fontFamily: fonts.text,
      fontSize: 12.5,
      color: colors.onSurfaceSecondary,
    },
    thanksBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      backgroundColor: colors.brandTertiary,
      borderRadius: radius.pill,
      paddingHorizontal: 15,
      paddingVertical: 9,
      marginTop: 4,
    },
    thanksBtnDone: {
      opacity: 0.65,
    },
    thanksText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.brand,
    },
    commentActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xl,
      marginTop: 4,
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: 10,
    },
    voiceThumb: {
      width: 56,
      height: 56,
      borderRadius: 10,
      backgroundColor: "#2E7D74",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    voiceThumbLang: {
      fontFamily: fonts.textBold,
      fontSize: 11,
      color: "#FFFFFF",
    },
  });
