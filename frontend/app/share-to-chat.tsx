import { Ionicons } from "@/src/ui/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { BackButton } from "@/src/components/BackButton";
import { countryToCode } from "@/src/constants/countries";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, Conversation } from "@/src/utils/api";

/**
 * Dedicated page (not a modal) that lists every conversation the user has —
 * tap someone to send them a live voice-room invite card. Mirrors the flow
 * of a typical "share to friend" picker on Messenger / Telegram, so it feels
 * native and predictable.
 */
export default function ShareToChatScreen() {
  const { room_id } = useLocalSearchParams<{ room_id?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get<Conversation[]>("/chats");
        setConvos(list.filter((c) => !!c.partner));
      } catch (e) {
        Alert.alert(
          "Load chats",
          e instanceof Error ? e.message : "Could not load your chats.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter((c) =>
      (c.partner?.name || "").toLowerCase().includes(q),
    );
  }, [convos, search]);

  const send = async (conv: Conversation) => {
    if (!room_id || sendingId) return;
    setSendingId(conv.id);
    try {
      await api.post(`/chats/${conv.id}/messages`, { room_id });
      setSentIds((prev) => new Set(prev).add(conv.id));
    } catch (e) {
      Alert.alert(
        "Share",
        e instanceof Error ? e.message : "Could not send the invite.",
      );
    } finally {
      setSendingId(null);
    }
  };

  const renderRow = ({ item }: { item: Conversation }) => {
    const sent = sentIds.has(item.id);
    const sending = sendingId === item.id;
    return (
      <View style={styles.row}>
        <Avatar
          name={item.partner?.name || ""}
          url={item.partner?.avatar_url}
          size={48}
          flagCode={countryToCode(item.partner?.country)}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.partner?.name || "Unknown"}
          </Text>
          {item.partner?.native_language ? (
            <Text style={styles.rowSub} numberOfLines={1}>
              @{item.partner.username || item.partner.name?.toLowerCase()}
            </Text>
          ) : null}
        </View>
        <Pressable
          testID={`share-to-chat-send-${item.id}`}
          disabled={sent || sending}
          onPress={() => send(item)}
          style={[
            styles.sendBtn,
            sent && styles.sendBtnSent,
            sending && { opacity: 0.7 },
          ]}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : sent ? (
            <>
              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
              <Text style={styles.sendBtnText}>Sent</Text>
            </>
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <BackButton testID="share-chat-back-btn" />
        <Text style={styles.title}>Share to Chat</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={17} color={colors.onSurfaceSecondary} />
        <TextInput
          testID="share-chat-search-input"
          value={search}
          onChangeText={setSearch}
          placeholder="Search friends…"
          placeholderTextColor={colors.onSurfaceSecondary}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons
            name="chatbubbles-outline"
            size={54}
            color={colors.onSurfaceSecondary}
          />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyHint}>
            Start chatting with someone first, then come back to share.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      fontFamily: fonts.displaySemi,
      fontSize: 24,
      color: colors.onSurface,
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: spacing.md,
      marginVertical: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.pill,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurface,
      ...(require("react-native").Platform.OS === "web"
        ? ({ outlineStyle: "none" } as object)
        : {}),
    },
    list: {
      paddingBottom: spacing.xxl,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    rowName: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurface,
    },
    rowSub: {
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 76,
    },
    sendBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: 8,
      minWidth: 76,
      alignSelf: "center",
      justifyContent: "center",
    },
    sendBtnSent: {
      backgroundColor: colors.success,
    },
    sendBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: "#FFFFFF",
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xxl,
      gap: 10,
    },
    emptyTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 16,
      color: colors.onSurface,
      marginTop: spacing.sm,
    },
    emptyHint: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
      lineHeight: 18,
    },
  });
