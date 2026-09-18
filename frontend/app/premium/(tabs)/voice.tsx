import { Ionicons } from "@/src/ui/icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { premiumColors, premiumRadius } from "@/src/premium/theme";

interface VoiceRoom {
  id: string;
  name?: string;
  topic?: string;
  color?: string;
  emoji?: string;
  host?: { id: string; name?: string; avatar_url?: string; is_vip?: boolean };
  participant_count?: number;
  language?: string;
}

export default function PremiumVoice() {
  const router = useRouter();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const isVip = !!user?.is_vip;

  const load = useCallback(async () => {
    try {
      const data = await api.get<VoiceRoom[]>("/rooms");
      // Show only rooms hosted by premium (VIP) users.
      setRooms(data.filter((r) => r.host?.is_vip));
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
      testID="premium-voice-screen"
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>PREMIUM CLUB</Text>
          <Text style={styles.title}>Voice Rooms</Text>
        </View>
        <Pressable
          onPress={() =>
            isVip
              ? router.push("/(tabs)/voice")
              : router.push("/learn/subscription")
          }
          style={[styles.newBtn, !isVip && styles.newBtnLocked]}
          testID="premium-voice-new"
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
            ? "Exclusive members-only rooms"
            : "Only Premium members can start a room."}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={premiumColors.gold} />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyBadge}>
                <Ionicons name="mic" size={28} color={premiumColors.gold} />
              </View>
              <Text style={styles.emptyTitle}>No live rooms</Text>
              <Text style={styles.emptyBody}>
                Be the first premium member to open a voice room today.
              </Text>
              <Pressable
                testID="premium-voice-empty-new"
                onPress={() =>
                  isVip
                    ? router.push("/(tabs)/voice")
                    : router.push("/learn/subscription")
                }
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>
                  {isVip ? "Start a room" : "Become Premium"}
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`premium-room-${item.id}`}
              onPress={() => router.push(`/room/${item.id}`)}
              style={[styles.card, { backgroundColor: item.color || premiumColors.surfaceRaised }]}
            >
              <View style={styles.cardTop}>
                <View style={styles.emojiBadge}>
                  <Text style={{ fontSize: 24 }}>{item.emoji || "🎙️"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.liveRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE · {item.participant_count ?? 0}</Text>
                    <View style={styles.vipBadge}>
                      <Ionicons name="diamond" size={8} color={premiumColors.onGold} />
                      <Text style={styles.vipText}>VIP</Text>
                    </View>
                  </View>
                  <Text style={styles.roomName} numberOfLines={1}>
                    {item.name || "Untitled room"}
                  </Text>
                  <Text style={styles.roomTopic} numberOfLines={1}>
                    {item.topic || "Come chat with premium members"}
                  </Text>
                </View>
              </View>
              <View style={styles.hostRow}>
                <Avatar
                  name={item.host?.name}
                  url={item.host?.avatar_url}
                  size={26}
                />
                <Text style={styles.hostText}>
                  Hosted by {item.host?.name || "a member"}
                </Text>
                <View style={{ flex: 1 }} />
                <View style={styles.joinPill}>
                  <Text style={styles.joinPillText}>Join</Text>
                  <Ionicons name="arrow-forward" size={12} color={premiumColors.onGold} />
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
  newBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: premiumColors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  newBtnLocked: {
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
    borderRadius: premiumRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: premiumColors.gold + "44",
    gap: 10,
  },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  emojiBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  liveText: {
    fontFamily: fonts.textBold,
    fontSize: 10,
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  vipText: {
    fontFamily: fonts.textBold,
    fontSize: 8,
    color: premiumColors.onGold,
  },
  roomName: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 2,
  },
  roomTopic: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  hostText: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  joinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: premiumColors.gold,
    borderRadius: premiumRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  joinPillText: {
    fontFamily: fonts.textBold,
    fontSize: 11,
    color: premiumColors.onGold,
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
