import { Ionicons } from "@/src/ui/icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { SpeakingBars } from "@/src/components/SpeakingBars";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, User } from "@/src/utils/api";

interface RoomNotice {
  id: string;
  created_at: string;
  room: {
    id: string;
    title?: string | null;
    topic?: string | null;
    language?: string | null;
    is_live: boolean;
    member_count: number;
  };
  host: User | null;
}

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

/** "Live & Voiceroom" system feed — cards for rooms started by hosts you follow. */
export default function VoiceroomNotices() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<RoomNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<RoomNotice[]>("/rooms/notices/list")
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const joinRoom = useCallback(
    async (notice: RoomNotice) => {
      if (!notice.room.is_live) {
        if (Platform.OS === "web") window.alert("This Voiceroom has ended.");
        else Alert.alert("Voiceroom", "This Voiceroom has ended.");
        return;
      }
      try {
        await api.post(`/rooms/${notice.room.id}/join`);
        router.push(`/room/${notice.room.id}`);
      } catch {
        if (Platform.OS === "web") window.alert("This Voiceroom has ended.");
        else Alert.alert("Voiceroom", "This Voiceroom has ended.");
      }
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="voiceroom-notices-screen">
      <View style={styles.header}>
        <Pressable testID="vn-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Live & Voiceroom</Text>
          <Text style={styles.subtitle}>Online: Just now</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.onSurface} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.bigMic}>
                <Ionicons name="mic" size={34} color="#FFFFFF" />
              </View>
              <Text style={styles.emptyTitle}>No Voiceroom notices yet</Text>
              <Text style={styles.emptySub}>
                Follow hosts you like — you will be notified here whenever they
                start a Voiceroom.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View>
              <Text style={styles.timeSep}>{timeLabel(item.created_at)}</Text>
              <View style={styles.noticeRow}>
                <View style={styles.micAvatarWrap}>
                  <View style={styles.micAvatar}>
                    <Ionicons name="mic" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleTitle}>
                    {item.room.is_live
                      ? "The host you follow is live"
                      : "The host you follow started a new Voiceroom"}
                  </Text>
                  <Pressable
                    testID={`vn-room-${item.id}`}
                    style={[
                      styles.roomCard,
                      item.room.is_live && styles.roomCardLive,
                    ]}
                    onPress={() => joinRoom(item)}
                  >
                    <View style={styles.chipRow}>
                      <View style={styles.langChip}>
                        <Text style={styles.langChipText}>
                          {(item.room.language || "EN").toUpperCase()}
                        </Text>
                      </View>
                      {item.room.topic ? (
                        <View style={styles.topicChip}>
                          <Text style={styles.topicChipText}>
                            # {item.room.topic}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.roomTitle} numberOfLines={1}>
                      {item.room.title || "Voiceroom"}
                    </Text>
                    <View style={styles.hostRow}>
                      <Avatar
                        name={item.host?.name}
                        url={item.host?.avatar_url}
                        size={30}
                      />
                      <Text style={styles.hostName} numberOfLines={1}>
                        {item.host?.name || "Host"}
                      </Text>
                      <View style={{ flex: 1 }} />
                      {item.room.is_live ? (
                        <View style={styles.liveBadge}>
                          <SpeakingBars />
                          <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                      ) : (
                        <View style={styles.endedBadge}>
                          <Text style={styles.endedBadgeText}>Ended</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                  <Pressable
                    testID={`vn-more-${item.id}`}
                    style={styles.moreRow}
                    onPress={() => router.push("/(tabs)/voice")}
                  >
                    <Text style={styles.moreText}>
                      {item.room.is_live ? "Watch Voiceroom" : "More Voicerooms"}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.onSurface}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    title: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.onSurface },
    subtitle: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceSecondary },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 320,
      paddingHorizontal: spacing.xl,
    },
    bigMic: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#3B9DF8",
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.onSurface },
    emptySub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
    },
    list: { padding: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
    timeSep: {
      textAlign: "center",
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginVertical: spacing.sm,
    },
    noticeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    micAvatarWrap: { width: 40 },
    micAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "#3B9DF8",
      alignItems: "center",
      justifyContent: "center",
    },
    verifiedBadge: {
      position: "absolute",
      bottom: -2,
      left: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#22C55E",
      borderWidth: 1.5,
      borderColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    bubble: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    bubbleTitle: {
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurface,
      marginBottom: spacing.sm,
    },
    roomCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    roomCardLive: {
      backgroundColor: colors.brandTertiary,
    },
    chipRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    langChip: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    langChipText: { fontFamily: fonts.textBold, fontSize: 10.5, color: colors.onSurface },
    topicChip: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    topicChipText: { fontFamily: fonts.textSemi, fontSize: 11, color: colors.onSurface },
    roomTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 16.5,
      color: colors.onSurface,
      marginTop: 7,
    },
    hostRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 },
    hostName: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurface,
      maxWidth: 110,
    },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.brand,
      borderRadius: 7,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    liveBadgeText: { fontFamily: fonts.textBold, fontSize: 10, color: "#FFFFFF" },
    endedBadge: {
      backgroundColor: colors.surfaceTertiary,
      borderRadius: 7,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    endedBadgeText: {
      fontFamily: fonts.textBold,
      fontSize: 10.5,
      color: colors.onSurfaceSecondary,
    },
    moreRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      marginTop: spacing.md,
    },
    moreText: { fontFamily: fonts.textBold, fontSize: 15, color: colors.onSurface },
  });
