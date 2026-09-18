import { VIcon } from "@/src/learn/Icon";
import { BoundedSheet } from "@/src/components/layout/BoundedSheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/utils/api";
import { vocabApi } from "@/src/learn/api";
import { useLearnTheme } from "@/src/learn/ThemeContext";
import { LearnPalette, learnRadius } from "@/src/learn/theme";

type ProTutor = {
  id: string;
  name: string;
  avatar_url?: string | null;
  headline?: string;
  bio?: string;
  native_accent?: string;
  rating?: number;
  reviews_count?: number;
  lessons_taught?: number;
  students_count?: number;
};

type Review = { id: string; name: string; date: string; text: string };

const FALLBACK_REVIEWS: Review[] = [
  {
    id: "r1",
    name: "Rachel M.",
    date: "November 12, 2023",
    text: "Working with this tutor has been an absolute game-changer for me. Their tailored approach to teaching English is exceptional.",
  },
  {
    id: "r2",
    name: "Marco P.",
    date: "October 04, 2023",
    text: "Clear explanations, patient, and always prepared. My interview vocabulary improved massively.",
  },
];

function nextDays(count: number): { date: Date; label: string; short: string }[] {
  const days = [] as { date: Date; label: string; short: string }[];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push({
      date: d,
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      short: `${d.getDate()}`,
    });
  }
  return days;
}

const TIME_SLOTS = ["09:00", "11:00", "14:00", "16:00", "18:00", "20:00"];

export default function TutorDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useLearnTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [tutor, setTutor] = useState<ProTutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<null | { date: Date; time: string }>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, mark] = await Promise.all([
          api.get<ProTutor>(`/pro/tutors/${id}`),
          vocabApi.bookmarkStatus("tutor", id).catch(() => ({ bookmarked: false })),
        ]);
        if (mounted) {
          setTutor(t);
          setBookmarked(!!mark.bookmarked);
        }
      } catch {
        if (mounted) setTutor(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const toggleBookmark = async () => {
    setBookmarked((v) => !v);
    try { await vocabApi.toggleBookmark("tutor", id); }
    catch { setBookmarked((v) => !v); }
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.cardPurple} /></View>;
  }

  if (!tutor) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: colors.textDim, textAlign: "center", marginBottom: 12 }}>Tutor not found.</Text>
        <Pressable onPress={() => router.back()} style={s.roundBtn}>
          <VIcon name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>
    );
  }

  const rating = Math.round(tutor.rating ?? 5);
  const reviewsCount = tutor.reviews_count ?? 24;
  const bio =
    tutor.bio ||
    "I’m a dedicated English educator with over five years of experience specializing in teaching professionals the language skills essential for their success.";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingLeft: insets.left, paddingRight: insets.right }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 + insets.bottom, paddingHorizontal: 18 }}
      >
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} style={s.roundBtn}>
            <VIcon name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable style={s.roundBtn}>
              <VIcon name="chatbubble-ellipses-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable style={s.roundBtn} onPress={toggleBookmark}>
              <VIcon name={bookmarked ? "bookmark" : "bookmark-outline"} size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 18 }}>
          <View style={s.avatarRing}>
            {tutor.avatar_url ? (
              <Image source={{ uri: tutor.avatar_url }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, { backgroundColor: "#DAD1FF", alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontSize: 26, fontWeight: "800", color: "#4B3F82" }}>{tutor.name?.[0] ?? "?"}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.name}>{tutor.name}</Text>
            <Text style={s.role}>
              {tutor.headline || `Certified ${(tutor.native_accent || "English").toString().replace(/^./, (c) => c.toUpperCase())} Teacher`}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 20, marginBottom: 20 }}>
          <View style={s.iconMeta}>
            <VIcon name="school-outline" size={18} color={colors.text} />
            <Text style={s.iconMetaText}>{tutor.lessons_taught ?? 256} lessons</Text>
          </View>
          <View style={s.iconMeta}>
            <VIcon name="people-outline" size={18} color={colors.text} />
            <Text style={s.iconMetaText}>{tutor.students_count ?? 32} students</Text>
          </View>
        </View>

        <View style={s.aboutCard}>
          <Text style={s.aboutTitle}>About me</Text>
          <Text style={s.aboutText}>{bio}</Text>
        </View>

        {confirmedBooking && (
          <View style={s.bookingConfirmed}>
            <VIcon name="checkmark-circle" size={20} color="#0B0B0F" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#0B0B0F", fontSize: 13, fontWeight: "800" }}>Booking confirmed</Text>
              <Text style={{ color: "#0B0B0F", fontSize: 12, marginTop: 2 }}>
                {confirmedBooking.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} at {confirmedBooking.time}
              </Text>
            </View>
          </View>
        )}

        <Pressable style={({ pressed }) => [s.bookBtn, pressed && { opacity: 0.9 }]} onPress={() => setBookingOpen(true)}>
          <VIcon name="calendar-outline" size={18} color={colors.onLight} />
          <Text style={s.bookText}>Book lesson</Text>
        </Pressable>

        <View style={s.reviewsCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <VIcon name="star" size={16} color="#0B0B0F" />
            <Text style={s.reviewsHeader}>{rating} · {reviewsCount} reviews</Text>
          </View>
          {FALLBACK_REVIEWS.map((r) => (
            <View key={r.id} style={s.reviewItem}>
              <View style={s.reviewAvatar}><Text style={{ fontWeight: "800", color: "#4B3F82" }}>{r.name[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.reviewerName}>{r.name}</Text>
                <Text style={s.reviewDate}>{r.date}</Text>
                <Text style={s.reviewText}>{r.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <BookingSheet
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        colors={colors}
        tutorId={id}
        tutorName={tutor.name}
        onBooked={(d, t) => { setConfirmedBooking({ date: d, time: t }); setBookingOpen(false); }}
      />
    </View>
  );
}

function BookingSheet({
  open, onClose, colors, tutorId, tutorName, onBooked,
}: {
  open: boolean;
  onClose: () => void;
  colors: LearnPalette;
  tutorId: string;
  tutorName: string;
  onBooked: (d: Date, t: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const s = makeStyles(colors);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const days = useMemo(() => nextDays(10), []);

  const submit = async () => {
    if (!time) return;
    const [hh, mm] = time.split(":").map((x) => parseInt(x, 10));
    const slot = new Date(days[dayIdx].date);
    slot.setHours(hh, mm, 0, 0);
    setSubmitting(true);
    try {
      await vocabApi.createBooking({ tutor_id: tutorId, slot_iso: slot.toISOString(), duration_min: 60 });
      onBooked(slot, time);
      setTime(null);
    } catch (e: any) {
      Alert.alert("Booking failed", e?.message || "Please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable testID="learn-booking-backdrop" style={s.sheetBackdrop} onPress={onClose} />
      <BoundedSheet testID="learn-booking-sheet" style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Book a lesson with {tutorName}</Text>
        <Text style={s.sheetLabel}>Choose a day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d, i) => {
            const active = i === dayIdx;
            return (
              <Pressable testID={`learn-booking-day-${i}`} key={i} onPress={() => setDayIdx(i)} style={[s.dayCell, active && s.dayCellActive]}>
                <Text style={[s.dayLabel, active && { color: "#0B0B0F" }]}>{d.label}</Text>
                <Text style={[s.dayNum, active && { color: "#0B0B0F" }]}>{d.short}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={s.sheetLabel}>Available times</Text>
        <View style={s.timeGrid}>
          {TIME_SLOTS.map((t) => (
            <Pressable testID={`learn-booking-time-${t}`} key={t} onPress={() => setTime(t)} style={[s.timeChip, time === t && s.timeChipActive]}>
              <Text style={[s.timeText, time === t && { color: "#0B0B0F" }]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[s.applyBtn, (!time || submitting) && { opacity: 0.5 }]}
          testID="learn-booking-confirm"
          disabled={!time || submitting}
          onPress={submit}
        >
          {submitting ? <ActivityIndicator color="#0B0B0F" /> : <Text style={s.applyText}>Confirm booking</Text>}
        </Pressable>
      </BoundedSheet>
    </Modal>
  );
}

const makeStyles = (c: LearnPalette) =>
  StyleSheet.create({
    topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    roundBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceRaised,
      alignItems: "center", justifyContent: "center",
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    avatarRing: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: "#F0715C", overflow: "hidden" },
    avatar: { width: "100%", height: "100%" },
    name: { color: c.text, fontSize: 26, fontWeight: "800" },
    role: { color: c.textDim, fontSize: 14, marginTop: 2 },
    iconMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconMetaText: { color: c.text, fontSize: 14, fontWeight: "600" },
    aboutCard: {
      backgroundColor: c.mode === "dark" ? c.cardLight : "#FFFFFF",
      borderRadius: 22, padding: 18, marginBottom: 16,
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    aboutTitle: { color: c.onLight, fontSize: 18, fontWeight: "800", marginBottom: 10 },
    aboutText: { color: "#2A2A34", fontSize: 14, lineHeight: 22 },
    bookingConfirmed: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: c.cardMintDeep, borderRadius: 16, padding: 14, marginBottom: 14,
    },
    bookBtn: {
      backgroundColor: c.cardPurple, borderRadius: learnRadius.chip, paddingVertical: 16,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16,
    },
    bookText: { color: c.onLight, fontSize: 16, fontWeight: "700" },
    reviewsCard: {
      backgroundColor: c.mode === "dark" ? c.cardLight : "#FFFFFF",
      borderRadius: 22, padding: 18,
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    reviewsHeader: { color: c.onLight, fontSize: 16, fontWeight: "800" },
    reviewItem: { flexDirection: "row", gap: 12, marginTop: 12 },
    reviewAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#D8CBFF", alignItems: "center", justifyContent: "center" },
    reviewerName: { color: c.onLight, fontSize: 14, fontWeight: "700" },
    reviewDate: { color: "#6B6B75", fontSize: 12, marginBottom: 4 },
    reviewText: { color: "#2A2A34", fontSize: 13, lineHeight: 19 },
    sheetBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: {
      position: "absolute", left: 0, right: 0, bottom: 0,
      backgroundColor: c.mode === "dark" ? c.surface : "#FFFFFF",
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 20, paddingTop: 12,
      borderTopWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.textFaint, alignSelf: "center", marginBottom: 12 },
    sheetTitle: { color: c.text, fontSize: 18, fontWeight: "800", marginBottom: 6 },
    sheetLabel: { color: c.textDim, fontSize: 13, fontWeight: "700", marginTop: 14, marginBottom: 10, textTransform: "uppercase" },
    dayCell: {
      width: 56, paddingVertical: 10, borderRadius: 16,
      backgroundColor: c.surfaceRaised, alignItems: "center", justifyContent: "center",
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    dayCellActive: { backgroundColor: c.cardPurple, borderColor: c.cardPurple },
    dayLabel: { color: c.textDim, fontSize: 11, fontWeight: "700" },
    dayNum: { color: c.text, fontSize: 18, fontWeight: "800", marginTop: 2 },
    timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    timeChip: {
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
      backgroundColor: c.surfaceRaised,
      borderWidth: c.mode === "light" ? 1 : 0, borderColor: c.border,
    },
    timeChipActive: { backgroundColor: c.cardPurple },
    timeText: { color: c.text, fontSize: 13, fontWeight: "700" },
    applyBtn: { marginTop: 20, backgroundColor: c.cardPurple, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
    applyText: { color: "#0B0B0F", fontSize: 16, fontWeight: "800" },
  });
