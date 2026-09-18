import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { api } from "@/src/utils/api";
import { proColors, proFonts, proRadius, proShadow } from "@/src/pro/theme";

interface ProTutor {
  id: string;
  name: string;
  avatar_url?: string;
  native_accent?: string;
  bio: string;
  specialties: string[];
  rating: number;
  reviews_count: number;
  lessons_taught: number;
  is_online: boolean;
  hourly_rate: number;
}

export default function ProTutorDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tutor, setTutor] = useState<ProTutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<ProTutor>(`/pro/tutors/${id}`)
      .then((t) => active && setTutor(t))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const book = async () => {
    if (booking || !tutor) return;
    setBooking(true);
    try {
      const session = await api.post<{ id: string }>("/pro/match", { tutor_id: tutor.id });
      router.push(`/pro/session/${session.id}`);
    } catch {
      // silent
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={proColors.terracotta} />
        </View>
      </SafeAreaView>
    );
  }
  if (!tutor) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <Text style={styles.empty}>Tutor not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="pro-tutor-detail">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8} testID="pro-tutor-back">
            <Ionicons name="chevron-back" size={22} color={proColors.ink} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Image source={{ uri: tutor.avatar_url }} style={styles.heroImg} contentFit="cover" />
          {tutor.is_online && (
            <View style={styles.onlineTag}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineTagText}>Online now</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{tutor.name}</Text>
        <Text style={styles.accent}>{tutor.native_accent}</Text>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <View style={styles.statTop}>
              <Ionicons name="star" size={14} color={proColors.gold} />
              <Text style={styles.statNum}>{tutor.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.statLabel}>{tutor.reviews_count} reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{tutor.lessons_taught}</Text>
            <Text style={styles.statLabel}>lessons</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{tutor.hourly_rate}</Text>
            <Text style={styles.statLabel}>min / lesson</Text>
          </View>
        </View>

        <Text style={styles.section}>About</Text>
        <Text style={styles.bio}>{tutor.bio}</Text>

        <Text style={styles.section}>Specialties</Text>
        <View style={styles.pillRow}>
          {tutor.specialties.map((s) => (
            <View key={s} style={styles.pill}>
              <Text style={styles.pillText}>{s}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          testID="pro-tutor-book"
          onPress={book}
          style={[styles.bookBtn, booking && { opacity: 0.6 }]}
          disabled={booking}
        >
          {booking ? (
            <ActivityIndicator color={proColors.onAccent} />
          ) : (
            <>
              <Ionicons name="videocam" size={20} color={proColors.onAccent} />
              <Text style={styles.bookText}>Start a lesson</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: proColors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { fontFamily: proFonts.sans, fontSize: 14, color: proColors.inkSoft },
  body: { paddingBottom: 30 },
  topBar: { paddingHorizontal: 18, paddingTop: 6 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: proColors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: proColors.border,
  },
  hero: {
    height: 300,
    marginHorizontal: 22,
    marginTop: 8,
    borderRadius: proRadius.xxl,
    overflow: "hidden",
    backgroundColor: proColors.surfaceMuted,
  },
  heroImg: { width: "100%", height: "100%" },
  onlineTag: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: proColors.glassStrong,
    borderRadius: proRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: proColors.online },
  onlineTagText: { fontFamily: proFonts.sansSemi, fontSize: 11, color: proColors.ink },
  name: { fontFamily: proFonts.serifBold, fontSize: 28, color: proColors.ink, paddingHorizontal: 22, marginTop: 16 },
  accent: { fontFamily: proFonts.sans, fontSize: 14, color: proColors.inkSoft, paddingHorizontal: 22, marginTop: 2 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: proColors.surface,
    borderRadius: proRadius.xl,
    marginHorizontal: 22,
    marginTop: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: proColors.border,
    ...proShadow.soft,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  statNum: { fontFamily: proFonts.serifBold, fontSize: 20, color: proColors.ink },
  statLabel: { fontFamily: proFonts.sans, fontSize: 11.5, color: proColors.inkSoft },
  statDivider: { width: 1, height: 34, backgroundColor: proColors.divider },
  section: { fontFamily: proFonts.serifBold, fontSize: 19, color: proColors.ink, paddingHorizontal: 22, marginTop: 22, marginBottom: 8 },
  bio: { fontFamily: proFonts.sans, fontSize: 14.5, color: proColors.inkSoft, lineHeight: 22, paddingHorizontal: 22 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 22 },
  pill: { backgroundColor: proColors.terracottaTint, borderRadius: proRadius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  pillText: { fontFamily: proFonts.sansSemi, fontSize: 13, color: proColors.terracotta },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 22,
    backgroundColor: proColors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: proColors.border,
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: proColors.terracotta,
    borderRadius: proRadius.md,
    paddingVertical: 16,
    ...proShadow.soft,
  },
  bookText: { fontFamily: proFonts.sansBold, fontSize: 16, color: proColors.onAccent },
});
