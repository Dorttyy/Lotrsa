import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { countryToCode } from "@/src/constants/countries";
import { fonts } from "@/src/theme";
import { api, Conversation } from "@/src/utils/api";
import { timeAgo } from "@/src/utils/time";
import { premiumColors, premiumRadius } from "@/src/premium/theme";

export default function PremiumChats() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.get<Conversation[]>("/chats");
      // Premium club shows conversations where the partner is either a VIP
      // OR a Premium teacher (someone who has opted into teaching on
      // Premium by setting `teach_languages`). This way, when a user
      // messages any teacher from the Premium Connect page, the chat
      // still appears here inside the Premium Club.
      setConversations(
        data.filter((c) => {
          const p = c.partner as
            | (Conversation["partner"] & { teach_languages?: string[] })
            | undefined;
          if (!p) return false;
          if (p.is_vip) return true;
          if (Array.isArray(p.teach_languages) && p.teach_languages.length > 0)
            return true;
          return false;
        }),
      );
    } catch {
      // keep previous list on transient errors
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = (c.partner?.name || "").toLowerCase();
      const snippet = (c.last_message?.text || "").toLowerCase();
      return name.includes(q) || snippet.includes(q);
    });
  }, [conversations, query]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="premium-chats-screen">
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/(tabs)/chats")}
          style={styles.headerBack}
          hitSlop={8}
          testID="premium-chats-exit"
        >
          <Ionicons name="chevron-back" size={22} color={premiumColors.gold} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBrand}>PREMIUM CLUB</Text>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <Pressable
          testID="premium-chats-add"
          style={styles.headerIconBtn}
          onPress={() => router.push("/premium/connect")}
        >
          <Ionicons name="add" size={22} color={premiumColors.onGold} />
        </Pressable>
      </View>

      <View style={styles.tagline}>
        <Ionicons name="diamond" size={12} color={premiumColors.gold} />
        <Text style={styles.taglineText}>Members-only conversations</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={premiumColors.onSurfaceSecondary} />
        <TextInput
          testID="premium-chats-search"
          style={styles.searchInput}
          placeholder="Search members"
          placeholderTextColor={premiumColors.onSurfaceTertiary}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={premiumColors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyBadge}>
                <Ionicons name="diamond" size={30} color={premiumColors.gold} />
              </View>
              <Text style={styles.emptyTitle}>
                {query ? "No matches" : "No premium chats yet"}
              </Text>
              <Text style={styles.emptyBody}>
                {query
                  ? "Try a different search."
                  : "Only Premium members can chat here. Find a member to say hello."}
              </Text>
              <Pressable
                testID="premium-chats-find"
                style={styles.findBtn}
                onPress={() => router.push("/premium/connect")}
              >
                <Text style={styles.findBtnText}>Find members</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`premium-chat-row-${item.id}`}
              style={styles.row}
              onPress={() => router.push(`/chat/${item.id}?premium=1`)}
            >
              <Avatar
                name={item.partner?.name}
                url={item.partner?.avatar_url}
                size={54}
                flagCode={countryToCode(item.partner?.country)}
                online={item.partner?.is_online}
                frame={item.partner?.active_frame}
              />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <View style={styles.nameRow}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.partner?.name || "Member"}
                    </Text>
                    <View style={styles.vipBadge}>
                      <Ionicons name="diamond" size={9} color={premiumColors.onGold} />
                      <Text style={styles.vipText}>PREMIUM</Text>
                    </View>
                  </View>
                  <Text style={styles.rowTime}>
                    {timeAgo(item.last_message?.created_at)}
                  </Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.rowSnippet} numberOfLines={1}>
                    {item.last_message?.text || "Say hello 👋"}
                  </Text>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: premiumColors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: premiumColors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBrand: {
    fontFamily: fonts.textBold,
    fontSize: 10,
    letterSpacing: 2,
    color: premiumColors.gold,
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: premiumColors.onSurface,
    marginTop: 2,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  taglineText: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: premiumColors.onSurfaceSecondary,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: premiumColors.surface,
    borderRadius: premiumRadius.md,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: premiumColors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.text,
    fontSize: 15,
    color: premiumColors.onSurface,
    padding: 0,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sep: { height: 1, backgroundColor: premiumColors.divider, marginLeft: 68 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  rowBody: { flex: 1, gap: 4 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  rowName: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: premiumColors.onSurface,
    flexShrink: 1,
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vipText: {
    fontFamily: fonts.textBold,
    fontSize: 8,
    color: premiumColors.onGold,
    letterSpacing: 0.5,
  },
  rowTime: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: premiumColors.onSurfaceTertiary,
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  rowSnippet: {
    flex: 1,
    fontFamily: fonts.text,
    fontSize: 14,
    color: premiumColors.onSurfaceSecondary,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: {
    fontFamily: fonts.textBold,
    fontSize: 10,
    color: premiumColors.onGold,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 10,
  },
  emptyBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: premiumColors.surfaceRaised,
    borderWidth: 2,
    borderColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: premiumColors.onSurface,
  },
  emptyBody: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: premiumColors.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  findBtn: {
    marginTop: 14,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  findBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: premiumColors.onGold,
  },
});
