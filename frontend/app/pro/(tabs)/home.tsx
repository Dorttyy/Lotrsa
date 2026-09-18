import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/utils/api";
import { proColors, proFonts, proRadius, proShadow } from "@/src/pro/theme";

interface ProTutor {
  id: string;
  name: string;
  avatar_url?: string;
  native_accent?: string;
  specialties: string[];
  rating: number;
  is_online: boolean;
  hourly_rate: number;
}

export default function ProHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [featured, setFeatured] = useState<ProTutor[]>([]);
  const [matching, setMatching] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const ring1 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.9 }],
    opacity: 0.35 * (1 - pulse.value),
  }));
  const ring2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ((pulse.value + 0.5) % 1) * 0.9 }],
    opacity: 0.25 * (1 - ((pulse.value + 0.5) % 1)),
  }));

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [tutors, me] = await Promise.all([
        api.get<ProTutor[]>("/pro/tutors"),
        api.get<{ wallet: { balance: number } }>("/pro/me"),
      ]);
      setFeatured(tutors.slice(0, 6));
      setBalance(me.wallet.balance);
    } catch {
      // silent
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const practiceNow = async () => {
    if (matching) return;
    setMatching(true);
    try {
      const session = await api.post<{ id: string }>("/pro/match", {});
      setTimeout(() => {
        setMatching(false);
        router.push(`/pro/session/${session.id}`);
      }, 1400);
    } catch {
      setMatching(false);
    }
  };

  const firstName = (user?.name || "there").split(" ")[0];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]} testID="pro-home-screen">
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>PRO · LIVE TUTORING</Text>
            <Text style={styles.hello}>Hello, {firstName}</Text>
          </View>
          <Pressable
            testID="pro-home-exit"
            onPress={() => router.replace("/(tabs)/chats")}
            style={styles.exitBtn}
            hitSlop={8}
          >
            <Ionicons name="close" size={20} color={proColors.inkSoft} />
          </Pressable>
        </View>

        {/* Wallet pill */}
        <View style={styles.walletPill}>
          <Ionicons name="time-outline" size={15} color={proColors.sage} />
          <Text style={styles.walletText}>
            {balance == null ? "—" : balance} lesson minutes available
          </Text>
        </View>

        {/* Pulse CTA */}
        <View style={styles.pulseWrap}>
          <Animated.View style={[styles.ring, ring1]} />
          <Animated.View style={[styles.ring, ring2]} />
          <Pressable
            testID="pro-practice-now"
            onPress={practiceNow}
            style={styles.pulseBtn}
          >
            {matching ? (
              <>
                <ActivityIndicator color={proColors.onAccent} />
                <Text style={styles.pulseLabel}>Matching…</Text>
              </>
            ) : (
              <>
                <Ionicons name="videocam" size={30} color={proColors.onAccent} />
                <Text style={styles.pulseLabel}>Practice Now</Text>
                <Text style={styles.pulseSub}>Instant 1-on-1 lesson</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.matchHint}>
          {matching
            ? "Finding your perfect tutor…"
            : "Tap to connect with an available tutor in seconds"}
        </Text>

        {/* Featured tutors */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Featured tutors</Text>
          <Pressable onPress={() => router.push("/pro/tutors")} hitSlop={6}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
        >
          {featured.map((t) => (
            <Pressable
              key={t.id}
              testID={`pro-featured-${t.id}`}
              style={styles.tutorCard}
              onPress={() => router.push(`/pro/tutor/${t.id}`)}
            >
              <View style={styles.tutorMedia}>
                <Image
                  source={{ uri: t.avatar_url }}
                  style={styles.tutorImg}
                  contentFit="cover"
                  transition={150}
                />
                {t.is_online && (
                  <View style={styles.onlineTag}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineTagText}>Online</Text>
                  </View>
                )}
                <View style={styles.ratingTag}>
                  <Ionicons name="star" size={11} color={proColors.gold} />
                  <Text style={styles.ratingTagText}>{t.rating.toFixed(1)}</Text>
                </View>
              </View>
              <Text style={styles.tutorName} numberOfLines={1}>
                {t.name}
              </Text>
              <Text style={styles.tutorAccent} numberOfLines={1}>
                {t.native_accent}
              </Text>
              <View style={styles.pillRow}>
                {t.specialties.slice(0, 1).map((s) => (
                  <View key={s} style={styles.specPill}>
                    <Text style={styles.specPillText} numberOfLines={1}>
                      {s}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* How it works */}
        <Text style={[styles.sectionTitle, { marginTop: 26 }]}>How Pro works</Text>
        <View style={styles.stepsCard}>
          {[
            { icon: "hand-left-outline", t: "Tap Practice Now", s: "Get matched instantly or book a favourite tutor." },
            { icon: "videocam-outline", t: "Join the video room", s: "Live 1-on-1 with chat, translation & a smart notebook." },
            { icon: "ribbon-outline", t: "Track your progress", s: "Every lesson becomes study notes and streaks." },
          ].map((step, i) => (
            <View key={step.t} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon as any} size={18} color={proColors.terracotta} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.t}</Text>
                <Text style={styles.stepSub}>{step.s}</Text>
              </View>
              {i < 2 && <View style={styles.stepLine} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: proColors.bg },
  body: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  kicker: {
    fontFamily: proFonts.sansSemi,
    fontSize: 11,
    letterSpacing: 2,
    color: proColors.terracotta,
  },
  hello: {
    fontFamily: proFonts.serifBold,
    fontSize: 30,
    color: proColors.ink,
    marginTop: 2,
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: proColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginHorizontal: 22,
    marginTop: 14,
    backgroundColor: proColors.sageTint,
    borderRadius: proRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  walletText: {
    fontFamily: proFonts.sansSemi,
    fontSize: 12.5,
    color: proColors.sage,
  },
  pulseWrap: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  ring: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: proColors.terracotta,
  },
  pulseBtn: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: proColors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    ...proShadow.card,
    shadowColor: proColors.terracotta,
    shadowOpacity: 0.4,
  },
  pulseLabel: {
    fontFamily: proFonts.serifBold,
    fontSize: 21,
    color: proColors.onAccent,
    marginTop: 4,
  },
  pulseSub: {
    fontFamily: proFonts.sans,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  matchHint: {
    textAlign: "center",
    fontFamily: proFonts.sans,
    fontSize: 13,
    color: proColors.inkSoft,
    marginHorizontal: 40,
    marginTop: -6,
    marginBottom: 8,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    marginTop: 22,
  },
  sectionTitle: {
    fontFamily: proFonts.serifBold,
    fontSize: 21,
    color: proColors.ink,
    paddingHorizontal: 22,
  },
  seeAll: {
    fontFamily: proFonts.sansSemi,
    fontSize: 13,
    color: proColors.terracotta,
  },
  hList: { paddingHorizontal: 22, paddingVertical: 14, gap: 14 },
  tutorCard: {
    width: 168,
    backgroundColor: proColors.surface,
    borderRadius: proRadius.xl,
    padding: 10,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  tutorMedia: {
    height: 150,
    borderRadius: proRadius.lg,
    overflow: "hidden",
    backgroundColor: proColors.surfaceMuted,
  },
  tutorImg: { width: "100%", height: "100%" },
  onlineTag: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: proColors.glassStrong,
    borderRadius: proRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: proColors.online,
  },
  onlineTagText: {
    fontFamily: proFonts.sansSemi,
    fontSize: 10,
    color: proColors.ink,
  },
  ratingTag: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: proColors.glassStrong,
    borderRadius: proRadius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ratingTagText: {
    fontFamily: proFonts.sansBold,
    fontSize: 11,
    color: proColors.ink,
  },
  tutorName: {
    fontFamily: proFonts.sansBold,
    fontSize: 15,
    color: proColors.ink,
    marginTop: 8,
  },
  tutorAccent: {
    fontFamily: proFonts.sans,
    fontSize: 12,
    color: proColors.inkSoft,
    marginTop: 1,
  },
  pillRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  specPill: {
    backgroundColor: proColors.terracottaTint,
    borderRadius: proRadius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  specPillText: {
    fontFamily: proFonts.sansSemi,
    fontSize: 11,
    color: proColors.terracotta,
  },
  stepsCard: {
    backgroundColor: proColors.surface,
    borderRadius: proRadius.xl,
    marginHorizontal: 22,
    marginTop: 14,
    padding: 18,
    gap: 18,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  stepRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: proRadius.md,
    backgroundColor: proColors.terracottaTint,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontFamily: proFonts.sansBold,
    fontSize: 15,
    color: proColors.ink,
  },
  stepSub: {
    fontFamily: proFonts.sans,
    fontSize: 12.5,
    color: proColors.inkSoft,
    marginTop: 2,
    lineHeight: 18,
  },
  stepLine: {
    position: "absolute",
    left: 19,
    top: 44,
    width: 2,
    height: 22,
    backgroundColor: proColors.divider,
  },
});
