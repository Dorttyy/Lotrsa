import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/AuthContext";
import { fonts } from "@/src/theme";
import { api } from "@/src/utils/api";
import { timeAgo } from "@/src/utils/time";
import { premiumColors, premiumRadius } from "@/src/premium/theme";

interface Moment {
  id: string;
  text?: string;
  photo_url?: string;
  photos?: string[];
  created_at?: string;
  like_count?: number;
  comment_count?: number;
  author?: {
    id: string;
    name?: string;
    avatar_url?: string;
    is_vip?: boolean;
    active_frame?: { id: string; color: string; colors?: string[] | null; animated?: boolean; expires_at?: string | null } | null;
  };
}

export default function PremiumMoments() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const isVip = !!user?.is_vip;

  const load = useCallback(async () => {
    try {
      const data = await api.get<Moment[]>("/moments");
      // Only show posts authored by VIPs — premium members only.
      setPosts(data.filter((p) => p.author?.is_vip));
    } catch {
      // keep list
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
      testID="premium-moments-screen"
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>PREMIUM CLUB</Text>
          <Text style={styles.title}>Moments</Text>
        </View>
        <Pressable
          onPress={() => router.push("/premium/moment-compose")}
          style={[styles.composeBtn, !isVip && styles.composeBtnLocked]}
          testID="premium-moments-compose"
        >
          <Ionicons
            name={isVip ? "add" : "lock-closed"}
            size={isVip ? 20 : 16}
            color={premiumColors.onGold}
          />
        </Pressable>
      </View>

      <View style={styles.hint}>
        <Ionicons name="diamond" size={12} color={premiumColors.gold} />
        <Text style={styles.hintText}>
          {isVip
            ? "Only members can post here"
            : "Only Premium members can post. Upgrade to join."}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={premiumColors.gold} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyBadge}>
                <Ionicons name="planet" size={28} color={premiumColors.gold} />
              </View>
              <Text style={styles.emptyTitle}>No premium posts yet</Text>
              <Text style={styles.emptyBody}>
                Members haven&apos;t shared anything here yet. Be the first!
              </Text>
              <Pressable
                testID="premium-moments-empty-compose"
                onPress={() =>
                  isVip
                    ? router.push("/premium/moment-compose")
                    : router.push("/learn/subscription")
                }
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>
                  {isVip ? "Compose a moment" : "Become Premium"}
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`premium-moment-${item.id}`}
              onPress={() => router.push(`/premium/moment/${item.id}`)}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <Avatar
                  name={item.author?.name}
                  url={item.author?.avatar_url}
                  size={40}
                  frame={item.author?.active_frame}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.authorRow}>
                    <Text style={styles.authorName}>{item.author?.name}</Text>
                    <View style={styles.vipBadge}>
                      <Ionicons name="diamond" size={9} color={premiumColors.onGold} />
                      <Text style={styles.vipText}>PREMIUM</Text>
                    </View>
                  </View>
                  <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                </View>
                <Pressable hitSlop={8}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color={premiumColors.onSurfaceSecondary}
                  />
                </Pressable>
              </View>
              {item.text ? (
                <Text style={styles.text}>{item.text}</Text>
              ) : null}
              {item.photo_url || (item.photos && item.photos[0]) ? (
                <Image
                  source={{ uri: item.photo_url || item.photos![0] }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.actions}>
                <View style={styles.actionRow}>
                  <Ionicons name="heart-outline" size={18} color={premiumColors.onSurfaceSecondary} />
                  <Text style={styles.actionText}>{item.like_count ?? 0}</Text>
                </View>
                <View style={styles.actionRow}>
                  <Ionicons name="chatbubble-outline" size={16} color={premiumColors.onSurfaceSecondary} />
                  <Text style={styles.actionText}>{item.comment_count ?? 0}</Text>
                </View>
                <View style={styles.actionRow}>
                  <Ionicons name="paper-plane-outline" size={16} color={premiumColors.onSurfaceSecondary} />
                  <Text style={styles.actionText}>Share</Text>
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
    paddingBottom: 6,
  },
  brand: {
    fontFamily: fonts.textBold,
    fontSize: 10,
    letterSpacing: 2,
    color: premiumColors.gold,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: premiumColors.onSurface,
    marginTop: 2,
  },
  composeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  composeBtnLocked: {
    backgroundColor: premiumColors.surfaceHigh,
    borderWidth: 1,
    borderColor: premiumColors.gold,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  hintText: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: premiumColors.onSurfaceSecondary,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: premiumColors.surfaceRaised,
    borderRadius: premiumRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: premiumColors.border,
    gap: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: premiumColors.onSurface,
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
  time: {
    fontFamily: fonts.text,
    fontSize: 11,
    color: premiumColors.onSurfaceTertiary,
    marginTop: 2,
  },
  text: {
    fontFamily: fonts.text,
    fontSize: 14,
    color: premiumColors.onSurface,
    lineHeight: 20,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: premiumRadius.md,
    backgroundColor: premiumColors.surfaceHigh,
  },
  actions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premiumColors.divider,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: premiumColors.onSurfaceSecondary,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  emptyBtn: {
    marginTop: 12,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyBtnText: {
    fontFamily: fonts.textBold,
    fontSize: 14,
    color: premiumColors.onGold,
  },
});
